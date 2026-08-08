import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { ProcessExplorer } from "../process-explorer";
import { LayersIcon } from "../ui/icons";
import { WorkspacePageHeader, WorkspaceShell } from "../workspace-shell";

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{
    process?: string | string[] | undefined;
  }>;
}) {
  await connection();
  const query = await searchParams;
  const initialProcessId = Array.isArray(query.process)
    ? query.process[0]
    : query.process;
  const { asOf, configuration, data, source } =
    await loadWorkspaceExperience();

  return (
    <WorkspaceShell
      activeView="explorer"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description="Browse, search, and filter the organization’s documented Processes. Select one to preview its immediate dependencies, then open its dedicated page for the complete picture."
        eyebrow={
          <>
            <LayersIcon className="size-3.5" />
            Operating model
          </>
        }
        stats={[
          { label: "Processes", value: data.processes.length },
          { label: "Roles", value: data.roles.length },
          { label: "Systems", value: data.systems.length },
        ]}
        title="Explorer"
      />
      <ProcessExplorer data={data} initialProcessId={initialProcessId} />
    </WorkspaceShell>
  );
}
