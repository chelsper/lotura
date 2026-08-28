import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  DISCOVERY_QUESTIONS,
  getDiscoveryQuestion,
} from "@/lib/discovery-questions.mjs";
import {
  buildDocumentedQuestionContext,
} from "@/lib/discovery-known-context.mjs";
import {
  discoveryProposalReadiness,
} from "@/lib/discovery-proposal-model.mjs";
import {
  activeDiscoveryObservations,
  analyzeDiscoveryReview,
} from "@/lib/discovery-review-signals.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { Alert, Badge, Button, Card } from "../../../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../../../workspace-shell";
import { changeDiscoveryPauseAction } from "../../actions";
import { DiscoveryAssistanceRequestForm } from "../../discovery-assistance-request-form";
import { DiscoveryAssistanceSuggestionForm } from "../../discovery-assistance-suggestion-form";
import { DiscoveryAssistanceRequestDetails } from "../../discovery-assistance-request-details";
import { DiscoveryAnswerForm } from "../../discovery-answer-form";
import { DiscoveryAnalystInterview } from "../../discovery-analyst-interview";
import { DiscoveryAnalystStartForm } from "../../discovery-analyst-start-form";
import { DiscoveryCorrectionForm } from "../../discovery-correction-form";
import { DiscoveryPriorObservationForm } from "../../discovery-prior-observation-form";

const stateLabels = {
  assumed: "Assumed",
  conflicting_observation: "Conflicting observation",
  known: "Known",
  needs_validation: "Needs validation",
  unknown: "Unknown",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default async function DiscoveryInterviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await connection();
  const { sessionId } = await params;
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();
  const discoveryOrganizationId = experience.discovery.organizationId;
  const { loadDiscoveryProposal, loadDiscoverySession } = await import("@/lib/discovery-data");
  const [session, proposal] = await Promise.all([
    loadDiscoverySession(experience.discovery.organizationId, sessionId),
    loadDiscoveryProposal(experience.discovery.organizationId, sessionId),
  ]);
  if (!session) notFound();

  const analystTurn = session.analystEnabled && session.status === "in_progress"
    ? await import("@/lib/discovery-analyst-data").then(
        ({ loadDiscoveryAnalystTurn }) =>
          loadDiscoveryAnalystTurn(
            discoveryOrganizationId,
            session.id,
            session.revision,
          ),
      )
    : null;

  const question = getDiscoveryQuestion(session.currentQuestionKey);
  const assistance = !session.analystEnabled && question && session.status === "in_progress"
    ? await import("@/lib/discovery-assistance-data").then(
        ({ loadProcessDiscoveryAssistance }) =>
          loadProcessDiscoveryAssistance(
            discoveryOrganizationId,
            session.id,
            session.revision,
            question.key,
          ),
      )
    : null;
  const documentedProcess = experience.data.processes.find(
    (process) => process.id === session.processId,
  );
  const documentedContext = question
    ? buildDocumentedQuestionContext(documentedProcess, question.key)
    : null;
  const superseded = new Set(
    session.observations
      .map((observation) => observation.supersedesObservationId)
      .filter((value): value is string => Boolean(value)),
  );
  const progress = session.analystEnabled
    ? new Set(session.observations.map((observation) => observation.promptKey)).size
    : question
    ? DISCOVERY_QUESTIONS.findIndex((item) => item.key === question.key) + 1
    : DISCOVERY_QUESTIONS.length;
  const reviewSignals = session.status === "ready_for_review"
    ? analyzeDiscoveryReview(session.observations)
    : [];
  const activeObservationIds = activeDiscoveryObservations(session.observations)
    .map((observation) => observation.id);
  const proposalReadiness = discoveryProposalReadiness(
    activeObservationIds,
    proposal?.decisions ?? [],
  );
  const completedWithoutChanges = proposal?.status === "ready_for_review"
    && proposalReadiness.included === 0;
  const nextStepLabel = completedWithoutChanges
    ? "View interview outcome"
    : proposal?.status === "ready_for_review"
      ? "View outcome and proposed changes"
      : proposal
        ? "Continue proposed update"
        : "Review and prepare an update";
  const nextStepHref = `/studio/discovery/interviews/${session.id}/reconcile`;

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
        Describe how the work happens without including sensitive records. Do not include donor, student, prospect, gift, wealth, HR, password, credential, or connection-string information.
      </Alert>

      {!session.analystEnabled && session.status === "in_progress" ? (
        <DiscoveryAnalystStartForm
          revision={session.revision}
          sessionId={session.id}
        />
      ) : null}

      {session.status === "paused" ? (
        <Card className="mt-6 p-5 sm:p-7">
          <Badge tone="neutral">Paused</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">This interview is paused</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Existing observations remain preserved. Resume when you are ready to continue from the current question.</p>
        </Card>
      ) : session.analystEnabled && session.status === "in_progress" ? (
        <DiscoveryAnalystInterview
          observations={session.observations}
          revision={session.revision}
          sessionId={session.id}
          turn={analystTurn}
        />
      ) : question && session.status === "in_progress" ? (
        <section className="mt-6 space-y-5">
          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone="neutral">Existing knowledge</Badge>
                <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
                  What Lotura already knows
                </h2>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                Source-linked · No AI
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Review the current documentation and earlier interview answers before writing anything again. Confirm an earlier answer only if it still describes this interview.
            </p>

            {documentedContext ? (
              <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {documentedContext.heading}
                </p>
                <div className="mt-2 space-y-1">
                  {documentedContext.lines.map((line) => (
                    <p className="text-sm leading-6 text-[var(--text-secondary)]" key={line}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                The documented Process does not contain a separate answer to this question yet.
              </p>
            )}

            {session.priorObservations.length > 0 ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Earlier answers about this topic
                </p>
                {session.priorObservations.map((observation) => (
                  <div
                    className="rounded-[10px] border border-[var(--border)] p-4"
                    key={observation.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone={observation.epistemicState === "known" ? "neutral" : "warning"}>
                        {stateLabels[observation.epistemicState]}
                      </Badge>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {dateFormatter.format(new Date(observation.createdAt))} · {observation.scopeStatement}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                      {observation.responseText || "This answer was explicitly unknown."}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                      Recorded by {observation.actorIdentifier}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <DiscoveryPriorObservationForm
                        promptKey={question.key}
                        revision={session.revision}
                        sessionId={session.id}
                        sourceObservationId={observation.id}
                      />
                      <a
                        className="inline-flex h-9 items-center justify-center rounded-[9px] border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-subtle)]"
                        href="#new-answer"
                      >
                        Something changed
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
                No active answer from an earlier interview is available for this exact question.
              </p>
            )}
          </Card>

          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone="accent">Optional assistance</Badge>
                <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
                  Get help with this part of the conversation
                </h2>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                Human review required
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Ask Lotura for a more focused question or a clearer draft. You can edit, skip, or reject every suggestion. The regular interview question remains available below.
            </p>
            <Alert className="mt-4" tone="info">
              External assistance remains optional. When the reviewed pilot is enabled, Lotura shows the exact context and asks for two confirmations before sending anything. Otherwise, assistance uses the deterministic mock.
            </Alert>
            {assistance ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    Review Lotura&apos;s suggestions
                  </p>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {assistance.sourceCount} attributable {assistance.sourceCount === 1 ? "source" : "sources"}
                  </span>
                </div>
                <DiscoveryAssistanceRequestDetails assistance={assistance} />
                {assistance.suggestions.map((suggestion) => (
                  <DiscoveryAssistanceSuggestionForm
                    key={suggestion.id}
                    providerKey={assistance.providerKey}
                    revision={session.revision}
                    sessionId={session.id}
                    sessionKind="process"
                    standardPromptText={question.prompt}
                    suggestion={suggestion}
                  />
                ))}
                {assistance.suggestions.every((suggestion) => suggestion.decision) ? (
                  <div className="border-t border-[var(--border)] pt-5">
                    <DiscoveryAssistanceRequestForm
                      promptKey={question.key}
                      revision={session.revision}
                      sessionId={session.id}
                      sessionKind="process"
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5">
                <DiscoveryAssistanceRequestForm
                  promptKey={question.key}
                  revision={session.revision}
                  sessionId={session.id}
                  sessionKind="process"
                />
              </div>
            )}
          </Card>

          <Card className="scroll-mt-5 p-5 sm:p-7" id="new-answer">
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
        </section>
      ) : (
        <section className="mt-6">
          <div className="mb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Badge tone="warning">Ready for review</Badge>
              <Link
                className="inline-flex h-9 items-center justify-center rounded-[9px] bg-[var(--workspace-accent)] px-3 text-xs font-medium text-[var(--workspace-accent-foreground)] hover:bg-[var(--workspace-accent-hover)]"
                href={nextStepHref}
              >
                {nextStepLabel}
              </Link>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">Review your interview answers</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              These are your saved notes about how the work happens. They have not changed or approved the documented Process. Comparing them with the current Process is the next step.
            </p>
            <Alert className="mt-4" tone="success">
              You do not need to resolve or rewrite answers marked Assumed, Unknown, Needs validation, or Conflicting observation. They move forward with that label so the right people can review them later. Change an answer only when its wording or label is wrong.
            </Alert>
            {proposal?.status === "ready_for_review" ? (
              <Alert className="mt-4" tone="success">
                {completedWithoutChanges
                  ? "The interview review is complete. No changes were proposed, and unresolved answers remain preserved for later. To protect that review record, these answers can no longer be corrected in place."
                  : "The review and its proposed changes are preserved for the next step. To protect that review record, these interview answers can no longer be corrected in place."}
              </Alert>
            ) : null}
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
              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                No immediate review questions were detected. No correction is required before the next step; unresolved answers keep their current labels.
              </p>
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
                {observation.confirmedFrom ? (
                  <p className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
                    Confirmed from an earlier interview dated {dateFormatter.format(new Date(observation.confirmedFrom.createdAt))}: {observation.confirmedFrom.scopeStatement}. The earlier answer remains preserved as the source.
                  </p>
                ) : null}
                {!superseded.has(observation.id) && observation.epistemicState !== "known" ? (
                  <p className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
                    No correction is required. This answer will move forward as {stateLabels[observation.epistemicState]} for later review.
                  </p>
                ) : null}
                {!superseded.has(observation.id) && proposal?.status !== "ready_for_review" ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-[var(--workspace-accent)]">Change this answer or label (optional)</summary>
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
          <Card className="mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)]">Ready for the next step</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                {completedWithoutChanges
                  ? "See what the review confirmed, what remains open, and why completing an interview does not require proposing a change."
                  : "Unresolved answers can move forward unchanged. The next step records how each answer should be treated without changing or approving the documented Process."}
              </p>
            </div>
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-[9px] bg-[var(--workspace-accent)] px-4 text-sm font-medium text-[var(--workspace-accent-foreground)] hover:bg-[var(--workspace-accent-hover)]"
              href={nextStepHref}
            >
              {nextStepLabel}
            </Link>
          </Card>
        </section>
      )}
    </WorkspaceShell>
  );
}
