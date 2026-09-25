import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { StudioCreatePage } from "../../../studio-create-page";
import { WorkspaceShell } from "../../../../workspace-shell";

export default async function NewOrganizationUnitPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string | string[] }>;
}) {
  await connection();
  const requestedParent = (await searchParams).parent;
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, configuration, data, source } = experience;
  const parent = data.units.find((unit) => unit.id === requestedParent && unit.status === "active");
  if (requestedParent !== undefined && !parent) notFound();
  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <StudioCreatePage
        data={data}
        entityType="organization_unit"
        initialUnitStableKey={parent?.id}
      />
    </WorkspaceShell>
  );
}
