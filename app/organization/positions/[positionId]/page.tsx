import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadOrganizationStructureExperience } from "@/lib/organization-structure-experience";

import { PositionDetail } from "../../position-detail";
import { WorkspaceShell } from "../../../workspace-shell";

export default async function OrganizationPositionPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  await connection();
  const { positionId } = await params;
  const { asOf, configuration, data, source } =
    await loadOrganizationStructureExperience();
  const position = data.positions.find((item) => item.id === positionId);

  if (!position) notFound();

  return (
    <WorkspaceShell
      activeView="organization"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <PositionDetail data={data} position={position} />
    </WorkspaceShell>
  );
}
