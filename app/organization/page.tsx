import { connection } from "next/server";
import { notFound } from "next/navigation";

import { loadOrganizationStructureExperience } from "@/lib/organization-structure-experience";

import { OrganizationIcon } from "../ui/icons";
import { WorkspacePageHeader, WorkspaceShell } from "../workspace-shell";
import { OrganizationBrowser } from "./organization-browser";
import { StructureContext, VacancyEvidenceNotice } from "./structure-context";

export default async function OrganizationPage({ searchParams }: {
  searchParams: Promise<{ view?: string | string[]; unit?: string | string[] }>;
}) {
  await connection();
  const { asOf, configuration, data, source } =
    await loadOrganizationStructureExperience();
  const { view: requestedView, unit: requestedUnit } = await searchParams;
  const unit = data.units.find((item) => item.id === requestedUnit);
  if (requestedUnit !== undefined && !unit) notFound();
  const view = requestedView === "positions" || requestedView === "people" ? requestedView : unit ? "positions" : "units";

  return (
    <WorkspaceShell
      activeView="organization"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description={unit ? "Browse the people and job titles recorded in this Unit." : "Explore Units, people, job titles, and how they connect."}
        eyebrow={
          <>
            <OrganizationIcon className="size-3.5" />
            Organizational context
          </>
        }
        title={unit?.name ?? "Organization"}
      />
      <OrganizationBrowser data={data} selectedView={view} unitId={unit?.id} />
      <details className="mt-6 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-[var(--text-secondary)]">About this information</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <StructureContext data={data} />
          <VacancyEvidenceNotice data={data} />
        </div>
      </details>
    </WorkspaceShell>
  );
}
