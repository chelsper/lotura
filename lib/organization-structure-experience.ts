import "server-only";

import { requireWorkspaceAccess } from "./authentication";
import { buildOrganizationStructureData } from "./organization-structure-data.mjs";
import { loadOrganizationStructure } from "./organization-structure-source";
import { resolveWorkspaceConfiguration } from "./workspace-configuration.mjs";
import { resolveWorkspaceConfigurationOverrides } from "./workspace-configuration-policy.mjs";

export async function loadOrganizationStructureExperience() {
  await requireWorkspaceAccess();
  const { asOf, operatingModel, source, structure } =
    await loadOrganizationStructure();
  const data = buildOrganizationStructureData(structure, operatingModel, asOf);
  const configuration = resolveWorkspaceConfiguration({
    organizationName: data.organization.name,
    overrides: resolveWorkspaceConfigurationOverrides(process.env),
  });

  return { asOf, configuration, data, source };
}
