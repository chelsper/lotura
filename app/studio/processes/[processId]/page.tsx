import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadProcessAuthoringContext } from "@/lib/operating-model-authoring-data";
import { loadProcessFamilyProcessIndex } from "@/lib/process-family-data";
import { decodeProcessRouteId } from "@/lib/process-route.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { ProcessAuthoringWorkspace } from "../../../process-authoring/process-authoring-workspace";
import { WorkspaceShell } from "../../../workspace-shell";

export default async function StudioProcessPage({
  params,
}: {
  params: Promise<{ processId: string }>;
}) {
  await connection();
  const { processId } = await params;
  const decodedProcessId = decodeProcessRouteId(processId);
  if (!decodedProcessId) notFound();

  const { asOf, authoring, configuration, data, discovery, source } =
    await loadWorkspaceExperience();
  if (!authoring.enabled) notFound();
  if (!data.processes.some((item) => item.id === decodedProcessId)) notFound();

  const context = await loadProcessAuthoringContext(
    authoring.organizationId,
    decodedProcessId,
    asOf,
  );
  if (!context) notFound();
  const familyIndex = await loadProcessFamilyProcessIndex(authoring.organizationId);
  const families = familyIndex[decodedProcessId] ?? [];

  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      {discovery.enabled ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent-subtle)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Discover how this Process actually happens</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Begin a guided interview without changing the documented draft.</p>
          </div>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-[9px] bg-[var(--workspace-accent)] px-3 text-xs font-medium text-[var(--workspace-accent-foreground)] hover:bg-[var(--workspace-accent-hover)]"
            href={`/studio/discovery?process=${encodeURIComponent(decodedProcessId)}`}
          >
            Interview me
          </Link>
        </div>
      ) : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Process Family context</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {families.length > 0
              ? `This Process has ${families.length} explicit current Family ${families.length === 1 ? "membership" : "memberships"}. Membership does not create inheritance.`
              : "No Process Family membership is currently recorded. This does not mean the Process is unrelated to other work."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {families.map((family) => (
            <Link
              className="inline-flex h-8 items-center rounded-[8px] border border-[var(--workspace-accent-border)] px-3 text-xs font-medium text-[var(--workspace-accent)] hover:bg-[var(--workspace-accent-subtle)]"
              href={`/studio/process-families/${family.stableKey}`}
              key={family.stableKey}
            >
              {family.name}
            </Link>
          ))}
          <Link
            className="inline-flex h-8 items-center rounded-[8px] border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            href="/studio/process-families"
          >
            View Families
          </Link>
        </div>
      </div>
      <ProcessAuthoringWorkspace
        context={context}
        surface="studio"
        today={new Date().toISOString().slice(0, 10)}
      />
    </WorkspaceShell>
  );
}
