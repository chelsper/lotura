import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadProcessAuthoringContext } from "@/lib/operating-model-authoring-data";
import { decodeProcessRouteId } from "@/lib/process-route.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { ProcessAuthoringWorkspace } from "../../../process-authoring/process-authoring-workspace";
import { WorkspaceShell } from "../../../workspace-shell";

export default async function StudioProcessPage({
  params,
}: {
  params: Promise<{ processId: string }>;
}) {
  await connection();
  const { processId } = await params;
  const decodedProcessId = decodeProcessRouteId(processId);
  if (!decodedProcessId) notFound();

  const { asOf, authoring, configuration, data, source } =
    await loadWorkspaceExperience();
  if (!authoring.enabled) notFound();
  if (!data.processes.some((item) => item.id === decodedProcessId)) notFound();

  const context = await loadProcessAuthoringContext(
    authoring.organizationId,
    decodedProcessId,
    asOf,
  );
  if (!context) notFound();

  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <ProcessAuthoringWorkspace
        context={context}
        surface="studio"
        today={new Date().toISOString().slice(0, 10)}
      />
    </WorkspaceShell>
  );
}
