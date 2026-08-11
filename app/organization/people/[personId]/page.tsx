import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadOrganizationStructureExperience } from "@/lib/organization-structure-experience";

import { PersonDetail } from "../../person-detail";
import { WorkspaceShell } from "../../../workspace-shell";

export default async function OrganizationPersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  await connection();
  const { personId } = await params;
  const { administration, asOf, configuration, data, source } =
    await loadOrganizationStructureExperience();
  const person = data.people.find((item) => item.id === personId);

  if (!person) notFound();

  return (
    <WorkspaceShell
      activeView="organization"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <PersonDetail
        administrationEnabled={administration.enabled}
        data={data}
        person={person}
      />
    </WorkspaceShell>
  );
}
