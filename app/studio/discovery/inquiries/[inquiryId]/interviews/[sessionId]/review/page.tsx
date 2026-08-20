import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Alert, Badge, Card } from "@/app/ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "@/app/workspace-shell";
import { DiscoveryInquiryReviewForm } from "@/app/studio/discovery/discovery-inquiry-review-form";
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

export default async function DiscoveryInquiryReviewPage({
  params,
}: {
  params: Promise<{ inquiryId: string; sessionId: string }>;
}) {
  await connection();
  const { inquiryId, sessionId } = await params;
  if (!validUuid(inquiryId) || !validUuid(sessionId)) notFound();

  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();
  const {
    loadDiscoveryInquiryReview,
    loadDiscoveryInquiryReviewProcesses,
    loadDiscoveryInquirySession,
  } = await import("@/lib/discovery-data");
  const [session, latestReview, processes] = await Promise.all([
    loadDiscoveryInquirySession(
      experience.discovery.organizationId,
      inquiryId,
      sessionId,
    ),
    loadDiscoveryInquiryReview(
      experience.discovery.organizationId,
      inquiryId,
      sessionId,
    ),
    loadDiscoveryInquiryReviewProcesses(experience.discovery.organizationId),
  ]);
  if (!session) notFound();
  const firstReview = session.status === "ready_for_review" && !latestReview;
  const laterReview = session.status === "closed" && Boolean(latestReview);
  if (!firstReview && !laterReview) notFound();

  const superseded = new Set(
    session.observations
      .map((observation) => observation.supersedesObservationId)
      .filter((value): value is string => Boolean(value)),
  );
  const activeObservations = session.observations.filter(
    (observation) => !superseded.has(observation.id),
  );
  if (activeObservations.length < 1) notFound();

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="Review the saved answers together, then preserve what you concluded without forcing a Process or a change."
        eyebrow={<>Question-first discovery · Human review</>}
        stats={[
          { label: "Answers reviewed", value: activeObservations.length },
          { label: "Review", value: latestReview ? latestReview.reviewSequence + 1 : 1 },
        ]}
        title="What did you learn?"
      />

      <div className="mt-5">
        <Link
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]"
          href={`/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`}
        >
          ← Back to the saved interview
        </Link>
      </div>

      {latestReview ? (
        <Alert className="mt-5" tone="info">
          This will preserve a later interpretation without changing or erasing
          review {latestReview.reviewSequence}.
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="space-y-5">
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Original question
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
              {session.questionText}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {session.scopeStatement}
            </p>
          </Card>

          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Evidence included in this review
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
              Saved answers
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              The labels you already chose remain part of the evidence. You do
              not need to classify every answer again.
            </p>
          </div>

          <div className="space-y-4">
            {activeObservations.map((observation) => (
              <Card className="p-4 sm:p-5" key={observation.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge
                    tone={observation.epistemicState === "known"
                      ? "neutral"
                      : "warning"}
                  >
                    {stateLabels[observation.epistemicState]}
                  </Badge>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Answer {observation.sequence}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">
                  {observation.promptText}
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                  {observation.responseText
                    || "No response supplied; the answer is explicitly unknown."}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Card className="p-5 sm:p-6 xl:sticky xl:top-5">
            <p className="text-xs font-medium text-[var(--workspace-accent)]">
              Your conclusion
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
              Where should this understanding go next?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Choose everything the evidence supports. Uncertainty can remain
              unresolved, and no change is a valid result.
            </p>
            <div className="mt-5">
              <DiscoveryInquiryReviewForm
                expectedRevision={session.revision}
                inquiryId={inquiryId}
                processes={processes}
                sessionId={sessionId}
                supersedesReviewId={latestReview?.id || null}
              />
            </div>
          </Card>
        </section>
      </div>
    </WorkspaceShell>
  );
}
