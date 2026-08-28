import type { DiscoveryAnalystResult } from "./discovery-analyst-model.mjs";

export const DISCOVERY_ANALYST_MODEL: "gpt-5.6-terra";
export const DISCOVERY_ANALYST_RESPONSES_ENDPOINT: "https://api.openai.com/v1/responses";
export function buildDiscoveryAnalystRequest(
  context: Record<string, unknown>,
  focus?: string | null,
): Record<string, unknown>;
export function executeOpenAIDiscoveryAnalyst(options: {
  apiKey: string;
  context: Record<string, unknown>;
  fetchImpl: typeof fetch;
  focus?: string | null;
  providerProjectId: string;
  timeoutMs?: number;
}): Promise<
  | {
      ok: true;
      providerMetadata: {
        cachedInputTokens: number;
        durationMs: number;
        inputTokens: number;
        model: "gpt-5.6-terra";
        outputTokens: number;
        promptPolicyVersion: "lad-067-alpha-v1";
        providerProjectId: string;
        requestCount: 1;
        status: "completed";
        totalTokens: number;
      };
      result: DiscoveryAnalystResult;
    }
  | { ok: false; reason: string }
>;
