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

function containsSeveralClaims(value) {
  const text = String(value || "");
  const numberedItems = text.match(/(?:^|\s)\d+\.\s/g)?.length || 0;
  const bulletedItems = text.match(/(?:^|\n)\s*[-•]\s/g)?.length || 0;
  const namedSections = /\bbefore:\s/i.test(text) && /\bafter:\s/i.test(text);
  return numberedItems >= 3 || bulletedItems >= 3 || namedSections;
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
        detail: "This answer is marked Known but uses language that explicitly signals uncertainty or a required check. Review the evidence state; Lotura has not changed it.",
        id: `known-uncertainty-${observation.id}`,
        kind: "certainty_language_mismatch",
        observationIds: [observation.id],
        title: "Certainty and wording may not agree",
      });
    }

    if (containsSeveralClaims(responseText)) {
      signals.push({
        detail: "This answer contains several claims that may not share one evidence state. Review the claims separately before reconciliation.",
        id: `multi-claim-${observation.id}`,
        kind: "mixed_claims",
        observationIds: [observation.id],
        title: "One answer may contain mixed evidence",
      });
    }

    if (observation.supersedesObservationId) {
      const prior = byId.get(observation.supersedesObservationId);
      if (
        prior?.responseText &&
        !materiallyCarriesForward(prior.responseText, responseText)
      ) {
        signals.push({
          detail: "The correction changes the active record but appears to omit substantive detail from the prior observation. Review both records before using this evidence.",
          id: `correction-context-${observation.id}`,
          kind: "correction_context_loss",
          observationIds: [prior.id, observation.id],
          title: "A correction may have dropped context",
        });
      }
    }
  }

  const start = active.find((observation) => observation.promptKey === "boundary_start");
  const end = active.find((observation) => observation.promptKey === "boundary_end");
  if (start && end && start.epistemicState !== end.epistemicState) {
    signals.push({
      detail: "The start and end boundaries use different evidence states. That may be legitimate, but the complete Process boundary should be reviewed explicitly before reconciliation.",
      id: `boundary-state-${start.id}-${end.id}`,
      kind: "boundary_state_difference",
      observationIds: [start.id, end.id],
      title: "Process-boundary certainty differs",
    });
  }

  return signals;
}
