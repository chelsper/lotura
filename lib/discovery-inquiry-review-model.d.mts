export type DiscoveryInquiryReviewOutcomeKind =
  | "connect_existing_process"
  | "possible_new_process"
  | "spans_multiple_processes"
  | "additional_validation_required"
  | "no_separate_process_needed";

export type DiscoveryInquiryReviewOutcomeDetail = {
  description: string;
  label: string;
  requiresExplanation: boolean;
};

export const DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS:
  readonly DiscoveryInquiryReviewOutcomeKind[];

export const DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS: Record<
  DiscoveryInquiryReviewOutcomeKind,
  DiscoveryInquiryReviewOutcomeDetail
>;

export function isDiscoveryInquiryReviewOutcomeKind(
  value: unknown,
): value is DiscoveryInquiryReviewOutcomeKind;

export function buildInquiryKnowledgeOutcomeCounts(observations: Array<{
  epistemicState:
    | "known"
    | "assumed"
    | "unknown"
    | "needs_validation"
    | "conflicting_observation";
}>): {
  reviewed: number;
  states: Record<
    | "known"
    | "assumed"
    | "unknown"
    | "needs_validation"
    | "conflicting_observation",
    number
  >;
};
