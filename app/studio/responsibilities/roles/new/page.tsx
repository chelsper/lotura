import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { RoleCreateForm } from "../../role-create-form";
import { RoleIcon } from "@/app/ui/icons";
import { WorkspacePageHeader, WorkspaceShell } from "@/app/workspace-shell";

export default async function NewOperationalRolePage() {
  await connection();
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, configuration, data, source } = experience;
  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link href="/studio">Workspace Studio</Link><span>/</span>
        <Link href="/studio/responsibilities">Responsibilities</Link><span>/</span>
        <span className="text-[var(--text-secondary)]">New Operational Role</span>
      </nav>
      <WorkspacePageHeader
        description="Create one durable responsibility together with its first explicit Position mandate. Human coverage remains a separate decision after creation."
        eyebrow={<><RoleIcon className="size-3.5" />Responsibility Builder</>}
        title="Add Operational Role"
      />
      <RoleCreateForm data={data} />
    </WorkspaceShell>
  );
}
