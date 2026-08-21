import type { ExplorerProcess } from "./process-explorer-data";

export type DocumentedQuestionContext = {
  heading: string;
  lines: string[];
};

export type KnownContextObservation = {
  epistemicState: string;
  id: string;
  promptKey: string;
  promptText: string;
  responseText: string | null;
  supersedesObservationId: string | null;
};

export function buildDocumentedQuestionContext(
  process: ExplorerProcess | null | undefined,
  promptKey: string,
): DocumentedQuestionContext | null;

export function buildInquiryKnownContext(input: {
  currentPromptKey: string;
  observations: KnownContextObservation[];
  questionText: string;
  scopeStatement: string;
}): {
  questionText: string;
  savedAnswers: Array<{
    id: string;
    label: string;
    state: string;
    text: string;
  }>;
  scopeStatement: string;
};
