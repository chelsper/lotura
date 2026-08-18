import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { WorkspaceShell } from "../../../workspace-shell";
import { ProcessFamilyCreateForm } from "../process-family-create-form";

export default async function NewProcessFamilyPage() {
  await connection();
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  return (
    <WorkspaceShell activeView="studio" asOf={experience.asOf} configuration={experience.configuration} source={experience.source}>
      <ProcessFamilyCreateForm today={new Date().toISOString().slice(0, 10)} />
    </WorkspaceShell>
  );
}
