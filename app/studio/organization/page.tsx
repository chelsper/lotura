import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { OrganizationBrowser } from "../../organization/organization-browser";
import { OrganizationIcon } from "../../ui/icons";
import { Alert } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";

const actionClass =
  "inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]";

export default async function OrganizationBuilderPage() {
  await connection();
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, configuration, data, source } = experience;

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description="Create and maintain the durable structural identities that anchor the organization’s digital twin. Source evidence, reporting structure, and operational responsibility remain distinct."
        eyebrow={
          <>
            <OrganizationIcon className="size-3.5" />
            Workspace Studio
          </>
        }
        stats={[
          { label: "People", value: data.people.length },
          { label: "Positions", value: data.positions.length },
          { label: "Units", value: data.units.length },
        ]}
        title="Organization Builder"
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Link className={actionClass} href="/studio/organization/units/new">Add Organization Unit</Link>
        <Link className={actionClass} href="/studio/organization/positions/new">Add Position</Link>
        <Link className={actionClass} href="/studio/organization/people/new">Add Person</Link>
      </div>
      <Alert className="mt-5" tone="info">
        Build structure deliberately. Person, Position, and Operational Role are different records; reporting hierarchy never assigns Process ownership.
      </Alert>

      <OrganizationBrowser basePath="/studio/organization" data={data} />
    </WorkspaceShell>
  );
}
