export const DISCOVERY_MAPPING_ACTIONS = [
  "update_process_purpose",
  "change_process_owner",
  "add_process_step",
  "revise_process_step",
  "change_step_responsibility",
  "link_existing_system",
  "add_process_exception",
  "revise_process_exception",
  "add_process_dependency",
  "preserve_unresolved",
];

export const DISCOVERY_MAPPING_ACTION_LABELS = {
  add_process_dependency: "Propose a Process dependency",
  add_process_exception: "Propose a new Exception",
  add_process_step: "Propose a new Step",
  change_process_owner: "Propose an Owner Role change",
  change_step_responsibility: "Propose a Step responsibility change",
  link_existing_system: "Propose linking an existing System",
  preserve_unresolved: "Keep this as an unresolved question",
  revise_process_exception: "Propose revising an Exception",
  revise_process_step: "Propose revising a Step",
  update_process_purpose: "Propose a purpose update",
};

export function currentDiscoveryMappingItems(items) {
  const current = new Map();
  for (const item of [...items].sort(
    (left, right) => left.itemSequence - right.itemSequence,
  )) {
    current.set(item.itemId, item);
  }
  return current;
}

export function discoveryMappingReadiness(includedObservationIds, items) {
  const current = [...currentDiscoveryMappingItems(items).values()];
  const active = current.filter((item) => item.state === "active");
  const covered = new Set(
    active.flatMap((item) => item.sourceObservationIds),
  );
  const uncoveredObservationIds = includedObservationIds.filter(
    (observationId) => !covered.has(observationId),
  );
  return {
    activeItems: active.length,
    canFinish: active.length > 0 && uncoveredObservationIds.length === 0,
    proposedChanges: active.filter(
      (item) => item.action !== "preserve_unresolved",
    ).length,
    unresolved: active.filter(
      (item) => item.action === "preserve_unresolved",
    ).length,
    uncoveredObservationIds,
    withdrawnItems: current.length - active.length,
  };
}
