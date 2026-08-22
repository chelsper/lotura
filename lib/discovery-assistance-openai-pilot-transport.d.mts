import type {
  DiscoveryAssistanceSuggestion,
} from "./discovery-assistance-model.mjs";
import type {
  NonConfidentialPilotConfiguration,
  NonConfidentialPilotInput,
} from "./discovery-assistance-non-confidential-pilot.mjs";

type EnabledPilotConfiguration = Extract<
  NonConfidentialPilotConfiguration,
  { enabled: true }
>;

export const OPENAI_RESPONSES_ENDPOINT:
  "https://api.openai.com/v1/responses";

export type OpenAINonConfidentialPilotResult =
  | {
      ok: true;
      providerMetadata: {
        inputTokens: number | null;
        model: "gpt-5.6-terra";
        outputTokens: number | null;
        promptPolicyVersion: "lad-064-v4";
        providerProjectId: string;
        requestCount: 1;
        status: "completed";
        totalTokens: number | null;
      };
      suggestions: DiscoveryAssistanceSuggestion[];
    }
  | {
      fallback: "standard_questions";
      ok: false;
      reason: string;
    };

export function executeOpenAINonConfidentialPilot(options: {
  apiKey: string;
  configuration: EnabledPilotConfiguration;
  fetchImpl: typeof fetch;
  input: NonConfidentialPilotInput;
  timeoutMs?: number;
}): Promise<OpenAINonConfidentialPilotResult>;
