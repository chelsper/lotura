import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { StudioStructureDetail } from "../../../studio-structure-detail";
import { WorkspaceShell } from "../../../../workspace-shell";

export default async function StudioOrganizationUnitPage({
  params,
}: {
  params: Promise<{ stableKey: string }>;
}) {
  await connection();
  const { stableKey } = await params;
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, changes, configuration, data, source } = experience;
  const unit = data.units.find((item) => item.id === stableKey);
  if (!unit) notFound();
  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <StudioStructureDetail changes={changes} data={data} entity={unit} entityType="organization_unit" />
    </WorkspaceShell>
  );
}
