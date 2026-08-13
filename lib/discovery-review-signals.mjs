const UNCERTAINTY_LANGUAGE = [
  /\b(?:i believe|i assume|i think|not sure|unsure|unclear|unknown)\b/i,
  /\b(?:needs?|requires?|must be) (?:further )?(?:validation|verification|confirmation)\b/i,
  /\b(?:not|isn't|is not) (?:yet )?(?:validated|verified|confirmed)\b/i,
  /\b(?:confirm|verify|validate) whether\b/i,
];

const META_ONLY_CORRECTION =
  /^(?:changed|change|reclassified|reclassify|classified|same answer|see (?:the )?(?:original|prior|above))/i;

const CONTENT_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by",
  "for", "from", "has", "have", "in", "into", "is", "it", "of", "on",
  "or", "our", "that", "the", "their", "then", "this", "to", "was",
  "were", "with",
]);

function contentWords(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g)
      ?.filter((word) => word.length > 2 && !CONTENT_STOP_WORDS.has(word)) || [],
  );
}

function materiallyCarriesForward(priorText, currentText) {
  if (!priorText || !currentText) return false;
  if (META_ONLY_CORRECTION.test(currentText.trim())) return false;

  const priorWords = contentWords(priorText);
  const currentWords = contentWords(currentText);
  if (priorWords.size === 0 || currentWords.size === 0) return false;

  let shared = 0;
  for (const word of currentWords) {
    if (priorWords.has(word)) shared += 1;
  }
  const overlap = shared / Math.min(priorWords.size, currentWords.size);
  const lengthRatio = currentText.trim().length / priorText.trim().length;
  return overlap >= 0.35 || lengthRatio >= 0.75;
}

function describeSeveralClaims(value) {
  const text = String(value || "");
  const numberedItems = text.match(/(?:^|\s)\d+\.\s/g)?.length || 0;
  const bulletedItems = text.match(/(?:^|\n)\s*[-•]\s/g)?.length || 0;
  const namedSections = /\bbefore:\s/i.test(text) && /\bafter:\s/i.test(text);
  if (numberedItems >= 3) return `${numberedItems} numbered steps`;
  if (bulletedItems >= 3) return `${bulletedItems} separate items`;
  if (namedSections) return "both work that happens before and work that happens after this Process";
  return null;
}

function displayEpistemicState(value) {
  return {
    assumed: "Assumed",
    conflicting_observations: "Conflicting observations",
    known: "Known",
    needs_validation: "Needs validation",
    unknown: "Unknown",
  }[value] || String(value || "Unclassified");
}

export function activeDiscoveryObservations(observations) {
  const superseded = new Set(
    observations
      .map((observation) => observation.supersedesObservationId)
      .filter(Boolean),
  );
  return observations.filter((observation) => !superseded.has(observation.id));
}

export function analyzeDiscoveryReview(observations) {
  const byId = new Map(observations.map((observation) => [observation.id, observation]));
  const active = activeDiscoveryObservations(observations);
  const signals = [];

  for (const observation of active) {
    const responseText = observation.responseText || "";
    if (
      observation.epistemicState === "known" &&
      UNCERTAINTY_LANGUAGE.some((pattern) => pattern.test(responseText))
    ) {
      signals.push({
        detail: "This answer is marked Known, but its wording says that something is uncertain or still needs to be checked. If the wording is accurate, append a correction with the right certainty label. If the Known label is accurate, clarify the wording. Lotura has not changed either one.",
        id: `known-uncertainty-${observation.id}`,
        kind: "certainty_language_mismatch",
        observationIds: [observation.id],
        title: "Check the certainty label",
      });
    }

    const severalClaims = describeSeveralClaims(responseText);
    if (severalClaims) {
      const evidenceLabel = displayEpistemicState(observation.epistemicState);
      signals.push({
        detail: `This answer includes ${severalClaims}. The entire answer is currently marked ${evidenceLabel}. If that label is accurate for every part, no change is needed. If not, append a correction that keeps the full answer and identifies which parts need validation.`,
        id: `multi-claim-${observation.id}`,
        kind: "mixed_claims",
        observationIds: [observation.id],
        title: "Check whether every part is confirmed",
      });
    }

    if (observation.supersedesObservationId) {
      const prior = byId.get(observation.supersedesObservationId);
      if (
        prior?.responseText &&
        !materiallyCarriesForward(prior.responseText, responseText)
      ) {
        signals.push({
          detail: "The newer correction changes the certainty label but does not repeat much of the earlier description. Review both records. If the earlier description is still accurate, append a correction that keeps that detail and applies the intended certainty label.",
          id: `correction-context-${observation.id}`,
          kind: "correction_context_loss",
          observationIds: [prior.id, observation.id],
          title: "A correction may have left out useful detail",
        });
      }
    }
  }

  const start = active.find((observation) => observation.promptKey === "boundary_start");
  const end = active.find((observation) => observation.promptKey === "boundary_end");
  if (start && end && start.epistemicState !== end.epistemicState) {
    const startLabel = displayEpistemicState(start.epistemicState);
    const endLabel = displayEpistemicState(end.epistemicState);
    signals.push({
      detail: `The Process start is marked ${startLabel}, while the Process end is marked ${endLabel}. This may be correct. Review both boundaries; if either label is wrong, append a correction before using the interview to update the Process.`,
      id: `boundary-state-${start.id}-${end.id}`,
      kind: "boundary_state_difference",
      observationIds: [start.id, end.id],
      title: "Check the start and end labels",
    });
  }

  return signals;
}
