import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { StudioCreatePage } from "../../../studio-create-page";
import { WorkspaceShell } from "../../../../workspace-shell";

export default async function NewPositionPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string | string[] }>;
}) {
  await connection();
  const requestedUnit = (await searchParams).unit;
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, configuration, data, source } = experience;
  const unit = data.units.find((item) => item.id === requestedUnit && item.status === "active");
  if (requestedUnit !== undefined && !unit) notFound();
  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <StudioCreatePage data={data} entityType="position" initialUnitStableKey={unit?.id} />
    </WorkspaceShell>
  );
}
