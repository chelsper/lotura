import {
  nonConfidentialPilotFallback,
  resolveNonConfidentialPilotConfiguration,
} from "./discovery-assistance-non-confidential-pilot.mjs";
import {
  executeOpenAINonConfidentialPilot,
} from "./discovery-assistance-openai-pilot-transport.mjs";

export const OPENAI_PILOT_CREDENTIAL_ENVIRONMENT_VARIABLE =
  "LOTURA_AI_ASSISTANCE_PILOT_OPENAI_API_KEY";

const OPENAI_SERVICE_ACCOUNT_KEY_PATTERN = /^sk-[A-Za-z0-9_-]{16,512}$/;

export class OpenAINonConfidentialPilotCredentialError extends Error {
  constructor(message) {
    super(message);
    this.name = "OpenAINonConfidentialPilotCredentialError";
  }
}

function resolveCredential(environment) {
  const apiKey = String(
    environment[OPENAI_PILOT_CREDENTIAL_ENVIRONMENT_VARIABLE] ?? "",
  ).trim();
  if (!OPENAI_SERVICE_ACCOUNT_KEY_PATTERN.test(apiKey)) {
    throw new OpenAINonConfidentialPilotCredentialError(
      "The dedicated OpenAI pilot credential is unavailable or invalid.",
    );
  }
  return apiKey;
}

export async function executeConfiguredOpenAINonConfidentialPilot(options) {
  if (!options || !options.environment || !options.runtimeAccess) {
    throw new OpenAINonConfidentialPilotCredentialError(
      "The OpenAI pilot runtime boundary requires explicit server configuration.",
    );
  }

  const configuration = resolveNonConfidentialPilotConfiguration(
    options.environment,
    options.runtimeAccess,
  );
  if (!configuration.enabled) {
    return nonConfidentialPilotFallback(configuration.reason);
  }

  const apiKey = resolveCredential(options.environment);
  return executeOpenAINonConfidentialPilot({
    apiKey,
    configuration,
    fetchImpl: options.fetchImpl,
    input: options.input,
    timeoutMs: options.timeoutMs,
  });
}
