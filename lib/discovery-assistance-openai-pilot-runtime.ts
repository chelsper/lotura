import "server-only";

import type { RuntimeAccessConfiguration } from "./authentication";
import type {
  NonConfidentialPilotInput,
} from "./discovery-assistance-non-confidential-pilot.mjs";
import {
  executeConfiguredOpenAINonConfidentialPilot,
} from "./discovery-assistance-openai-pilot-runtime.mjs";
import type {
  OpenAINonConfidentialPilotResult,
} from "./discovery-assistance-openai-pilot-transport.mjs";

export {
  OPENAI_PILOT_CREDENTIAL_ENVIRONMENT_VARIABLE,
  OpenAINonConfidentialPilotCredentialError,
} from "./discovery-assistance-openai-pilot-runtime.mjs";

export function executeOpenAINonConfidentialPilotFromServer(options: {
  input: NonConfidentialPilotInput;
  runtimeAccess: RuntimeAccessConfiguration;
  timeoutMs?: number;
}): Promise<OpenAINonConfidentialPilotResult> {
  return executeConfiguredOpenAINonConfidentialPilot({
    environment: process.env,
    fetchImpl: fetch,
    input: options.input,
    runtimeAccess: options.runtimeAccess,
    timeoutMs: options.timeoutMs,
  });
}
