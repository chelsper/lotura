import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { StudioCreatePage } from "../../../studio-create-page";
import { WorkspaceShell } from "../../../../workspace-shell";

export default async function NewPersonPage() {
  await connection();
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, configuration, data, source } = experience;
  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <StudioCreatePage data={data} entityType="person" />
    </WorkspaceShell>
  );
}
