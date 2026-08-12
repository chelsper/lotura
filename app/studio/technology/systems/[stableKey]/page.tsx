import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadTechnologySystemContext } from "@/lib/technology-authoring-data";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { WorkspaceShell } from "../../../../workspace-shell";
import { SystemWorkspace } from "../../system-workspace";

export default async function TechnologySystemPage({
  params,
}: {
  params: Promise<{ stableKey: string }>;
}) {
  await connection();
  const { stableKey } = await params;
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  const context = await loadTechnologySystemContext(
    experience.authoring.organizationId,
    stableKey,
  );
  if (!context) notFound();

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <SystemWorkspace
        context={context}
        today={new Date().toISOString().slice(0, 10)}
      />
    </WorkspaceShell>
  );
}
