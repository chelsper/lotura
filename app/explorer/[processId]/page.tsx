import { connection } from "next/server";
import { notFound } from "next/navigation";

import { decodeProcessRouteId } from "@/lib/process-route.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { ProcessDetail } from "../../process-detail";
import { WorkspaceShell } from "../../workspace-shell";

export default async function ProcessDetailPage({
  params,
}: {
  params: Promise<{ processId: string }>;
}) {
  await connection();

  const { processId } = await params;
  const decodedProcessId = decodeProcessRouteId(processId);
  const { asOf, configuration, data, source } =
    await loadWorkspaceExperience();
  const process = decodedProcessId
    ? data.processes.find((item) => item.id === decodedProcessId)
    : undefined;

  if (!process) {
    notFound();
  }

  return (
    <WorkspaceShell
      activeView="explorer"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <ProcessDetail process={process} />
    </WorkspaceShell>
  );
}
