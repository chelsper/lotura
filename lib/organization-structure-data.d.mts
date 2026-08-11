import type { ProcessExplorerSeed } from "./process-explorer-data";

export type StructuralLifecycleStatus = "active" | "inactive" | "retired";
export type EffectiveRecordStatus =
  | "scheduled"
  | "active"
  | "ended"
  | "cancelled";
export type PositionAssignmentType =
  | "incumbent"
  | "job_share"
  | "interim"
  | "acting"
  | "backup";
export type ReportingRelationshipType =
  | "primary"
  | "dotted_line"
  | "functional";
export type RoleMandateType = "primary" | "shared";
export type RoleCoverageType =
  | "permanent"
  | "interim"
  | "acting"
  | "delegated"
  | "backup";

type EffectiveRecord = {
  key: string;
  status: EffectiveRecordStatus;
  effectiveFrom: string;
  effectiveUntil?: string;
  reason?: string;
  updatedAt?: string;
};

export type OrganizationStructureSeed = {
  organization: { name: string };
  snapshot: {
    stableKey: string;
    sourceAsOf: string;
    isPartial: boolean;
    vacancyEvidenceComplete: boolean;
    approvedForImportAt: string;
    importedAt: string;
    currentForPilotUseAt?: string;
  };
  people: Array<{
    stableKey: string;
    displayName: string;
    status: "active" | "inactive";
    updatedAt?: string;
  }>;
  organizationUnits: Array<{
    stableKey: string;
    name: string;
    parentOrganizationUnitKey?: string;
    isProvisional: boolean;
    status: StructuralLifecycleStatus;
    statusReason?: string;
    effectiveFrom: string;
    effectiveUntil?: string;
    updatedAt?: string;
  }>;
  positions: Array<{
    stableKey: string;
    organizationUnitKey?: string;
    title: string;
    status: StructuralLifecycleStatus;
    statusReason?: string;
    effectiveFrom: string;
    effectiveUntil?: string;
    updatedAt?: string;
    vacancyEvidenceSupported?: boolean;
  }>;
  positionAssignments: Array<
    EffectiveRecord & {
      positionKey: string;
      personKey: string;
      assignmentType: PositionAssignmentType;
    }
  >;
  positionReportingRelationships: Array<
    EffectiveRecord & {
      subordinatePositionKey: string;
      managerPositionKey: string;
      relationshipType: ReportingRelationshipType;
    }
  >;
  roleMandates: Array<
    EffectiveRecord & {
      positionKey: string;
      roleKey: string;
      mandateType: RoleMandateType;
      scope?: string;
    }
  >;
  roleCoverages: Array<
    EffectiveRecord & {
      roleMandateKey: string;
      personKey: string;
      coverageType: RoleCoverageType;
    }
  >;
};

export type OrganizationUnitSummary = {
  id: string;
  name: string;
  isProvisional: boolean;
  status: StructuralLifecycleStatus;
  revision: string;
};

export type OrganizationPersonSummary = {
  id: string;
  name: string;
  status: "active" | "inactive";
  revision: string;
};

export type OccupancyState = {
  id:
    | "occupied"
    | "temporarily_covered"
    | "occupied_with_temporary_coverage"
    | "vacant"
    | "not_established";
  label: string;
  tone: "success" | "warning" | "info" | "neutral";
};

export type OrganizationPositionSummary = {
  id: string;
  title: string;
  status: StructuralLifecycleStatus;
  unit: OrganizationUnitSummary | null;
  occupancy: OccupancyState;
  revision: string;
};

export type StructureProcess = {
  id: string;
  name: string;
  status: "draft" | "active" | "archived";
  relationships: string[];
  systems: Array<{ id: string; name: string; usage: string }>;
};

export type StructureRelationship = {
  id: string;
  type: ReportingRelationshipType;
  typeLabel: string;
  position: OrganizationPositionSummary;
  reason: string | null;
  isCrossUnit: boolean;
  effectiveFrom: string;
  effectiveUntil: string | null;
  revision: string;
};

export type StructureMandate = {
  id: string;
  type: RoleMandateType;
  typeLabel: string;
  scope: string | null;
  reason: string | null;
  revision: string;
  role: {
    id: string;
    stableKey: string | null;
    name: string;
    status: "active" | "inactive";
  };
  coverage: Array<{
    id: string;
    type: RoleCoverageType;
    typeLabel: string;
    person: OrganizationPersonSummary;
    reason: string | null;
    effectiveFrom: string;
    effectiveUntil: string | null;
    revision: string;
  }>;
  processes: StructureProcess[];
  systems: Array<{ id: string; name: string; usage: string }>;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

export type OrganizationPosition = OrganizationPositionSummary & {
  statusReason: string | null;
  assignments: Array<{
    id: string;
    type: PositionAssignmentType;
    typeLabel: string;
    person: OrganizationPersonSummary;
    reason: string | null;
    effectiveFrom: string;
    effectiveUntil: string | null;
    revision: string;
  }>;
  primaryManager: StructureRelationship | null;
  directReports: StructureRelationship[];
  additionalManagers: StructureRelationship[];
  additionalReports: StructureRelationship[];
  peers: OrganizationPositionSummary[];
  managerChain: OrganizationPositionSummary[];
  mandates: StructureMandate[];
  processes: StructureProcess[];
  systems: Array<{ id: string; name: string; usage: string }>;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

export type OrganizationPerson = OrganizationPersonSummary & {
  assignments: Array<{
    id: string;
    type: PositionAssignmentType;
    typeLabel: string;
    position: OrganizationPositionSummary;
    reason: string | null;
    effectiveFrom: string;
    effectiveUntil: string | null;
  }>;
  coverages: Array<{
    id: string;
    type: RoleCoverageType;
    typeLabel: string;
    mandateType: RoleMandateType;
    mandateTypeLabel: string;
    scope: string | null;
    role: { id: string; name: string };
    position: OrganizationPositionSummary;
    reason: string | null;
    processes: StructureProcess[];
    effectiveFrom: string;
    effectiveUntil: string | null;
  }>;
  reportingContexts: Array<{
    position: OrganizationPositionSummary;
    primaryManager: StructureRelationship | null;
    directReports: StructureRelationship[];
  }>;
  processes: StructureProcess[];
};

export type OrganizationUnit = OrganizationUnitSummary & {
  statusReason: string | null;
  parent: OrganizationUnitSummary | null;
  children: OrganizationUnitSummary[];
  positions: OrganizationPosition[];
  crossUnitRelationships: Array<{
    id: string;
    type: ReportingRelationshipType;
    typeLabel: string;
    subordinate: OrganizationPositionSummary;
    manager: OrganizationPositionSummary;
  }>;
  roles: Array<{
    id: string;
    name: string;
    status: "active" | "inactive";
    mandateType: RoleMandateType;
    mandateTypeLabel: string;
    scope: string | null;
  }>;
  processes: StructureProcess[];
  effectiveFrom: string;
  effectiveUntil: string | null;
};

export type OrganizationStructureData = {
  organization: { name: string };
  asOf: string;
  operationalRoles: Array<{
    id: string;
    stableKey: string | null;
    name: string;
    description: string | null;
    status: "active" | "inactive";
    revision: string | null;
    processes: StructureProcess[];
    systems: Array<{ id: string; name: string; usage: string }>;
  }>;
  snapshot: {
    id: string;
    sourceAsOf: string;
    importedAt: string;
    currentForPilotUseAt: string | null;
    isPartial: boolean;
    vacancyEvidenceComplete: boolean;
    basisLabel: "Partial reviewed structure" | "Full reviewed import basis";
  };
  units: OrganizationUnit[];
  positions: OrganizationPosition[];
  people: OrganizationPerson[];
  gaps: {
    provisionalUnits: number;
    positionsWithoutUnit: number;
    occupancyNotEstablished: number;
    confirmedVacancies: number;
    rolesWithoutMandates: number;
    mandatesWithoutCoverage: number;
  };
};

export function buildOrganizationStructureData(
  structure: OrganizationStructureSeed,
  operatingModel: ProcessExplorerSeed,
  asOf?: string | Date,
): OrganizationStructureData;

export function mapNeonOrganizationStructure(rows: Record<string, unknown>): {
  asOf: string;
  structure: OrganizationStructureSeed;
};
