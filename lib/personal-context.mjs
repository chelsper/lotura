export class PersonalContextResolutionError extends Error {
  constructor(message) {
    super(message);
    this.name = "PersonalContextResolutionError";
  }
}

function unique(items, keyOf) {
  const byKey = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()];
}

function connectedPosition(data, summary) {
  if (!summary) return null;
  const position = data.positions.find((item) => item.id === summary.id);
  return {
    ...summary,
    people: position?.assignments.map((item) => item.person) ?? [],
  };
}

export function buildPersonalContext({
  association,
  data,
  explorerData,
  familyIndex = {},
  knowledgeGaps,
  systemStableKeys = {},
}) {
  const person = data.people.find(
    (item) => item.id === association.personStableKey,
  );
  const position = data.positions.find(
    (item) => item.id === association.positionStableKey,
  );

  if (!person || person.status !== "active") {
    throw new PersonalContextResolutionError(
      "The configured pilot Person is not current in this Organization.",
    );
  }
  if (!position || position.status !== "active") {
    throw new PersonalContextResolutionError(
      "The configured pilot Position is not current in this Organization.",
    );
  }
  const assignment = person.assignments.find(
    (item) => item.position.id === position.id,
  );
  if (!assignment) {
    throw new PersonalContextResolutionError(
      "The configured pilot Person and Position do not have a current Position Assignment.",
    );
  }

  const roleById = new Map(
    data.operationalRoles.map((item) => [item.id, item]),
  );
  const coverages = person.coverages.filter(
    (item) => item.position.id === position.id,
  );
  const roles = unique(
    coverages.map((coverage) => {
      const role = roleById.get(coverage.role.id);
      return {
        coverageType: coverage.type,
        coverageTypeLabel: coverage.typeLabel,
        effectiveFrom: coverage.effectiveFrom,
        effectiveUntil: coverage.effectiveUntil,
        id: coverage.role.id,
        mandateType: coverage.mandateType,
        mandateTypeLabel: coverage.mandateTypeLabel,
        name: coverage.role.name,
        processes: coverage.processes,
        scope: coverage.scope,
        stableKey: role?.stableKey ?? null,
      };
    }),
    (item) => item.id,
  );

  const relationshipByProcess = new Map();
  for (const role of roles) {
    for (const process of role.processes) {
      const existing = relationshipByProcess.get(process.id) ?? new Set();
      for (const relationship of process.relationships) {
        existing.add(relationship);
      }
      relationshipByProcess.set(process.id, existing);
    }
  }

  const explorerProcessById = new Map(
    explorerData.processes.map((item) => [item.id, item]),
  );
  const processes = [...relationshipByProcess.entries()]
    .map(([processId, relationships]) => {
      const process = explorerProcessById.get(processId);
      if (!process) {
        throw new PersonalContextResolutionError(
          "A covered Operational Role references a Process outside the current projection.",
        );
      }
      return {
        dependencies: [
          ...process.upstream.map((item) => ({ ...item, direction: "incoming" })),
          ...process.downstream.map((item) => ({ ...item, direction: "outgoing" })),
        ],
        families: familyIndex[process.id] ?? [],
        id: process.id,
        name: process.name,
        purpose: process.purpose,
        relationships: [...relationships].sort(),
        status: process.status,
        systems: process.systems.map((system) => ({
          ...system,
          stableKey: systemStableKeys[system.id] ?? null,
        })),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const ownedProcesses = processes.filter((item) =>
    item.relationships.includes("Owns Process"),
  );
  const participatedProcesses = processes.filter(
    (item) => !item.relationships.includes("Owns Process"),
  );
  const systems = unique(
    processes.flatMap((process) =>
      process.systems.map((system) => ({
        ...system,
        processId: process.id,
        processName: process.name,
      })),
    ),
    (item) => item.id,
  ).sort((left, right) => left.name.localeCompare(right.name));

  const unit = position.unit
    ? data.units.find((item) => item.id === position.unit.id) ?? null
    : null;
  const manager = connectedPosition(data, position.primaryManager?.position);
  const directReports = position.directReports.map((item) => ({
    ...connectedPosition(data, item.position),
    isCrossUnit: item.isCrossUnit,
  }));
  const connectedUnits = unique(
    [
      unit
        ? { id: unit.id, name: unit.name, relationship: "Your Unit" }
        : null,
      manager?.unit
        ? {
            id: manager.unit.id,
            name: manager.unit.name,
            relationship: "Manager Position Unit",
          }
        : null,
      ...directReports.map((report) =>
        report.unit
          ? {
              id: report.unit.id,
              name: report.unit.name,
              relationship: "Direct-report Position Unit",
            }
          : null,
      ),
    ].filter(Boolean),
    (item) => item.id,
  );

  const relevantProcessIds = new Set([
    ...processes.map((item) => item.id),
    ...position.processes.map((item) => item.id),
  ]);
  const relevantMandateIds = new Set(position.mandates.map((item) => item.id));
  const unresolved = knowledgeGaps.items.filter(
    (item) =>
      (item.processKey && relevantProcessIds.has(item.processKey)) ||
      (item.sourceType === "role_mandate" &&
        relevantMandateIds.has(item.sourceStableKey)),
  );

  return {
    applicationIdentity: association.applicationIdentity,
    assignment: {
      effectiveFrom: assignment.effectiveFrom,
      effectiveUntil: assignment.effectiveUntil,
      type: assignment.type,
      typeLabel: assignment.typeLabel,
    },
    connectedUnits,
    directReports,
    manager,
    ownedProcesses,
    participatedProcesses,
    person: {
      id: person.id,
      name: person.name,
    },
    position: {
      id: position.id,
      title: position.title,
    },
    roles,
    systems,
    unit: unit
      ? {
          children: unit.children,
          id: unit.id,
          name: unit.name,
          parent: unit.parent,
        }
      : null,
    unresolved,
  };
}
