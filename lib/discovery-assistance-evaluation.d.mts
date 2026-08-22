import type {
  DiscoveryAssistancePacket,
  DiscoveryAssistanceSuggestion,
} from "./discovery-assistance-model.mjs";

export type FictionalDiscoveryEvaluationInput = {
  assistanceKind: "clarity_draft" | "question_suggestions";
  dataClassification: "fictional";
  originalText?: string | null;
  packet: DiscoveryAssistancePacket;
};

export type DiscoveryAssistanceHumanReview = {
  conversational: boolean;
  faithfulToSources: boolean;
  nonRepetitive: boolean;
  relevant: boolean;
};

export type OpenAIDiscoveryEvaluationRequest = {
  background: false;
  input: Array<{
    content: Array<{ text: string; type: "input_text" }>;
    role: "developer" | "user";
  }>;
  max_output_tokens: number;
  model: string;
  reasoning: { effort: "low" };
  store: false;
  text: {
    format: {
      name: string;
      schema: Record<string, unknown>;
      strict: true;
      type: "json_schema";
    };
    verbosity: "low";
  };
  tool_choice: "none";
  tools: [];
};

export type OpenAIDiscoveryEvaluationTransport = (input: {
  request: OpenAIDiscoveryEvaluationRequest;
  timeoutMs: number;
}) => Promise<{ outputText: string; status: "completed" | "failed" }>;

export type OpenAIDiscoveryEvaluationResult =
  | { ok: true; suggestions: DiscoveryAssistanceSuggestion[] }
  | {
      fallback: "standard_questions";
      ok: false;
      reason: "invalid_response" | "provider_unavailable" | "timeout";
    };

export const OPENAI_DISCOVERY_EVALUATION_CONTRACT: Readonly<{
  dataClassification: "fictional";
  modelIdentifier: "gpt-5.6-terra";
  promptPolicyVersion: "lad-064-eval-v1";
  providerKey: "openai";
  reasoningEffort: "low";
}>;

export function buildOpenAIDiscoveryEvaluationRequest(
  input: FictionalDiscoveryEvaluationInput,
): OpenAIDiscoveryEvaluationRequest;

export function parseOpenAIDiscoveryEvaluationOutput(
  input: FictionalDiscoveryEvaluationInput,
  outputText: string,
): DiscoveryAssistanceSuggestion[];

export function evaluateDiscoveryAssistanceCandidate(input: {
  humanReview?: DiscoveryAssistanceHumanReview | null;
  input: FictionalDiscoveryEvaluationInput;
  outputText: string;
}): {
  automatedChecks: {
    noAuthorityClaim: boolean;
    nonLeading: boolean;
    nonRepetitive: boolean;
    preservesUncertainty: boolean;
    safeContent: boolean;
    schemaAndContextValid: boolean;
  };
  humanReviewComplete: boolean;
  passesReleaseGate: boolean;
  suggestions: DiscoveryAssistanceSuggestion[];
};

export function executeOpenAIDiscoveryEvaluation(
  input: FictionalDiscoveryEvaluationInput,
  transport: OpenAIDiscoveryEvaluationTransport,
  timeoutMs?: number,
): Promise<OpenAIDiscoveryEvaluationResult>;
