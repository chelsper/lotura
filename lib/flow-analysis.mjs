const PRIMARY_ASSIGNMENT_TYPES = new Set(["permanent", "interim", "acting"]);

const evidenceLanguage = {
  direct: "Direct impact",
  indirect: "Potential indirect impact",
  review: "Review recommended",
};

function asTime(value, label) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    throw new Error(`FLOW Analysis requires a valid ${label} timestamp.`);
  }
  return time;
}

function byKey(items) {
  return new Map(items.map((item) => [item.key, item]));
}

function unique(values) {
  return [...new Set(values)];
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function namesFor(ids, map) {
  return ids.map((id) => map.get(id)?.name ?? id);
}

function fact(label, value) {
  return { label, value: String(value) };
}

function countPhrase(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function finding({
  id,
  evidence = evidenceLanguage.review,
  title,
  summary,
  facts,
  howDetermined,
  limitation,
  processIds = [],
  roleIds = [],
  systemIds = [],
}) {
  return {
    id,
    evidence,
    title,
    summary,
    facts,
    howDetermined,
    limitation: limitation ?? null,
    processIds: unique(processIds),
    roleIds: unique(roleIds),
    systemIds: unique(systemIds),
  };
}

export function isAssignmentCurrent(assignment, membership, asOf) {
  if (!assignment || !membership || membership.status !== "active") return false;
  if (assignment.status !== "active") return false;

  const asOfTime = asTime(asOf, "as-of");
  const startsAt = asTime(assignment.effectiveFrom, "effective-from");
  if (startsAt > asOfTime) return false;

  if (assignment.effectiveUntil) {
    const endsAt = asTime(assignment.effectiveUntil, "effective-until");
    if (endsAt <= asOfTime) return false;
  }

  return true;
}

export function getRoleCoverage(seed, asOf) {
  const memberships = byKey(seed.memberships);
  const users = byKey(seed.users);

  return seed.roles.map((role) => {
    const currentAssignments = seed.roleAssignments
      .filter((assignment) => assignment.roleKey === role.key)
      .filter((assignment) =>
        isAssignmentCurrent(
          assignment,
          memberships.get(assignment.membershipKey),
          asOf,
        ),
      )
      .map((assignment) => {
        const membership = memberships.get(assignment.membershipKey);
        const person = membership ? users.get(membership.userKey) : null;
        if (!membership || !person) {
          throw new Error(
            `FLOW Analysis cannot resolve assignment membership '${assignment.membershipKey}'.`,
          );
        }

        return {
          membershipId: membership.key,
          personId: person.key,
          personName: person.displayName,
          assignmentType: assignment.assignmentType,
          effectiveFrom: assignment.effectiveFrom,
          effectiveUntil: assignment.effectiveUntil ?? null,
          reason: assignment.reason ?? null,
        };
      });

    const primaryAssignments = currentAssignments.filter((assignment) =>
      PRIMARY_ASSIGNMENT_TYPES.has(assignment.assignmentType),
    );

    if (primaryAssignments.length > 1) {
      throw new Error(
        `FLOW Analysis found more than one current primary assignment for role '${role.key}'.`,
      );
    }

    return {
      roleId: role.key,
      primary: primaryAssignments[0] ?? null,
      backups: currentAssignments.filter(
        (assignment) => assignment.assignmentType === "backup",
      ),
    };
  });
}

export function analyzeStepResponsibilities(seed, asOf) {
  const roles = byKey(seed.roles);
  const processes = byKey(seed.processes);
  const coverage = new Map(
    getRoleCoverage(seed, asOf).map((item) => [item.roleId, item]),
  );

  return seed.processSteps.map((step) => {
    const process = processes.get(step.processKey);
    if (!process) {
      throw new Error(`FLOW Analysis cannot resolve process '${step.processKey}'.`);
    }

    const inherited = !step.responsibleRoleKey;
    const roleId = step.responsibleRoleKey ?? process.ownerRoleKey ?? null;
    const role = roleId ? roles.get(roleId) : null;
    const roleCoverage = roleId ? coverage.get(roleId) : null;

    let classification;
    if (!roleId || !role) {
      classification = "unclear";
    } else if (role.status === "inactive") {
      classification = "retired";
    } else if (!roleCoverage?.primary) {
      classification = "unstaffed";
    } else {
      classification = inherited ? "inherited" : "explicit";
    }

    return {
      stepId: step.key,
      stepTitle: step.title,
      processId: process.key,
      processName: process.name,
      roleId,
      roleName: role?.name ?? null,
      basis: inherited ? "inherited" : "explicit",
      classification,
    };
  });
}

function activeProcessGraph(seed) {
  const activeProcessIds = new Set(
    seed.processes
      .filter((process) => process.status === "active")
      .map((process) => process.key),
  );
  const outgoing = new Map(
    [...activeProcessIds].map((processId) => [processId, new Set()]),
  );
  const incoming = new Map(
    [...activeProcessIds].map((processId) => [processId, new Set()]),
  );

  for (const dependency of seed.processDependencies) {
    if (
      activeProcessIds.has(dependency.sourceProcessKey) &&
      activeProcessIds.has(dependency.targetProcessKey)
    ) {
      outgoing
        .get(dependency.sourceProcessKey)
        .add(dependency.targetProcessKey);
      incoming
        .get(dependency.targetProcessKey)
        .add(dependency.sourceProcessKey);
    }
  }

  return { activeProcessIds, outgoing, incoming };
}

function stronglyConnectedComponents(nodes, outgoing) {
  let nextIndex = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const target of outgoing.get(node) ?? []) {
      if (!indices.has(target)) {
        visit(target);
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node), lowLinks.get(target)),
        );
      } else if (onStack.has(target)) {
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node), indices.get(target)),
        );
      }
    }

    if (lowLinks.get(node) === indices.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      components.push(sorted(component));
    }
  }

  for (const node of nodes) {
    if (!indices.has(node)) visit(node);
  }

  return components;
}

function reachable(start, adjacency) {
  const visited = new Set();
  const queue = [...(adjacency.get(start) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === start || visited.has(current)) continue;
    visited.add(current);
    queue.push(...(adjacency.get(current) ?? []));
  }

  return visited;
}

function longestComponentPath(componentId, adjacency, memo) {
  if (memo.has(componentId)) return memo.get(componentId);

  let best = [componentId];
  for (const target of adjacency.get(componentId) ?? []) {
    const candidate = [componentId, ...longestComponentPath(target, adjacency, memo)];
    if (candidate.length > best.length) best = candidate;
  }

  memo.set(componentId, best);
  return best;
}

export function analyzeDependencyGraph(seed) {
  const { activeProcessIds, outgoing, incoming } = activeProcessGraph(seed);
  const components = stronglyConnectedComponents(activeProcessIds, outgoing);
  const componentByProcess = new Map();
  components.forEach((component, componentId) => {
    component.forEach((processId) => componentByProcess.set(processId, componentId));
  });

  const componentOutgoing = new Map(
    components.map((_, componentId) => [componentId, new Set()]),
  );
  const componentIncoming = new Map(
    components.map((_, componentId) => [componentId, new Set()]),
  );

  for (const [source, targets] of outgoing) {
    const sourceComponent = componentByProcess.get(source);
    for (const target of targets) {
      const targetComponent = componentByProcess.get(target);
      if (sourceComponent !== targetComponent) {
        componentOutgoing.get(sourceComponent).add(targetComponent);
        componentIncoming.get(targetComponent).add(sourceComponent);
      }
    }
  }

  const downstreamMemo = new Map();
  const upstreamMemo = new Map();

  return seed.processes
    .filter((process) => activeProcessIds.has(process.key))
    .map((process) => {
      const componentId = componentByProcess.get(process.key);
      const downstreamComponents = longestComponentPath(
        componentId,
        componentOutgoing,
        downstreamMemo,
      );
      const upstreamComponents = longestComponentPath(
        componentId,
        componentIncoming,
        upstreamMemo,
      );

      return {
        processId: process.key,
        directUpstreamIds: sorted(incoming.get(process.key) ?? []),
        directDownstreamIds: sorted(outgoing.get(process.key) ?? []),
        allUpstreamIds: sorted(reachable(process.key, incoming)),
        allDownstreamIds: sorted(reachable(process.key, outgoing)),
        upstreamDepth: Math.max(0, upstreamComponents.length - 1),
        downstreamDepth: Math.max(0, downstreamComponents.length - 1),
        longestUpstreamPath: upstreamComponents
          .slice()
          .reverse()
          .map((id) => components[id][0]),
        longestDownstreamPath: downstreamComponents.map(
          (id) => components[id][0],
        ),
        cycleProcessIds:
          components[componentId].length > 1 ? components[componentId] : [],
      };
    });
}

export function analyzeRoleImpact(seed, asOf) {
  const roles = byKey(seed.roles);
  const processes = byKey(seed.processes);
  const activeProcessIds = new Set(
    seed.processes
      .filter((process) => process.status === "active")
      .map((process) => process.key),
  );
  const coverage = new Map(
    getRoleCoverage(seed, asOf).map((item) => [item.roleId, item]),
  );

  return seed.roles
    .filter((role) => role.status === "active")
    .map((role) => {
      const ownedProcesses = seed.processes.filter(
        (process) =>
          process.status === "active" && process.ownerRoleKey === role.key,
      );
      const responsibleSteps = seed.processSteps.filter(
        (step) =>
          activeProcessIds.has(step.processKey) &&
          step.responsibleRoleKey === role.key,
      );
      const inheritedSteps = seed.processSteps.filter(
        (step) =>
          activeProcessIds.has(step.processKey) &&
          !step.responsibleRoleKey &&
          processes.get(step.processKey)?.ownerRoleKey === role.key,
      );
      const ownedExceptions = seed.exceptions.filter(
        (item) =>
          item.status === "active" &&
          activeProcessIds.has(item.processKey) &&
          item.ownerRoleKey === role.key,
      );
      const ownedSystems = seed.systems.filter(
        (system) => system.status === "active" && system.ownerRoleKey === role.key,
      );
      const affectedProcessIds = unique([
        ...ownedProcesses.map((process) => process.key),
        ...responsibleSteps.map((step) => step.processKey),
        ...inheritedSteps.map((step) => step.processKey),
        ...ownedExceptions.map((item) => item.processKey),
      ]);
      const roleCoverage = coverage.get(role.key);
      const assignmentCount = seed.roleAssignments.filter(
        (assignment) => assignment.roleKey === role.key,
      ).length;

      return {
        roleId: role.key,
        roleName: roles.get(role.key).name,
        primary: roleCoverage?.primary ?? null,
        backups: roleCoverage?.backups ?? [],
        ownedProcessIds: ownedProcesses.map((process) => process.key),
        responsibleStepIds: responsibleSteps.map((step) => step.key),
        inheritedStepIds: inheritedSteps.map((step) => step.key),
        ownedExceptionIds: ownedExceptions.map((item) => item.key),
        ownedSystemIds: ownedSystems.map((system) => system.key),
        assignmentCount,
        affectedProcessIds,
        directReferenceCount:
          ownedProcesses.length +
          responsibleSteps.length +
          ownedExceptions.length +
          ownedSystems.length +
          assignmentCount,
      };
    })
    .sort(
      (left, right) =>
        right.directReferenceCount - left.directReferenceCount ||
        left.roleName.localeCompare(right.roleName),
    );
}

export function analyzeSystemImpact(seed, graph = analyzeDependencyGraph(seed)) {
  const processes = byKey(seed.processes);
  const graphByProcess = new Map(graph.map((item) => [item.processId, item]));
  const activeProcessIds = new Set(
    seed.processes
      .filter((process) => process.status === "active")
      .map((process) => process.key),
  );

  return seed.systems
    .filter((system) => system.status === "active")
    .map((system) => {
      const directProcessIds = unique(
        seed.processSystems
          .filter(
            (link) =>
              link.systemKey === system.key &&
              activeProcessIds.has(link.processKey),
          )
          .map((link) => link.processKey),
      );
      const directSet = new Set(directProcessIds);
      const potentialIndirectIds = unique(
        directProcessIds.flatMap(
          (processId) => graphByProcess.get(processId)?.allDownstreamIds ?? [],
        ),
      ).filter((processId) => !directSet.has(processId));

      return {
        systemId: system.key,
        systemName: system.name,
        directProcessIds,
        directProcessNames: namesFor(directProcessIds, processes),
        potentialIndirectIds,
        potentialIndirectNames: namesFor(potentialIndirectIds, processes),
      };
    })
    .sort(
      (left, right) =>
        right.directProcessIds.length - left.directProcessIds.length ||
        left.systemName.localeCompare(right.systemName),
    );
}

export function analyzeProcessChangeImpact(
  seed,
  graph = analyzeDependencyGraph(seed),
) {
  const roles = byKey(seed.roles);
  const systems = byKey(seed.systems);
  const graphByProcess = new Map(graph.map((item) => [item.processId, item]));

  return seed.processes
    .filter((process) => process.status === "active")
    .map((process) => {
      const processGraph = graphByProcess.get(process.key);
      const participatingRoleIds = unique([
        ...(process.ownerRoleKey ? [process.ownerRoleKey] : []),
        ...seed.processSteps
          .filter((step) => step.processKey === process.key)
          .map((step) => step.responsibleRoleKey ?? process.ownerRoleKey)
          .filter(Boolean),
        ...seed.exceptions
          .filter(
            (item) => item.processKey === process.key && item.status === "active",
          )
          .map((item) => item.ownerRoleKey)
          .filter(Boolean),
      ]);
      const directSystemIds = unique(
        seed.processSystems
          .filter((link) => link.processKey === process.key)
          .map((link) => link.systemKey),
      );
      const directSystemSet = new Set(directSystemIds);
      const contextualSystemIds = seed.systems
        .filter(
          (system) =>
            system.status === "active" &&
            system.ownerRoleKey &&
            participatingRoleIds.includes(system.ownerRoleKey) &&
            !directSystemSet.has(system.key),
        )
        .map((system) => system.key);
      const directDownstreamIds = processGraph?.directDownstreamIds ?? [];
      const directDownstreamSet = new Set(directDownstreamIds);
      const potentialIndirectIds = (processGraph?.allDownstreamIds ?? []).filter(
        (processId) => !directDownstreamSet.has(processId),
      );

      return {
        processId: process.key,
        processName: process.name,
        directUpstreamIds: processGraph?.directUpstreamIds ?? [],
        directDownstreamIds,
        potentialIndirectIds,
        participatingRoleIds,
        participatingRoleNames: namesFor(participatingRoleIds, roles),
        directSystemIds,
        directSystemNames: namesFor(directSystemIds, systems),
        contextualSystemIds,
        contextualSystemNames: namesFor(contextualSystemIds, systems),
        activeExceptionIds: seed.exceptions
          .filter(
            (item) => item.processKey === process.key && item.status === "active",
          )
          .map((item) => item.key),
      };
    });
}

function ownershipGapFindings(seed) {
  const roles = byKey(seed.roles);
  const results = [];

  for (const process of seed.processes) {
    if (!process.ownerRoleKey) {
      results.push(
        finding({
          id: `ownership-process-${process.key}`,
          title: `${process.name} has no owner role`,
          summary:
            process.status === "draft"
              ? "Review recommended before this draft process becomes active."
              : "Direct impact: the current process has no intended owner role.",
          facts: [fact("Process status", process.status)],
          howDetermined:
            "FLOW checked the process owner-role relationship. Draft processes may omit it; active and archived processes normally cannot.",
          processIds: [process.key],
        }),
      );
    } else if (roles.get(process.ownerRoleKey)?.status === "inactive") {
      results.push(
        finding({
          id: `ownership-retired-process-${process.key}`,
          title: `${process.name} points to a retired owner role`,
          summary: "Review recommended: intended ownership references an inactive role.",
          facts: [fact("Owner role", roles.get(process.ownerRoleKey).name)],
          howDetermined:
            "FLOW compared the process owner-role reference with the current role status.",
          processIds: [process.key],
          roleIds: [process.ownerRoleKey],
        }),
      );
    }
  }

  for (const system of seed.systems.filter((item) => item.status === "active")) {
    if (!system.ownerRoleKey || roles.get(system.ownerRoleKey)?.status === "inactive") {
      results.push(
        finding({
          id: `ownership-system-${system.key}`,
          title: `${system.name} lacks an active owner role`,
          summary: "Review recommended for current system stewardship.",
          facts: [
            fact(
              "Owner role",
              system.ownerRoleKey
                ? roles.get(system.ownerRoleKey)?.name ?? "Unknown role"
                : "Not recorded",
            ),
          ],
          howDetermined:
            "FLOW checked whether this active system has an owner-role reference to an active role.",
          roleIds: system.ownerRoleKey ? [system.ownerRoleKey] : [],
          systemIds: [system.key],
        }),
      );
    }
  }

  for (const item of seed.exceptions.filter((entry) => entry.status === "active")) {
    if (!item.ownerRoleKey || roles.get(item.ownerRoleKey)?.status === "inactive") {
      results.push(
        finding({
          id: `ownership-exception-${item.key}`,
          title: `${item.name} lacks an active owner role`,
          summary: "Review recommended for this active exception path.",
          facts: [fact("Process", seed.processes.find((p) => p.key === item.processKey)?.name ?? item.processKey)],
          howDetermined:
            "FLOW checked whether this active exception has an owner-role reference to an active role.",
          processIds: [item.processKey],
          roleIds: item.ownerRoleKey ? [item.ownerRoleKey] : [],
        }),
      );
    }
  }

  return results;
}

function currentGapFindings(seed, roleImpacts, responsibilities) {
  const results = ownershipGapFindings(seed);

  for (const role of roleImpacts) {
    if (!role.primary) {
      results.push(
        finding({
          id: `vacant-${role.roleId}`,
          evidence: evidenceLanguage.direct,
          title: `${role.roleName} has no current primary assignee`,
          summary: `Direct impact: ${countPhrase(role.affectedProcessIds.length, "active process")} currently ${role.affectedProcessIds.length === 1 ? "relies" : "rely"} on this role's intended responsibility.`,
          facts: [
            fact("Processes", role.affectedProcessIds.length),
            fact("Responsible steps", role.responsibleStepIds.length + role.inheritedStepIds.length),
            fact("Active backups", role.backups.length),
          ],
          howDetermined:
            "FLOW found no active permanent, interim, or acting assignment whose effective dates include the visible as-of time and whose membership is active.",
          processIds: role.affectedProcessIds,
          roleIds: [role.roleId],
          systemIds: role.ownedSystemIds,
        }),
      );
    } else if (["interim", "acting"].includes(role.primary.assignmentType)) {
      results.push(
        finding({
          id: `temporary-${role.roleId}`,
          title: `${role.roleName} has ${role.primary.assignmentType} coverage`,
          summary: `Review recommended: ${role.primary.personName} currently covers this role on an ${role.primary.assignmentType} basis.`,
          facts: [
            fact("Effective from", role.primary.effectiveFrom),
            fact("Effective until", role.primary.effectiveUntil ?? "No end recorded"),
            fact("Processes", role.affectedProcessIds.length),
            fact("Active backups", role.backups.length),
          ],
          howDetermined:
            "FLOW evaluated active primary role assignments against the visible as-of time and selected temporary assignment types.",
          limitation:
            "The schema does not record whether temporary coverage has been approved or is sufficient.",
          processIds: role.affectedProcessIds,
          roleIds: [role.roleId],
        }),
      );
    }
  }

  const problemClasses = new Set(["unclear", "unstaffed", "retired"]);
  const problemsByProcess = new Map();
  for (const responsibility of responsibilities) {
    if (!problemClasses.has(responsibility.classification)) continue;
    const current = problemsByProcess.get(responsibility.processId) ?? [];
    current.push(responsibility);
    problemsByProcess.set(responsibility.processId, current);
  }

  for (const [processId, problems] of problemsByProcess) {
    const processName = problems[0].processName;
    const counts = Object.fromEntries(
      ["unclear", "unstaffed", "retired"].map((classification) => [
        classification,
        problems.filter((item) => item.classification === classification).length,
      ]),
    );
    results.push(
      finding({
        id: `responsibility-${processId}`,
        evidence: evidenceLanguage.direct,
        title: `${processName} has step-responsibility findings`,
        summary: `Direct impact: ${countPhrase(problems.length, "documented step")} ${problems.length === 1 ? "needs" : "need"} responsibility review.`,
        facts: [
          fact("Unclear", counts.unclear),
          fact("Unstaffed", counts.unstaffed),
          fact("Retired", counts.retired),
          fact("Affected steps", problems.map((item) => item.stepTitle).join(", ")),
        ],
        howDetermined:
          "FLOW uses an explicit responsible role when present. Otherwise it inherits the process owner, then checks whether that role is active and currently staffed.",
        processIds: [processId],
        roleIds: problems.map((item) => item.roleId).filter(Boolean),
      }),
    );
  }

  return results;
}

function concentrationFindings(seed, roleImpacts, graph) {
  const processes = byKey(seed.processes);
  const activeProcessIds = new Set(
    seed.processes.filter((p) => p.status === "active").map((p) => p.key),
  );
  const findings = { roles: [], exceptions: [], systems: [], dependencies: [] };

  for (const role of roleImpacts) {
    const enabledProcessIds = unique(
      seed.processSystems
        .filter((link) => role.ownedSystemIds.includes(link.systemKey))
        .map((link) => link.processKey)
        .filter((processId) => activeProcessIds.has(processId)),
    );
    findings.roles.push(
      finding({
        id: `reach-${role.roleId}`,
        title: role.roleName,
        summary: `${role.roleName} owns ${countPhrase(role.ownedProcessIds.length, "process")} and is responsible for ${countPhrase(role.responsibleStepIds.length + role.inheritedStepIds.length, "step")} across ${countPhrase(role.affectedProcessIds.length, "process")}.`,
        facts: [
          fact("Processes owned", role.ownedProcessIds.length),
          fact("Responsible steps", role.responsibleStepIds.length + role.inheritedStepIds.length),
          fact("Exceptions owned", role.ownedExceptionIds.length),
          fact("Systems owned", role.ownedSystemIds.length),
          fact("Processes enabled by owned systems", enabledProcessIds.length),
        ],
        howDetermined:
          "FLOW counts each direct Version 0.1 role reference separately and reports the raw footprint without combining it into a score.",
        processIds: unique([...role.affectedProcessIds, ...enabledProcessIds]),
        roleIds: [role.roleId],
        systemIds: role.ownedSystemIds,
      }),
    );
  }

  for (const process of seed.processes.filter((p) => p.status === "active")) {
    const steps = seed.processSteps.filter((step) => step.processKey === process.key);
    const exceptions = seed.exceptions.filter(
      (item) => item.processKey === process.key && item.status === "active",
    );
    if (exceptions.length > 0) {
      const affectedStepIds = unique(
        exceptions.map((item) => item.processStepKey).filter(Boolean),
      );
      findings.exceptions.push(
        finding({
          id: `exceptions-${process.key}`,
          title: process.name,
          summary: `${process.name} has ${countPhrase(exceptions.length, "active exception")} affecting ${affectedStepIds.length} of ${countPhrase(steps.length, "documented step")}.`,
          facts: [
            fact("Active exceptions", exceptions.length),
            fact(
              "Step-scoped exceptions",
              exceptions.filter((item) => item.processStepKey).length,
            ),
            fact("Steps affected", affectedStepIds.length),
            fact("Process-level", exceptions.filter((item) => !item.processStepKey).length),
          ],
          howDetermined:
            "FLOW counts active exception records and distinguishes process-level exceptions from exceptions scoped to a documented step.",
          limitation:
            "The schema records exception types, not their occurrence frequency, cost, or severity.",
          processIds: [process.key],
        }),
      );
    }
  }
  findings.exceptions.sort(
    (left, right) =>
      Number(right.facts[0].value) - Number(left.facts[0].value) ||
      left.title.localeCompare(right.title),
  );

  for (const impact of analyzeSystemImpact(seed, graph)) {
    findings.systems.push(
      finding({
        id: `system-concentration-${impact.systemId}`,
        title: impact.systemName,
        summary: `${impact.systemName} is directly used by ${impact.directProcessIds.length} of ${countPhrase(activeProcessIds.size, "active process")}.`,
        facts: [
          fact("Direct process links", impact.directProcessIds.length),
          fact("Processes", impact.directProcessNames.join(", ") || "None"),
        ],
        howDetermined:
          "FLOW counts distinct active processes connected to this active system through ProcessSystem.",
        limitation:
          "A process-system link does not establish criticality, volume, or lack of a fallback.",
        processIds: impact.directProcessIds,
        systemIds: [impact.systemId],
      }),
    );
  }

  for (const item of graph) {
    const process = processes.get(item.processId);
    findings.dependencies.push(
      finding({
        id: `depth-${item.processId}`,
        title: process.name,
        summary: `${process.name} has ${countPhrase(item.upstreamDepth, "upstream level")} and ${countPhrase(item.downstreamDepth, "downstream level")} in the documented process graph.`,
        facts: [
          fact("Direct upstream", item.directUpstreamIds.length),
          fact("Direct downstream", item.directDownstreamIds.length),
          fact("Upstream depth", item.upstreamDepth),
          fact("Downstream depth", item.downstreamDepth),
          fact(
            "Longest upstream path",
            namesFor(item.longestUpstreamPath, processes).join(" → "),
          ),
          fact(
            "Longest downstream path",
            namesFor(item.longestDownstreamPath, processes).join(" → "),
          ),
          fact("Dependency cycle", item.cycleProcessIds.length > 0 ? namesFor(item.cycleProcessIds, processes).join(" ↔ ") : "None documented"),
        ],
        howDetermined:
          "FLOW follows source-to-target dependencies, collapses cycles into one component, and reports the longest remaining component path.",
        limitation:
          "Graph connectivity indicates review context, not operational failure or a mandatory change.",
        processIds: unique([
          item.processId,
          ...item.directUpstreamIds,
          ...item.directDownstreamIds,
        ]),
      }),
    );
  }
  findings.dependencies.sort(
    (left, right) =>
      Number(right.facts[3].value) - Number(left.facts[3].value) ||
      left.title.localeCompare(right.title),
  );

  return findings;
}

function scenarioFindings(seed, roleImpacts, graph) {
  const processes = byKey(seed.processes);
  const roles = [];

  for (const role of roleImpacts) {
    roles.push({
      roleId: role.roleId,
      roleName: role.roleName,
      vacancy: finding({
        id: `scenario-vacancy-${role.roleId}`,
        evidence: evidenceLanguage.direct,
        title: `If ${role.roleName} becomes vacant`,
        summary: `Direct impact: ${countPhrase(role.affectedProcessIds.length, "active process")} would retain intended role ownership but lose a current primary assignee.`,
        facts: [
          fact("Processes", role.affectedProcessIds.length),
          fact("Responsible steps", role.responsibleStepIds.length + role.inheritedStepIds.length),
          fact("Exceptions owned", role.ownedExceptionIds.length),
          fact("Systems owned", role.ownedSystemIds.length),
          fact("Active backups", role.backups.length),
        ],
        howDetermined:
          "FLOW hypothetically removes the current primary assignment while leaving every intended role reference unchanged. Backups are disclosed but not assumed to take over.",
        limitation:
          "The schema does not record backup readiness, capacity, skills, or automatic succession.",
        processIds: role.affectedProcessIds,
        roleIds: [role.roleId],
        systemIds: role.ownedSystemIds,
      }),
      restructuring: finding({
        id: `scenario-restructure-${role.roleId}`,
        title: `If ${role.roleName} is retired or consolidated`,
        summary: `Review recommended for ${countPhrase(role.directReferenceCount, "current responsibility reference")} before restructuring this role.`,
        facts: [
          fact("Process owners", role.ownedProcessIds.length),
          fact("Explicit step roles", role.responsibleStepIds.length),
          fact("Inherited steps affected", role.inheritedStepIds.length),
          fact("Exceptions owned", role.ownedExceptionIds.length),
          fact("Systems owned", role.ownedSystemIds.length),
          fact("Role assignments", role.assignmentCount),
        ],
        howDetermined:
          "FLOW counts current process, explicit step, exception, system, and assignment references that would require a decision if the role changed structurally. Steps inheriting process ownership are shown separately as affected context.",
        limitation:
          "Reference count is not an effort score. Reassigning a person is a vacancy scenario; it does not itself change intended role ownership.",
        processIds: role.affectedProcessIds,
        roleIds: [role.roleId],
        systemIds: role.ownedSystemIds,
      }),
    });
  }

  const systemScenarios = analyzeSystemImpact(seed, graph).map((impact) =>
    finding({
      id: `scenario-system-${impact.systemId}`,
      evidence: evidenceLanguage.direct,
      title: `If ${impact.systemName} becomes unavailable`,
      summary: `Direct impact: ${countPhrase(impact.directProcessIds.length, "active process")} ${impact.directProcessIds.length === 1 ? "uses" : "use"} this system. Potential indirect impact: ${countPhrase(impact.potentialIndirectIds.length, "downstream process")} ${impact.potentialIndirectIds.length === 1 ? "is" : "are"} connected to those processes.`,
      facts: [
        fact("Directly linked processes", impact.directProcessNames.join(", ") || "None"),
        fact("Potential indirect processes", impact.potentialIndirectNames.join(", ") || "None"),
      ],
      howDetermined:
        "FLOW treats ProcessSystem links as direct impact and follows source-to-target dependencies for potential indirect impact. Connectivity does not prove that work stops.",
      limitation:
        "The schema does not record system criticality, redundancy, outage behavior, or manual fallback capability.",
      processIds: [...impact.directProcessIds, ...impact.potentialIndirectIds],
      systemIds: [impact.systemId],
    }),
  );

  const processScenarios = analyzeProcessChangeImpact(seed, graph).map((impact) => {
    const directUpstreamNames = namesFor(impact.directUpstreamIds, processes);
    const directDownstreamNames = namesFor(impact.directDownstreamIds, processes);
    const indirectNames = namesFor(impact.potentialIndirectIds, processes);

    return finding({
      id: `scenario-process-${impact.processId}`,
      title: `If ${impact.processName} changes`,
      summary: `Review recommended with ${countPhrase(impact.directUpstreamIds.length, "direct upstream process")}, ${countPhrase(impact.directDownstreamIds.length, "direct downstream process")}, ${countPhrase(impact.directSystemIds.length, "directly linked system")}, and ${countPhrase(impact.participatingRoleIds.length, "participating role")}.`,
      facts: [
        fact("Direct upstream", directUpstreamNames.join(", ") || "None"),
        fact("Direct downstream", directDownstreamNames.join(", ") || "None"),
        fact("Potential indirect impact", indirectNames.join(", ") || "None"),
        fact("Directly linked systems", impact.directSystemNames.join(", ") || "None"),
        fact("Participating roles", impact.participatingRoleNames.join(", ") || "None"),
        fact("Contextual systems owned by those roles", impact.contextualSystemNames.join(", ") || "None"),
        fact("Active exceptions", impact.activeExceptionIds.length),
      ],
      howDetermined:
        "FLOW includes direct ProcessSystem links in the review set, lists role-owned systems only as context, and follows source-to-target dependencies for potential indirect impact.",
      limitation:
        "Connectivity recommends review; it does not prove operational failure or that every linked record must change.",
      processIds: unique([
        impact.processId,
        ...impact.directUpstreamIds,
        ...impact.directDownstreamIds,
        ...impact.potentialIndirectIds,
      ]),
      roleIds: impact.participatingRoleIds,
      systemIds: impact.directSystemIds,
    });
  });

  return { roles, systems: systemScenarios, processes: processScenarios };
}

export function buildFlowAnalysis(seed, asOf) {
  asTime(asOf, "as-of");
  const coverage = getRoleCoverage(seed, asOf);
  const responsibilities = analyzeStepResponsibilities(seed, asOf);
  const graph = analyzeDependencyGraph(seed);
  const roleImpacts = analyzeRoleImpact(seed, asOf);

  const responsibilityCounts = Object.fromEntries(
    ["explicit", "inherited", "unclear", "unstaffed", "retired"].map(
      (classification) => [
        classification,
        responsibilities.filter((item) => item.classification === classification)
          .length,
      ],
    ),
  );

  return {
    organization: seed.organization,
    asOf: new Date(asOf).toISOString(),
    evidenceLanguage,
    roleCoverage: coverage,
    responsibilityCounts,
    responsibilities,
    currentGaps: currentGapFindings(
      seed,
      roleImpacts,
      responsibilities,
    ),
    concentrations: concentrationFindings(seed, roleImpacts, graph),
    scenarios: scenarioFindings(seed, roleImpacts, graph),
  };
}
