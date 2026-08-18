import type { ProcessExplorerSeed } from "./process-explorer-data";
import type { OrganizationStructureSeed } from "./organization-structure-data.mjs";

export type KnowledgeGapEvidenceState =
  | "known"
  | "assumed"
  | "unknown"
  | "needs_validation"
  | "conflicting_observation";

export type KnowledgeGapDiscoverySources = {
  decisions: Array<{
    createdAt: string;
    decisionSequence: number;
    disposition: "keep_documented" | "use_in_proposal" | "leave_for_later";
    observationId: string;
  }>;
  observations: Array<{
    createdAt: string;
    epistemicState: KnowledgeGapEvidenceState;
    id: string;
    processKey: string;
    processName: string;
    promptText: string;
    sessionId: string;
    supersedesObservationId: string | null;
  }>;
};

export type KnowledgeGapItem = {
  category: "responsibility" | "discovery";
  evidenceState?: KnowledgeGapEvidenceState;
  fact: string;
  href?: string;
  interviewKey?: string;
  key: string;
  organizationKey: string;
  processKey?: string;
  question: string;
  recordedAt?: string;
  sourceStableKey: string;
  sourceType:
    | "process"
    | "process_step"
    | "role_mandate"
    | "discovery_observation"
    | "discovery_review_choice";
  whyReview: string;
};

export type KnowledgeGaps = {
  counts: { discovery: number; responsibility: number; total: number };
  groups: Array<{
    description: string;
    id: "responsibility" | "discovery";
    items: KnowledgeGapItem[];
    label: string;
  }>;
  items: KnowledgeGapItem[];
};

export function buildKnowledgeGaps(input: {
  asOf: string | Date;
  discovery?: KnowledgeGapDiscoverySources;
  operatingModel: ProcessExplorerSeed;
  organizationKey: string;
  structure: OrganizationStructureSeed;
}): KnowledgeGaps;
