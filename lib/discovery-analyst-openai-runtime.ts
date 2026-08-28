import "server-only";

import type { RuntimeAccessConfiguration } from "./authentication";
import {
  resolveNonConfidentialPilotConfiguration,
} from "./discovery-assistance-non-confidential-pilot.mjs";
import {
  resolveOpenAIPilotCredential,
} from "./discovery-assistance-openai-pilot-runtime.mjs";
import {
  executeOpenAIDiscoveryAnalyst,
} from "./discovery-analyst-openai.mjs";

export async function executeConfiguredDiscoveryAnalyst(options: {
  context: Record<string, unknown>;
  focus?: string | null;
  runtimeAccess: RuntimeAccessConfiguration;
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
    return executeOpenAIDiscoveryAnalyst({
      apiKey,
      context: options.context,
      fetchImpl: fetch,
      focus: options.focus,
      providerProjectId: configuration.providerProjectId,
    });
  } catch {
    return { ok: false as const, reason: "provider_unavailable" };
  }
}
