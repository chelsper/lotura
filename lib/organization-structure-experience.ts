import "server-only";

import { requireWorkspaceAccess } from "./authentication";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
import { buildKnowledgeGaps } from "./knowledge-gaps.mjs";
import { resolveOrganizationStructureAdministrationConfiguration } from "./organization-structure-administration-policy.mjs";
import { buildOrganizationStructureData } from "./organization-structure-data.mjs";
import { loadOrganizationStructure } from "./organization-structure-source";
import { resolveProcessAcquisitionConfiguration } from "./process-acquisition-policy.mjs";
import { resolveWorkspaceConfiguration } from "./workspace-configuration.mjs";
import { resolveWorkspaceConfigurationOverrides } from "./workspace-configuration-policy.mjs";

export async function loadOrganizationStructureExperience() {
  const runtimeAccess = await requireWorkspaceAccess();
  const administration =
    resolveOrganizationStructureAdministrationConfiguration(
      process.env,
      runtimeAccess,
    );
  const processAcquisition = resolveProcessAcquisitionConfiguration(
    process.env,
    runtimeAccess,
  );
  const discovery = resolveDiscoveryConfiguration(process.env, runtimeAccess);
  const { asOf, operatingModel, source, structure } =
    await loadOrganizationStructure();
  const data = buildOrganizationStructureData(structure, operatingModel, asOf);
  const configuration = resolveWorkspaceConfiguration({
    organizationName: data.organization.name,
    overrides: resolveWorkspaceConfigurationOverrides(process.env),
  });
  const changes = administration.enabled
    ? await import("./organization-structure-neon").then(({ loadNeonOrganizationStructureChanges }) =>
        loadNeonOrganizationStructureChanges(administration.organizationId),
      )
    : [];

  return {
    administration,
    asOf,
    changes,
    configuration,
    data,
    discovery,
    processAcquisition,
    source,
  };
}

async function loadWorkspaceStudioContext(
  runtimeAccess: Awaited<ReturnType<typeof requireWorkspaceAccess>>,
) {
  const administration =
    resolveOrganizationStructureAdministrationConfiguration(
      process.env,
      runtimeAccess,
    );
  if (!administration.enabled) {
    return { enabled: false as const };
  }

  const processAcquisition = resolveProcessAcquisitionConfiguration(
    process.env,
    runtimeAccess,
  );
  const discovery = resolveDiscoveryConfiguration(process.env, runtimeAccess);
  const { asOf, operatingModel, source, structure } =
    await loadOrganizationStructure();
  const data = buildOrganizationStructureData(structure, operatingModel, asOf);
  const configuration = resolveWorkspaceConfiguration({
    organizationName: data.organization.name,
    overrides: resolveWorkspaceConfigurationOverrides(process.env),
  });
  const changes = await import("./organization-structure-neon").then(
    ({ loadNeonOrganizationStructureChanges }) =>
      loadNeonOrganizationStructureChanges(administration.organizationId),
  );

  return {
    administration,
    asOf,
    changes,
    configuration,
    data,
    discovery,
    enabled: true as const,
    processAcquisition,
    source,
    structure,
    operatingModel,
  };
}

export async function loadWorkspaceStudioExperience() {
  const runtimeAccess = await requireWorkspaceAccess();
  const context = await loadWorkspaceStudioContext(runtimeAccess);
  if (!context.enabled) return context;
  const { operatingModel: _operatingModel, structure: _structure, ...experience } =
    context;
  void _operatingModel;
  void _structure;
  return experience;
}

export async function loadKnowledgeGapsExperience() {
  const runtimeAccess = await requireWorkspaceAccess();
  const context = await loadWorkspaceStudioContext(runtimeAccess);
  if (!context.enabled) return context;

  const discoverySources = context.discovery.enabled
    ? await import("./knowledge-gaps-neon").then(
        ({ loadNeonKnowledgeGapDiscoverySources }) =>
          loadNeonKnowledgeGapDiscoverySources(
            context.administration.organizationId,
          ),
      )
    : { decisions: [], observations: [] };
  const knowledgeGaps = buildKnowledgeGaps({
    asOf: context.asOf,
    discovery: discoverySources,
    operatingModel: context.operatingModel,
    organizationKey: `organization:${context.administration.organizationId}`,
    structure: context.structure,
  });
  const { operatingModel: _operatingModel, structure: _structure, ...experience } =
    context;
  void _operatingModel;
  void _structure;
  return { ...experience, knowledgeGaps };
}
