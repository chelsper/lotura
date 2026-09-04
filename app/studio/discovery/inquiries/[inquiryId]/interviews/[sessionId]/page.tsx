import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  DISCOVERY_INQUIRY_QUESTIONS,
  getDiscoveryInquiryQuestion,
} from "@/lib/discovery-inquiry-questions.mjs";
import { buildInquiryKnownContext } from "@/lib/discovery-known-context.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { Alert, Badge, Button, Card } from "../../../../../../ui/primitives";
import {
  WorkspacePageHeader,
  WorkspaceShell,
} from "../../../../../../workspace-shell";
import { changeInquiryDiscoveryPauseAction } from "../../../../actions";
import { DiscoveryAssistanceRequestForm } from "../../../../discovery-assistance-request-form";
import { DiscoveryAssistanceSuggestionForm } from "../../../../discovery-assistance-suggestion-form";
import { DiscoveryAssistanceRequestDetails } from "../../../../discovery-assistance-request-details";
import { DiscoveryInquiryAnswerForm } from "../../../../discovery-inquiry-answer-form";
import { DiscoveryInquiryCorrectionForm } from "../../../../discovery-inquiry-correction-form";
import { DiscoveryAnalystInterview } from "../../../../discovery-analyst-interview";
import { DiscoveryAnalystStartForm } from "../../../../discovery-analyst-start-form";
import { DiscoveryReferenceConfirmationTable } from "../../../../discovery-reference-confirmation-table";

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
  const discoveryOrganizationId = experience.discovery.organizationId;
  const { loadDiscoveryInquiryReview, loadDiscoveryInquirySession } =
    await import("@/lib/discovery-data");
  const session = await loadDiscoveryInquirySession(
    experience.discovery.organizationId,
    inquiryId,
    sessionId,
  );
  if (!session) notFound();
  const latestReview = session.status === "closed"
    ? await loadDiscoveryInquiryReview(
        experience.discovery.organizationId,
        inquiryId,
        sessionId,
      )
    : null;
  const [analystTurn, referenceConfirmations] = session.analystEnabled
    ? await Promise.all([
        import("@/lib/discovery-analyst-data").then(({ loadDiscoveryAnalystTurn }) =>
          loadDiscoveryAnalystTurn(
            discoveryOrganizationId,
            session.id,
            session.revision,
            "inquiry",
          )),
        import("@/lib/discovery-reference-data").then(({ loadInquiryReferenceConfirmations }) =>
          loadInquiryReferenceConfirmations(
            discoveryOrganizationId,
            session.id,
          )),
      ])
    : [null, null];

  const question = getDiscoveryInquiryQuestion(session.currentQuestionKey);
  const assistance = question && session.status === "in_progress"
    ? await import("@/lib/discovery-assistance-data").then(
        ({ loadInquiryDiscoveryAssistance }) =>
          loadInquiryDiscoveryAssistance(
            discoveryOrganizationId,
            inquiryId,
            session.id,
            session.revision,
            question.key,
          ),
      )
    : null;
  const knownContext = question
    ? buildInquiryKnownContext({
        currentPromptKey: question.key,
        observations: session.observations,
        questionText: session.questionText,
        scopeStatement: session.scopeStatement,
      })
    : null;
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
        stats={session.analystEnabled
          ? [
              { label: "Answers saved", value: session.observations.length },
              {
                label: "Needs attention",
                value: (analystTurn?.snapshot.needsValidation.length ?? 0)
                  + (analystTurn?.snapshot.conflicts.length ?? 0),
              },
            ]
          : [
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
        {(session.status === "in_progress" || session.status === "paused")
          && (!session.analystEnabled || session.status === "paused") ? (
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
        Inquiry-first interview: saved answers remain evidence for human review and do not create or select a Process.
      </Alert>

      {session.status === "in_progress" && !session.analystEnabled ? (
        <DiscoveryAnalystStartForm
          inquiryId={inquiryId}
          revision={session.revision}
          sessionId={sessionId}
          sessionKind="inquiry"
        />
      ) : null}

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
          {analystTurn?.snapshot.narrative ? (
            <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Where you left off</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                {analystTurn.snapshot.narrative}
              </p>
            </div>
          ) : null}
        </Card>
      ) : session.status === "in_progress" && session.analystEnabled ? (
        <DiscoveryAnalystInterview
          inquiryId={inquiryId}
          observations={session.observations}
          referenceCount={referenceConfirmations?.candidates.length ?? 0}
          referenceReview={referenceConfirmations ? (
              <DiscoveryReferenceConfirmationTable
                candidates={referenceConfirmations.candidates}
                inquiryId={inquiryId}
                runId={referenceConfirmations.runId}
                sessionId={session.id}
              />
            ) : undefined}
          revision={session.revision}
          sessionId={session.id}
          sessionKind="inquiry"
          turn={analystTurn}
        />
      ) : question && session.status === "in_progress" && knownContext ? (
        <section className="mt-6 space-y-5">
          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone="neutral">Existing context</Badge>
                <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
                  What Lotura already knows
                </h2>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                Saved context · No AI
              </span>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  Original question
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {knownContext.questionText}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  Interview focus
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {knownContext.scopeStatement}
                </dd>
              </div>
            </dl>
            {knownContext.savedAnswers.length > 0 ? (
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Recent saved answers
                </p>
                <div className="mt-3 space-y-3">
                  {knownContext.savedAnswers.map((answer) => (
                    <div
                      className="rounded-[10px] bg-[var(--surface-subtle)] p-4"
                      key={answer.id}
                    >
                      <p className="text-xs font-medium text-[var(--text-tertiary)]">
                        {answer.label}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                        {answer.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
                No earlier answers have been saved in this exploration yet.
              </p>
            )}
            <p className="mt-4 text-xs leading-5 text-[var(--text-tertiary)]">
              This context stays attached to the original question. Lotura is not assuming that it belongs to an existing Process.
            </p>
          </Card>

          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone="accent">Optional assistance</Badge>
                <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
                  Get help exploring this question
                </h2>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                Human review required
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Ask Lotura for a focused follow-up or a clearer version of rough notes. The original organizational question and the regular interview question remain available.
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
                    inquiryId={inquiryId}
                    key={suggestion.id}
                    providerKey={assistance.providerKey}
                    revision={session.revision}
                    sessionId={session.id}
                    sessionKind="inquiry"
                    standardPromptText={question.prompt}
                    suggestion={suggestion}
                  />
                ))}
                {assistance.suggestions.every((suggestion) => suggestion.decision) ? (
                  <div className="border-t border-[var(--border)] pt-5">
                    <DiscoveryAssistanceRequestForm
                      inquiryId={inquiryId}
                      promptKey={question.key}
                      revision={session.revision}
                      sessionId={session.id}
                      sessionKind="inquiry"
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5">
                <DiscoveryAssistanceRequestForm
                  inquiryId={inquiryId}
                  promptKey={question.key}
                  revision={session.revision}
                  sessionId={session.id}
                  sessionKind="inquiry"
                />
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-7">
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
        </section>
      ) : session.status === "ready_for_review" ? (
        <section className="mt-6">
          <Badge tone="warning">Ready for human review</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
            Review what you learned
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            These answers remain connected to the original question without
            claiming that they describe one existing Process. Correct wording
            or labels below if needed, then review the answers together and
            preserve what you concluded.
          </p>
          <Alert className="mt-4" tone="success">
            Reaching this point is a valid outcome. No Process was selected,
            created, proposed, approved, or changed.
          </Alert>
          <Link
            className="mt-4 inline-flex h-10 shrink-0 items-center justify-center rounded-[9px] bg-[var(--workspace-accent)] px-4 text-sm font-medium text-[var(--workspace-accent-foreground)] hover:bg-[var(--workspace-accent-hover)]"
            href={`/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}/review`}
          >
            Review what you learned
          </Link>
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
      ) : (
        <Card className="mt-6 p-5 sm:p-7">
          <Badge tone="success">Review complete</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
            This interview has a Knowledge Outcome
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            The reviewed answers and human conclusions remain preserved. No
            Process was created, proposed, approved, or changed.
          </p>
          {latestReview ? (
            <Link
              className="mt-4 inline-flex h-10 shrink-0 items-center justify-center rounded-[9px] bg-[var(--workspace-accent)] px-4 text-sm font-medium text-[var(--workspace-accent-foreground)] hover:bg-[var(--workspace-accent-hover)]"
              href={`/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}/outcomes/${latestReview.id}`}
            >
              View what you learned
            </Link>
          ) : null}
        </Card>
      )}
    </WorkspaceShell>
  );
}
