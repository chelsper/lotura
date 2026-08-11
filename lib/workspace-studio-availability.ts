import "server-only";

import { requireWorkspaceAccess } from "./authentication";
import { resolveOrganizationStructureAdministrationConfiguration } from "./organization-structure-administration-policy.mjs";

export async function workspaceStudioAvailable() {
  try {
    const runtimeAccess = await requireWorkspaceAccess();
    return resolveOrganizationStructureAdministrationConfiguration(
      process.env,
      runtimeAccess,
    ).enabled;
  } catch {
    return false;
  }
}
