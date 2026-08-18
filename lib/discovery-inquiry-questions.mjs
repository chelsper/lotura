export const DISCOVERY_INQUIRY_QUESTION_CATALOG_VERSION =
  "question-first-interview-v1";

export const DISCOVERY_INQUIRY_QUESTIONS = Object.freeze([
  {
    key: "work_to_understand",
    topic: "purpose",
    label: "What you want to understand",
    prompt: "What work or situation are you trying to understand, and why does it matter?",
    helper: "Describe the work in ordinary language. You do not need to decide whether it is a separate Process.",
  },
  {
    key: "boundary_start",
    topic: "boundary",
    label: "Where it seems to start",
    prompt: "What event, request, or handoff seems to start this work?",
    helper: "Record what you know today. If the starting point is unclear, preserve that uncertainty.",
  },
  {
    key: "boundary_end",
    topic: "boundary",
    label: "Where it seems to end",
    prompt: "What appears to be true when this work is finished?",
    helper: "Different endpoints may indicate more than one Process, but do not decide that yet.",
  },
  {
    key: "participants_responsibility",
    topic: "participants_responsibility",
    label: "People and responsibility",
    prompt: "Who participates in this work, and what does each participant actually do?",
    helper: "Describe responsibilities without inferring an Operational Role from a title or reporting line.",
  },
  {
    key: "sequence",
    topic: "sequence",
    label: "What happens",
    prompt: "What happens, in the order it usually occurs?",
    helper: "A high-level description is enough. Preserve alternate paths separately.",
  },
  {
    key: "systems",
    topic: "systems",
    label: "Technology",
    prompt: "Which Systems or operational records support this work, and how are they used?",
    helper: "Naming a System does not establish criticality, ownership, or system-of-record status.",
  },
  {
    key: "exceptions",
    topic: "exceptions",
    label: "Alternate paths",
    prompt: "What legitimate alternate paths change how this work happens?",
    helper: "Capture accepted variations. A mistake or unresolved problem is not automatically an Exception.",
  },
  {
    key: "dependencies_handoffs",
    topic: "dependencies_handoffs",
    label: "What comes before and after",
    prompt: "What work must happen before this, and what work receives or follows it?",
    helper: "Record explicit handoffs. Shared Systems or reporting relationships do not prove a dependency.",
  },
  {
    key: "unresolved_questions",
    topic: "unresolved_questions",
    label: "What remains uncertain",
    prompt: "What gaps, assumptions, disagreements, or boundary questions should remain open for later validation?",
    helper: "Unknown is an acceptable answer. Do not choose a Process merely to finish the interview.",
  },
]);

export const DISCOVERY_INQUIRY_FIRST_QUESTION_KEY =
  DISCOVERY_INQUIRY_QUESTIONS[0].key;
export const DISCOVERY_INQUIRY_REVIEW_KEY = "review";

export function getDiscoveryInquiryQuestion(key) {
  return DISCOVERY_INQUIRY_QUESTIONS.find((question) => question.key === key)
    || null;
}

export function getNextDiscoveryInquiryQuestionKey(key) {
  const index = DISCOVERY_INQUIRY_QUESTIONS.findIndex(
    (question) => question.key === key,
  );
  if (index < 0) return null;
  return DISCOVERY_INQUIRY_QUESTIONS[index + 1]?.key
    || DISCOVERY_INQUIRY_REVIEW_KEY;
}
