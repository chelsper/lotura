export const DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS = [
  "connect_existing_process",
  "possible_new_process",
  "possible_new_process_family",
  "possible_policy",
  "spans_multiple_processes",
  "additional_validation_required",
  "no_separate_process_needed",
];

export const DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS = {
  connect_existing_process: {
    description:
      "Keep this evidence connected to one existing Process for future review.",
    label: "Connect this understanding to an existing Process",
    requiresExplanation: false,
  },
  possible_new_process: {
    description:
      "Preserve that the evidence supports reviewing a separate shared working Draft.",
    label: "This may be a new Process",
    requiresExplanation: true,
  },
  possible_new_process_family: {
    description:
      "Preserve that this appears to group several related Processes rather than describe one repeatable flow.",
    label: "This may be a new Process Family",
    requiresExplanation: true,
  },
  possible_policy: {
    description:
      "Preserve this as a governing Policy candidate without forcing it into the Process hierarchy.",
    label: "This may be a Policy or governing document",
    requiresExplanation: true,
  },
  spans_multiple_processes: {
    description:
      "Preserve that the work appears to cross more than one Process boundary.",
    label: "This crosses several Processes",
    requiresExplanation: true,
  },
  additional_validation_required: {
    description:
      "Record what still needs another participant, Unit, or authoritative source.",
    label: "More validation is needed",
    requiresExplanation: true,
  },
  no_separate_process_needed: {
    description:
      "Conclude that this review does not currently justify another Process.",
    label: "No separate Process is needed",
    requiresExplanation: false,
  },
};

export function isDiscoveryInquiryReviewOutcomeKind(value) {
  return DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS.includes(value);
}

export function buildInquiryKnowledgeOutcomeCounts(observations) {
  const counts = {
    assumed: 0,
    conflicting_observation: 0,
    known: 0,
    needs_validation: 0,
    unknown: 0,
  };
  for (const observation of observations) {
    if (Object.hasOwn(counts, observation.epistemicState)) {
      counts[observation.epistemicState] += 1;
    }
  }
  return { reviewed: observations.length, states: counts };
}
