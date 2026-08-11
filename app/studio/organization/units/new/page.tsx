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
  const parentStableKey = Array.isArray(requestedParent)
    ? requestedParent[0]
    : requestedParent;
  const initialUnitStableKey = data.units.some(
    (unit) => unit.id === parentStableKey && unit.status === "active",
  )
    ? parentStableKey
    : undefined;
  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <StudioCreatePage
        data={data}
        entityType="organization_unit"
        initialUnitStableKey={initialUnitStableKey}
      />
    </WorkspaceShell>
  );
}
