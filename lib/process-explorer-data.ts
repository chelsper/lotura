export type ActiveInactiveStatus = "active" | "inactive";
export type ProcessStatus = "draft" | "active" | "archived";
export type AssignmentType = "permanent" | "interim" | "acting" | "backup";
export type AssignmentStatus = "scheduled" | "active" | "ended" | "cancelled";
export type SystemType =
  | "software"
  | "external_service"
  | "manual_record"
  | "other";
export type DependencyType =
  | "requires"
  | "receives_from"
  | "provides_to"
  | "triggers";

type SeedUser = {
  key: string;
  email: string;
  displayName: string;
};

type SeedMembership = {
  key: string;
  userKey: string;
  accessLevel: "owner" | "admin" | "member";
  status: ActiveInactiveStatus;
};

type SeedRole = {
  key: string;
  name: string;
  description?: string;
  status: ActiveInactiveStatus;
};

type SeedRoleAssignment = {
  roleKey: string;
  membershipKey: string;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  effectiveFrom: string;
  effectiveUntil?: string;
  reason?: string;
};

type SeedSystem = {
  key: string;
  name: string;
  description?: string;
  systemType: SystemType;
  url?: string;
  ownerRoleKey?: string;
  status: ActiveInactiveStatus;
};

type SeedProcess = {
  key: string;
  name: string;
  purpose?: string;
  ownerRoleKey?: string;
  status: ProcessStatus;
};

type SeedProcessStep = {
  key: string;
  processKey: string;
  position: number;
  title: string;
  instructions: string;
  responsibleRoleKey?: string;
};

type SeedException = {
  key: string;
  processKey: string;
  processStepKey?: string;
  name: string;
  condition: string;
  response: string;
  status: ActiveInactiveStatus;
  ownerRoleKey?: string;
};

type SeedProcessSystem = {
  processKey: string;
  systemKey: string;
  usage: string;
};

type SeedProcessDependency = {
  sourceProcessKey: string;
  targetProcessKey: string;
  dependencyType: DependencyType;
  description?: string;
};

export type ProcessExplorerSeed = {
  organization: { name: string };
  users: SeedUser[];
  memberships: SeedMembership[];
  roles: SeedRole[];
  roleAssignments: SeedRoleAssignment[];
  systems: SeedSystem[];
  processes: SeedProcess[];
  processSteps: SeedProcessStep[];
  exceptions: SeedException[];
  processSystems: SeedProcessSystem[];
  processDependencies: SeedProcessDependency[];
};

export type ExplorerRole = {
  id: string;
  name: string;
  description: string | null;
  status: ActiveInactiveStatus;
  currentAssignee: {
    name: string;
    assignmentType: AssignmentType;
  } | null;
};

export type ExplorerSystem = {
  id: string;
  name: string;
  description: string | null;
  type: SystemType;
  usage: string;
  status: ActiveInactiveStatus;
};

export type ExplorerDependency = {
  processId: string;
  processName: string;
  type: DependencyType;
  description: string | null;
};

export type ExplorerException = {
  id: string;
  name: string;
  condition: string;
  response: string;
  status: ActiveInactiveStatus;
  stepId: string | null;
  stepTitle: string | null;
  ownerRole: Pick<ExplorerRole, "id" | "name"> | null;
};

export type ExplorerStep = {
  id: string;
  position: number;
  title: string;
  instructions: string;
  responsibleRole: Pick<ExplorerRole, "id" | "name"> | null;
};

export type ExplorerProcess = {
  id: string;
  name: string;
  purpose: string | null;
  status: ProcessStatus;
  ownerRole: ExplorerRole | null;
  roleIds: string[];
  steps: ExplorerStep[];
  exceptions: ExplorerException[];
  systems: ExplorerSystem[];
  upstream: ExplorerDependency[];
  downstream: ExplorerDependency[];
};

export type ProcessExplorerData = {
  organization: { name: string };
  roles: ExplorerRole[];
  systems: Array<Pick<ExplorerSystem, "id" | "name" | "type" | "status">>;
  processes: ExplorerProcess[];
};

function requiredFromMap<T>(map: Map<string, T>, key: string, label: string) {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Invalid Process Explorer seed: ${label} '${key}' is missing.`);
  }

  return value;
}

export function buildProcessExplorerData(
  seed: ProcessExplorerSeed,
): ProcessExplorerData {
  const usersByKey = new Map(seed.users.map((item) => [item.key, item]));
  const membershipsByKey = new Map(
    seed.memberships.map((item) => [item.key, item]),
  );
  const seedRolesByKey = new Map(seed.roles.map((item) => [item.key, item]));
  const seedSystemsByKey = new Map(
    seed.systems.map((item) => [item.key, item]),
  );
  const seedProcessesByKey = new Map(
    seed.processes.map((item) => [item.key, item]),
  );
  const seedStepsByKey = new Map(
    seed.processSteps.map((item) => [item.key, item]),
  );

  for (const membership of seed.memberships) {
    requiredFromMap(usersByKey, membership.userKey, "membership user");
  }

  const activePrimaryAssignments = new Map<string, number>();

  for (const assignment of seed.roleAssignments) {
    requiredFromMap(seedRolesByKey, assignment.roleKey, "assigned role");
    requiredFromMap(
      membershipsByKey,
      assignment.membershipKey,
      "assigned membership",
    );

    if (
      assignment.status === "active" &&
      assignment.assignmentType !== "backup"
    ) {
      const assignmentCount =
        (activePrimaryAssignments.get(assignment.roleKey) ?? 0) + 1;
      activePrimaryAssignments.set(assignment.roleKey, assignmentCount);

      if (assignmentCount > 1) {
        throw new Error(
          `Invalid Process Explorer seed: role '${assignment.roleKey}' has more than one active primary assignment.`,
        );
      }
    }
  }

  for (const system of seed.systems) {
    if (system.ownerRoleKey) {
      requiredFromMap(seedRolesByKey, system.ownerRoleKey, "system owner");
    }
  }

  for (const process of seed.processes) {
    if (process.status !== "draft" && !process.ownerRoleKey) {
      throw new Error(
        `Invalid Process Explorer seed: ${process.status} process '${process.key}' requires an owner role.`,
      );
    }

    if (process.ownerRoleKey) {
      requiredFromMap(seedRolesByKey, process.ownerRoleKey, "process owner");
    }
  }

  const stepPositions = new Set<string>();

  for (const step of seed.processSteps) {
    requiredFromMap(seedProcessesByKey, step.processKey, "step process");

    if (step.position < 1) {
      throw new Error(
        `Invalid Process Explorer seed: step '${step.key}' has a non-positive position.`,
      );
    }

    const positionKey = `${step.processKey}:${step.position}`;
    if (stepPositions.has(positionKey)) {
      throw new Error(
        `Invalid Process Explorer seed: process '${step.processKey}' has duplicate step position ${step.position}.`,
      );
    }
    stepPositions.add(positionKey);

    if (step.responsibleRoleKey) {
      requiredFromMap(
        seedRolesByKey,
        step.responsibleRoleKey,
        "responsible role",
      );
    }
  }

  for (const processException of seed.exceptions) {
    requiredFromMap(
      seedProcessesByKey,
      processException.processKey,
      "exception process",
    );
    if (processException.ownerRoleKey) {
      requiredFromMap(
        seedRolesByKey,
        processException.ownerRoleKey,
        "exception owner",
      );
    }
  }

  for (const processSystem of seed.processSystems) {
    requiredFromMap(
      seedProcessesByKey,
      processSystem.processKey,
      "process-system process",
    );
    requiredFromMap(
      seedSystemsByKey,
      processSystem.systemKey,
      "process-system system",
    );
  }

  const roles = seed.roles.map<ExplorerRole>((role) => {
    const currentAssignment = seed.roleAssignments.find(
      (assignment) =>
        assignment.roleKey === role.key &&
        assignment.status === "active" &&
        assignment.assignmentType !== "backup",
    );

    let currentAssignee: ExplorerRole["currentAssignee"] = null;

    if (currentAssignment) {
      const membership = requiredFromMap(
        membershipsByKey,
        currentAssignment.membershipKey,
        "membership",
      );
      const person = requiredFromMap(usersByKey, membership.userKey, "user");

      currentAssignee = {
        name: person.displayName,
        assignmentType: currentAssignment.assignmentType,
      };
    }

    return {
      id: role.key,
      name: role.name,
      description: role.description ?? null,
      status: role.status,
      currentAssignee,
    };
  });
  const rolesByKey = new Map(roles.map((item) => [item.id, item]));

  const dependencyKeys = new Set<string>();

  for (const dependency of seed.processDependencies) {
    requiredFromMap(
      seedProcessesByKey,
      dependency.sourceProcessKey,
      "source process",
    );
    requiredFromMap(
      seedProcessesByKey,
      dependency.targetProcessKey,
      "target process",
    );

    if (dependency.sourceProcessKey === dependency.targetProcessKey) {
      throw new Error(
        `Invalid Process Explorer seed: process dependency '${dependency.sourceProcessKey}' cannot reference itself.`,
      );
    }

    const dependencyKey = `${dependency.sourceProcessKey}:${dependency.targetProcessKey}:${dependency.dependencyType}`;
    if (dependencyKeys.has(dependencyKey)) {
      throw new Error(
        `Invalid Process Explorer seed: duplicate process dependency '${dependencyKey}'.`,
      );
    }
    dependencyKeys.add(dependencyKey);
  }

  const processes = seed.processes.map<ExplorerProcess>((process) => {
    const steps = seed.processSteps
      .filter((step) => step.processKey === process.key)
      .sort((left, right) => left.position - right.position)
      .map<ExplorerStep>((step) => ({
        id: step.key,
        position: step.position,
        title: step.title,
        instructions: step.instructions,
        responsibleRole: step.responsibleRoleKey
          ? requiredFromMap(
              rolesByKey,
              step.responsibleRoleKey,
              "responsible role",
            )
          : null,
      }));
    const stepsByKey = new Map(steps.map((item) => [item.id, item]));

    const processExceptions = seed.exceptions
      .filter((item) => item.processKey === process.key)
      .map<ExplorerException>((item) => {
        if (item.processStepKey) {
          const scopedSeedStep = requiredFromMap(
            seedStepsByKey,
            item.processStepKey,
            "exception step",
          );

          if (scopedSeedStep.processKey !== process.key) {
            throw new Error(
              `Invalid Process Explorer seed: exception '${item.key}' references a step from another process.`,
            );
          }
        }

        const scopedStep = item.processStepKey
          ? requiredFromMap(stepsByKey, item.processStepKey, "exception step")
          : null;

        return {
          id: item.key,
          name: item.name,
          condition: item.condition,
          response: item.response,
          status: item.status,
          stepId: scopedStep?.id ?? null,
          stepTitle: scopedStep?.title ?? null,
          ownerRole: item.ownerRoleKey
            ? requiredFromMap(rolesByKey, item.ownerRoleKey, "exception owner")
            : null,
        };
      });

    const systems = seed.processSystems
      .filter((item) => item.processKey === process.key)
      .map<ExplorerSystem>((item) => {
        const linkedSystem = requiredFromMap(
          seedSystemsByKey,
          item.systemKey,
          "system",
        );

        return {
          id: linkedSystem.key,
          name: linkedSystem.name,
          description: linkedSystem.description ?? null,
          type: linkedSystem.systemType,
          usage: item.usage,
          status: linkedSystem.status,
        };
      });

    const upstream = seed.processDependencies
      .filter((dependency) => dependency.targetProcessKey === process.key)
      .map<ExplorerDependency>((dependency) => {
        const connectedProcess = requiredFromMap(
          seedProcessesByKey,
          dependency.sourceProcessKey,
          "source process",
        );

        return {
          processId: connectedProcess.key,
          processName: connectedProcess.name,
          type: dependency.dependencyType,
          description: dependency.description ?? null,
        };
      });

    const downstream = seed.processDependencies
      .filter((dependency) => dependency.sourceProcessKey === process.key)
      .map<ExplorerDependency>((dependency) => {
        const connectedProcess = requiredFromMap(
          seedProcessesByKey,
          dependency.targetProcessKey,
          "target process",
        );

        return {
          processId: connectedProcess.key,
          processName: connectedProcess.name,
          type: dependency.dependencyType,
          description: dependency.description ?? null,
        };
      });

    const roleIds = new Set<string>();

    if (process.ownerRoleKey) roleIds.add(process.ownerRoleKey);
    for (const step of steps) {
      if (step.responsibleRole) roleIds.add(step.responsibleRole.id);
    }
    for (const item of processExceptions) {
      if (item.ownerRole) roleIds.add(item.ownerRole.id);
    }

    return {
      id: process.key,
      name: process.name,
      purpose: process.purpose ?? null,
      status: process.status,
      ownerRole: process.ownerRoleKey
        ? requiredFromMap(rolesByKey, process.ownerRoleKey, "process owner")
        : null,
      roleIds: Array.from(roleIds),
      steps,
      exceptions: processExceptions,
      systems,
      upstream,
      downstream,
    };
  });

  return {
    organization: seed.organization,
    roles,
    systems: seed.systems.map((item) => ({
      id: item.key,
      name: item.name,
      type: item.systemType,
      status: item.status,
    })),
    processes,
  };
}
