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

    if (observation.epistemicState === "known" && observation.supersedesObservationId) {
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

  return signals;
}
