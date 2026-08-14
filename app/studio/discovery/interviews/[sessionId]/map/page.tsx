import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  currentDiscoveryMappingItems,
  DISCOVERY_MAPPING_ACTION_LABELS,
  discoveryMappingReadiness,
  type DiscoveryMappingAction,
} from "@/lib/discovery-mapping-model.mjs";
import { fingerprintDocumentedProcessSnapshot } from "@/lib/discovery-mapping-administration";
import {
  buildDocumentedProcessSnapshot,
  currentDiscoveryProposalDecisions,
} from "@/lib/discovery-proposal-model.mjs";
import { buildDiscoveryReconciliationEvidence } from "@/lib/discovery-reconciliation-preview.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import {
  DiscoveryMappingItemForm,
  DiscoveryMappingItemStateForm,
  FinishDiscoveryMappingForm,
} from "../../../discovery-mapping-controls";
import { DiscoveryProposalItemSummary } from "../../../discovery-proposal-item-summary";
import { BeginProposalReviewForm } from "../../../proposal-review-controls";
import { Alert, Badge, Card } from "../../../../../ui/primitives";
import {
  WorkspacePageHeader,
  WorkspaceShell,
} from "../../../../../workspace-shell";

export default async function DiscoveryMappingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await connection();
  const { sessionId } = await params;
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();

  const {
    loadDiscoveryProposal,
    loadDiscoveryProposalMapping,
    loadDiscoveryMappingCatalog,
    loadOperatingModelProposalReview,
    loadDiscoverySession,
  } = await import("@/lib/discovery-data");
  const [session, proposal, mapping, catalog] = await Promise.all([
    loadDiscoverySession(experience.discovery.organizationId, sessionId),
    loadDiscoveryProposal(experience.discovery.organizationId, sessionId),
    loadDiscoveryProposalMapping(experience.discovery.organizationId, sessionId),
    loadDiscoveryMappingCatalog(experience.discovery.organizationId, sessionId),
  ]);
  if (!session || !proposal || proposal.status !== "ready_for_review" || !catalog) notFound();
  const process = experience.data.processes.find((item) => item.id === session.processId);
  if (!process) notFound();

  const activeObservations = buildDiscoveryReconciliationEvidence(session.observations)
    .flatMap((section) => section.evidence);
  const observationById = new Map(activeObservations.map((item) => [item.id, item]));
  const currentDecisions = currentDiscoveryProposalDecisions(proposal.decisions);
  const includedEvidence = activeObservations.filter(
    (observation) => currentDecisions.get(observation.id)?.disposition === "use_in_proposal",
  );
  if (includedEvidence.length === 0) notFound();

  const currentItems = [...currentDiscoveryMappingItems(mapping?.items ?? []).values()];
  const readiness = discoveryMappingReadiness(
    includedEvidence.map((item) => item.id),
    mapping?.items ?? [],
  );
  const mappingFinished = mapping?.status === "ready_for_proposal_review";
  const review = experience.proposalReview.enabled && mappingFinished
    ? await loadOperatingModelProposalReview(
        experience.proposalReview.organizationId,
        sessionId,
      )
    : null;
  const currentSnapshot = buildDocumentedProcessSnapshot(process);
  const currentFingerprint = fingerprintDocumentedProcessSnapshot(currentSnapshot);
  const documentationChanged = currentFingerprint !== proposal.documentedProcessFingerprint;
  const activeActions = new Set(
    currentItems.filter((item) => item.state === "active").map((item) => item.action),
  );
  const availableActions: DiscoveryMappingAction[] = [
    ...(!activeActions.has("update_process_purpose")
      ? ["update_process_purpose" as const]
      : []),
    ...(!activeActions.has("change_process_owner")
      ? ["change_process_owner" as const]
      : []),
    "add_process_step",
    ...(catalog.steps.length
      ? ["revise_process_step" as const, "change_step_responsibility" as const]
      : []),
    ...(catalog.systems.some((system) => system.status === "active" && !system.alreadyLinked)
      ? ["link_existing_system" as const]
      : []),
    "add_process_exception",
    ...(catalog.exceptions.length ? ["revise_process_exception" as const] : []),
    ...(catalog.processes.some((related) => related.status !== "archived")
      ? ["add_process_dependency" as const]
      : []),
    "preserve_unresolved",
  ];
  const roles = experience.data.roles
    .filter((role) => role.status === "active" && role.stableKey)
    .map((role) => ({ id: role.stableKey!, name: role.name }));

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="Turn selected interview evidence into specific, reviewable changes without changing the documented Process."
        eyebrow={<>Discovery · Specific changes</>}
        stats={[
          { label: "Included answers", value: includedEvidence.length },
          { label: "Proposed changes", value: readiness.proposedChanges },
          { label: "Unresolved questions", value: readiness.unresolved },
        ]}
        title={process.name}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]"
          href={`/studio/discovery/interviews/${session.id}/reconcile`}
        >
          ← Back to proposed-update evidence
        </Link>
        <Link
          className="text-xs font-medium text-[var(--workspace-accent)]"
          href={`/studio/processes/${encodeURIComponent(process.id)}`}
        >
          View documented Process
        </Link>
      </div>

      <Alert className="mt-5" tone={mappingFinished ? "success" : "warning"}>
        {mappingFinished
          ? "Specific changes are ready for proposal review. They have not been approved or applied, and the documented Process has not changed."
          : "Write the specific changes these interview answers may support. A proposal is an interpretation for later review—not approval and not a change to the documented Process."}
      </Alert>
      {documentationChanged ? (
        <Alert className="mt-4" tone="error">
          The documented Process changed after this review began. You can still read this work, but it cannot be finished without a future governed rebase.
        </Alert>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Evidence selected for this update</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Interview answers to account for</h2>
          </div>
          <Badge tone={readiness.uncoveredObservationIds.length === 0 ? "success" : "warning"}>
            {readiness.uncoveredObservationIds.length === 0
              ? "Every answer accounted for"
              : `${readiness.uncoveredObservationIds.length} still to map`}
          </Badge>
        </div>
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {includedEvidence.map((observation) => {
            const covered = !readiness.uncoveredObservationIds.includes(observation.id);
            return (
              <li className="rounded-[10px] border border-[var(--border)] p-4" key={observation.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--text)]">Interview answer {observation.sequence}</span>
                  <Badge tone={covered ? "success" : "warning"}>{covered ? "Accounted for" : "Needs an item"}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {observation.responseText || "Explicitly unknown"}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Structured proposal</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Specific changes and unresolved questions</h2>
          </div>
          <Badge tone="info">Human-authored</Badge>
        </div>

        {currentItems.length ? (
          <div className="mt-5 space-y-4">
            {currentItems.map((item) => (
              <Card className="p-5 sm:p-6" key={item.itemId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={item.state === "active" ? "info" : "neutral"}>
                        {item.state === "active" ? "Current proposal" : "Withdrawn"}
                      </Badge>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        Revision {item.itemSequence}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-[var(--text)]">
                      {DISCOVERY_MAPPING_ACTION_LABELS[item.action]}
                    </h3>
                  </div>
                  {(mapping?.items.filter((revision) => revision.itemId === item.itemId).length ?? 0) > 1 ? (
                    <span className="text-xs text-[var(--text-tertiary)]">Earlier revisions preserved</span>
                  ) : null}
                </div>
                <div className="mt-5">
                  <DiscoveryProposalItemSummary item={item} observationById={observationById} />
                </div>
                {!mappingFinished && mapping ? (
                  <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 xl:grid-cols-2">
                    {item.state === "active" ? (
                      <details className="rounded-[10px] border border-[var(--border)] p-4">
                        <summary className="cursor-pointer text-sm font-medium text-[var(--text)]">Revise this item</summary>
                        <div className="mt-5">
                          <DiscoveryMappingItemForm
                            availableActions={[item.action]}
                            catalog={catalog}
                            currentPurpose={process.purpose}
                            evidence={includedEvidence}
                            expectedMappingRevision={mapping.revision}
                            item={item}
                            ownerRoleId={process.ownerRole?.stableKey ?? null}
                            roles={roles}
                            sessionId={session.id}
                          />
                        </div>
                      </details>
                    ) : <div />}
                    <DiscoveryMappingItemStateForm
                      expectedMappingRevision={mapping.revision}
                      item={item}
                      sessionId={session.id}
                    />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-5 border-dashed p-5 text-sm leading-6 text-[var(--text-secondary)]">
            No specific changes have been proposed yet.
          </Card>
        )}
      </section>

      {!mappingFinished ? (
        <Card className="mt-7 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Add a proposal item</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Describe the exact change these answers support. You may propose Process definition, Steps and responsibility, an existing System, an Exception, a dependency, or preserve an honest unresolved question.
          </p>
          <div className="mt-5">
            <DiscoveryMappingItemForm
              availableActions={availableActions}
              catalog={catalog}
              currentPurpose={process.purpose}
              evidence={includedEvidence}
              expectedMappingRevision={mapping?.revision ?? 0}
              ownerRoleId={process.ownerRole?.stableKey ?? null}
              roles={roles}
              sessionId={session.id}
            />
          </div>
        </Card>
      ) : null}

      <Card className="mt-7 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">
              {mappingFinished
                ? "Ready for proposal review"
                : readiness.canFinish && !documentationChanged
                  ? "Every included answer is accounted for"
                  : "Specific changes are still being prepared"}
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">
              Finishing freezes this mapping for its next human review. It does not approve or apply anything.
            </p>
          </div>
          {!mappingFinished && mapping ? (
            <FinishDiscoveryMappingForm
              canFinish={readiness.canFinish && !documentationChanged}
              expectedMappingRevision={mapping.revision}
              sessionId={session.id}
            />
          ) : review ? (
            <Link
              className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--accent)] px-3.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              href={`/studio/discovery/interviews/${session.id}/proposal-review`}
            >
              {review.status === "in_review" ? "Continue proposal review" : "View proposal review"}
            </Link>
          ) : mapping && experience.proposalReview.enabled && readiness.proposedChanges > 0 ? (
            <BeginProposalReviewForm
              expectedMappingRevision={mapping.revision}
              sessionId={session.id}
            />
          ) : (
            <Badge tone="success">
              {readiness.proposedChanges > 0 ? "Proposal review not configured" : "No changes to review"}
            </Badge>
          )}
        </div>
      </Card>
    </WorkspaceShell>
  );
}
