export type DiscoveryObservationTopic =
  | "purpose"
  | "boundary"
  | "participants_responsibility"
  | "sequence"
  | "systems"
  | "exceptions"
  | "dependencies_handoffs"
  | "unresolved_questions";

export type DiscoveryQuestion = {
  key: string;
  topic: DiscoveryObservationTopic;
  label: string;
  prompt: string;
  helper: string;
};

export const DISCOVERY_QUESTION_CATALOG_VERSION: string;
export const DISCOVERY_QUESTIONS: readonly DiscoveryQuestion[];
export const DISCOVERY_FIRST_QUESTION_KEY: string;
export const DISCOVERY_REVIEW_KEY: string;
export function getDiscoveryQuestion(key: string): DiscoveryQuestion | null;
export function getNextDiscoveryQuestionKey(key: string): string | null;
