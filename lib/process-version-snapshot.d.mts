export type ProcessVersionSnapshotInput = {
  dependencies: Array<{
    dependencyType: "requires" | "receives_from" | "provides_to" | "triggers";
    description: string | null;
    direction: "upstream" | "downstream";
    sourceProcessName: string;
    sourceProcessStableKey: string;
    stableKey: string;
    targetProcessName: string;
    targetProcessStableKey: string;
  }>;
  exceptions: Array<{
    condition: string;
    name: string;
    ownerRoleName: string | null;
    ownerRoleStableKey: string | null;
    processStepStableKey: string | null;
    processStepTitle: string | null;
    response: string;
    stableKey: string;
    status: "active" | "inactive";
  }>;
  process: {
    name: string;
    ownerRoleName: string | null;
    ownerRoleStableKey: string | null;
    purpose: string | null;
    stableKey: string;
    status: "draft" | "active" | "archived";
  };
  steps: Array<{
    instructions: string;
    position: number;
    responsibleRoleName: string | null;
    responsibleRoleStableKey: string | null;
    stableKey: string;
    title: string;
  }>;
  systems: Array<{
    description: string | null;
    name: string;
    stableKey: string;
    status: "active" | "inactive";
    type: "software" | "external_service" | "manual_record" | "other";
    usage: string;
  }>;
};

export type ProcessVersionSnapshot = Record<string, unknown>;

export function buildProcessVersionSnapshot(
  input: ProcessVersionSnapshotInput,
): ProcessVersionSnapshot;

export function fingerprintProcessVersionSnapshot(
  snapshot: ProcessVersionSnapshot,
): string;
