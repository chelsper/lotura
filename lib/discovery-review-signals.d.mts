export type DiscoveryReviewObservation = {
  epistemicState:
    | "known"
    | "assumed"
    | "unknown"
    | "needs_validation"
    | "conflicting_observation";
  id: string;
  promptKey: string;
  responseText: string | null;
  supersedesObservationId: string | null;
};

export type DiscoveryReviewSignal = {
  detail: string;
  id: string;
  kind:
    | "boundary_state_difference"
    | "certainty_language_mismatch"
    | "correction_context_loss"
    | "mixed_claims";
  observationIds: string[];
  title: string;
};

export function activeDiscoveryObservations<T extends DiscoveryReviewObservation>(
  observations: readonly T[],
): T[];

export function analyzeDiscoveryReview(
  observations: readonly DiscoveryReviewObservation[],
): DiscoveryReviewSignal[];
