export const PROPOSAL_REVIEW_DISPOSITIONS = [
  "approve",
  "reject",
  "needs_validation",
];

export const PROPOSAL_REVIEW_DISPOSITION_LABELS = {
  approve: "Approve to move forward",
  reject: "Do not approve",
  needs_validation: "Needs more validation",
};

export const PROPOSAL_REVIEW_STATUS_LABELS = {
  in_review: "Review in progress",
  approved_for_application: "Approved to move forward",
  approved_in_part: "Some changes approved to move forward",
  needs_validation: "More validation needed",
  not_approved: "No changes approved",
};

export function currentProposalReviewDecisions(decisions) {
  const current = new Map();
  for (const decision of [...decisions].sort(
    (left, right) => left.decisionSequence - right.decisionSequence,
  )) {
    current.set(decision.itemId, decision);
  }
  return current;
}

export function proposalReviewSummary(items, decisions) {
  const reviewItems = items.filter(
    (item) => item.state === "active" && item.action !== "preserve_unresolved",
  );
  const current = currentProposalReviewDecisions(decisions);
  const totals = {
    approved: 0,
    needsValidation: 0,
    rejected: 0,
  };
  for (const item of reviewItems) {
    const disposition = current.get(item.itemId)?.disposition;
    if (disposition === "approve") totals.approved += 1;
    if (disposition === "reject") totals.rejected += 1;
    if (disposition === "needs_validation") totals.needsValidation += 1;
  }
  const decided = totals.approved + totals.rejected + totals.needsValidation;
  const canFinish = reviewItems.length > 0 && decided === reviewItems.length;
  const status = !canFinish
    ? null
    : totals.needsValidation > 0
      ? "needs_validation"
      : totals.approved === reviewItems.length
        ? "approved_for_application"
        : totals.approved > 0 && totals.rejected > 0
          ? "approved_in_part"
          : "not_approved";

  return {
    ...totals,
    canFinish,
    decided,
    remaining: reviewItems.length - decided,
    status,
    total: reviewItems.length,
  };
}
