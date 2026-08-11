import type { ProcessExplorerSeed } from "./process-explorer-data";

type ActiveInactiveStatus = "active" | "inactive";

export type NeonOperatingModelRows = {
  asOf: string | Date;
  organizations: Array<{ id: number; name: string }>;
  users: Array<{ id: number; email: string; displayName: string }>;
  memberships: Array<{
    id: number;
    userId: number;
    accessLevel: "owner" | "admin" | "member";
    status: ActiveInactiveStatus;
  }>;
  roles: Array<{
    id: number;
    name: string;
    description: string | null;
    status: ActiveInactiveStatus;
  }>;
  roleAssignments: Array<{
    id: number;
    roleId: number;
    membershipId: number;
    assignmentType: "permanent" | "interim" | "acting" | "backup";
    status: "scheduled" | "active" | "ended" | "cancelled";
    effectiveFrom: string | Date;
    effectiveUntil: string | Date | null;
    reason: string | null;
  }>;
  people: Array<{
    id: number;
    displayName: string;
    status: ActiveInactiveStatus;
  }>;
  roleMandates: Array<{
    id: number;
    roleId: number;
    mandateType: "primary" | "shared";
    scope: string | null;
    status: "scheduled" | "active" | "ended" | "cancelled";
    effectiveFrom: string | Date;
    effectiveUntil: string | Date | null;
  }>;
  roleCoverages: Array<{
    id: number;
    roleMandateId: number;
    personId: number;
    coverageType:
      | "permanent"
      | "interim"
      | "acting"
      | "delegated"
      | "backup";
    status: "scheduled" | "active" | "ended" | "cancelled";
    effectiveFrom: string | Date;
    effectiveUntil: string | Date | null;
  }>;
  systems: Array<{
    id: number;
    name: string;
    description: string | null;
    systemType: "software" | "external_service" | "manual_record" | "other";
    url: string | null;
    ownerRoleId: number | null;
    status: ActiveInactiveStatus;
  }>;
  processes: Array<{
    id: number;
    name: string;
    purpose: string | null;
    ownerRoleId: number | null;
    status: "draft" | "active" | "archived";
  }>;
  processSteps: Array<{
    id: number;
    processId: number;
    position: number;
    title: string;
    instructions: string;
    responsibleRoleId: number | null;
  }>;
  exceptions: Array<{
    id: number;
    processId: number;
    processStepId: number | null;
    name: string;
    condition: string;
    response: string;
    status: ActiveInactiveStatus;
    ownerRoleId: number | null;
  }>;
  processSystems: Array<{
    processId: number;
    systemId: number;
    usage: string;
  }>;
  processDependencies: Array<{
    id: number;
    sourceProcessId: number;
    targetProcessId: number;
    dependencyType: "requires" | "receives_from" | "provides_to" | "triggers";
    description: string | null;
  }>;
};

export function mapNeonOperatingModel(rows: NeonOperatingModelRows): {
  seed: ProcessExplorerSeed;
  asOf: string;
};
