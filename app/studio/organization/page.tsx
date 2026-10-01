import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { OrganizationBrowser } from "../../organization/organization-browser";
import { OrganizationIcon } from "../../ui/icons";
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
      activeView="organization"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description={unit ? "People and job titles in this Unit. Child Units have their own lists." : "Find a Unit, person, or job title. Open it to see connections or make an update."}
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
        title={unit?.name ?? "Organization"}
      />

      <OrganizationNavigation activeView={view} preserveScroll unit={unit} />

      {!unit || unit.status === "active" ? <div className="mt-5 flex flex-wrap gap-2">
        <Link className={actionClass} href={`/studio/organization/units/new${unit ? `?parent=${encodeURIComponent(unit.id)}` : ""}`}>{unit ? "Add child Unit" : "Add Unit"}</Link>
        <Link className={actionClass} href={`/studio/organization/people/new${unit ? `?unit=${encodeURIComponent(unit.id)}` : ""}`}>Add person</Link>
        <Link className={actionClass} href={`/studio/organization/positions/new${unit ? `?unit=${encodeURIComponent(unit.id)}` : ""}`}>Add job title</Link>
      </div> : null}

      <OrganizationBrowser basePath="/studio/organization" data={data} selectedView={view} unitId={unit?.id} />
      <details className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-[var(--text-secondary)]">About this view</summary>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">Start with the people and job titles you know. Add responsibilities and other connections when you are ready. Recording a job title or reporting line does not assign responsibility or Process ownership.</p>
      </details>
    </WorkspaceShell>
  );
}
