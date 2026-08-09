import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadOrganizationStructureExperience } from "@/lib/organization-structure-experience";

import { OrganizationUnitDetail } from "../../organization-unit-detail";
import { WorkspaceShell } from "../../../workspace-shell";

export default async function OrganizationUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  await connection();
  const { unitId } = await params;
  const { asOf, configuration, data, source } =
    await loadOrganizationStructureExperience();
  const unit = data.units.find((item) => item.id === unitId);

  if (!unit) notFound();

  return (
    <WorkspaceShell
      activeView="organization"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <OrganizationUnitDetail data={data} unit={unit} />
    </WorkspaceShell>
  );
}
