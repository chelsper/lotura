import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  currentDiscoveryMappingItems,
  DISCOVERY_MAPPING_ACTION_LABELS,
} from "@/lib/discovery-mapping-model.mjs";
import { fingerprintDocumentedProcessSnapshot } from "@/lib/discovery-mapping-administration";
import { buildDocumentedProcessSnapshot } from "@/lib/discovery-proposal-model.mjs";
import {
  currentProposalReviewDecisions,
  PROPOSAL_REVIEW_DISPOSITION_LABELS,
  PROPOSAL_REVIEW_STATUS_LABELS,
  proposalReviewSummary,
} from "@/lib/proposal-review-model.mjs";
import { buildDiscoveryReconciliationEvidence } from "@/lib/discovery-reconciliation-preview.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { DiscoveryProposalItemSummary } from "../../../discovery-proposal-item-summary";
import {
  FinishProposalReviewForm,
  ProposalReviewDecisionForm,
} from "../../../proposal-review-controls";
import { Alert, Badge, Card } from "../../../../../ui/primitives";
import {
  WorkspacePageHeader,
  WorkspaceShell,
} from "../../../../../workspace-shell";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function dispositionTone(disposition: string | undefined) {
  if (disposition === "approve") return "success" as const;
  if (disposition === "reject") return "error" as const;
  if (disposition === "needs_validation") return "warning" as const;
  return "neutral" as const;
}

export default async function ProposalReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await connection();
  const { sessionId } = await params;
  const experience = await loadWorkspaceExperience();
  if (!experience.proposalReview.enabled) notFound();

  const {
    loadDiscoveryProposal,
    loadDiscoveryProposalMapping,
    loadDiscoverySession,
    loadOperatingModelProposalApplication,
    loadOperatingModelProposalReview,
  } = await import("@/lib/discovery-data");
  const [session, proposal, mapping, review, application] = await Promise.all([
    loadDiscoverySession(experience.proposalReview.organizationId, sessionId),
    loadDiscoveryProposal(experience.proposalReview.organizationId, sessionId),
    loadDiscoveryProposalMapping(
      experience.proposalReview.organizationId,
      sessionId,
    ),
    loadOperatingModelProposalReview(
      experience.proposalReview.organizationId,
      sessionId,
    ),
    loadOperatingModelProposalApplication(
      experience.proposalReview.organizationId,
      sessionId,
    ),
  ]);
  if (
    !session ||
    !proposal ||
    !mapping ||
    !review ||
    mapping.status !== "ready_for_proposal_review" ||
    review.mappingId !== mapping.id ||
    review.mappingRevision !== mapping.revision
  ) {
    notFound();
  }
  const process = experience.data.processes.find(
    (item) => item.id === session.processId,
  );
  if (!process) notFound();

  const currentItems = [...currentDiscoveryMappingItems(mapping.items).values()];
  const reviewItems = currentItems.filter(
    (item) => item.state === "active" && item.action !== "preserve_unresolved",
  );
  if (reviewItems.length === 0) notFound();
  const unresolvedItems = currentItems.filter(
    (item) => item.state === "active" && item.action === "preserve_unresolved",
  );
  const currentDecisions = currentProposalReviewDecisions(review.decisions);
  const summary = proposalReviewSummary(mapping.items, review.decisions);
  const evidence = buildDiscoveryReconciliationEvidence(session.observations)
    .flatMap((section) => section.evidence);
  const observationById = new Map(evidence.map((item) => [item.id, item]));
  const currentFingerprint = fingerprintDocumentedProcessSnapshot(
    buildDocumentedProcessSnapshot(process),
  );
  const documentationChanged =
    currentFingerprint !== review.documentedProcessFingerprint ||
    currentFingerprint !== proposal.documentedProcessFingerprint;
  const reviewFinished = review.status !== "in_review";

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="Review each proposed change against its evidence and decide what may move forward."
        eyebrow={<>Discovery · Proposal review</>}
        stats={[
          { label: "Specific changes", value: summary.total },
          { label: "Reviewed", value: summary.decided },
          { label: "Still to review", value: summary.remaining },
        ]}
        title={process.name}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]"
          href={`/studio/discovery/interviews/${session.id}/map`}
        >
          ← Back to specific changes
        </Link>
        <Link
          className="text-xs font-medium text-[var(--workspace-accent)]"
          href={`/studio/processes/${encodeURIComponent(process.id)}`}
        >
          View documented Process
        </Link>
      </div>

      <Alert className="mt-5" tone={reviewFinished ? "success" : "warning"}>
        {reviewFinished
          ? `${PROPOSAL_REVIEW_STATUS_LABELS[review.status]}. This result has not changed the documented Process.`
          : "This review decides what may move forward. It does not change or institutionally approve the documented Process."}
      </Alert>
      {documentationChanged ? (
        <Alert className="mt-4" tone="error">
          The documented Process changed after this proposal was prepared. The review remains readable, but it cannot be finished against stale documentation.
        </Alert>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Review capability</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">Explicitly enabled</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              The authenticated Lotura actor is recorded independently from organizational assignment.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Process Steward</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">Not assigned</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Reporting relationships and Process ownership do not create Stewardship.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Version application</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">
              {application
                ? `Applied as version ${application.afterVersionSequence}`
                : experience.processApplication.enabled
                  ? "Explicitly enabled"
                  : "Not configured"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {application
                ? "The prior and resulting documented states are preserved."
                : "A separate governed application step is required before current documentation can change."}
            </p>
          </div>
        </div>
      </Card>

      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Accountable review</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Specific proposed changes</h2>
          </div>
          <Badge tone={reviewFinished ? "success" : "info"}>
            {PROPOSAL_REVIEW_STATUS_LABELS[review.status]}
          </Badge>
        </div>

        <div className="mt-5 space-y-4">
          {reviewItems.map((item) => {
            const decision = currentDecisions.get(item.itemId) ?? null;
            const decisionHistory = review.decisions.filter(
              (entry) => entry.itemId === item.itemId,
            );
            return (
              <Card className="p-5 sm:p-6" key={item.itemId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Proposed item revision {item.itemSequence}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[var(--text)]">
                      {DISCOVERY_MAPPING_ACTION_LABELS[item.action]}
                    </h3>
                  </div>
                  <Badge tone={dispositionTone(decision?.disposition)}>
                    {decision
                      ? PROPOSAL_REVIEW_DISPOSITION_LABELS[decision.disposition]
                      : "Not reviewed"}
                  </Badge>
                </div>
                <div className="mt-5">
                  <DiscoveryProposalItemSummary
                    item={item}
                    observationById={observationById}
                  />
                </div>
                {decision ? (
                  <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                    <p>
                      <span className="font-medium text-[var(--text)]">Latest decision:</span>{" "}
                      {PROPOSAL_REVIEW_DISPOSITION_LABELS[decision.disposition]}
                    </p>
                    {decision.reviewNote ? <p className="mt-1">{decision.reviewNote}</p> : null}
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                      {formatTimestamp(decision.createdAt)} UTC · {decision.actorIdentifier}
                      {decisionHistory.length > 1
                        ? ` · ${decisionHistory.length - 1} earlier ${decisionHistory.length === 2 ? "decision" : "decisions"} preserved`
                        : ""}
                    </p>
                  </div>
                ) : null}
                {!reviewFinished ? (
                  <ProposalReviewDecisionForm
                    currentDecision={decision}
                    expectedReviewRevision={review.revision}
                    itemId={item.itemId}
                    sessionId={session.id}
                  />
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      {unresolvedItems.length ? (
        <Card className="mt-7 p-5 sm:p-6">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Preserved context</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Questions left unresolved</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            These questions remain useful knowledge, but they are not operating-model changes to approve.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
            {unresolvedItems.map((item) => (
              <li key={item.itemId}>{String(item.proposedState.question)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-7 p-5 sm:p-6">
        {reviewFinished ? (
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Completed review</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
              {PROPOSAL_REVIEW_STATUS_LABELS[review.status]}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {review.completionNote}
            </p>
            <p className="mt-3 text-xs text-[var(--text-tertiary)]">
              {review.completedAt ? `${formatTimestamp(review.completedAt)} UTC` : "Completion time unavailable"}
              {review.completedByActor ? ` · ${review.completedByActor}` : ""}
            </p>
            <Alert className="mt-4" tone={application ? "success" : "info"}>
              {application
                ? `This review was applied atomically as Process version ${application.afterVersionSequence}.`
                : "This review is preserved. The documented Process remains unchanged until a separately authorized application succeeds."}
            </Alert>
            {experience.processApplication.enabled && summary.approved > 0 ? (
              <Link
                className="mt-4 inline-flex rounded-[10px] bg-[var(--workspace-accent)] px-4 py-2.5 text-sm font-semibold text-white"
                href={`/studio/discovery/interviews/${session.id}/proposal-review/apply`}
              >
                {application ? "View application receipt" : "Apply approved changes"}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)]">Review summary</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
                {summary.remaining === 0
                  ? "Every proposed change has a decision"
                  : `${summary.remaining} ${summary.remaining === 1 ? "change still needs" : "changes still need"} a decision`}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="success">{summary.approved} approved</Badge>
                <Badge tone="error">{summary.rejected} not approved</Badge>
                <Badge tone="warning">{summary.needsValidation} need validation</Badge>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Finishing preserves this review result for the next governed step. It does not change current documentation.
              </p>
            </div>
            <FinishProposalReviewForm
              canFinish={summary.canFinish && !documentationChanged}
              expectedReviewRevision={review.revision}
              sessionId={session.id}
            />
          </div>
        )}
      </Card>
    </WorkspaceShell>
  );
}
