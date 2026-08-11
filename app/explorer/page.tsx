import { connection } from "next/server";
import Link from "next/link";

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
  const { asOf, configuration, data, processAcquisition, source } =
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
      {processAcquisition.enabled ? (
        <div className="mt-5 flex justify-end">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-transparent bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-[var(--workspace-accent-foreground)] transition-colors hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
            href="/process-acquisition"
          >
            Add Process
          </Link>
        </div>
      ) : null}
      <ProcessExplorer data={data} initialProcessId={initialProcessId} />
    </WorkspaceShell>
  );
}
