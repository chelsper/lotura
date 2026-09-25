import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { StudioCreatePage } from "../../../studio-create-page";
import { WorkspaceShell } from "../../../../workspace-shell";

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string | string[]; person?: string | string[] }>;
}) {
  await connection();
  const query = await searchParams;
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, configuration, data, source } = experience;
  const unit = data.units.find((item) => item.id === query.unit && item.status === "active");
  const person = data.people.find((item) => item.id === query.person && item.status === "active");
  if ((query.unit !== undefined && !unit) || (query.person !== undefined && (!unit || !person))) notFound();
  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <StudioCreatePage data={data} entityType="person" initialUnitStableKey={unit?.id} savedPerson={person} />
    </WorkspaceShell>
  );
}
