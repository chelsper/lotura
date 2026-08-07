import "server-only";

import seedData from "@/db/seeds/process-explorer.json";

import type { ProcessExplorerSeed } from "./process-explorer-data";
import {
  loadOperatingModelFromPolicy,
  resolveOperatingModelConfiguration,
  type LoadedOperatingModel,
} from "./process-explorer-source-policy.mjs";

function safeErrorKind(error: unknown) {
  if (!error || typeof error !== "object") return "unknown";

  const rawName = "name" in error ? String(error.name) : "unknown";
  const rawCode = "code" in error ? String(error.code) : "";
  const name = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(rawName)
    ? rawName
    : "unknown";
  const code = /^[A-Z0-9_-]{1,32}$/.test(rawCode) ? rawCode : null;
  return code ? `${name}:${code}` : name;
}

async function loadDemoOperatingModel() {
  return {
    seed: structuredClone(seedData) as ProcessExplorerSeed,
  };
}

export async function loadOperatingModel(): Promise<LoadedOperatingModel> {
  try {
    const configuration = resolveOperatingModelConfiguration(process.env);

    return await loadOperatingModelFromPolicy(configuration, {
      loadDemo: loadDemoOperatingModel,
      loadNeon: async (organizationId) => {
        const { loadNeonOperatingModel } = await import(
          "./process-explorer-neon"
        );
        return loadNeonOperatingModel(organizationId);
      },
    });
  } catch (error) {
    console.error("[operating-model] load failed", {
      kind: safeErrorKind(error),
    });
    throw new Error("The operating model is temporarily unavailable.");
  }
}
