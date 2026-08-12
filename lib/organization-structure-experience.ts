import "server-only";

import { requireWorkspaceAccess } from "./authentication";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
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

export async function loadWorkspaceStudioExperience() {
  const runtimeAccess = await requireWorkspaceAccess();
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
  };
}
