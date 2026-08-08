import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { OrganizationOverview } from "../organization-overview";
import { WorkspaceShell } from "../workspace-shell";

export default async function OverviewPage() {
  await connection();

  const { asOf, configuration, data, source } =
    await loadWorkspaceExperience();

  return (
    <WorkspaceShell
      activeView="overview"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <OrganizationOverview data={data} source={source} />
    </WorkspaceShell>
  );
}
