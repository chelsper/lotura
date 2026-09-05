import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Alert, Badge, Card } from "@/app/ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "@/app/workspace-shell";
import { DiscoveryProcessBaselineForm } from "@/app/studio/discovery/discovery-process-baseline-form";
import { loadLatestDiscoveryAnalystTurn } from "@/lib/discovery-analyst-data";
import {
  buildInquiryKnowledgeOutcomeCounts,
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS,
} from "@/lib/discovery-inquiry-review-model.mjs";
import { loadProcessFamilyCatalog } from "@/lib/process-family-data";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

const stateLabels = {
  assumed: "Assumed",
  conflicting_observation: "Conflicting observation",
  known: "Known",
  needs_validation: "Needs validation",
  unknown: "Unknown",
};

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function processPurpose({
  narrative,
  purpose,
  scope,
  trigger,
  endBoundary,
}: {
  endBoundary: string | null;
  narrative: string;
  purpose: string | null;
  scope: string;
  trigger: string | null;
}) {
  return [
    purpose || narrative || scope,
    trigger ? `Starts when: ${trigger}` : null,
    endBoundary ? `Ends when: ${endBoundary}` : null,
  ].filter(Boolean).join("\n\n");
}

export default async function DiscoveryInquiryOutcomePage({
  params,
}: {
  params: Promise<{
    inquiryId: string;
    reviewId: string;
    sessionId: string;
  }>;
}) {
  await connection();
  const { inquiryId, reviewId, sessionId } = await params;
  if (
    !validUuid(inquiryId)
    || !validUuid(sessionId)
    || !validUuid(reviewId)
  ) notFound();

  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();
  const {
    loadDiscoveryInquiryReview,
    loadDiscoveryInquirySession,
  } = await import("@/lib/discovery-data");
  const [session, review, latestReview] = await Promise.all([
    loadDiscoveryInquirySession(
      experience.discovery.organizationId,
      inquiryId,
      sessionId,
    ),
    loadDiscoveryInquiryReview(
      experience.discovery.organizationId,
      inquiryId,
      sessionId,
      reviewId,
    ),
    loadDiscoveryInquiryReview(
      experience.discovery.organizationId,
      inquiryId,
      sessionId,
    ),
  ]);
  if (!session || !review || !latestReview) notFound();
  const counts = buildInquiryKnowledgeOutcomeCounts(review.observations);
  const isLatest = latestReview.id === review.id;
  const canCreateBaseline = isLatest && review.outcomes.some(
    (outcome) => outcome.kind === "possible_new_process",
  );
  const isProcessFamilyCandidate = review.outcomes.some(
    (outcome) => outcome.kind === "possible_new_process_family",
  );
  const isPolicyCandidate = review.outcomes.some(
    (outcome) => outcome.kind === "possible_policy",
  );
  const [analystTurn, familyCatalog] = await Promise.all([
    canCreateBaseline
      ? loadLatestDiscoveryAnalystTurn(
          experience.discovery.organizationId,
          sessionId,
          "inquiry",
        )
      : Promise.resolve(null),
    canCreateBaseline
      ? loadProcessFamilyCatalog(experience.discovery.organizationId)
      : Promise.resolve({ families: [] }),
  ]);
  const defaultPurpose = analystTurn
    ? processPurpose({
        endBoundary: analystTurn.snapshot.process.endBoundary,
        narrative: analystTurn.snapshot.narrative,
        purpose: analystTurn.snapshot.process.purpose,
        scope: session.scopeStatement,
        trigger: analystTurn.snapshot.process.trigger,
      })
    : session.scopeStatement;
  const defaultSteps = analystTurn?.snapshot.process.steps.join("\n") ?? "";
  const basePath =
    `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`;

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="A durable, human-reviewed summary of what this Discovery cycle established and what remains open."
        eyebrow={<>Question-first discovery · Knowledge Outcome</>}
        stats={[
          { label: "Answers reviewed", value: counts.reviewed },
          { label: "Human conclusions", value: review.outcomes.length },
          { label: "Review", value: review.reviewSequence },
        ]}
        title="What you learned"
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]"
          href={basePath}
        >
          ← Back to the saved interview
        </Link>
        {isLatest ? (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-[9px] border border-[var(--workspace-accent-border)] px-3 text-xs font-medium text-[var(--workspace-accent)] hover:bg-[var(--workspace-accent-subtle)]"
            href={`${basePath}/review`}
          >
            Record a later interpretation
          </Link>
        ) : (
          <Link
            className="text-xs font-medium text-[var(--workspace-accent)] hover:underline"
            href={`${basePath}/outcomes/${latestReview.id}`}
          >
            View the latest review
          </Link>
        )}
      </div>

      {!isLatest ? (
        <Alert className="mt-5" tone="info">
          This review remains preserved, but a later human interpretation is
          now current.
        </Alert>
      ) : null}

      <Alert className="mt-5" tone="success">
        This review preserved organizational understanding. No Process was
        created, proposed, approved, or changed.
      </Alert>

      {canCreateBaseline ? (
        <Card className="mt-6 p-5 sm:p-6">
          <Badge tone="success">Enough for a working baseline</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text)]">
            Turn what you learned into something useful now
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Review the bare bones below, then create a shared Draft Process.
            It can be read and used immediately while unanswered questions and
            Needs validation evidence remain available for later Discovery.
          </p>
          {experience.authoring.enabled ? (
            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <DiscoveryProcessBaselineForm
                defaultName={session.questionText}
                defaultPurpose={defaultPurpose}
                defaultSteps={defaultSteps}
                families={familyCatalog.families
                  .filter((family) => family.status === "active")
                  .map((family) => ({
                    id: family.stableKey,
                    name: family.name,
                  }))}
                inquiryId={inquiryId}
                reviewId={reviewId}
                roles={experience.data.roles
                  .filter((role) => role.status === "active")
                  .map((role) => ({ id: role.id, name: role.name }))}
                sessionId={sessionId}
              />
            </div>
          ) : (
            <Alert className="mt-5" tone="info">
              The understanding is preserved. A Workspace Administrator can
              create the shared working baseline when Process authoring is enabled.
            </Alert>
          )}
        </Card>
      ) : null}

      {isProcessFamilyCandidate ? (
        <Card className="mt-6 p-5 sm:p-6">
          <Badge tone="accent">Process Family candidate</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
            This appears to organize several related Processes
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Lotura preserved that conclusion without pretending the Family is
            itself a Process. Create or review the Family, then add individual
            working Processes as members when their basic flows are clear.
          </p>
          <Link
            className="mt-4 inline-flex h-9 items-center rounded-[9px] border border-[var(--workspace-accent-border)] px-3 text-xs font-medium text-[var(--workspace-accent)] hover:bg-[var(--workspace-accent-subtle)]"
            href="/studio/process-families"
          >
            Review Process Families
          </Link>
        </Card>
      ) : null}

      {isPolicyCandidate ? (
        <Card className="mt-6 p-5 sm:p-6">
          <Badge tone="accent">Policy candidate</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
            Keep this as governing guidance—not a parent Process
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            The Policy classification and evidence are preserved. First-class
            Policy authoring is not part of this Alpha, so Lotura has not forced
            the Policy into the Process hierarchy or created a misleading Process.
          </p>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="space-y-6">
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              What was reviewed
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
              {session.questionText}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {session.scopeStatement}
            </p>
          </Card>

          <section>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              What you concluded
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">
              Knowledge Outcome
            </h2>
            <div className="mt-4 space-y-4">
              {review.outcomes.map((outcome) => {
                const details =
                  DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS[outcome.kind];
                return (
                  <Card className="p-5" key={outcome.id}>
                    <Badge tone={outcome.kind === "additional_validation_required"
                      ? "warning"
                      : "accent"}
                    >
                      Human conclusion
                    </Badge>
                    <h3 className="mt-3 text-lg font-semibold text-[var(--text)]">
                      {details.label}
                    </h3>
                    {outcome.processId && outcome.processName ? (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Context: {" "}
                        <Link
                          className="font-medium text-[var(--workspace-accent)] hover:underline"
                          href={`/studio/processes/${encodeURIComponent(outcome.processId)}`}
                        >
                          {outcome.processName}
                        </Link>
                      </p>
                    ) : null}
                    {outcome.explanation ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                        {outcome.explanation}
                      </p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          </section>

          {review.reviewNote ? (
            <Card className="p-5 sm:p-6">
              <p className="text-xs font-medium text-[var(--text-tertiary)]">
                Overall note
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                {review.reviewNote}
              </p>
            </Card>
          ) : null}
        </section>

        <aside className="space-y-5">
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Evidence state
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
              What remains visible
            </h2>
            <div className="mt-4 space-y-3">
              {Object.entries(counts.states).map(([state, count]) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
                  key={state}
                >
                  <span className="text-sm text-[var(--text-secondary)]">
                    {stateLabels[state as keyof typeof stateLabels]}
                  </span>
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--text-tertiary)]">
              These counts describe the preserved evidence. They are not a
              confidence, quality, or completion score.
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Review record
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-[var(--text-tertiary)]">Completed</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {formattedDate(review.completedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-tertiary)]">Reviewed by</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {review.actorIdentifier}
                </dd>
              </div>
              {review.supersedesReviewId ? (
                <div>
                  <dt className="text-[var(--text-tertiary)]">History</dt>
                  <dd className="mt-1 text-[var(--text-secondary)]">
                    This interpretation follows an earlier preserved review.
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
