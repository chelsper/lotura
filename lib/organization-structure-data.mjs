const ASSIGNMENT_TYPES = new Set([
  "incumbent",
  "job_share",
  "interim",
  "acting",
  "backup",
]);

function timestamp(value, label) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Invalid ${label} timestamp.`);
  }
  return parsed;
}

function isCurrentEffective(record, asOf) {
  if (record.status !== "active") return false;
  const from = timestamp(record.effectiveFrom, "effective-from");
  const until = record.effectiveUntil
    ? timestamp(record.effectiveUntil, "effective-until")
    : null;
  return from <= asOf && (!until || asOf < until);
}

function required(map, key, label) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Invalid Organization Structure data: ${label} '${key}' is missing.`);
  }
  return value;
}

function uniqueMap(items, keyOf, label) {
  const map = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!key || map.has(key)) {
      throw new Error(`Invalid Organization Structure data: duplicate or missing ${label} '${key ?? ""}'.`);
    }
    map.set(key, item);
  }
  return map;
}

function revision(record, fallback) {
  return timestamp(record.updatedAt ?? fallback, "record revision").toISOString();
}

function unitSummary(unit, fallback) {
  return unit
    ? {
        id: unit.stableKey,
        name: unit.name,
        isProvisional: unit.isProvisional,
        status: unit.status,
        revision: revision(unit, fallback),
      }
    : null;
}

function personSummary(person, fallback) {
  return {
    id: person.stableKey,
    name: person.displayName,
    status: person.status,
    revision: revision(person, fallback),
  };
}

function positionSummary(position, unit, occupancy, fallback) {
  return {
    id: position.stableKey,
    title: position.title,
    status: position.status,
    unit: unitSummary(unit, fallback),
    occupancy,
    revision: revision(position, fallback),
  };
}

function effectivePeriod(record) {
  return {
    effectiveFrom: timestamp(record.effectiveFrom, "effective-from").toISOString(),
    effectiveUntil: record.effectiveUntil
      ? timestamp(record.effectiveUntil, "effective-until").toISOString()
      : null,
  };
}

function assignmentLabel(type) {
  return {
    incumbent: "Incumbent",
    job_share: "Job share",
    interim: "Interim",
    acting: "Acting",
    backup: "Backup",
  }[type];
}

function coverageLabel(type) {
  return {
    permanent: "Permanent",
    interim: "Interim",
    acting: "Acting",
    delegated: "Delegated",
    backup: "Backup",
  }[type];
}

function relationshipLabel(type) {
  return {
    primary: "Primary reporting",
    dotted_line: "Dotted-line reporting",
    functional: "Functional reporting",
  }[type];
}

function mandateLabel(type) {
  return type === "primary" ? "Primary mandate" : "Shared mandate";
}

function occupancyFor(positionAssignments, vacancyEvidenceComplete) {
  const permanent = positionAssignments.filter((assignment) =>
    ["incumbent", "job_share"].includes(assignment.assignmentType),
  );
  const temporary = positionAssignments.filter((assignment) =>
    ["interim", "acting"].includes(assignment.assignmentType),
  );
  const backups = positionAssignments.filter(
    (assignment) => assignment.assignmentType === "backup",
  );

  if (permanent.length > 0 && temporary.length > 0) {
    return {
      id: "occupied_with_temporary_coverage",
      label: "Occupied with temporary coverage",
      tone: "info",
    };
  }
  if (permanent.length > 0) {
    return { id: "occupied", label: "Occupied", tone: "success" };
  }
  if (temporary.length > 0) {
    return {
      id: "temporarily_covered",
      label: "Temporarily covered",
      tone: "warning",
    };
  }
  if (vacancyEvidenceComplete) {
    return {
      id: "vacant",
      label: backups.length > 0 ? "Vacant — backup recorded" : "Vacant",
      tone: "warning",
    };
  }
  return {
    id: "not_established",
    label: "Occupancy not established",
    tone: "neutral",
  };
}

function uniqueById(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function sorted(items, selector) {
  return [...items].sort((left, right) =>
    selector(left).localeCompare(selector(right), undefined, {
      sensitivity: "base",
    }),
  );
}

export function buildOrganizationStructureData(
  structure,
  operatingModel,
  asOfValue = new Date().toISOString(),
) {
  const asOfDate = timestamp(asOfValue, "as-of");
  const asOf = asOfDate.toISOString();
  const revisionFallback = structure.snapshot.importedAt;

  if (structure.organization?.name !== operatingModel.organization?.name) {
    throw new Error(
      "Invalid Organization Structure data: structure and operating model Organizations do not match.",
    );
  }

  const peopleByKey = uniqueMap(
    structure.people,
    (item) => item.stableKey,
    "Person stable key",
  );
  const unitsByKey = uniqueMap(
    structure.organizationUnits,
    (item) => item.stableKey,
    "Organization Unit stable key",
  );
  const positionsByKey = uniqueMap(
    structure.positions,
    (item) => item.stableKey,
    "Position stable key",
  );
  const assignmentsByKey = uniqueMap(
    structure.positionAssignments,
    (item) => item.key,
    "Position Assignment key",
  );
  const reportingByKey = uniqueMap(
    structure.positionReportingRelationships,
    (item) => item.key,
    "reporting relationship key",
  );
  const mandatesByKey = uniqueMap(
    structure.roleMandates,
    (item) => item.key,
    "Role Mandate key",
  );
  const coveragesByKey = uniqueMap(
    structure.roleCoverages,
    (item) => item.key,
    "Role Coverage key",
  );
  const rolesByKey = uniqueMap(
    operatingModel.roles,
    (item) => item.key,
    "Operational Role key",
  );
  const processesByKey = uniqueMap(
    operatingModel.processes,
    (item) => item.key,
    "Process key",
  );
  const systemsByKey = uniqueMap(
    operatingModel.systems,
    (item) => item.key,
    "System key",
  );

  for (const unit of structure.organizationUnits) {
    if (unit.parentOrganizationUnitKey) {
      required(unitsByKey, unit.parentOrganizationUnitKey, "parent Unit");
    }
  }
  for (const position of structure.positions) {
    if (position.organizationUnitKey) {
      required(unitsByKey, position.organizationUnitKey, "Position Unit");
    }
  }
  for (const assignment of assignmentsByKey.values()) {
    required(positionsByKey, assignment.positionKey, "assigned Position");
    required(peopleByKey, assignment.personKey, "assigned Person");
    if (!ASSIGNMENT_TYPES.has(assignment.assignmentType)) {
      throw new Error(
        `Invalid Organization Structure data: unsupported assignment type '${assignment.assignmentType}'.`,
      );
    }
  }
  for (const relationship of reportingByKey.values()) {
    required(
      positionsByKey,
      relationship.subordinatePositionKey,
      "subordinate Position",
    );
    required(
      positionsByKey,
      relationship.managerPositionKey,
      "manager Position",
    );
  }
  for (const mandate of mandatesByKey.values()) {
    required(positionsByKey, mandate.positionKey, "mandated Position");
    required(rolesByKey, mandate.roleKey, "mandated Operational Role");
  }
  for (const coverage of coveragesByKey.values()) {
    required(mandatesByKey, coverage.roleMandateKey, "covered Role Mandate");
    required(peopleByKey, coverage.personKey, "covering Person");
  }

  const currentPeople = structure.people.filter((item) => item.status === "active");
  const currentUnits = structure.organizationUnits.filter((item) =>
    isCurrentEffective(item, asOfDate),
  );
  const currentPositions = structure.positions.filter((item) =>
    isCurrentEffective(item, asOfDate),
  );
  const currentAssignments = structure.positionAssignments.filter((item) =>
    isCurrentEffective(item, asOfDate),
  );
  const currentReporting = structure.positionReportingRelationships.filter(
    (item) => isCurrentEffective(item, asOfDate),
  );
  const currentMandates = structure.roleMandates.filter((item) =>
    isCurrentEffective(item, asOfDate),
  );
  const currentCoverages = structure.roleCoverages.filter((item) =>
    isCurrentEffective(item, asOfDate),
  );

  const currentUnitKeys = new Set(currentUnits.map((item) => item.stableKey));
  const currentPositionKeys = new Set(
    currentPositions.map((item) => item.stableKey),
  );
  const currentPersonKeys = new Set(
    currentPeople.map((item) => item.stableKey),
  );

  const assignmentsByPosition = new Map();
  const assignmentsByPerson = new Map();
  for (const assignment of currentAssignments) {
    if (
      !currentPositionKeys.has(assignment.positionKey) ||
      !currentPersonKeys.has(assignment.personKey)
    ) {
      continue;
    }
    assignmentsByPosition.set(assignment.positionKey, [
      ...(assignmentsByPosition.get(assignment.positionKey) ?? []),
      assignment,
    ]);
    assignmentsByPerson.set(assignment.personKey, [
      ...(assignmentsByPerson.get(assignment.personKey) ?? []),
      assignment,
    ]);
  }

  const vacancyEvidenceComplete = Boolean(
    structure.snapshot.vacancyEvidenceComplete,
  );
  const occupancyByPosition = new Map(
    currentPositions.map((position) => [
      position.stableKey,
      occupancyFor(
        assignmentsByPosition.get(position.stableKey) ?? [],
        vacancyEvidenceComplete && position.vacancyEvidenceSupported !== false,
      ),
    ]),
  );

  const primaryManagerByPosition = new Map();
  const primaryReportsByPosition = new Map();
  const additionalManagersByPosition = new Map();
  const additionalReportsByPosition = new Map();
  for (const relationship of currentReporting) {
    if (
      !currentPositionKeys.has(relationship.subordinatePositionKey) ||
      !currentPositionKeys.has(relationship.managerPositionKey)
    ) {
      continue;
    }
    if (relationship.relationshipType === "primary") {
      primaryManagerByPosition.set(
        relationship.subordinatePositionKey,
        relationship,
      );
      primaryReportsByPosition.set(relationship.managerPositionKey, [
        ...(primaryReportsByPosition.get(relationship.managerPositionKey) ?? []),
        relationship,
      ]);
    } else {
      additionalManagersByPosition.set(relationship.subordinatePositionKey, [
        ...(additionalManagersByPosition.get(relationship.subordinatePositionKey) ?? []),
        relationship,
      ]);
      additionalReportsByPosition.set(relationship.managerPositionKey, [
        ...(additionalReportsByPosition.get(relationship.managerPositionKey) ?? []),
        relationship,
      ]);
    }
  }

  const processFactsByRole = new Map();
  function addProcessFact(roleKey, processKey, fact) {
    if (!roleKey) return;
    required(rolesByKey, roleKey, "Process Operational Role");
    required(processesByKey, processKey, "Role Process");
    const processes = processFactsByRole.get(roleKey) ?? new Map();
    const facts = processes.get(processKey) ?? new Set();
    facts.add(fact);
    processes.set(processKey, facts);
    processFactsByRole.set(roleKey, processes);
  }
  for (const process of operatingModel.processes) {
    addProcessFact(process.ownerRoleKey, process.key, "Owns Process");
  }
  for (const step of operatingModel.processSteps) {
    addProcessFact(step.responsibleRoleKey, step.processKey, "Responsible for Step");
  }
  for (const exception of operatingModel.exceptions) {
    addProcessFact(exception.ownerRoleKey, exception.processKey, "Owns Exception");
  }

  const systemsByProcess = new Map();
  for (const link of operatingModel.processSystems) {
    const system = required(systemsByKey, link.systemKey, "Process System");
    required(processesByKey, link.processKey, "System Process");
    systemsByProcess.set(link.processKey, [
      ...(systemsByProcess.get(link.processKey) ?? []),
      { id: system.key, name: system.name, usage: link.usage },
    ]);
  }

  function processReachForRole(roleKey) {
    const facts = processFactsByRole.get(roleKey) ?? new Map();
    return sorted(
      [...facts.entries()].map(([processKey, relationships]) => {
        const process = required(processesByKey, processKey, "Process reach");
        return {
          id: process.key,
          name: process.name,
          status: process.status,
          relationships: [...relationships].sort(),
          systems: sorted(systemsByProcess.get(process.key) ?? [], (item) => item.name),
        };
      }),
      (item) => item.name,
    );
  }

  const mandatesByPosition = new Map();
  for (const mandate of currentMandates) {
    if (!currentPositionKeys.has(mandate.positionKey)) continue;
    mandatesByPosition.set(mandate.positionKey, [
      ...(mandatesByPosition.get(mandate.positionKey) ?? []),
      mandate,
    ]);
  }
  const coveragesByMandate = new Map();
  const coveragesByPerson = new Map();
  for (const coverage of currentCoverages) {
    const mandate = required(
      mandatesByKey,
      coverage.roleMandateKey,
      "covered Role Mandate",
    );
    if (
      !currentPositionKeys.has(mandate.positionKey) ||
      !currentPersonKeys.has(coverage.personKey)
    ) {
      continue;
    }
    coveragesByMandate.set(coverage.roleMandateKey, [
      ...(coveragesByMandate.get(coverage.roleMandateKey) ?? []),
      coverage,
    ]);
    coveragesByPerson.set(coverage.personKey, [
      ...(coveragesByPerson.get(coverage.personKey) ?? []),
      coverage,
    ]);
  }

  function basePosition(positionKey) {
    const position = required(positionsByKey, positionKey, "Position");
    const unit = position.organizationUnitKey
      ? unitsByKey.get(position.organizationUnitKey)
      : null;
    return positionSummary(
      position,
      unit && currentUnitKeys.has(unit.stableKey) ? unit : null,
      occupancyByPosition.get(position.stableKey),
      revisionFallback,
    );
  }

  function assignmentView(assignment) {
    const person = required(peopleByKey, assignment.personKey, "assigned Person");
    return {
      id: assignment.key,
      type: assignment.assignmentType,
      typeLabel: assignmentLabel(assignment.assignmentType),
      person: personSummary(person, revisionFallback),
      reason: assignment.reason ?? null,
      revision: revision(assignment, revisionFallback),
      ...effectivePeriod(assignment),
    };
  }

  function relationshipView(relationship, direction) {
    const otherKey =
      direction === "manager"
        ? relationship.managerPositionKey
        : relationship.subordinatePositionKey;
    const other = basePosition(otherKey);
    return {
      id: relationship.key,
      type: relationship.relationshipType,
      typeLabel: relationshipLabel(relationship.relationshipType),
      position: other,
      reason: relationship.reason ?? null,
      revision: revision(relationship, revisionFallback),
      isCrossUnit: false,
      ...effectivePeriod(relationship),
    };
  }

  function managerChain(positionKey) {
    const chain = [];
    const visited = new Set([positionKey]);
    let cursor = positionKey;
    for (let depth = 0; depth < 50; depth += 1) {
      const relationship = primaryManagerByPosition.get(cursor);
      if (!relationship) break;
      const managerKey = relationship.managerPositionKey;
      if (visited.has(managerKey)) break;
      visited.add(managerKey);
      chain.unshift(basePosition(managerKey));
      cursor = managerKey;
    }
    return chain;
  }

  function mandateView(mandate) {
    const role = required(rolesByKey, mandate.roleKey, "mandated Operational Role");
    const processes = processReachForRole(role.key);
    const coverage = sorted(
      (coveragesByMandate.get(mandate.key) ?? []).map((item) => {
        const person = required(peopleByKey, item.personKey, "covering Person");
        return {
          id: item.key,
          type: item.coverageType,
          typeLabel: coverageLabel(item.coverageType),
          person: personSummary(person, revisionFallback),
          reason: item.reason ?? null,
          revision: revision(item, revisionFallback),
          ...effectivePeriod(item),
        };
      }),
      (item) => item.person.name,
    );
    return {
      id: mandate.key,
      type: mandate.mandateType,
      typeLabel: mandateLabel(mandate.mandateType),
      scope: mandate.scope ?? null,
      reason: mandate.reason ?? null,
      revision: revision(mandate, revisionFallback),
      role: {
        id: role.key,
        stableKey: role.stableKey ?? null,
        name: role.name,
        status: role.status,
      },
      coverage,
      processes,
      systems: uniqueById(processes.flatMap((process) => process.systems)),
      ...effectivePeriod(mandate),
    };
  }

  const positions = sorted(
    currentPositions.map((position) => {
      const unit = position.organizationUnitKey
        ? unitsByKey.get(position.organizationUnitKey)
        : null;
      const assignments = sorted(
        (assignmentsByPosition.get(position.stableKey) ?? []).map(assignmentView),
        (item) => `${item.typeLabel}:${item.person.name}`,
      );
      const mandates = sorted(
        (mandatesByPosition.get(position.stableKey) ?? []).map(mandateView),
        (item) => item.role.name,
      );
      const primaryManagerRelationship = primaryManagerByPosition.get(
        position.stableKey,
      );
      const primaryManager = primaryManagerRelationship
        ? relationshipView(primaryManagerRelationship, "manager")
        : null;
      const directReports = sorted(
        (primaryReportsByPosition.get(position.stableKey) ?? []).map((item) =>
          relationshipView(item, "report"),
        ),
        (item) => item.position.title,
      );
      const additionalManagers = sorted(
        (additionalManagersByPosition.get(position.stableKey) ?? []).map((item) =>
          relationshipView(item, "manager"),
        ),
        (item) => item.position.title,
      );
      const additionalReports = sorted(
        (additionalReportsByPosition.get(position.stableKey) ?? []).map((item) =>
          relationshipView(item, "report"),
        ),
        (item) => item.position.title,
      );
      const ownUnitId = unit?.stableKey ?? null;
      for (const relation of [
        ...(primaryManager ? [primaryManager] : []),
        ...directReports,
        ...additionalManagers,
        ...additionalReports,
      ]) {
        relation.isCrossUnit =
          Boolean(ownUnitId || relation.position.unit?.id) &&
          ownUnitId !== (relation.position.unit?.id ?? null);
      }

      let peers = [];
      if (primaryManagerRelationship) {
        peers = sorted(
          (primaryReportsByPosition.get(
            primaryManagerRelationship.managerPositionKey,
          ) ?? [])
            .filter((item) => item.subordinatePositionKey !== position.stableKey)
            .map((item) => basePosition(item.subordinatePositionKey)),
          (item) => item.title,
        );
      }

      const processes = uniqueById(mandates.flatMap((item) => item.processes));
      return {
        id: position.stableKey,
        title: position.title,
        status: position.status,
        statusReason: position.statusReason ?? null,
        unit: unitSummary(
          unit && currentUnitKeys.has(unit.stableKey) ? unit : null,
          revisionFallback,
        ),
        occupancy: occupancyByPosition.get(position.stableKey),
        assignments,
        primaryManager,
        directReports,
        additionalManagers,
        additionalReports,
        peers,
        managerChain: managerChain(position.stableKey),
        mandates,
        processes,
        systems: uniqueById(processes.flatMap((process) => process.systems)),
        revision: revision(position, revisionFallback),
        ...effectivePeriod(position),
      };
    }),
    (item) => item.title,
  );
  const projectedPositionsByKey = new Map(
    positions.map((item) => [item.id, item]),
  );

  const people = sorted(
    currentPeople.map((person) => {
      const assignments = sorted(
        (assignmentsByPerson.get(person.stableKey) ?? []).map((assignment) => ({
          id: assignment.key,
          type: assignment.assignmentType,
          typeLabel: assignmentLabel(assignment.assignmentType),
          position: basePosition(assignment.positionKey),
          reason: assignment.reason ?? null,
          revision: revision(assignment, revisionFallback),
          ...effectivePeriod(assignment),
        })),
        (item) => item.position.title,
      );
      const coverages = sorted(
        (coveragesByPerson.get(person.stableKey) ?? []).map((coverage) => {
          const mandate = required(
            mandatesByKey,
            coverage.roleMandateKey,
            "covered Role Mandate",
          );
          const role = required(rolesByKey, mandate.roleKey, "covered Role");
          return {
            id: coverage.key,
            type: coverage.coverageType,
            typeLabel: coverageLabel(coverage.coverageType),
            mandateType: mandate.mandateType,
            mandateTypeLabel: mandateLabel(mandate.mandateType),
            scope: mandate.scope ?? null,
            role: { id: role.key, name: role.name },
            position: basePosition(mandate.positionKey),
            reason: coverage.reason ?? null,
            processes: processReachForRole(role.key),
            ...effectivePeriod(coverage),
          };
        }),
        (item) => item.role.name,
      );
      const reportingContexts = assignments.map((assignment) => {
        const position = projectedPositionsByKey.get(assignment.position.id);
        return {
          position: assignment.position,
          primaryManager: position?.primaryManager ?? null,
          directReports: position?.directReports ?? [],
        };
      });
      return {
        id: person.stableKey,
        name: person.displayName,
        status: person.status,
        revision: revision(person, revisionFallback),
        assignments,
        coverages,
        reportingContexts,
        processes: uniqueById(coverages.flatMap((item) => item.processes)),
      };
    }),
    (item) => item.name,
  );

  const units = sorted(
    currentUnits.map((unit) => {
      const unitPositions = positions.filter(
        (position) => position.unit?.id === unit.stableKey,
      );
      const relationships = currentReporting
        .map((relationship) => {
          const subordinate = projectedPositionsByKey.get(
            relationship.subordinatePositionKey,
          );
          const manager = projectedPositionsByKey.get(
            relationship.managerPositionKey,
          );
          if (!subordinate || !manager) return null;
          const subordinateInUnit = subordinate.unit?.id === unit.stableKey;
          const managerInUnit = manager.unit?.id === unit.stableKey;
          if (subordinateInUnit === managerInUnit) return null;
          return {
            id: relationship.key,
            type: relationship.relationshipType,
            typeLabel: relationshipLabel(relationship.relationshipType),
            subordinate: basePosition(relationship.subordinatePositionKey),
            manager: basePosition(relationship.managerPositionKey),
          };
        })
        .filter(Boolean);
      const mandates = unitPositions.flatMap((position) => position.mandates);
      return {
        id: unit.stableKey,
        name: unit.name,
        isProvisional: unit.isProvisional,
        status: unit.status,
        statusReason: unit.statusReason ?? null,
        parent: unit.parentOrganizationUnitKey
          ? unitSummary(
              unitsByKey.get(unit.parentOrganizationUnitKey),
              revisionFallback,
            )
          : null,
        children: sorted(
          currentUnits
            .filter(
              (candidate) =>
                candidate.parentOrganizationUnitKey === unit.stableKey,
            )
            .map((item) => unitSummary(item, revisionFallback)),
          (item) => item.name,
        ),
        positions: unitPositions,
        crossUnitRelationships: relationships,
        roles: uniqueById(
          mandates.map((mandate) => ({
            ...mandate.role,
            mandateType: mandate.type,
            mandateTypeLabel: mandate.typeLabel,
            scope: mandate.scope,
          })),
        ),
        processes: uniqueById(
          unitPositions.flatMap((position) => position.processes),
        ),
        revision: revision(unit, revisionFallback),
        ...effectivePeriod(unit),
      };
    }),
    (item) => item.name,
  );

  const currentMandateRoleKeys = new Set(currentMandates.map((item) => item.roleKey));
  const mandatesWithoutCoverage = currentMandates.filter(
    (item) => (coveragesByMandate.get(item.key) ?? []).length === 0,
  );

  return {
    organization: { name: structure.organization.name },
    asOf,
    operationalRoles: sorted(
      operatingModel.roles.map((item) => {
        const processes = processReachForRole(item.key);
        return {
          id: item.key,
          stableKey: item.stableKey ?? null,
          name: item.name,
          description: item.description ?? null,
          status: item.status,
          revision: item.updatedAt ?? null,
          processes,
          systems: uniqueById(processes.flatMap((process) => process.systems)),
        };
      }),
      (item) => item.name,
    ),
    snapshot: {
      id: structure.snapshot.stableKey,
      sourceAsOf: timestamp(
        structure.snapshot.sourceAsOf,
        "structure source-as-of",
      ).toISOString(),
      importedAt: timestamp(
        structure.snapshot.importedAt,
        "structure imported-at",
      ).toISOString(),
      currentForPilotUseAt: structure.snapshot.currentForPilotUseAt
        ? timestamp(
            structure.snapshot.currentForPilotUseAt,
            "current workspace basis",
          ).toISOString()
        : null,
      isPartial: Boolean(structure.snapshot.isPartial),
      vacancyEvidenceComplete,
      basisLabel: structure.snapshot.isPartial
        ? "Partial reviewed structure"
        : "Full reviewed import basis",
    },
    units,
    positions,
    people,
    gaps: {
      provisionalUnits: units.filter((item) => item.isProvisional).length,
      positionsWithoutUnit: positions.filter((item) => !item.unit).length,
      occupancyNotEstablished: positions.filter(
        (item) => item.occupancy.id === "not_established",
      ).length,
      confirmedVacancies: positions.filter(
        (item) => item.occupancy.id === "vacant",
      ).length,
      rolesWithoutMandates: operatingModel.roles.filter(
        (item) => item.status === "active" && !currentMandateRoleKeys.has(item.key),
      ).length,
      mandatesWithoutCoverage: mandatesWithoutCoverage.length,
    },
  };
}

function databaseKey(prefix, value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`Invalid ${prefix} database identifier.`);
  }
  return `${prefix}:${value}`;
}

function optionalIso(value) {
  return value ? timestamp(value, "database record").toISOString() : undefined;
}

export function mapNeonOrganizationStructure(rows) {
  if (rows.organizations.length !== 1) {
    throw new Error("The configured organization was not found in Neon.");
  }
  if (rows.imports.length !== 1) {
    throw new Error(
      "The configured organization does not have one current structure basis.",
    );
  }

  const organization = rows.organizations[0];
  const imported = rows.imports[0];
  const unitKeys = new Map(
    rows.organizationUnits.map((item) => [item.id, item.stableKey]),
  );
  const positionKeys = new Map(
    rows.positions.map((item) => [item.id, item.stableKey]),
  );
  const personKeys = new Map(
    rows.people.map((item) => [item.id, item.stableKey]),
  );
  const mandateKeys = new Map(
    rows.roleMandates.map((item) => [
      item.id,
      databaseKey("role-mandate", item.id),
    ]),
  );

  function mappedKey(map, id, label) {
    const value = map.get(id);
    if (!value) throw new Error(`Invalid ${label} database relationship.`);
    return value;
  }

  return {
    asOf: timestamp(rows.asOf, "database as-of").toISOString(),
    structure: {
      organization: { name: organization.name },
      snapshot: {
        stableKey: imported.stableKey,
        sourceAsOf: timestamp(imported.sourceAsOf, "source-as-of").toISOString(),
        isPartial: imported.isPartial,
        vacancyEvidenceComplete: imported.vacancyEvidenceComplete,
        approvedForImportAt: timestamp(
          imported.approvedForImportAt,
          "approved-for-import",
        ).toISOString(),
        importedAt: timestamp(imported.importedAt, "imported-at").toISOString(),
        currentForPilotUseAt: optionalIso(imported.currentForPilotUseAt),
      },
      people: rows.people.map((item) => ({
        stableKey: item.stableKey,
        displayName: item.displayName,
        status: item.status,
        updatedAt: timestamp(
          item.updatedAt ?? imported.importedAt,
          "Person updated-at",
        ).toISOString(),
      })),
      organizationUnits: rows.organizationUnits.map((item) => ({
        stableKey: item.stableKey,
        name: item.name,
        parentOrganizationUnitKey: item.parentOrganizationUnitId
          ? mappedKey(
              unitKeys,
              item.parentOrganizationUnitId,
              "parent Organization Unit",
            )
          : undefined,
        isProvisional: item.isProvisional,
        status: item.status,
        statusReason: item.statusReason ?? undefined,
        effectiveFrom: timestamp(item.effectiveFrom, "Unit effective-from").toISOString(),
        effectiveUntil: optionalIso(item.effectiveUntil),
        updatedAt: timestamp(
          item.updatedAt ?? imported.importedAt,
          "Unit updated-at",
        ).toISOString(),
      })),
      positions: rows.positions.map((item) => ({
        stableKey: item.stableKey,
        organizationUnitKey: item.organizationUnitId
          ? mappedKey(unitKeys, item.organizationUnitId, "Position Unit")
          : undefined,
        title: item.title,
        status: item.status,
        statusReason: item.statusReason ?? undefined,
        effectiveFrom: timestamp(
          item.effectiveFrom,
          "Position effective-from",
        ).toISOString(),
        effectiveUntil: optionalIso(item.effectiveUntil),
        vacancyEvidenceSupported:
          item.introducedByImportId === undefined
            ? true
            : item.introducedByImportId === imported.id,
        updatedAt: timestamp(
          item.updatedAt ?? imported.importedAt,
          "Position updated-at",
        ).toISOString(),
      })),
      positionAssignments: rows.positionAssignments.map((item) => ({
        key: databaseKey("position-assignment", item.id),
        positionKey: mappedKey(positionKeys, item.positionId, "assigned Position"),
        personKey: mappedKey(personKeys, item.personId, "assigned Person"),
        assignmentType: item.assignmentType,
        status: item.status,
        effectiveFrom: timestamp(
          item.effectiveFrom,
          "Position Assignment effective-from",
        ).toISOString(),
        effectiveUntil: optionalIso(item.effectiveUntil),
        reason: item.reason ?? undefined,
        updatedAt: timestamp(
          item.updatedAt ?? imported.importedAt,
          "Position Assignment updated-at",
        ).toISOString(),
      })),
      positionReportingRelationships: rows.positionReportingRelationships.map(
        (item) => ({
          key: databaseKey("position-reporting", item.id),
          subordinatePositionKey: mappedKey(
            positionKeys,
            item.subordinatePositionId,
            "subordinate Position",
          ),
          managerPositionKey: mappedKey(
            positionKeys,
            item.managerPositionId,
            "manager Position",
          ),
          relationshipType: item.relationshipType,
          status: item.status,
          effectiveFrom: timestamp(
            item.effectiveFrom,
            "reporting effective-from",
          ).toISOString(),
          effectiveUntil: optionalIso(item.effectiveUntil),
          reason: item.reason ?? undefined,
          updatedAt: timestamp(
            item.updatedAt ?? imported.importedAt,
            "reporting updated-at",
          ).toISOString(),
        }),
      ),
      roleMandates: rows.roleMandates.map((item) => ({
        key: databaseKey("role-mandate", item.id),
        positionKey: mappedKey(positionKeys, item.positionId, "mandated Position"),
        roleKey: databaseKey("role", item.roleId),
        mandateType: item.mandateType,
        scope: item.scope ?? undefined,
        status: item.status,
        effectiveFrom: timestamp(
          item.effectiveFrom,
          "Role Mandate effective-from",
        ).toISOString(),
        effectiveUntil: optionalIso(item.effectiveUntil),
        reason: item.reason ?? undefined,
        updatedAt: timestamp(
          item.updatedAt ?? imported.importedAt,
          "Role Mandate updated-at",
        ).toISOString(),
      })),
      roleCoverages: rows.roleCoverages.map((item) => ({
        key: databaseKey("role-coverage", item.id),
        roleMandateKey: mappedKey(
          mandateKeys,
          item.roleMandateId,
          "covered Role Mandate",
        ),
        personKey: mappedKey(personKeys, item.personId, "covering Person"),
        coverageType: item.coverageType,
        status: item.status,
        effectiveFrom: timestamp(
          item.effectiveFrom,
          "Role Coverage effective-from",
        ).toISOString(),
        effectiveUntil: optionalIso(item.effectiveUntil),
        reason: item.reason ?? undefined,
        updatedAt: timestamp(
          item.updatedAt ?? imported.importedAt,
          "Role Coverage updated-at",
        ).toISOString(),
      })),
    },
  };
}
