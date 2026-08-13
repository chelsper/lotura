import { activeDiscoveryObservations } from "./discovery-review-signals.mjs";

export const DISCOVERY_RECONCILIATION_SECTIONS = [
  {
    description: "Why the Process exists and what it is intended to accomplish.",
    key: "definition",
    label: "Purpose",
    topics: ["purpose"],
  },
  {
    description: "What starts the Process and what must be true when it ends.",
    key: "boundaries",
    label: "Start and end boundaries",
    topics: ["boundary"],
  },
  {
    description: "Durable responsibilities and the people currently involved in the work.",
    key: "responsibility",
    label: "Ownership and responsibility",
    topics: ["participants_responsibility"],
  },
  {
    description: "The work described in its usual order.",
    key: "steps",
    label: "Steps",
    topics: ["sequence"],
  },
  {
    description: "Technology and operational records used by the Process.",
    key: "systems",
    label: "Systems",
    topics: ["systems"],
  },
  {
    description: "Legitimate alternate paths that change how the work is performed.",
    key: "exceptions",
    label: "Exceptions",
    topics: ["exceptions"],
  },
  {
    description: "Work that must happen before this Process or receives work from it.",
    key: "dependencies",
    label: "Dependencies and handoffs",
    topics: ["dependencies_handoffs"],
  },
  {
    description: "Questions, gaps, assumptions, and disagreements preserved for later validation.",
    key: "unresolved",
    label: "Unresolved knowledge",
    topics: ["unresolved_questions"],
  },
];

export function buildDiscoveryReconciliationEvidence(observations) {
  const active = activeDiscoveryObservations(observations);

  return DISCOVERY_RECONCILIATION_SECTIONS.map((section) => ({
    ...section,
    evidence: active
      .filter((observation) => section.topics.includes(observation.topic))
      .map((observation) => ({
        epistemicState: observation.epistemicState,
        id: observation.id,
        promptKey: observation.promptKey,
        promptText: observation.promptText,
        responseText: observation.responseText,
        sequence: observation.sequence,
      })),
  }));
}
