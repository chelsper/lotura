import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadTechnologyRoles } from "@/lib/technology-authoring-data";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { SystemCreateForm } from "../system-create-form";
import { WorkspaceShell } from "../../../workspace-shell";

export default async function NewSystemPage() {
  await connection();
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  const roles = await loadTechnologyRoles(experience.authoring.organizationId);

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <SystemCreateForm
        roles={roles}
        today={new Date().toISOString().slice(0, 10)}
      />
    </WorkspaceShell>
  );
}
