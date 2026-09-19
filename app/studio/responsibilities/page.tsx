import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { buildResponsibilityRoles } from "@/lib/responsibility-builder";
import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { RoleIcon } from "../../ui/icons";
import { Alert } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";
import { OrganizationNavigation } from "../organization-navigation";
import { ResponsibilityBrowser } from "./responsibility-browser";

const actionClass =
  "inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-[var(--workspace-accent-foreground)] transition-colors hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]";

export default async function ResponsibilityBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string | string[] }>;
}) {
  await connection();
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, changes, configuration, data, source } = experience;
  const requestedUnit = (await searchParams).unit;
  const unit = data.units.find((item) => item.id === requestedUnit);
  if (requestedUnit !== undefined && !unit) notFound();
  const roles = buildResponsibilityRoles(data, changes).filter((role) =>
    !unit || role.mandates.some((item) => item.position.unit?.id === unit.id),
  );
  if (roles.some((role) => !role.stableKey || !role.revision)) {
    throw new Error("Responsibility Builder requires immutable Role identity and revision data.");
  }
  const summaries = roles.map((role) => {
    const mandates = role.mandates.filter((item) => !unit || item.position.unit?.id === unit.id);
    return {
      coverageCount: mandates.reduce(
        (total, item) => total + item.mandate.coverage.length,
        0,
      ),
      description: role.description,
      mandateCount: mandates.length,
      name: role.name,
      processCount: role.processes.length,
      stableKey: role.stableKey as string,
      status: role.status,
      systemCount: role.systems.length,
    };
  });

  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <WorkspacePageHeader
        description="Responsibilities describe work people are accountable for. They are separate from job titles and the people holding them."
        eyebrow={<><RoleIcon className="size-3.5" />Workspace Studio</>}
        stats={[
          { label: "Responsibilities", value: roles.length },
          ...(!unit ? [
            { label: "Without mandate", value: data.gaps.rolesWithoutMandates },
            { label: "Mandates without coverage", value: data.gaps.mandatesWithoutCoverage },
          ] : []),
        ]}
        title={unit ? `${unit.name} · Responsibilities` : "Responsibilities"}
      />
      <OrganizationNavigation activeView="roles" unit={unit} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Looking for everyone&apos;s titles?{" "}
          <Link className="font-medium text-[var(--workspace-accent)] underline" href={`/studio/organization?view=positions${unit ? `&unit=${encodeURIComponent(unit.id)}` : ""}`}>View job titles{unit ? " in this Unit" : ""} →</Link>
        </p>
        <Link className={actionClass} href="/studio/responsibilities/roles/new">
          Add Operational Role
        </Link>
      </div>
      <Alert className="mt-5" tone="info">
        A new Operational Role begins with an explicit first Position mandate. Creating a Role does not change Position occupancy, reporting hierarchy, Process ownership, or human coverage.
      </Alert>
      {unit ? <p className="mt-4 text-xs text-[var(--text-secondary)]">Shown through recorded Position mandates in this Unit. A responsibility may also be shared with other Units.</p> : null}
      <ResponsibilityBrowser roles={summaries} unitId={unit?.id} />
    </WorkspaceShell>
  );
}
