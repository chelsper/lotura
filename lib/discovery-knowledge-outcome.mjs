import { currentDiscoveryMappingItems } from "./discovery-mapping-model.mjs";
import { currentDiscoveryProposalDecisions } from "./discovery-proposal-model.mjs";

export function buildDiscoveryKnowledgeOutcome({
  completedAt = null,
  completedByActor = null,
  decisions,
  mapping = null,
  observations,
}) {
  const observationById = new Map(
    observations.map((observation) => [observation.id, observation]),
  );
  const currentDecisionByObservation = currentDiscoveryProposalDecisions(decisions);
  const currentDecisions = observations
    .map((observation) => currentDecisionByObservation.get(observation.id))
    .filter(Boolean);
  const decisionsByDisposition = (disposition) => currentDecisions
    .filter((decision) => decision.disposition === disposition);

  const documented = decisionsByDisposition("keep_documented");
  const later = decisionsByDisposition("leave_for_later");
  const selected = decisionsByDisposition("use_in_proposal");
  const laterObservations = later
    .map((decision) => observationById.get(decision.observationId))
    .filter(Boolean);
  const needsValidationObservationIds = laterObservations
    .filter((observation) => observation.epistemicState !== "known")
    .map((observation) => observation.id);
  const conflictingObservationIds = observations
    .filter((observation) => observation.epistemicState === "conflicting_observation")
    .map((observation) => observation.id);
  const unresolvedBoundaryObservationIds = laterObservations
    .filter((observation) => observation.topic === "boundary")
    .map((observation) => observation.id);

  const currentMappingItems = [
    ...currentDiscoveryMappingItems(mapping?.items ?? []).values(),
  ];
  const activeMappingItems = currentMappingItems
    .filter((item) => item.state === "active");
  const structuredChangeCount = activeMappingItems
    .filter((item) => item.action !== "preserve_unresolved").length;
  const unresolvedMappingCount = activeMappingItems
    .filter((item) => item.action === "preserve_unresolved").length;
  const mappingStatus = mapping?.status ?? "none";
  const noChangesProposed = selected.length === 0 || (
    mappingStatus === "ready_for_proposal_review" && structuredChangeCount === 0
  );
  const stage = noChangesProposed
    ? "no_changes"
    : mappingStatus === "ready_for_proposal_review"
      ? "ready_for_proposal_review"
      : activeMappingItems.length > 0
        ? "mapping_in_progress"
        : "evidence_selected";

  return {
    completedAt,
    completedByActor,
    conflictingObservationIds,
    documentedObservationIds: documented.map((decision) => decision.observationId),
    laterObservationIds: later.map((decision) => decision.observationId),
    mappingStatus,
    needsValidationObservationIds,
    noChangesProposed,
    reviewedObservationIds: currentDecisions.map((decision) => decision.observationId),
    selectedObservationIds: selected.map((decision) => decision.observationId),
    stage,
    structuredChangeCount,
    unresolvedBoundaryObservationIds,
    unresolvedMappingCount,
  };
}
