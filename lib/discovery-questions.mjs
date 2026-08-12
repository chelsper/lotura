export const DISCOVERY_QUESTION_CATALOG_VERSION = "guided-interview-v1";

export const DISCOVERY_QUESTIONS = Object.freeze([
  {
    key: "purpose",
    topic: "purpose",
    label: "Purpose",
    prompt: "What repeatable work does this Process accomplish, and why does it exist?",
    helper: "Describe the work in plain language. An incomplete answer is useful when it is honest.",
  },
  {
    key: "boundary_start",
    topic: "boundary",
    label: "Where it starts",
    prompt: "What event or handoff starts this Process?",
    helper: "Name the trigger and the first meaningful action. Note uncertainty instead of inventing a boundary.",
  },
  {
    key: "boundary_end",
    topic: "boundary",
    label: "Where it ends",
    prompt: "What must be true before this Process is considered complete?",
    helper: "If different people use different endpoints, record that as a conflicting observation.",
  },
  {
    key: "participants_responsibility",
    topic: "participants_responsibility",
    label: "People and responsibility",
    prompt: "Which durable responsibilities and current participants perform or oversee this work?",
    helper: "Describe what each participant does. Do not infer an Operational Role from a title or reporting line.",
  },
  {
    key: "sequence",
    topic: "sequence",
    label: "Sequence",
    prompt: "What are the high-level steps, in the order they usually happen?",
    helper: "Keep this at the operating-model level. Alternate paths can be captured separately.",
  },
  {
    key: "systems",
    topic: "systems",
    label: "Technology",
    prompt: "Which Systems or operational records support this work, and how are they used?",
    helper: "A System being named does not establish criticality, ownership, or system-of-record status.",
  },
  {
    key: "exceptions",
    topic: "exceptions",
    label: "Alternate paths",
    prompt: "What legitimate exceptions or alternate paths change how this Process is performed?",
    helper: "Capture accepted variations. A mistake or unresolved problem is not automatically an Exception.",
  },
  {
    key: "dependencies_handoffs",
    topic: "dependencies_handoffs",
    label: "Dependencies and handoffs",
    prompt: "Which work must happen before this Process, and which work receives or follows it?",
    helper: "Record only explicit handoffs and dependencies. Shared Systems or reporting lines do not prove a dependency.",
  },
  {
    key: "unresolved_questions",
    topic: "unresolved_questions",
    label: "What remains uncertain",
    prompt: "What gaps, assumptions, disagreements, or questions should be preserved for later validation?",
    helper: "Discovery is an expected outcome of documentation. Do not resolve uncertainty merely to finish the interview.",
  },
]);

export const DISCOVERY_FIRST_QUESTION_KEY = DISCOVERY_QUESTIONS[0].key;
export const DISCOVERY_REVIEW_KEY = "review";

export function getDiscoveryQuestion(key) {
  return DISCOVERY_QUESTIONS.find((question) => question.key === key) || null;
}

export function getNextDiscoveryQuestionKey(key) {
  const index = DISCOVERY_QUESTIONS.findIndex((question) => question.key === key);
  if (index < 0) return null;
  return DISCOVERY_QUESTIONS[index + 1]?.key || DISCOVERY_REVIEW_KEY;
}
