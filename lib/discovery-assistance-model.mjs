import { createHash } from "node:crypto";

const ALLOWED_TOPICS = new Set([
  "purpose",
  "boundary",
  "participants_responsibility",
  "sequence",
  "systems",
  "exceptions",
  "dependencies_handoffs",
  "unresolved_questions",
]);
const ALLOWED_SOURCE_KINDS = new Set([
  "process_snapshot",
  "process_observation",
  "inquiry_context",
  "inquiry_observation",
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function fingerprintAssistanceValue(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function normalizeParticipantFocus(value) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized.slice(0, 2000) : null;
}

export function validateAssistancePacket(packet) {
  if (!packet || (packet.sessionKind !== "process" && packet.sessionKind !== "inquiry")) {
    return false;
  }
  if (!ALLOWED_TOPICS.has(packet.topic)) return false;
  if (!String(packet.promptKey ?? "").trim()) return false;
  if (!String(packet.currentQuestion ?? "").trim()) return false;
  if (!Array.isArray(packet.sources) || packet.sources.length < 1 || packet.sources.length > 8) {
    return false;
  }
  return packet.sources.every((source, index) =>
    source
    && Number(source.sequence) === index + 1
    && ALLOWED_SOURCE_KINDS.has(source.kind)
    && source.snapshot
    && typeof source.snapshot === "object"
    && !Array.isArray(source.snapshot));
}

function topicLabel(topic) {
  return {
    boundary: "where this work starts or finishes",
    dependencies_handoffs: "the handoffs and work connected to this",
    exceptions: "what changes the usual path",
    participants_responsibility: "who performs or oversees the work",
    purpose: "what this work accomplishes",
    sequence: "how the work happens in practice",
    systems: "the technology and records involved",
    unresolved_questions: "what still needs confirmation",
  }[topic] ?? "this part of the work";
}

function contextualReason(packet) {
  const uncertain = packet.sources.find((source) => {
    const state = source.snapshot?.epistemicState;
    return state && state !== "known";
  });
  if (uncertain) {
    return "Earlier evidence about this topic was left uncertain or needs validation.";
  }
  if (packet.sessionKind === "process") {
    return "This asks about what may differ from the current documented Process.";
  }
  return "This keeps the conversation focused on the original organizational question.";
}

export function createMockQuestionSuggestions(packet) {
  if (!validateAssistancePacket(packet)) {
    throw new Error("The bounded assistance packet is invalid.");
  }
  const label = topicLabel(packet.topic);
  const focus = normalizeParticipantFocus(packet.participantFocus);
  const suggestions = [
    {
      kind: "follow_up_question",
      promptKey: packet.promptKey,
      rationale: contextualReason(packet),
      suggestedText: focus
        ? `Thinking specifically about ${focus}, what should someone understand about ${label}?`
        : `What is the most important thing someone should understand about ${label}?`,
      topic: packet.topic,
    },
  ];

  if (packet.sources.some((source) => source.kind.endsWith("observation"))) {
    suggestions.push({
      kind: "follow_up_question",
      promptKey: packet.promptKey,
      rationale: "An earlier answer is available, so this asks only about what changed or remains incomplete.",
      suggestedText: `What, if anything, has changed or still needs clarification about ${label}?`,
      topic: packet.topic,
    });
  }

  if (packet.topic === "dependencies_handoffs" || packet.topic === "systems") {
    suggestions.push({
      kind: "follow_up_question",
      promptKey: packet.promptKey,
      rationale: "Connected work can be missed when only the immediate task is described.",
      suggestedText: "Who or what else depends on this, and what would they notice if it changed?",
      topic: packet.topic,
    });
  }

  return suggestions.slice(0, 3);
}

export function createMockClarityDraft(packet, originalText) {
  if (!validateAssistancePacket(packet)) {
    throw new Error("The bounded assistance packet is invalid.");
  }
  const original = String(originalText ?? "").trim();
  if (!original || original.length > 10000) {
    throw new Error("The original participant wording is invalid.");
  }
  const compact = original.replace(/\s+/g, " ");
  const suggestedText = compact.length > 0
    ? `${compact.charAt(0).toUpperCase()}${compact.slice(1)}`
    : compact;
  return {
    kind: "clarity_draft",
    originalText: original,
    promptKey: packet.promptKey,
    rationale: "This draft only improves spacing and readability. Review it before preserving your answer.",
    suggestedText,
    topic: packet.topic,
  };
}

export function validateAssistanceSuggestions(suggestions) {
  return Array.isArray(suggestions)
    && suggestions.length > 0
    && suggestions.length <= 3
    && suggestions.every((suggestion) =>
      (suggestion.kind === "follow_up_question" || suggestion.kind === "clarity_draft")
      && ALLOWED_TOPICS.has(suggestion.topic)
      && String(suggestion.promptKey ?? "").trim().length > 0
      && String(suggestion.suggestedText ?? "").trim().length > 0
      && String(suggestion.suggestedText).length <= 2000
      && String(suggestion.rationale ?? "").trim().length > 0
      && String(suggestion.rationale).length <= 1000
      && (suggestion.kind === "follow_up_question"
        ? suggestion.originalText == null
        : String(suggestion.originalText ?? "").trim().length > 0));
}

export const validateMockSuggestions = validateAssistanceSuggestions;
