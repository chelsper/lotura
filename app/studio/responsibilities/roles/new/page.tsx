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
    <WorkspaceShell activeView="organization" asOf={asOf} configuration={configuration} source={source}>
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link href="/studio">Workspace Studio</Link><span>/</span>
        <Link href="/studio/responsibilities">Responsibilities</Link><span>/</span>
        <span className="text-[var(--text-secondary)]">New responsibility</span>
      </nav>
      <WorkspacePageHeader
        description="Name the work and link it to the first job title responsible. You can record who does the work separately after saving."
        eyebrow={<><RoleIcon className="size-3.5" />Responsibilities</>}
        title="Add responsibility"
      />
      <RoleCreateForm data={data} />
    </WorkspaceShell>
  );
}
