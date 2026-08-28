import type { DiscoveryProcessProposalDraft } from "./discovery-process-proposal-draft-model.mjs";

export const DISCOVERY_PROCESS_PROPOSAL_MODEL: string;
export const DISCOVERY_PROCESS_PROPOSAL_RESPONSES_ENDPOINT: string;

export function buildDiscoveryProcessProposalRequest(
  context: Record<string, unknown>,
): Record<string, unknown>;

export function executeOpenAIDiscoveryProcessProposal(options: {
  apiKey: string;
  context: Record<string, unknown>;
  fetchImpl: typeof fetch;
  providerProjectId: string;
  timeoutMs?: number;
  validationContext: {
    exceptionIds: string[];
    observationIds: string[];
    processIds: string[];
    roleIds: string[];
    stepIds: string[];
    systemIds: string[];
  };
}): Promise<
  | {
      draft: DiscoveryProcessProposalDraft;
      ok: true;
      providerMetadata: {
        cachedInputTokens: number;
        durationMs: number;
        inputTokens: number;
        model: string;
        outputTokens: number;
        promptPolicyVersion: string;
        providerProjectId: string;
        requestCount: 1;
        status: "completed";
        totalTokens: number;
      };
    }
  | { ok: false; reason: string }
>;
