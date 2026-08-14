import type {
  DiscoveryMappingItemLike,
} from "./discovery-mapping-model.mjs";
import type {
  DiscoveryProposalDecisionLike,
} from "./discovery-proposal-model.mjs";

export type KnowledgeOutcomeObservationLike = {
  epistemicState:
    | "known"
    | "assumed"
    | "unknown"
    | "needs_validation"
    | "conflicting_observation";
  id: string;
  topic:
    | "purpose"
    | "boundary"
    | "participants_responsibility"
    | "sequence"
    | "systems"
    | "exceptions"
    | "dependencies_handoffs"
    | "unresolved_questions";
};

export type KnowledgeOutcomeMappingLike = {
  items: DiscoveryMappingItemLike[];
  status: "draft" | "ready_for_proposal_review";
};

export type DiscoveryKnowledgeOutcome = {
  completedAt: string | null;
  completedByActor: string | null;
  conflictingObservationIds: string[];
  documentedObservationIds: string[];
  laterObservationIds: string[];
  mappingStatus: "none" | "draft" | "ready_for_proposal_review";
  needsValidationObservationIds: string[];
  noChangesProposed: boolean;
  reviewedObservationIds: string[];
  selectedObservationIds: string[];
  stage:
    | "no_changes"
    | "evidence_selected"
    | "mapping_in_progress"
    | "ready_for_proposal_review";
  structuredChangeCount: number;
  unresolvedBoundaryObservationIds: string[];
  unresolvedMappingCount: number;
};

export function buildDiscoveryKnowledgeOutcome(input: {
  completedAt?: string | null;
  completedByActor?: string | null;
  decisions: DiscoveryProposalDecisionLike[];
  mapping?: KnowledgeOutcomeMappingLike | null;
  observations: KnowledgeOutcomeObservationLike[];
}): DiscoveryKnowledgeOutcome;
