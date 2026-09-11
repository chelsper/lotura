import "server-only";

import { requireWorkspaceAccess } from "./authentication";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
import { buildKnowledgeGaps } from "./knowledge-gaps.mjs";
import { resolveOperatingModelAuthoringConfiguration } from "./operating-model-authoring-policy.mjs";
import { buildOrganizationStructureData } from "./organization-structure-data.mjs";
import { loadOrganizationStructure } from "./organization-structure-source";
import { buildPersonalContext } from "./personal-context.mjs";
import { resolvePilotIdentityAssociationConfiguration } from "./pilot-identity-policy.mjs";
import { buildProcessExplorerData } from "./process-explorer-data";
import { resolveWorkspaceConfiguration } from "./workspace-configuration.mjs";
import { resolveWorkspaceConfigurationOverrides } from "./workspace-configuration-policy.mjs";

export async function loadPersonalContextExperience() {
  const runtimeAccess = await requireWorkspaceAccess();
  const association = resolvePilotIdentityAssociationConfiguration(
    process.env,
    runtimeAccess,
  );
  if (!association.enabled) return { enabled: false as const };

  const authoring = resolveOperatingModelAuthoringConfiguration(
    process.env,
    runtimeAccess,
  );
  const discovery = resolveDiscoveryConfiguration(process.env, runtimeAccess);
  const { asOf, operatingModel, source, structure } =
    await loadOrganizationStructure();
  const data = buildOrganizationStructureData(structure, operatingModel, asOf);
  const explorerData = buildProcessExplorerData(operatingModel, asOf);
  const configuration = resolveWorkspaceConfiguration({
    organizationName: data.organization.name,
    overrides: resolveWorkspaceConfigurationOverrides(process.env),
  });

  const [{ loadProcessFamilyProcessIndex }, { loadTechnologyCatalog }] =
    await Promise.all([
      import("./process-family-data"),
      import("./technology-authoring-data"),
    ]);
  const [familyIndex, technology, discoverySources] = await Promise.all([
    loadProcessFamilyProcessIndex(association.organizationId),
    loadTechnologyCatalog(association.organizationId),
    discovery.enabled
      ? import("./knowledge-gaps-neon").then(
          ({ loadNeonKnowledgeGapDiscoverySources }) =>
            loadNeonKnowledgeGapDiscoverySources(association.organizationId),
        )
      : Promise.resolve({ decisions: [], observations: [] }),
  ]);
  const knowledgeGaps = buildKnowledgeGaps({
    asOf,
    discovery: discoverySources,
    operatingModel,
    organizationKey: `organization:${association.organizationId}`,
    structure,
  });
  const systemStableKeys = Object.fromEntries(
    technology.systems.map((system) => [system.id, system.stableKey]),
  );
  const personalContext = buildPersonalContext({
    association,
    data,
    explorerData,
    familyIndex,
    knowledgeGaps,
    systemStableKeys,
  });

  return {
    asOf,
    authoring,
    configuration,
    discovery,
    enabled: true as const,
    personalContext,
    source,
  };
}
