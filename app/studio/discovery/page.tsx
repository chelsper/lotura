import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { ArrowIcon, LayersIcon } from "../../ui/icons";
import { Alert, Badge, Card } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";
import { DiscoveryStartForm } from "./discovery-start-form";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ process?: string | string[] }>;
}) {
  await connection();
  const query = await searchParams;
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();

  const { loadDiscoverySessions } = await import("@/lib/discovery-data");
  const sessions = await loadDiscoverySessions(
    experience.discovery.organizationId,
  );
  const processes = experience.data.processes.map((process) => ({
    id: process.id,
    name: process.name,
    status: process.status,
  }));
  const requestedProcess = first(query.process) || null;
  const initialProcessId = processes.some((item) => item.id === requestedProcess)
    ? requestedProcess
    : null;

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="Describe current work one question at a time while preserving uncertainty, assumptions, and disagreement as reviewable observations."
        eyebrow={<><LayersIcon className="size-3.5" /> Guided discovery</>}
        stats={[
          { label: "Sessions", value: sessions.length },
          { label: "Ready to review", value: sessions.filter((item) => item.status === "ready_for_review").length },
        ]}
        title="Discovery"
      />

      <Alert className="mt-5" tone="warning">
        Discovery records are evidence, not approved organizational truth. Interview observations do not update the canonical Process until a future human review and reconciliation capability explicitly does so.
      </Alert>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-4 sm:p-6">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Start with an existing Process</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Interview yourself about how the work happens</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            This first foundation is manual and administrator-led. It preserves source observations for review; it does not use AI or write canonical Process facts.
          </p>
          <div className="mt-5">
            <DiscoveryStartForm initialProcessId={initialProcessId} processes={processes} />
          </div>
        </Card>

        <Card className="h-fit p-4 sm:p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Interview sessions</p>
          <div className="mt-4 space-y-3">
            {sessions.length ? sessions.map((session) => (
              <Link
                className="group block rounded-[10px] border border-[var(--border)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                href={`/studio/discovery/interviews/${session.id}`}
                key={session.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{session.processName}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{session.scopeStatement}</p>
                  </div>
                  <ArrowIcon className="mt-1 size-4 shrink-0 text-[var(--workspace-accent)]" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={session.status === "ready_for_review" ? "warning" : "neutral"}>{session.status.replaceAll("_", " ")}</Badge>
                  <Badge tone="neutral">{session.observationCount} observations</Badge>
                </div>
              </Link>
            )) : (
              <p className="text-xs leading-5 text-[var(--text-tertiary)]">No interview sessions exist yet.</p>
            )}
          </div>
        </Card>
      </div>
    </WorkspaceShell>
  );
}
