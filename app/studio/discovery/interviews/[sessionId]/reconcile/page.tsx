import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import type { ExplorerProcess } from "@/lib/process-explorer-data";
import { buildDiscoveryReconciliationEvidence } from "@/lib/discovery-reconciliation-preview.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { Alert, Badge, Card } from "../../../../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../../../../workspace-shell";

const stateLabels = {
  assumed: "Assumed",
  conflicting_observation: "Conflicting observation",
  known: "Known",
  needs_validation: "Needs validation",
  unknown: "Unknown",
};

function EmptyCanonical({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

function CanonicalProcessSection({
  process,
  section,
}: {
  process: ExplorerProcess;
  section: string;
}) {
  if (section === "definition") {
    return (
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-[var(--text-tertiary)]">Name</dt>
          <dd className="mt-1 text-[var(--text)]">{process.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--text-tertiary)]">Purpose</dt>
          <dd className="mt-1 whitespace-pre-wrap leading-6 text-[var(--text-secondary)]">{process.purpose || "Not documented"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--text-tertiary)]">Status</dt>
          <dd className="mt-1"><Badge tone={process.status === "draft" ? "warning" : "neutral"}>{process.status}</Badge></dd>
        </div>
      </dl>
    );
  }

  if (section === "boundaries") {
    return <EmptyCanonical>The current Process does not have separate fields for its start and end. Existing Step and purpose text has not been used as a substitute.</EmptyCanonical>;
  }

  if (section === "responsibility") {
    const responsibleRoles = Array.from(new Map(
      process.steps
        .filter((step) => step.responsibleRole)
        .map((step) => [step.responsibleRole!.id, step.responsibleRole!]),
    ).values());
    return (
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Owner Operational Role</p>
          <p className="mt-1 text-[var(--text)]">{process.ownerRole?.name || "Not assigned"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Responsible Roles on Steps</p>
          {responsibleRoles.length ? (
            <ul className="mt-2 space-y-1.5 text-[var(--text-secondary)]">
              {responsibleRoles.map((role) => <li key={role.id}>{role.name}</li>)}
            </ul>
          ) : <p className="mt-1 text-[var(--text-secondary)]">Not assigned</p>}
        </div>
      </div>
    );
  }

  if (section === "steps") {
    return process.steps.length ? (
      <ol className="space-y-3">
        {process.steps.map((step) => (
          <li className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 text-sm" key={step.id}>
            <span className="text-[var(--text-tertiary)]">{step.position}.</span>
            <div>
              <p className="font-medium text-[var(--text)]">{step.title}</p>
              <p className="mt-1 leading-6 text-[var(--text-secondary)]">{step.instructions}</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">Responsible Role: {step.responsibleRole?.name || "Not assigned"}</p>
            </div>
          </li>
        ))}
      </ol>
    ) : <EmptyCanonical>No Steps are documented in the current Process.</EmptyCanonical>;
  }

  if (section === "systems") {
    return process.systems.length ? (
      <ul className="space-y-3">
        {process.systems.map((system) => (
          <li className="text-sm" key={system.id}>
            <p className="font-medium text-[var(--text)]">{system.name}</p>
            <p className="mt-1 leading-6 text-[var(--text-secondary)]">{system.usage}</p>
          </li>
        ))}
      </ul>
    ) : <EmptyCanonical>No Systems are linked to the current Process.</EmptyCanonical>;
  }

  if (section === "exceptions") {
    return process.exceptions.length ? (
      <ul className="space-y-4">
        {process.exceptions.map((exception) => (
          <li className="text-sm" key={exception.id}>
            <p className="font-medium text-[var(--text)]">{exception.name}</p>
            <p className="mt-1 leading-6 text-[var(--text-secondary)]"><span className="font-medium">When:</span> {exception.condition}</p>
            <p className="mt-1 leading-6 text-[var(--text-secondary)]"><span className="font-medium">Response:</span> {exception.response}</p>
          </li>
        ))}
      </ul>
    ) : <EmptyCanonical>No active Exceptions are documented.</EmptyCanonical>;
  }

  if (section === "dependencies") {
    const dependencies = [
      ...process.upstream.map((item) => ({ ...item, direction: "Upstream" })),
      ...process.downstream.map((item) => ({ ...item, direction: "Downstream" })),
    ];
    return dependencies.length ? (
      <ul className="space-y-3">
        {dependencies.map((item) => (
          <li className="text-sm" key={`${item.direction}-${item.processId}-${item.type}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{item.direction}</Badge>
              <span className="font-medium text-[var(--text)]">{item.processName}</span>
            </div>
            {item.description ? <p className="mt-1 leading-6 text-[var(--text-secondary)]">{item.description}</p> : null}
          </li>
        ))}
      </ul>
    ) : <EmptyCanonical>No explicit Process dependencies are documented.</EmptyCanonical>;
  }

  return <EmptyCanonical>The current Process does not store detailed uncertainty or validation notes. They remain with the interview until you are ready to review a proposed update.</EmptyCanonical>;
}

export default async function DiscoveryReconciliationPreviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await connection();
  const { sessionId } = await params;
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();

  const { loadDiscoverySession } = await import("@/lib/discovery-data");
  const session = await loadDiscoverySession(
    experience.discovery.organizationId,
    sessionId,
  );
  if (!session || session.status !== "ready_for_review") notFound();

  const process = experience.data.processes.find((item) => item.id === session.processId);
  if (!process) notFound();

  const sections = buildDiscoveryReconciliationEvidence(session.observations);
  const evidenceCount = sections.reduce((total, section) => total + section.evidence.length, 0);

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="See what is documented now beside what you said in the interview."
        eyebrow={<>Discovery · Side-by-side review</>}
        stats={[
          { label: "Active observations", value: evidenceCount },
          { label: "Canonical Steps", value: process.steps.length },
        ]}
        title={process.name}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]" href={`/studio/discovery/interviews/${session.id}`}>
          ← Back to interview evidence
        </Link>
        <Link className="text-xs font-medium text-[var(--workspace-accent)]" href={`/studio/processes/${encodeURIComponent(process.id)}`}>
          View current Process
        </Link>
      </div>

      <Alert className="mt-5" tone="warning">
        Side-by-side review only. Lotura has not suggested, approved, or saved any changes to the Process.
      </Alert>

      <Card className="mt-5 p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <Badge tone="neutral">Current documented Process</Badge>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">What Lotura currently shows for this Process.</p>
          </div>
          <div>
            <Badge tone="warning">Interview notes</Badge>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Your current answers, including anything marked uncertain or needing validation.</p>
          </div>
          <div>
            <Badge tone="info">No update proposed</Badge>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Lotura has not decided what should change or matched these notes to saved records.</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 space-y-5">
        {sections.map((section) => (
          <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]" key={section.key}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">{section.label}</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{section.description}</p>
              </div>
              <Badge tone="info">No update proposed</Badge>
            </div>
            <div className="grid xl:grid-cols-2">
              <div className="border-b border-[var(--border)] p-5 sm:p-6 xl:border-b-0 xl:border-r">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Current documented Process</p>
                <CanonicalProcessSection process={process} section={section.key} />
              </div>
              <div className="p-5 sm:p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Current interview notes</p>
                {section.evidence.length ? (
                  <div className="space-y-4">
                    {section.evidence.map((observation) => (
                      <article className="rounded-[10px] border border-[var(--border)] p-4" key={observation.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge tone={observation.epistemicState === "known" ? "neutral" : "warning"}>{stateLabels[observation.epistemicState]}</Badge>
                          <Link className="text-xs font-medium text-[var(--workspace-accent)]" href={`/studio/discovery/interviews/${session.id}#observation-${observation.id}`}>
                            Interview answer {observation.sequence}
                          </Link>
                        </div>
                        <p className="mt-3 text-xs font-medium text-[var(--text-tertiary)]">{observation.promptText}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{observation.responseText || "No response supplied; the answer is explicitly unknown."}</p>
                      </article>
                    ))}
                  </div>
                ) : <EmptyCanonical>No current interview answer covers this area.</EmptyCanonical>}
              </div>
            </div>
          </section>
        ))}
      </div>

      <Alert className="mt-6" tone="info">
        In a later step, you will be able to choose what should become a proposed update. That action is not available on this page yet.
      </Alert>
    </WorkspaceShell>
  );
}
