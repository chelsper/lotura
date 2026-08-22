import "server-only";

import {
  executeOpenAIDiscoveryEvaluation,
  type FictionalDiscoveryEvaluationInput,
  type OpenAIDiscoveryEvaluationResult,
  type OpenAIDiscoveryEvaluationTransport,
} from "./discovery-assistance-evaluation.mjs";

export type OpenAIEvaluationTransport = OpenAIDiscoveryEvaluationTransport;
export type OpenAIEvaluationResult = OpenAIDiscoveryEvaluationResult;

const DEFAULT_TIMEOUT_MS = 8_000;

export async function requestOpenAIFictionalEvaluation(
  input: FictionalDiscoveryEvaluationInput,
  transport: OpenAIEvaluationTransport,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<OpenAIEvaluationResult> {
  return executeOpenAIDiscoveryEvaluation(input, transport, timeoutMs);
}
