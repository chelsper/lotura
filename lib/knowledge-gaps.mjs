function isCurrentEffective(record, asOf) {
  if (record.status !== "active") return false;
  const effectiveFrom = new Date(record.effectiveFrom).getTime();
  const effectiveUntil = record.effectiveUntil
    ? new Date(record.effectiveUntil).getTime()
    : null;
  return effectiveFrom <= asOf && (effectiveUntil === null || effectiveUntil > asOf);
}

function compareItems(left, right) {
  return left.question.localeCompare(right.question) || left.key.localeCompare(right.key);
}

function currentObservations(observations) {
  const superseded = new Set(
    observations
      .map((observation) => observation.supersedesObservationId)
      .filter(Boolean),
  );
  return observations.filter((observation) => !superseded.has(observation.id));
}

function currentDecisionByObservation(decisions) {
  const current = new Map();
  for (const decision of decisions) {
    const previous = current.get(decision.observationId);
    if (!previous || decision.decisionSequence > previous.decisionSequence) {
      current.set(decision.observationId, decision);
    }
  }
  return current;
}

function discoveryQuestion(observation) {
  if (observation.epistemicState === "needs_validation") {
    return `What source or participant can validate “${observation.promptText}”?`;
  }
  if (observation.epistemicState === "unknown") {
    return `What could help answer “${observation.promptText}”?`;
  }
  return `How should the differing evidence about “${observation.promptText}” be understood?`;
}

function discoveryReason(observation) {
  if (observation.epistemicState === "needs_validation") {
    return "The latest saved answer was intentionally marked Needs validation.";
  }
  if (observation.epistemicState === "unknown") {
    return "Unknown was preserved as an honest answer rather than filled with an assumption.";
  }
  return "The latest saved answer preserves conflicting observations for a later human review.";
}

export function buildKnowledgeGaps({
  asOf,
  discovery = { decisions: [], observations: [] },
  operatingModel,
  organizationKey,
  structure,
}) {
  const asOfTime = new Date(asOf).getTime();
  if (!Number.isFinite(asOfTime)) {
    throw new Error("Knowledge Gaps requires a valid as-of timestamp.");
  }

  const items = [];
  const processByKey = new Map(
    operatingModel.processes.map((process) => [process.key, process]),
  );
  const roleByKey = new Map(
    operatingModel.roles.map((role) => [role.key, role]),
  );
  const positionByKey = new Map(
    structure.positions.map((position) => [position.stableKey, position]),
  );

  for (const process of operatingModel.processes) {
    if (process.ownerRoleKey) continue;
    items.push({
      category: "responsibility",
      fact: `No Owner Role is recorded for ${process.name}. Its current status is ${process.status === "draft" ? "Working draft" : process.status}.`,
      href: `/explorer/${encodeURIComponent(process.key)}`,
      key: `process-owner:${process.key}`,
      organizationKey,
      processKey: process.key,
      question: `Who should own ${process.name}?`,
      sourceStableKey: process.key,
      sourceType: "process",
      whyReview: "Process ownership must be established through an explicit Operational Role; it is never inferred from a Person, Position, title, or reporting relationship.",
    });
  }

  for (const step of operatingModel.processSteps) {
    const process = processByKey.get(step.processKey);
    if (!process || step.responsibleRoleKey || process.ownerRoleKey) continue;
    items.push({
      category: "responsibility",
      fact: `No Responsible Role is recorded for this Step, and ${process.name} has no Owner Role to provide default responsibility context.`,
      href: `/explorer/${encodeURIComponent(process.key)}`,
      key: `step-responsibility:${step.key}`,
      organizationKey,
      processKey: process.key,
      question: `Which Operational Role is responsible for “${step.title}”?`,
      sourceStableKey: step.key,
      sourceType: "process_step",
      whyReview: "The recorded model does not yet establish responsibility for this part of the work.",
    });
  }

  const currentMandates = structure.roleMandates.filter((mandate) =>
    isCurrentEffective(mandate, asOfTime),
  );
  const coveredMandates = new Set(
    structure.roleCoverages
      .filter((coverage) => isCurrentEffective(coverage, asOfTime))
      .map((coverage) => coverage.roleMandateKey),
  );
  for (const mandate of currentMandates) {
    if (coveredMandates.has(mandate.key)) continue;
    const role = roleByKey.get(mandate.roleKey);
    const position = positionByKey.get(mandate.positionKey);
    if (!role || !position) continue;
    items.push({
      category: "responsibility",
      fact: `An active ${mandate.mandateType} Role Mandate connects ${position.title} to ${role.name}, but no current Role Coverage is recorded.`,
      href: role.stableKey
        ? `/studio/responsibilities/roles/${encodeURIComponent(role.stableKey)}`
        : undefined,
      key: `mandate-coverage:${mandate.key}`,
      organizationKey,
      question: `Who currently covers ${role.name} for ${position.title}?`,
      sourceStableKey: mandate.key,
      sourceType: "role_mandate",
      whyReview: "This is a coverage question. It does not establish that the Position or Role is vacant.",
    });
  }

  const decisions = currentDecisionByObservation(discovery.decisions);
  for (const observation of currentObservations(discovery.observations)) {
    const href = `/studio/discovery/interviews/${encodeURIComponent(observation.sessionId)}/reconcile#observation-${encodeURIComponent(observation.id)}`;
    if (
      observation.epistemicState === "needs_validation" ||
      observation.epistemicState === "unknown" ||
      observation.epistemicState === "conflicting_observation"
    ) {
      items.push({
        category: "discovery",
        evidenceState: observation.epistemicState,
        fact: discoveryReason(observation),
        href,
        interviewKey: observation.sessionId,
        key: `discovery-evidence:${observation.id}:${observation.epistemicState}`,
        organizationKey,
        processKey: observation.processKey,
        question: discoveryQuestion(observation),
        recordedAt: observation.createdAt,
        sourceStableKey: observation.id,
        sourceType: "discovery_observation",
        whyReview: `This question remains attached to ${observation.processName}; it has not changed the documented Process.`,
      });
    }

    const decision = decisions.get(observation.id);
    if (decision?.disposition === "leave_for_later") {
      items.push({
        category: "discovery",
        evidenceState: observation.epistemicState,
        fact: `A reviewer intentionally chose to leave this answer for later: “${observation.promptText}”`,
        href,
        interviewKey: observation.sessionId,
        key: `discovery-later:${observation.id}`,
        organizationKey,
        processKey: observation.processKey,
        question: `When should this ${observation.processName} answer be revisited?`,
        recordedAt: decision.createdAt,
        sourceStableKey: observation.id,
        sourceType: "discovery_review_choice",
        whyReview: "Leaving an answer for later is a valid review outcome. It remains visible without forcing a correction or proposed change.",
      });
    }
  }

  const responsibility = items
    .filter((item) => item.category === "responsibility")
    .sort(compareItems);
  const discoveryItems = items
    .filter((item) => item.category === "discovery")
    .sort(compareItems);

  return {
    counts: {
      discovery: discoveryItems.length,
      responsibility: responsibility.length,
      total: items.length,
    },
    groups: [
      {
        description: "Questions created only where the recorded model does not establish ownership, Step responsibility, or current Role coverage.",
        id: "responsibility",
        items: responsibility,
        label: "Responsibility",
      },
      {
        description: "Questions preserved from current interview evidence and explicit human review choices.",
        id: "discovery",
        items: discoveryItems,
        label: "Discovery",
      },
    ],
    items: [...responsibility, ...discoveryItems],
  };
}
