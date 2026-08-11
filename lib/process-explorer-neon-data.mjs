function key(prefix, id) {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(`Invalid ${prefix} database identifier.`);
  }
  return `${prefix}:${id}`;
}

function isoTimestamp(value, label) {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error(`Invalid ${label} timestamp from Neon.`);
  }
  return timestamp.toISOString();
}

export function mapNeonOperatingModel(rows) {
  if (rows.organizations.length !== 1) {
    throw new Error("The configured organization was not found in Neon.");
  }

  const organization = rows.organizations[0];

  return {
    asOf: isoTimestamp(rows.asOf, "as-of"),
    seed: {
      organization: { name: organization.name },
      users: rows.users.map((item) => ({
        key: key("user", item.id),
        email: item.email,
        displayName: item.displayName,
      })),
      memberships: rows.memberships.map((item) => ({
        key: key("membership", item.id),
        userKey: key("user", item.userId),
        accessLevel: item.accessLevel,
        status: item.status,
      })),
      roles: rows.roles.map((item) => ({
        key: key("role", item.id),
        name: item.name,
        description: item.description ?? undefined,
        status: item.status,
      })),
      roleAssignments: rows.roleAssignments.map((item) => ({
        roleKey: key("role", item.roleId),
        membershipKey: key("membership", item.membershipId),
        assignmentType: item.assignmentType,
        status: item.status,
        effectiveFrom: isoTimestamp(item.effectiveFrom, "effective-from"),
        effectiveUntil: item.effectiveUntil
          ? isoTimestamp(item.effectiveUntil, "effective-until")
          : undefined,
        reason: item.reason ?? undefined,
      })),
      people: rows.people.map((item) => ({
        key: key("person", item.id),
        displayName: item.displayName,
        status: item.status,
      })),
      roleMandates: rows.roleMandates.map((item) => ({
        key: key("mandate", item.id),
        roleKey: key("role", item.roleId),
        mandateType: item.mandateType,
        scope: item.scope ?? undefined,
        status: item.status,
        effectiveFrom: isoTimestamp(item.effectiveFrom, "mandate effective-from"),
        effectiveUntil: item.effectiveUntil
          ? isoTimestamp(item.effectiveUntil, "mandate effective-until")
          : undefined,
      })),
      roleCoverages: rows.roleCoverages.map((item) => ({
        key: key("coverage", item.id),
        roleMandateKey: key("mandate", item.roleMandateId),
        personKey: key("person", item.personId),
        coverageType: item.coverageType,
        status: item.status,
        effectiveFrom: isoTimestamp(item.effectiveFrom, "coverage effective-from"),
        effectiveUntil: item.effectiveUntil
          ? isoTimestamp(item.effectiveUntil, "coverage effective-until")
          : undefined,
      })),
      systems: rows.systems.map((item) => ({
        key: key("system", item.id),
        name: item.name,
        description: item.description ?? undefined,
        systemType: item.systemType,
        url: item.url ?? undefined,
        ownerRoleKey: item.ownerRoleId
          ? key("role", item.ownerRoleId)
          : undefined,
        status: item.status,
      })),
      processes: rows.processes.map((item) => ({
        key: key("process", item.id),
        name: item.name,
        purpose: item.purpose ?? undefined,
        ownerRoleKey: item.ownerRoleId
          ? key("role", item.ownerRoleId)
          : undefined,
        status: item.status,
      })),
      processSteps: rows.processSteps.map((item) => ({
        key: key("step", item.id),
        processKey: key("process", item.processId),
        position: item.position,
        title: item.title,
        instructions: item.instructions,
        responsibleRoleKey: item.responsibleRoleId
          ? key("role", item.responsibleRoleId)
          : undefined,
      })),
      exceptions: rows.exceptions.map((item) => ({
        key: key("exception", item.id),
        processKey: key("process", item.processId),
        processStepKey: item.processStepId
          ? key("step", item.processStepId)
          : undefined,
        name: item.name,
        condition: item.condition,
        response: item.response,
        status: item.status,
        ownerRoleKey: item.ownerRoleId
          ? key("role", item.ownerRoleId)
          : undefined,
      })),
      processSystems: rows.processSystems.map((item) => ({
        processKey: key("process", item.processId),
        systemKey: key("system", item.systemId),
        usage: item.usage,
      })),
      processDependencies: rows.processDependencies.map((item) => ({
        sourceProcessKey: key("process", item.sourceProcessId),
        targetProcessKey: key("process", item.targetProcessId),
        dependencyType: item.dependencyType,
        description: item.description ?? undefined,
      })),
    },
  };
}
