import "server-only";

import operatingModelFixture from "@/db/seeds/process-explorer.json";
import structureFixture from "@/db/seeds/organization-structure.json";

import type { OrganizationStructureSeed } from "./organization-structure-data.mjs";
import type { ProcessExplorerSeed } from "./process-explorer-data";
import { loadOrganizationStructureFromPolicy } from "./organization-structure-source-policy.mjs";
import { resolveOperatingModelConfiguration } from "./process-explorer-source-policy.mjs";

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

async function loadDemoOrganizationStructure() {
  return {
    structure: structuredClone(structureFixture) as OrganizationStructureSeed,
    operatingModel: structuredClone(
      operatingModelFixture,
    ) as ProcessExplorerSeed,
  };
}

export async function loadOrganizationStructure() {
  try {
    const configuration = resolveOperatingModelConfiguration(process.env);
    return await loadOrganizationStructureFromPolicy(configuration, {
      loadDemo: loadDemoOrganizationStructure,
      loadNeon: async (organizationId) => {
        const { loadNeonOrganizationStructure } = await import(
          "./organization-structure-neon"
        );
        return loadNeonOrganizationStructure(organizationId);
      },
    });
  } catch (error) {
    console.error("[organization-structure] load failed", {
      kind: safeErrorKind(error),
    });
    throw new Error("The Organization Structure is temporarily unavailable.");
  }
}
