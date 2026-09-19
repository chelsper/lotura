import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { OrganizationBrowser } from "../../organization/organization-browser";
import { OrganizationIcon } from "../../ui/icons";
import { Alert } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";
import { OrganizationNavigation } from "../organization-navigation";

const actionClass =
  "inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]";

export default async function OrganizationBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[]; unit?: string | string[] }>;
}) {
  await connection();
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, configuration, data, source } = experience;
  const { view: requestedView, unit: requestedUnit } = await searchParams;
  const unit = data.units.find((item) => item.id === requestedUnit);
  if (requestedUnit !== undefined && !unit) notFound();
  const view = requestedView === "positions" || requestedView === "people" ? requestedView : unit ? "positions" : "units";
  const positions = unit ? data.positions.filter((item) => item.unit?.id === unit.id) : data.positions;
  const people = unit ? data.people.filter((item) => item.assignments.some((assignment) => assignment.position.unit?.id === unit.id)) : data.people;

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description={unit ? "People and job titles recorded directly in this Unit. Child Units have their own lists." : "Find people, job titles, and Organization Units. Open a record to see its connections or make an update."}
        eyebrow={
          <>
            <OrganizationIcon className="size-3.5" />
            Workspace Studio
          </>
        }
        stats={[
          { label: "People", value: people.length },
          { label: "Job titles", value: positions.length },
          ...(!unit ? [{ label: "Units", value: data.units.length }] : []),
        ]}
        title={unit?.name ?? "Organization Builder"}
      />

      <OrganizationNavigation activeView={view} preserveScroll unit={unit} />

      <div className="mt-5 flex flex-wrap gap-2">
        <Link className={actionClass} href="/studio/organization/units/new">Add Organization Unit</Link>
        <Link className={actionClass} href="/studio/organization/positions/new">Add Position</Link>
        <Link className={actionClass} href="/studio/organization/people/new">Add Person</Link>
      </div>
      <Alert className="mt-5" tone="info">
        Build structure deliberately. Person, Position, and Operational Role are different records; reporting hierarchy never assigns Process ownership.
      </Alert>

      <OrganizationBrowser basePath="/studio/organization" data={data} selectedView={view} unitId={unit?.id} />
    </WorkspaceShell>
  );
}
