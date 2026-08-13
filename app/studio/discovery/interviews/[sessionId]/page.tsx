import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  DISCOVERY_QUESTIONS,
  getDiscoveryQuestion,
} from "@/lib/discovery-questions.mjs";
import { analyzeDiscoveryReview } from "@/lib/discovery-review-signals.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { Alert, Badge, Button, Card } from "../../../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../../../workspace-shell";
import { changeDiscoveryPauseAction } from "../../actions";
import { DiscoveryAnswerForm } from "../../discovery-answer-form";
import { DiscoveryCorrectionForm } from "../../discovery-correction-form";

const stateLabels = {
  assumed: "Assumed",
  conflicting_observation: "Conflicting observation",
  known: "Known",
  needs_validation: "Needs validation",
  unknown: "Unknown",
};

export default async function DiscoveryInterviewPage({
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
  if (!session) notFound();

  const question = getDiscoveryQuestion(session.currentQuestionKey);
  const superseded = new Set(
    session.observations
      .map((observation) => observation.supersedesObservationId)
      .filter((value): value is string => Boolean(value)),
  );
  const progress = question
    ? DISCOVERY_QUESTIONS.findIndex((item) => item.key === question.key) + 1
    : DISCOVERY_QUESTIONS.length;
  const reviewSignals = session.status === "ready_for_review"
    ? analyzeDiscoveryReview(session.observations)
    : [];

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description={session.scopeStatement}
        eyebrow={<>Discovery session · Source observations</>}
        stats={[
          { label: "Questions reached", value: progress },
          { label: "Observations", value: session.observations.length },
        ]}
        title={session.processName}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]" href="/studio/discovery">
          ← All discovery sessions
        </Link>
        {session.status === "in_progress" || session.status === "paused" ? (
          <form action={changeDiscoveryPauseAction}>
            <input name="sessionId" type="hidden" value={session.id} />
            <input name="expectedRevision" type="hidden" value={session.revision} />
            <input name="paused" type="hidden" value={session.status === "in_progress" ? "yes" : "no"} />
            <Button size="sm" type="submit">
              {session.status === "in_progress" ? "Pause interview" : "Resume interview"}
            </Button>
          </form>
        ) : null}
      </div>

      <Alert className="mt-5" tone="warning">
        Sanitized operational knowledge only. Do not include donor, student, prospect, gift, wealth, HR, password, credential, or connection-string information.
      </Alert>

      {session.status === "paused" ? (
        <Card className="mt-6 p-5 sm:p-7">
          <Badge tone="neutral">Paused</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">This interview is paused</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Existing observations remain preserved. Resume when you are ready to continue from the current question.</p>
        </Card>
      ) : question && session.status === "in_progress" ? (
        <Card className="mt-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone="accent">Question {progress} of {DISCOVERY_QUESTIONS.length}</Badge>
            <span className="text-xs font-medium text-[var(--text-tertiary)]">{question.label}</span>
          </div>
          <h2 className="mt-5 max-w-3xl text-2xl font-semibold tracking-[-0.035em] text-[var(--text)] sm:text-3xl">{question.prompt}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{question.helper}</p>
          <div className="mt-7 border-t border-[var(--border)] pt-6">
            <DiscoveryAnswerForm promptKey={question.key} revision={session.revision} sessionId={session.id} />
          </div>
        </Card>
      ) : (
        <section className="mt-6">
          <div className="mb-5">
            <Badge tone="warning">Ready for review</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">Review the observations—not a proposed Process</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              These responses remain source evidence. Nothing here has updated, approved, activated, or completed the canonical Process. A later reconciliation step is still required.
            </p>
          </div>
          <Card className="mb-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone={reviewSignals.length > 0 ? "warning" : "neutral"}>
                  {reviewSignals.length} review {reviewSignals.length === 1 ? "question" : "questions"}
                </Badge>
                <h3 className="mt-3 text-lg font-semibold text-[var(--text)]">Things to review</h3>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">Deterministic review · No AI</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Lotura looks for explainable wording, classification, boundary, and correction patterns. These are review prompts—not findings, truth, or automatic reclassification. Nothing is changed unless you append a correction.
            </p>
            {reviewSignals.length > 0 ? (
              <div className="mt-5 space-y-3">
                {reviewSignals.map((signal) => (
                  <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4" key={signal.id}>
                    <p className="text-sm font-semibold text-[var(--text)]">{signal.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{signal.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {signal.observationIds.map((observationId) => {
                        const observation = session.observations.find((item) => item.id === observationId);
                        return observation ? (
                          <a className="text-xs font-medium text-[var(--workspace-accent)]" href={`#observation-${observationId}`} key={observationId}>
                            Review Observation {observation.sequence}
                          </a>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-secondary)]">No deterministic review questions were detected. Human review is still required.</p>
            )}
          </Card>
          <div className="space-y-4">
            {session.observations.map((observation) => (
              <Card className={superseded.has(observation.id) ? "scroll-mt-5 p-4 opacity-60 sm:p-5" : "scroll-mt-5 p-4 sm:p-5"} id={`observation-${observation.id}`} key={observation.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge tone={observation.epistemicState === "known" ? "neutral" : "warning"}>{stateLabels[observation.epistemicState]}</Badge>
                  <span className="text-[11px] text-[var(--text-tertiary)]">Observation {observation.sequence}{superseded.has(observation.id) ? " · superseded" : ""}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">{observation.promptText}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{observation.responseText || "No response supplied; the answer is explicitly unknown."}</p>
                {observation.supersedesObservationId ? (
                  <p className="mt-3 text-xs text-[var(--text-tertiary)]">This observation corrects an earlier record without erasing it.</p>
                ) : null}
                {!superseded.has(observation.id) ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-[var(--workspace-accent)]">Append a correction</summary>
                    <DiscoveryCorrectionForm
                      currentEpistemicState={observation.epistemicState}
                      currentResponseText={observation.responseText}
                      observationId={observation.id}
                      revision={session.revision}
                      sessionId={session.id}
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
