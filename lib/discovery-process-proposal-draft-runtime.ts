import "server-only";

import type { RuntimeAccessConfiguration } from "./authentication";
import {
  resolveNonConfidentialPilotConfiguration,
} from "./discovery-assistance-non-confidential-pilot.mjs";
import {
  resolveOpenAIPilotCredential,
} from "./discovery-assistance-openai-pilot-runtime.mjs";
import {
  executeOpenAIDiscoveryProcessProposal,
} from "./discovery-process-proposal-draft-openai.mjs";

export async function executeConfiguredDiscoveryProcessProposal(options: {
  context: Record<string, unknown>;
  runtimeAccess: RuntimeAccessConfiguration;
  validationContext: {
    exceptionIds: string[];
    observationIds: string[];
    processIds: string[];
    roleIds: string[];
    stepIds: string[];
    systemIds: string[];
  };
}) {
  try {
    const configuration = resolveNonConfidentialPilotConfiguration(
      process.env,
      options.runtimeAccess,
    );
    if (!configuration.enabled) {
      return { ok: false as const, reason: configuration.reason };
    }
    const apiKey = resolveOpenAIPilotCredential(process.env);
    return executeOpenAIDiscoveryProcessProposal({
      apiKey,
      context: options.context,
      fetchImpl: fetch,
      providerProjectId: configuration.providerProjectId,
      validationContext: options.validationContext,
    });
  } catch {
    return { ok: false as const, reason: "provider_unavailable" };
  }
}
