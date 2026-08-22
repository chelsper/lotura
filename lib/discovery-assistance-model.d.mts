export type DiscoveryAssistanceTopic =
  | "purpose"
  | "boundary"
  | "participants_responsibility"
  | "sequence"
  | "systems"
  | "exceptions"
  | "dependencies_handoffs"
  | "unresolved_questions";

export type DiscoveryAssistanceSource = {
  kind:
    | "process_snapshot"
    | "process_observation"
    | "inquiry_context"
    | "inquiry_observation";
  sequence: number;
  snapshot: Record<string, unknown>;
  [key: string]: unknown;
};

export type DiscoveryAssistancePacket = {
  currentQuestion: string;
  participantFocus: string | null;
  promptKey: string;
  sessionKind: "process" | "inquiry";
  sources: DiscoveryAssistanceSource[];
  topic: DiscoveryAssistanceTopic;
};

export type DiscoveryAssistanceSuggestion = {
  kind: "follow_up_question" | "clarity_draft";
  originalText?: string;
  promptKey: string;
  rationale: string;
  suggestedText: string;
  topic: DiscoveryAssistanceTopic;
};

export function fingerprintAssistanceValue(value: unknown): string;
export function normalizeParticipantFocus(value: unknown): string | null;
export function validateAssistancePacket(
  packet: unknown,
): packet is DiscoveryAssistancePacket;
export function createMockQuestionSuggestions(
  packet: DiscoveryAssistancePacket,
): DiscoveryAssistanceSuggestion[];
export function createMockClarityDraft(
  packet: DiscoveryAssistancePacket,
  originalText: string,
): DiscoveryAssistanceSuggestion;
export function validateMockSuggestions(
  suggestions: unknown,
): suggestions is DiscoveryAssistanceSuggestion[];
