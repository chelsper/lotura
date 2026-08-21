export const DISCOVERY_PROPOSAL_DISPOSITIONS = [
  "use_in_proposal",
  "keep_documented",
  "leave_for_later",
];

export const DISCOVERY_PROPOSAL_DISPOSITION_LABELS = {
  keep_documented: "Keep what is documented",
  leave_for_later: "Leave for later",
  use_in_proposal: "Use in proposed update",
};

export function buildDocumentedProcessSnapshot(process) {
  return {
    dependencies: {
      downstream: process.downstream.map((item) => ({
        description: item.description,
        processId: item.processId,
        processName: item.processName,
        type: item.type,
      })),
      upstream: process.upstream.map((item) => ({
        description: item.description,
        processId: item.processId,
        processName: item.processName,
        type: item.type,
      })),
    },
    exceptions: process.exceptions.map((item) => ({
      condition: item.condition,
      id: item.id,
      name: item.name,
      ownerRole: item.ownerRole
        ? { id: item.ownerRole.id, name: item.ownerRole.name }
        : null,
      response: item.response,
      status: item.status,
      stepId: item.stepId,
      stepTitle: item.stepTitle,
    })),
    process: {
      id: process.id,
      name: process.name,
      ownerRole: process.ownerRole
        ? { id: process.ownerRole.id, name: process.ownerRole.name }
        : null,
      purpose: process.purpose,
      status: process.status,
    },
    steps: process.steps.map((item) => ({
      id: item.id,
      instructions: item.instructions,
      position: item.position,
      responsibleRole: item.responsibleRole
        ? { id: item.responsibleRole.id, name: item.responsibleRole.name }
        : null,
      title: item.title,
    })),
    systems: process.systems.map((item) => ({
      description: item.description,
      id: item.id,
      name: item.name,
      status: item.status,
      type: item.type,
      usage: item.usage,
    })),
  };
}

export function currentDiscoveryProposalDecisions(decisions) {
  const current = new Map();
  for (const decision of [...decisions].sort(
    (left, right) => left.decisionSequence - right.decisionSequence,
  )) {
    current.set(decision.observationId, decision);
  }
  return current;
}

export function defaultDiscoveryReviewDisposition(epistemicState) {
  return epistemicState === "known" ? "keep_documented" : "leave_for_later";
}

export function discoveryReviewByExceptionSummary(observations, decisions) {
  const current = currentDiscoveryProposalDecisions(decisions);
  let included = 0;
  let kept = 0;
  let later = 0;
  let remaining = 0;

  for (const observation of observations) {
    const disposition = current.get(observation.id)?.disposition;
    if (disposition === "use_in_proposal") included += 1;
    else if (disposition === "keep_documented") kept += 1;
    else if (disposition === "leave_for_later") later += 1;
    else {
      remaining += 1;
      if (defaultDiscoveryReviewDisposition(observation.epistemicState) === "keep_documented") {
        kept += 1;
      } else {
        later += 1;
      }
    }
  }

  return {
    canFinishNoChanges: observations.length > 0 && included === 0,
    canFinishSelectedChanges: included > 0,
    included,
    kept,
    later,
    remaining,
    total: observations.length,
  };
}

export function discoveryProposalReadiness(observationIds, decisions) {
  const current = currentDiscoveryProposalDecisions(decisions);
  const included = observationIds.filter(
    (id) => current.get(id)?.disposition === "use_in_proposal",
  ).length;
  const kept = observationIds.filter(
    (id) => current.get(id)?.disposition === "keep_documented",
  ).length;
  const later = observationIds.filter(
    (id) => current.get(id)?.disposition === "leave_for_later",
  ).length;
  const reviewed = observationIds.filter((id) => current.has(id)).length;
  return {
    canFinish: observationIds.length > 0 && reviewed === observationIds.length,
    included,
    kept,
    later,
    remaining: observationIds.length - reviewed,
    reviewed,
    total: observationIds.length,
  };
}
