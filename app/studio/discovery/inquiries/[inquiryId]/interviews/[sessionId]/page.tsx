import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  DISCOVERY_INQUIRY_QUESTIONS,
  getDiscoveryInquiryQuestion,
} from "@/lib/discovery-inquiry-questions.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { Alert, Badge, Button, Card } from "../../../../../../ui/primitives";
import {
  WorkspacePageHeader,
  WorkspaceShell,
} from "../../../../../../workspace-shell";
import { changeInquiryDiscoveryPauseAction } from "../../../../actions";
import { DiscoveryInquiryAnswerForm } from "../../../../discovery-inquiry-answer-form";
import { DiscoveryInquiryCorrectionForm } from "../../../../discovery-inquiry-correction-form";

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

export default async function DiscoveryInquiryInterviewPage({
  params,
}: {
  params: Promise<{ inquiryId: string; sessionId: string }>;
}) {
  await connection();
  const { inquiryId, sessionId } = await params;
  if (!validUuid(inquiryId) || !validUuid(sessionId)) notFound();

  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();
  const { loadDiscoveryInquirySession } = await import("@/lib/discovery-data");
  const session = await loadDiscoveryInquirySession(
    experience.discovery.organizationId,
    inquiryId,
    sessionId,
  );
  if (!session) notFound();

  const question = getDiscoveryInquiryQuestion(session.currentQuestionKey);
  const superseded = new Set(
    session.observations
      .map((observation) => observation.supersedesObservationId)
      .filter((value): value is string => Boolean(value)),
  );
  const progress = question
    ? DISCOVERY_INQUIRY_QUESTIONS.findIndex(
      (item) => item.key === question.key,
    ) + 1
    : DISCOVERY_INQUIRY_QUESTIONS.length;

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description={session.scopeStatement}
        eyebrow={<>Question-first discovery · Saved answers</>}
        stats={[
          { label: "Questions reached", value: progress },
          { label: "Saved answers", value: session.observations.length },
        ]}
        title={session.questionText}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]"
          href={`/studio/discovery/inquiries/${inquiryId}`}
        >
          ← Back to the original question
        </Link>
        {session.status === "in_progress" || session.status === "paused" ? (
          <form action={changeInquiryDiscoveryPauseAction}>
            <input name="inquiryId" type="hidden" value={inquiryId} />
            <input name="sessionId" type="hidden" value={sessionId} />
            <input
              name="expectedRevision"
              type="hidden"
              value={session.revision}
            />
            <input
              name="paused"
              type="hidden"
              value={session.status === "in_progress" ? "yes" : "no"}
            />
            <Button size="sm" type="submit">
              {session.status === "in_progress"
                ? "Pause interview"
                : "Resume interview"}
            </Button>
          </form>
        ) : null}
      </div>

      <Alert className="mt-5" tone="info">
        You are exploring this question before choosing a Process. Your saved
        answers are evidence for later human review; they have not created,
        selected, or changed a documented Process.
      </Alert>

      {session.status === "paused" ? (
        <Card className="mt-6 p-5 sm:p-7">
          <Badge tone="neutral">Paused</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
            This interview is paused
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Existing answers remain preserved. Resume when you are ready to
            continue from the current question.
          </p>
        </Card>
      ) : question && session.status === "in_progress" ? (
        <Card className="mt-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone="accent">
              Question {progress} of {DISCOVERY_INQUIRY_QUESTIONS.length}
            </Badge>
            <span className="text-xs font-medium text-[var(--text-tertiary)]">
              {question.label}
            </span>
          </div>
          <h2 className="mt-5 max-w-3xl text-2xl font-semibold tracking-[-0.035em] text-[var(--text)] sm:text-3xl">
            {question.prompt}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {question.helper}
          </p>
          <div className="mt-7 border-t border-[var(--border)] pt-6">
            <DiscoveryInquiryAnswerForm
              inquiryId={inquiryId}
              promptKey={question.key}
              revision={session.revision}
              sessionId={sessionId}
            />
          </div>
        </Card>
      ) : (
        <section className="mt-6">
          <Badge tone="warning">Ready for human review</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
            Review what you learned
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            These answers remain connected to the original question without
            claiming that they describe one existing Process. You can correct
            wording or labels below. A later review slice will let a person
            decide whether the evidence belongs with an existing Process, spans
            several Processes, needs more validation, or may support a new
            working draft.
          </p>
          <Alert className="mt-4" tone="success">
            Reaching this point is a valid outcome. No Process was selected,
            created, proposed, approved, or changed.
          </Alert>
          <div className="mt-5 space-y-4">
            {session.observations.map((observation) => (
              <Card
                className={superseded.has(observation.id)
                  ? "p-4 opacity-60 sm:p-5"
                  : "p-4 sm:p-5"}
                id={`observation-${observation.id}`}
                key={observation.id}
              >
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
                    {superseded.has(observation.id) ? " · superseded" : ""}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">
                  {observation.promptText}
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                  {observation.responseText
                    || "No response supplied; the answer is explicitly unknown."}
                </p>
                {observation.supersedesObservationId ? (
                  <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                    This answer corrects an earlier record without erasing it.
                  </p>
                ) : null}
                {!superseded.has(observation.id) ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-[var(--workspace-accent)]">
                      Change this answer or label (optional)
                    </summary>
                    <DiscoveryInquiryCorrectionForm
                      currentEpistemicState={observation.epistemicState}
                      currentResponseText={observation.responseText}
                      inquiryId={inquiryId}
                      observationId={observation.id}
                      revision={session.revision}
                      sessionId={sessionId}
                    />
                  </details>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}
