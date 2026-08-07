import "server-only";

import { buildFlowAnalysis } from "./flow-analysis.mjs";
import { buildProcessExplorerData } from "./process-explorer-data";
import { loadOperatingModel } from "./process-explorer-source";
import { resolveWorkspaceConfiguration } from "./workspace-configuration.mjs";

export async function loadWorkspaceExperience() {
  const { asOf, seed, source } = await loadOperatingModel();
  const data = buildProcessExplorerData(seed, asOf);
  const analysis = buildFlowAnalysis(seed, asOf);
  const configuration = resolveWorkspaceConfiguration({
    organizationName: data.organization.name,
  });

  return { analysis, asOf, configuration, data, source };
}
