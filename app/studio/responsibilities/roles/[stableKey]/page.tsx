import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { RoleIcon } from "@/app/ui/icons";
import { Badge, Card } from "@/app/ui/primitives";
import { WorkspaceShell } from "@/app/workspace-shell";
import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";
import { buildResponsibilityRoles } from "@/lib/responsibility-builder";

import { ResponsibilityRoleWorkspace } from "../../responsibility-role-workspace";

export default async function OperationalRolePage({
  params,
}: {
  params: Promise<{ stableKey: string }>;
}) {
  await connection();
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { stableKey } = await params;
  const { asOf, changes, configuration, data, source } = experience;
  const role = buildResponsibilityRoles(data, changes).find(
    (candidate) => candidate.stableKey === stableKey,
  );
  if (!role || !role.stableKey || !role.revision) notFound();

  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Link href="/studio">Workspace Studio</Link><span>/</span>
          <Link href="/studio/responsibilities">Responsibilities</Link><span>/</span>
          <span className="text-[var(--text-secondary)]">{role.name}</span>
        </nav>
        <header className="mt-5 border-b border-[var(--border)] pb-7 sm:pb-9">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent"><RoleIcon className="size-3" />Operational Role</Badge>
            <Badge tone={role.status === "active" ? "success" : "neutral"}>{role.status}</Badge>
          </div>
          <h1 className="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">{role.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{role.description ?? "No responsibility description has been recorded."}</p>
          <p className="mt-3 text-xs font-medium text-[var(--workspace-accent)]">Roles outlive people. Mandates allocate responsibility; coverage records who currently provides it.</p>
        </header>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><p className="text-[11px] text-[var(--text-tertiary)]">Current Position mandates</p><p className="mt-1 text-xl font-semibold text-[var(--text)]">{role.mandates.length}</p></Card>
          <Card className="p-4"><p className="text-[11px] text-[var(--text-tertiary)]">Current human coverage</p><p className="mt-1 text-xl font-semibold text-[var(--text)]">{role.mandates.reduce((total, item) => total + item.mandate.coverage.length, 0)}</p></Card>
          <Card className="p-4"><p className="text-[11px] text-[var(--text-tertiary)]">Connected Processes</p><p className="mt-1 text-xl font-semibold text-[var(--text)]">{role.processes.length}</p></Card>
        </div>
        <ResponsibilityRoleWorkspace data={data} role={role} />
      </div>
    </WorkspaceShell>
  );
}
