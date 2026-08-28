import type { RuntimeAccessConfiguration } from "./authentication";
import type {
  NonConfidentialPilotInput,
} from "./discovery-assistance-non-confidential-pilot.mjs";
import type {
  OpenAINonConfidentialPilotResult,
} from "./discovery-assistance-openai-pilot-transport.mjs";

export const OPENAI_PILOT_CREDENTIAL_ENVIRONMENT_VARIABLE:
  "LOTURA_AI_ASSISTANCE_PILOT_OPENAI_API_KEY";

export class OpenAINonConfidentialPilotCredentialError extends Error {}

export function resolveOpenAIPilotCredential(
  environment: Record<string, string | undefined>,
): string;

export function executeConfiguredOpenAINonConfidentialPilot(options: {
  environment: Record<string, string | undefined>;
  fetchImpl: typeof fetch;
  input: NonConfidentialPilotInput;
  runtimeAccess: RuntimeAccessConfiguration;
  timeoutMs?: number;
}): Promise<OpenAINonConfidentialPilotResult>;
