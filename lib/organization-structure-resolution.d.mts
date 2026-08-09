import type {
  OrganizationStructurePreview,
} from "./organization-structure-preview.mjs";

export type OrganizationStructureResolutionSeverity = "blocker" | "warning";
export type OrganizationStructureResolutionResult =
  | "excluded"
  | "needs-validation"
  | "resolved"
  | "reviewed";

export type OrganizationStructureResolutionGroup = {
  actions: string[];
  candidateRecordKeys: string[];
  description: string;
  key: string;
  kind: string;
  recordKeys: string[];
  severity: OrganizationStructureResolutionSeverity;
  title: string;
};

export type OrganizationStructureResolutionDecision = {
  action: string;
  candidateRecordKey: string | null;
  groupKey: string;
  note: string;
  recordKeys: string[];
  result: OrganizationStructureResolutionResult;
};

export type OrganizationStructureResolutionSession = {
  approval: null | {
    approvedAt: string;
    excludedRecordKeys: string[];
    includedRecordKeys: string[];
    status: "approved-for-import";
  };
  attestations: {
    basisOnly: boolean;
    humanReview: boolean;
    localOnly: boolean;
  };
  decisions: Record<string, OrganizationStructureResolutionDecision>;
  preparation: {
    identityStrategyNote: string;
    identityStrategyReviewed: boolean;
    reviewedSourceAsOf: string;
    sourceAsOfNote: string;
  };
};

export type OrganizationStructureResolutionReadiness = {
  attestationsComplete: boolean;
  blockers: Array<{ key: string; message: string }>;
  effectiveSourceAsOf: string | null;
  excludedRecordKeys: string[];
  includedRecordKeys: string[];
  issueStates: Array<{
    decision: OrganizationStructureResolutionDecision | null;
    group: OrganizationStructureResolutionGroup;
    includedRecordKeys: string[];
    state:
      | "excluded"
      | "needs-validation"
      | "resolved"
      | "reviewed"
      | "source-evidence";
  }>;
  readyForLocalApproval: boolean;
  warnings: Array<{ key: string; message: string }>;
};

export const organizationStructureResolutionActions: Record<
  string,
  {
    description: string;
    label: string;
    requiresCandidate?: boolean;
    requiresNote: boolean;
    result: OrganizationStructureResolutionResult;
  }
>;

export function buildOrganizationStructureResolutionGroups(
  preview: OrganizationStructurePreview,
): OrganizationStructureResolutionGroup[];

export function createOrganizationStructureResolutionSession(): OrganizationStructureResolutionSession;

export function applyOrganizationStructureResolutionDecision(
  session: OrganizationStructureResolutionSession,
  groups: OrganizationStructureResolutionGroup[],
  input: {
    action: string;
    candidateRecordKey?: string | null;
    groupKey: string;
    note?: string;
  },
): OrganizationStructureResolutionSession;

export function removeOrganizationStructureResolutionDecision(
  session: OrganizationStructureResolutionSession,
  groupKey: string,
): OrganizationStructureResolutionSession;

export function updateOrganizationStructureResolutionPreparation(
  session: OrganizationStructureResolutionSession,
  changes: Partial<OrganizationStructureResolutionSession["preparation"]>,
): OrganizationStructureResolutionSession;

export function updateOrganizationStructureResolutionAttestation(
  session: OrganizationStructureResolutionSession,
  attestation: keyof OrganizationStructureResolutionSession["attestations"],
  checked: boolean,
): OrganizationStructureResolutionSession;

export function evaluateOrganizationStructureResolutionReadiness(
  preview: OrganizationStructurePreview,
  session: OrganizationStructureResolutionSession,
): OrganizationStructureResolutionReadiness;

export function approveOrganizationStructureResolutionSession(
  preview: OrganizationStructurePreview,
  session: OrganizationStructureResolutionSession,
  approvedAt: string,
): OrganizationStructureResolutionSession;
