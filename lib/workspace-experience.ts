import "server-only";

import { buildFlowAnalysis } from "./flow-analysis.mjs";
import { requireWorkspaceAccess } from "./authentication";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
import { resolveOperatingModelAuthoringConfiguration } from "./operating-model-authoring-policy.mjs";
import { buildProcessExplorerData } from "./process-explorer-data";
import { resolveProcessAcquisitionConfiguration } from "./process-acquisition-policy.mjs";
import { resolveProposalReviewConfiguration } from "./proposal-review-policy.mjs";
import { resolveProcessApplicationConfiguration } from "./process-application-policy.mjs";
import { loadOperatingModel } from "./process-explorer-source";
import { resolveWorkspaceConfiguration } from "./workspace-configuration.mjs";
import { resolveWorkspaceConfigurationOverrides } from "./workspace-configuration-policy.mjs";

export async function loadWorkspaceExperience() {
  const runtimeAccess = await requireWorkspaceAccess();
  const processAcquisition = resolveProcessAcquisitionConfiguration(
    process.env,
    runtimeAccess,
  );
  const authoring = resolveOperatingModelAuthoringConfiguration(
    process.env,
    runtimeAccess,
  );
  const discovery = resolveDiscoveryConfiguration(process.env, runtimeAccess);
  const proposalReview = resolveProposalReviewConfiguration(
    process.env,
    runtimeAccess,
  );
  const processApplication = resolveProcessApplicationConfiguration(
    process.env,
    runtimeAccess,
  );
  const { asOf, seed, source } = await loadOperatingModel();
  const data = buildProcessExplorerData(seed, asOf);
  const analysis = buildFlowAnalysis(seed, asOf);
  const configuration = resolveWorkspaceConfiguration({
    organizationName: data.organization.name,
    overrides: resolveWorkspaceConfigurationOverrides(process.env),
  });

  return {
    analysis,
    asOf,
    authoring,
    configuration,
    data,
    discovery,
    processAcquisition,
    processApplication,
    proposalReview,
    source,
  };
}
