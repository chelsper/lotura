import type { DiscoveryMappingAction } from "./discovery-mapping-model.mjs";

export type DiscoveryProcessProposalDraftChange = {
  action: DiscoveryMappingAction;
  dependencyDescription: string | null;
  dependencyDirection: "upstream" | "downstream" | null;
  dependencyType: "requires" | "receives_from" | "provides_to" | "triggers" | null;
  exceptionCondition: string | null;
  exceptionId: string | null;
  exceptionName: string | null;
  exceptionResponse: string | null;
  ownerRoleId: string | null;
  processStepId: string | null;
  proposedPurpose: string | null;
  proposedStepInstructions: string | null;
  proposedStepPosition: number | null;
  proposedStepTitle: string | null;
  rationale: string;
  relatedProcessId: string | null;
  responsibleRoleId: string | null;
  sourceObservationIds: string[];
  systemId: string | null;
  systemUsage: string | null;
  title: string;
  unresolvedQuestion: string | null;
};

export type DiscoveryProcessProposalDraft = {
  changes: DiscoveryProcessProposalDraftChange[];
  clear: string[];
  conflicts: string[];
  needsValidation: string[];
  process: {
    dependencies: string[];
    endBoundary: string | null;
    exceptions: string[];
    handoffs: string[];
    ownerRole: string | null;
    participants: string[];
    purpose: string | null;
    steps: Array<{
      description: string;
      responsibleRole: string | null;
      sequence: number;
      systems: string[];
      title: string;
    }>;
    trigger: string | null;
  };
  summary: string;
};

export const DISCOVERY_PROCESS_PROPOSAL_PROMPT_POLICY_VERSION: string;

export function validateDiscoveryProcessProposalDraft(
  value: unknown,
  context?: {
    exceptionIds?: string[];
    observationIds?: string[];
    processIds?: string[];
    roleIds?: string[];
    stepIds?: string[];
    systemIds?: string[];
  },
): DiscoveryProcessProposalDraft | null;
