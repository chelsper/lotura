import { connection } from "next/server";

import { loadOrganizationStructureExperience } from "@/lib/organization-structure-experience";

import { OrganizationIcon } from "../ui/icons";
import { WorkspacePageHeader, WorkspaceShell } from "../workspace-shell";
import { OrganizationBrowser } from "./organization-browser";
import { StructureContext, VacancyEvidenceNotice } from "./structure-context";

export default async function OrganizationPage() {
  await connection();
  const { asOf, configuration, data, source } =
    await loadOrganizationStructureExperience();

  return (
    <WorkspaceShell
      activeView="organization"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description="See the durable Positions, current people, reporting relationships, and Operational Roles that connect organizational structure to the work."
        eyebrow={
          <>
            <OrganizationIcon className="size-3.5" />
            Organizational structure
          </>
        }
        title="How is this organization structured?"
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <StructureContext data={data} />
        <VacancyEvidenceNotice data={data} />
      </div>
      <OrganizationBrowser data={data} />
    </WorkspaceShell>
  );
}
