import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { buildResponsibilityRoles } from "@/lib/responsibility-builder";
import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { RoleIcon } from "../../ui/icons";
import { Alert } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";
import { ResponsibilityBrowser } from "./responsibility-browser";

const actionClass =
  "inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-[var(--workspace-accent-foreground)] transition-colors hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]";

export default async function ResponsibilityBuilderPage() {
  await connection();
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, changes, configuration, data, source } = experience;
  const roles = buildResponsibilityRoles(data, changes);
  if (roles.some((role) => !role.stableKey || !role.revision)) {
    throw new Error("Responsibility Builder requires immutable Role identity and revision data.");
  }
  const summaries = roles.map((role) => ({
    coverageCount: role.mandates.reduce(
      (total, item) => total + item.mandate.coverage.length,
      0,
    ),
    description: role.description,
    mandateCount: role.mandates.length,
    name: role.name,
    processCount: role.processes.length,
    stableKey: role.stableKey as string,
    status: role.status,
    systemCount: role.systems.length,
  }));

  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <WorkspacePageHeader
        description="Build the durable responsibilities that connect Positions and People to the operating model. Responsibility is recorded explicitly; it is never inferred from a title or reporting line."
        eyebrow={<><RoleIcon className="size-3.5" />Workspace Studio</>}
        stats={[
          { label: "Roles", value: roles.length },
          { label: "Without mandate", value: data.gaps.rolesWithoutMandates },
          { label: "Mandates without coverage", value: data.gaps.mandatesWithoutCoverage },
        ]}
        title="Responsibility Builder"
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Roles outlive people. Position mandates allocate responsibility; Role Coverage records who currently provides it.
        </p>
        <Link className={actionClass} href="/studio/responsibilities/roles/new">
          Add Operational Role
        </Link>
      </div>
      <Alert className="mt-5" tone="info">
        A new Operational Role begins with an explicit first Position mandate. Creating a Role does not change Position occupancy, reporting hierarchy, Process ownership, or human coverage.
      </Alert>
      <ResponsibilityBrowser roles={summaries} />
    </WorkspaceShell>
  );
}
