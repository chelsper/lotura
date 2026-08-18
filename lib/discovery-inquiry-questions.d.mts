export type DiscoveryInquiryQuestion = {
  helper: string;
  key: string;
  label: string;
  prompt: string;
  topic:
    | "purpose"
    | "boundary"
    | "participants_responsibility"
    | "sequence"
    | "systems"
    | "exceptions"
    | "dependencies_handoffs"
    | "unresolved_questions";
};

export const DISCOVERY_INQUIRY_QUESTION_CATALOG_VERSION: string;
export const DISCOVERY_INQUIRY_QUESTIONS: readonly DiscoveryInquiryQuestion[];
export const DISCOVERY_INQUIRY_FIRST_QUESTION_KEY: string;
export const DISCOVERY_INQUIRY_REVIEW_KEY: string;

export function getDiscoveryInquiryQuestion(
  key: string,
): DiscoveryInquiryQuestion | null;
export function getNextDiscoveryInquiryQuestionKey(key: string): string | null;
