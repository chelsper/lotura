import "server-only";

import { buildFlowAnalysis } from "./flow-analysis.mjs";
import { requireWorkspaceAccess } from "./authentication";
import { buildProcessExplorerData } from "./process-explorer-data";
import { loadOperatingModel } from "./process-explorer-source";
import { resolveWorkspaceConfiguration } from "./workspace-configuration.mjs";
import { resolveWorkspaceConfigurationOverrides } from "./workspace-configuration-policy.mjs";

export async function loadWorkspaceExperience() {
  await requireWorkspaceAccess();
  const { asOf, seed, source } = await loadOperatingModel();
  const data = buildProcessExplorerData(seed, asOf);
  const analysis = buildFlowAnalysis(seed, asOf);
  const configuration = resolveWorkspaceConfiguration({
    organizationName: data.organization.name,
    overrides: resolveWorkspaceConfigurationOverrides(process.env),
  });

  return { analysis, asOf, configuration, data, source };
}
