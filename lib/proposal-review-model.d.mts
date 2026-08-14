export type ProposalReviewDisposition =
  | "approve"
  | "reject"
  | "needs_validation";

export type ProposalReviewStatus =
  | "in_review"
  | "approved_for_application"
  | "approved_in_part"
  | "needs_validation"
  | "not_approved";

export type ProposalReviewDecisionLike = {
  decisionSequence: number;
  disposition: ProposalReviewDisposition;
  itemId: string;
};

export const PROPOSAL_REVIEW_DISPOSITIONS: ProposalReviewDisposition[];
export const PROPOSAL_REVIEW_DISPOSITION_LABELS: Record<
  ProposalReviewDisposition,
  string
>;
export const PROPOSAL_REVIEW_STATUS_LABELS: Record<ProposalReviewStatus, string>;

export function currentProposalReviewDecisions<T extends ProposalReviewDecisionLike>(
  decisions: T[],
): Map<string, T>;

export function proposalReviewSummary(
  items: Array<{
    action: string;
    itemId: string;
    state: string;
  }>,
  decisions: ProposalReviewDecisionLike[],
): {
  approved: number;
  canFinish: boolean;
  decided: number;
  needsValidation: number;
  rejected: number;
  remaining: number;
  status: Exclude<ProposalReviewStatus, "in_review"> | null;
  total: number;
};
