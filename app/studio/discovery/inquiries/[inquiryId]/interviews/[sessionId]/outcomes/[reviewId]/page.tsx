import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Alert, Badge, Card } from "@/app/ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "@/app/workspace-shell";
import {
  buildInquiryKnowledgeOutcomeCounts,
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS,
} from "@/lib/discovery-inquiry-review-model.mjs";
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
