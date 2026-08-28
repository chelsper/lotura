import { DISCOVERY_QUESTIONS } from "./discovery-questions.mjs";

export const DISCOVERY_ANALYST_AUTHORIZATION_VERSION = "lad-067-alpha-v1";
export const DISCOVERY_ANALYST_PROMPT_POLICY_VERSION = "lad-067-alpha-v1";

export const DISCOVERY_ANALYST_STATES = Object.freeze([
  "known",
  "assumed",
  "unknown",
  "needs_validation",
  "conflicting_observation",
]);

const STATE_SET = new Set(DISCOVERY_ANALYST_STATES);
const QUESTION_BY_KEY = new Map(
  DISCOVERY_QUESTIONS.map((question) => [question.key, question]),
);

const PROCESS_ARRAY_FIELDS = Object.freeze([
  "participants",
  "steps",
  "systems",
  "handoffs",
  "exceptions",
  "dependencies",
  "approvals",
  "alternatePaths",
]);

const SUMMARY_ARRAY_FIELDS = Object.freeze([
  "clear",
  "needsValidation",
  "conflicts",
  "participantsNeeded",
  "openQuestions",
]);

function boundedText(value, maximum, nullable = false) {
  if (value == null && nullable) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) return undefined;
  return normalized;
}

function boundedTextArray(value, maximumItems = 12, maximumLength = 800) {
  if (!Array.isArray(value) || value.length > maximumItems) return undefined;
  const normalized = value.map((item) => boundedText(item, maximumLength));
  return normalized.every(Boolean) ? normalized : undefined;
}

export function validateDiscoveryAnalystResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const narrative = boundedText(value.narrative, 6000);
  const acknowledgement = boundedText(value.acknowledgement, 1000);
  const suggestedEpistemicState = STATE_SET.has(value.suggestedEpistemicState)
    ? value.suggestedEpistemicState
    : null;
  const nextQuestion = value.nextQuestion;
  const selectedQuestion = nextQuestion && QUESTION_BY_KEY.get(nextQuestion.promptKey);
  const questionText = boundedText(nextQuestion?.text, 2000);
  const rationale = boundedText(nextQuestion?.rationale, 1000);
  if (
    !narrative
    || !acknowledgement
    || !suggestedEpistemicState
    || !selectedQuestion
    || selectedQuestion.topic !== nextQuestion.topic
    || !questionText
    || !rationale
  ) return null;

  const process = value.process;
  if (!process || typeof process !== "object" || Array.isArray(process)) return null;
  const normalizedProcess = {
    purpose: process.purpose == null ? null : boundedText(process.purpose, 2000),
    trigger: process.trigger == null ? null : boundedText(process.trigger, 2000),
    endBoundary: process.endBoundary == null
      ? null
      : boundedText(process.endBoundary, 2000),
    ownerRole: process.ownerRole == null ? null : boundedText(process.ownerRole, 500),
  };
  if (Object.values(normalizedProcess).some((item) => item === undefined)) return null;
  for (const field of PROCESS_ARRAY_FIELDS) {
    const items = boundedTextArray(process[field], 20, 1200);
    if (!items) return null;
    normalizedProcess[field] = items;
  }

  const normalized = {
    narrative,
    acknowledgement,
    suggestedEpistemicState,
    process: normalizedProcess,
    nextQuestion: {
      promptKey: selectedQuestion.key,
      topic: selectedQuestion.topic,
      text: questionText,
      rationale,
    },
  };
  for (const field of SUMMARY_ARRAY_FIELDS) {
    const items = boundedTextArray(value[field], 16, 1200);
    if (!items) return null;
    normalized[field] = items;
  }
  return normalized;
}

export function createDiscoveryAnalystFallback(context, reason = "provider_unavailable") {
  const observations = Array.isArray(context?.observations)
    ? context.observations
    : [];
  const covered = new Set(observations.map((observation) => observation.promptKey));
  const question = DISCOVERY_QUESTIONS.find((candidate) => !covered.has(candidate.key))
    ?? DISCOVERY_QUESTIONS.at(-1);
  const processName = boundedText(context?.process?.name, 255) ?? "this Process";
  const needsValidation = observations
    .filter((observation) => observation.epistemicState !== "known")
    .slice(-6)
    .map((observation) => observation.responseText || observation.promptText)
    .filter(Boolean);
  const known = observations
    .filter((observation) => observation.epistemicState === "known")
    .slice(-6)
    .map((observation) => observation.responseText)
    .filter(Boolean);
  return {
    acknowledgement: observations.length > 0
      ? "I preserved what you shared and identified the next part that still needs context."
      : "Let’s build a shared understanding of how this work actually happens today.",
    clear: known,
    conflicts: [],
    narrative: known.length > 0
      ? `So far, the interview has preserved ${known.length} clear observation${known.length === 1 ? "" : "s"} about ${processName}.`
      : `We have not yet established how ${processName} works in practice.`,
    needsValidation,
    openQuestions: [question.prompt],
    participantsNeeded: [],
    process: {
      purpose: null,
      trigger: null,
      endBoundary: null,
      ownerRole: null,
      participants: [],
      steps: [],
      systems: [],
      handoffs: [],
      exceptions: [],
      dependencies: [],
      approvals: [],
      alternatePaths: [],
    },
    suggestedEpistemicState: "known",
    nextQuestion: {
      promptKey: question.key,
      topic: question.topic,
      text: question.prompt,
      rationale: reason === "provider_unavailable"
        ? "The adaptive analyst was temporarily unavailable, so Lotura selected the next uncovered Discovery topic without losing your interview."
        : "This is the next uncovered Discovery topic.",
    },
  };
}
