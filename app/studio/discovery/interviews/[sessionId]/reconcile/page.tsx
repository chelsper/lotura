import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import type {
  DiscoveryProposalDecisionRecord,
} from "@/lib/discovery-data";
import {
  buildDocumentedProcessSnapshot,
  currentDiscoveryProposalDecisions,
  DISCOVERY_PROPOSAL_DISPOSITION_LABELS,
  discoveryProposalReadiness,
  type DocumentedProcessSnapshot,
} from "@/lib/discovery-proposal-model.mjs";
import { buildDiscoveryReconciliationEvidence } from "@/lib/discovery-reconciliation-preview.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import {
  DiscoveryProposalDecisionForm,
  FinishDiscoveryProposalForm,
} from "../../../discovery-proposal-controls";
import { Alert, Badge, Card } from "../../../../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../../../../workspace-shell";

const stateLabels = {
  assumed: "Assumed",
  conflicting_observation: "Conflicting observation",
  known: "Known",
  needs_validation: "Needs validation",
  unknown: "Unknown",
};

function EmptyDocumentedInfo({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

function DocumentedProcessSection({
  snapshot,
  section,
}: {
  snapshot: DocumentedProcessSnapshot;
  section: string;
}) {
  if (section === "definition") {
    return (
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-[var(--text-tertiary)]">Name</dt>
          <dd className="mt-1 text-[var(--text)]">{snapshot.process.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--text-tertiary)]">Purpose</dt>
          <dd className="mt-1 whitespace-pre-wrap leading-6 text-[var(--text-secondary)]">{snapshot.process.purpose || "Not documented"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--text-tertiary)]">Status</dt>
          <dd className="mt-1"><Badge tone={snapshot.process.status === "draft" ? "warning" : "neutral"}>{snapshot.process.status}</Badge></dd>
        </div>
      </dl>
    );
  }

  if (section === "boundaries") {
    return <EmptyDocumentedInfo>The current Process does not have separate fields for its start and end. Existing Step and purpose text has not been used as a substitute.</EmptyDocumentedInfo>;
  }

  if (section === "responsibility") {
    const responsibleRoles = Array.from(new Map(
      snapshot.steps
        .filter((step) => step.responsibleRole)
        .map((step) => [step.responsibleRole!.id, step.responsibleRole!]),
    ).values());
    return (
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Owner Operational Role</p>
          <p className="mt-1 text-[var(--text)]">{snapshot.process.ownerRole?.name || "Not assigned"}</p>
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
    return snapshot.steps.length ? (
      <ol className="space-y-3">
        {snapshot.steps.map((step) => (
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
    ) : <EmptyDocumentedInfo>No Steps are documented in the current Process.</EmptyDocumentedInfo>;
  }

  if (section === "systems") {
    return snapshot.systems.length ? (
      <ul className="space-y-3">
        {snapshot.systems.map((system) => (
          <li className="text-sm" key={system.id}>
            <p className="font-medium text-[var(--text)]">{system.name}</p>
            <p className="mt-1 leading-6 text-[var(--text-secondary)]">{system.usage}</p>
          </li>
        ))}
      </ul>
    ) : <EmptyDocumentedInfo>No Systems are linked to the current Process.</EmptyDocumentedInfo>;
  }

  if (section === "exceptions") {
    return snapshot.exceptions.length ? (
      <ul className="space-y-4">
        {snapshot.exceptions.map((exception) => (
          <li className="text-sm" key={exception.id}>
            <p className="font-medium text-[var(--text)]">{exception.name}</p>
            <p className="mt-1 leading-6 text-[var(--text-secondary)]"><span className="font-medium">When:</span> {exception.condition}</p>
            <p className="mt-1 leading-6 text-[var(--text-secondary)]"><span className="font-medium">Response:</span> {exception.response}</p>
          </li>
        ))}
      </ul>
    ) : <EmptyDocumentedInfo>No active Exceptions are documented.</EmptyDocumentedInfo>;
  }

  if (section === "dependencies") {
    const dependencies = [
      ...snapshot.dependencies.upstream.map((item) => ({ ...item, direction: "Upstream" })),
      ...snapshot.dependencies.downstream.map((item) => ({ ...item, direction: "Downstream" })),
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
    ) : <EmptyDocumentedInfo>No explicit Process dependencies are documented.</EmptyDocumentedInfo>;
  }

  return <EmptyDocumentedInfo>The current Process does not store detailed uncertainty or validation notes. They remain with the interview until you are ready to review a proposed update.</EmptyDocumentedInfo>;
}

function ProposalChoiceSummary({
  decisions,
  sequenceByObservation,
}: {
  decisions: DiscoveryProposalDecisionRecord[];
  sequenceByObservation: Map<string, number>;
}) {
  const groups = [
    {
      disposition: "use_in_proposal" as const,
      empty: "No interview answers are included yet.",
      explanation: "These exact notes will form the basis for later structured review.",
      title: "Use in proposed update",
    },
    {
      disposition: "keep_documented" as const,
      empty: "No answers are marked to keep the current documentation.",
      explanation: "The current documented information stays as it is for these points.",
      title: "Keep what is documented",
    },
    {
      disposition: "leave_for_later" as const,
      empty: "No answers are set aside for later.",
      explanation: "These notes remain available, but are not included in this proposed update.",
      title: "Leave for later",
    },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {groups.map((group) => {
        const matching = decisions.filter(
          (decision) => decision.disposition === group.disposition,
        );
        return (
          <Card className="p-4" key={group.disposition}>
            <p className="text-sm font-semibold text-[var(--text)]">{group.title}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{group.explanation}</p>
            {matching.length ? (
              <ul className="mt-3 space-y-2 text-xs text-[var(--text-secondary)]">
                {matching.map((decision) => (
                  <li key={decision.observationId}>
                    Interview answer {sequenceByObservation.get(decision.observationId) ?? "—"}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-xs text-[var(--text-tertiary)]">{group.empty}</p>}
          </Card>
        );
      })}
    </div>
  );
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

  const { loadDiscoveryProposal, loadDiscoverySession } = await import("@/lib/discovery-data");
  const [session, proposal] = await Promise.all([
    loadDiscoverySession(experience.discovery.organizationId, sessionId),
    loadDiscoveryProposal(experience.discovery.organizationId, sessionId),
  ]);
  if (!session || session.status !== "ready_for_review") notFound();

  const process = experience.data.processes.find((item) => item.id === session.processId);
  if (!process) notFound();

  const sections = buildDiscoveryReconciliationEvidence(session.observations);
  const evidenceCount = sections.reduce((total, section) => total + section.evidence.length, 0);
  const snapshot = proposal?.documentedProcessSnapshot ?? buildDocumentedProcessSnapshot(process);
  const documentedSnapshotLabel = proposal
    ? "Documented Process when review began"
    : "Current documented Process";
  const activeObservationIds = sections.flatMap((section) => section.evidence.map((item) => item.id));
  const sequenceByObservation = new Map(
    sections.flatMap((section) => section.evidence).map((item) => [item.id, item.sequence]),
  );
  const decisions = proposal?.decisions ?? [];
  const currentDecisions = currentDiscoveryProposalDecisions(decisions);
  const currentDecisionList = activeObservationIds
    .map((id) => currentDecisions.get(id))
    .filter((decision): decision is DiscoveryProposalDecisionRecord => Boolean(decision));
  const readiness = discoveryProposalReadiness(activeObservationIds, decisions);
  const proposalFinished = proposal?.status === "ready_for_review";

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
          { label: "Interview answers", value: evidenceCount },
          { label: "Choices made", value: readiness.reviewed },
          { label: "Left for later", value: readiness.later },
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

      <Alert className="mt-5" tone={proposalFinished ? "success" : "warning"}>
        {proposalFinished
          ? "Proposed update ready for review. It has not been approved or applied, and the documented Process has not changed."
          : "Choose how each interview answer should be treated. You do not need to append a correction first. If another person or department must validate an answer, choose Leave for later. Saving a choice records review work only; it does not change the documented Process."}
      </Alert>
      {proposalFinished && readiness.included > 0 ? (
        <div className="mt-4 flex justify-end">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-white transition hover:opacity-90"
            href={`/studio/discovery/interviews/${session.id}/map`}
          >
            Turn notes into specific changes
          </Link>
        </div>
      ) : null}

      <Card className="mt-5 p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <Badge tone="neutral">{documentedSnapshotLabel}</Badge>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {proposal
                ? "The saved comparison point for this proposed update. Later Process changes do not rewrite it."
                : "What Lotura currently shows for this Process."}
            </p>
          </div>
          <div>
            <Badge tone="warning">Interview notes</Badge>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Your current answers, including anything marked uncertain or needing validation.</p>
          </div>
          <div>
            <Badge tone="info">Human choices</Badge>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">You decide what belongs in the proposed update, what stays as documented, and what waits for later.</p>
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
              <Badge tone={section.evidence.every((item) => currentDecisions.has(item.id)) && section.evidence.length > 0 ? "success" : "info"}>
                {section.evidence.length === 0
                  ? "No interview answer"
                  : section.evidence.every((item) => currentDecisions.has(item.id))
                    ? "Choices recorded"
                    : "Still to review"}
              </Badge>
            </div>
            <div className="grid xl:grid-cols-2">
              <div className="border-b border-[var(--border)] p-5 sm:p-6 xl:border-b-0 xl:border-r">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{documentedSnapshotLabel}</p>
                <DocumentedProcessSection snapshot={snapshot} section={section.key} />
              </div>
              <div className="p-5 sm:p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Current interview notes</p>
                {section.evidence.length ? (
                  <div className="space-y-4">
                    {section.evidence.map((observation) => (
                      <article className="rounded-[10px] border border-[var(--border)] p-4" key={observation.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={observation.epistemicState === "known" ? "neutral" : "warning"}>{stateLabels[observation.epistemicState]}</Badge>
                            {currentDecisions.get(observation.id) ? (
                              <Badge tone="info">{DISCOVERY_PROPOSAL_DISPOSITION_LABELS[currentDecisions.get(observation.id)!.disposition]}</Badge>
                            ) : null}
                          </div>
                          <Link className="text-xs font-medium text-[var(--workspace-accent)]" href={`/studio/discovery/interviews/${session.id}#observation-${observation.id}`}>
                            Interview answer {observation.sequence}
                          </Link>
                        </div>
                        <p className="mt-3 text-xs font-medium text-[var(--text-tertiary)]">{observation.promptText}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{observation.responseText || "No response supplied; the answer is explicitly unknown."}</p>
                        {observation.epistemicState !== "known" ? (
                          <p className="mt-3 rounded-[8px] bg-[var(--warning-soft)] px-3 py-2 text-xs leading-5 text-[var(--warning)]">
                            This answer is already marked {stateLabels[observation.epistemicState]}. No correction is required. Choose Leave for later when validation or clarification must come from someone else.
                          </p>
                        ) : null}
                        {currentDecisions.get(observation.id)?.reviewNote ? (
                          <p className="mt-3 rounded-[8px] bg-[var(--surface-subtle)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
                            Review note: {currentDecisions.get(observation.id)!.reviewNote}
                          </p>
                        ) : null}
                        {decisions.filter((decision) => decision.observationId === observation.id).length > 1 ? (
                          <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                            Earlier choices remain in history.
                          </p>
                        ) : null}
                        {!proposalFinished ? (
                          <DiscoveryProposalDecisionForm
                            currentDecision={currentDecisions.get(observation.id) ?? null}
                            expectedProposalRevision={proposal?.revision ?? 0}
                            observationId={observation.id}
                            sessionId={session.id}
                          />
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : <EmptyDocumentedInfo>No current interview answer covers this area.</EmptyDocumentedInfo>}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-7 border-t border-[var(--border)] pt-7">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">Proposed update</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Review your choices</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          This summary records the exact interview notes you selected. It does not turn free text into Steps, Roles, Systems, Exceptions, or dependencies. Those structured changes require a later review.
        </p>
        <div className="mt-5">
          <ProposalChoiceSummary
            decisions={currentDecisionList}
            sequenceByObservation={sequenceByObservation}
          />
        </div>
        <Card className="mt-5 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                {proposalFinished
                  ? "Ready for the next review"
                  : readiness.remaining === 0
                    ? "All interview answers have a choice"
                    : `${readiness.remaining} ${readiness.remaining === 1 ? "answer" : "answers"} still need a choice`}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                Finishing this proposed update does not approve or apply it.
              </p>
            </div>
            {!proposalFinished ? (
              <FinishDiscoveryProposalForm
                canFinish={readiness.canFinish}
                expectedProposalRevision={proposal?.revision ?? 0}
                sessionId={session.id}
              />
            ) : <Badge tone="success">Ready for review</Badge>}
          </div>
        </Card>
      </section>
    </WorkspaceShell>
  );
}
