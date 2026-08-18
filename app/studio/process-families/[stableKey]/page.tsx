import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadProcessFamilyContext } from "@/lib/process-family-data";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { WorkspaceShell } from "../../../workspace-shell";
import { ProcessFamilyWorkspace } from "../process-family-workspace";

export default async function ProcessFamilyPage({
  params,
}: {
  params: Promise<{ stableKey: string }>;
}) {
  await connection();
  const { stableKey } = await params;
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  const context = await loadProcessFamilyContext(
    experience.authoring.organizationId,
    stableKey,
  );
  if (!context) notFound();
  return (
    <WorkspaceShell activeView="studio" asOf={experience.asOf} configuration={experience.configuration} source={experience.source}>
      <ProcessFamilyWorkspace context={context} today={new Date().toISOString().slice(0, 10)} />
    </WorkspaceShell>
  );
}
