"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { DiscoveryAnalystTurnRecord } from "@/lib/discovery-analyst-data";
import type { DiscoveryObservationRecord } from "@/lib/discovery-data";

import { Alert, Badge, Button, Card, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState, type DiscoveryActionState } from "./action-state";
import {
  answerDiscoveryAnalystAction,
  answerInquiryDiscoveryAnalystAction,
  correctDiscoveryAnalystAction,
  correctInquiryDiscoveryAnalystAction,
  finishDiscoveryAnalystAction,
  finishInquiryDiscoveryAnalystAction,
  refreshDiscoveryAnalystAction,
  refreshInquiryDiscoveryAnalystAction,
  skipDiscoveryAnalystQuestionAction,
  skipInquiryDiscoveryAnalystQuestionAction,
} from "./actions";

const stateLabels = {
  assumed: "Assumed",
  conflicting_observation: "Conflicting observation",
  known: "Known",
  needs_validation: "Needs validation",
  unknown: "Unknown",
};

const states = Object.entries(stateLabels) as Array<
  [keyof typeof stateLabels, string]
>;

function SummaryList({
  empty,
  items,
  title,
  tone = "neutral",
}: {
  empty: string;
  items: string[];
  title: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
        <Badge tone={tone}>{items.length}</Badge>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          {items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[var(--text-tertiary)]">{empty}</p>
      )}
    </div>
  );
}

function HiddenContext({
  inquiryId,
  revision,
  sessionId,
}: {
  inquiryId?: string;
  revision: number;
  sessionId: string;
}) {
  return (
    <>
      {inquiryId ? <input name="inquiryId" type="hidden" value={inquiryId} /> : null}
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedRevision" type="hidden" value={revision} />
    </>
  );
}

function AnalystRefreshButtons({ disabled, canRefresh }: { disabled: boolean; canRefresh: boolean }) {
  const { data, pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <Button disabled={disabled || pending} name="focus" size="sm" type="submit" value="synthesize">
        {pending && data?.get("focus") === "synthesize"
          ? "Updating understanding…"
          : "What do you understand so far?"}
      </Button>
      {canRefresh ? (
        <Button disabled={disabled || pending} name="focus" size="sm" type="submit" value="continue">
          {pending && data?.get("focus") === "continue" ? "Refreshing analyst…" : "Refresh analyst"}
        </Button>
      ) : null}
    </div>
  );
}

export function DiscoveryAnalystInterview({
  inquiryId,
  observations,
  revision,
  sessionId,
  sessionKind = "process",
  turn,
}: {
  inquiryId?: string;
  observations: DiscoveryObservationRecord[];
  revision: number;
  sessionId: string;
  sessionKind?: "inquiry" | "process";
  turn: DiscoveryAnalystTurnRecord | null;
}) {
  const inquiryMode = sessionKind === "inquiry";
  const [answerState, answerAction, answerPending] = useActionState(
    inquiryMode ? answerInquiryDiscoveryAnalystAction : answerDiscoveryAnalystAction,
    initialDiscoveryActionState,
  );
  const [correctionState, correctionAction, correctionPending] = useActionState(
    inquiryMode ? correctInquiryDiscoveryAnalystAction : correctDiscoveryAnalystAction,
    initialDiscoveryActionState,
  );
  const [skipState, skipAction, skipPending] = useActionState(
    inquiryMode
      ? skipInquiryDiscoveryAnalystQuestionAction
      : skipDiscoveryAnalystQuestionAction,
    initialDiscoveryActionState,
  );
  const [refreshState, refreshAction, refreshPending] = useActionState(
    async (previousState: DiscoveryActionState, formData: FormData): Promise<DiscoveryActionState> => {
      try {
        const action = inquiryMode ? refreshInquiryDiscoveryAnalystAction : refreshDiscoveryAnalystAction;
        return await action(previousState, formData);
      } catch {
        return {
          message: "We couldn’t confirm whether the analyst finished. Reload this page before trying again. Your saved answers are preserved.",
          status: "error",
        };
      }
    },
    initialDiscoveryActionState,
  );
  const analystPending = answerPending || correctionPending || skipPending || refreshPending;
  const [evidenceChoice, setEvidenceChoice] = useState<{
    suggestionId?: string;
    value: keyof typeof stateLabels;
  }>({ suggestionId: turn?.suggestion.id, value: turn?.snapshot.suggestedEpistemicState ?? "known" });
  const epistemicState = evidenceChoice.suggestionId === turn?.suggestion.id
    ? evidenceChoice.value
    : turn?.snapshot.suggestedEpistemicState ?? "known";

  return (
    <section className="mt-6 space-y-5">
      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge tone="accent">Working synthesis · Not canonical</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
              Here&apos;s what I think I understand so far
            </h2>
          </div>
          {turn ? (
            <span className="text-xs text-[var(--text-tertiary)]">
              {turn.providerKey === "openai" ? "OpenAI-assisted" : "Coverage fallback"}
            </span>
          ) : null}
        </div>
        {turn ? (
          <>
            {turn.providerKey !== "openai" ? (
              <div className="mt-4">
                <Alert tone="warning">
                  The AI analyst did not return a usable response for this turn. Below are excerpts of your saved answers and a standard follow-up, not a new AI synthesis. You can continue, finish, or use Refresh analyst to try again.
                </Alert>
              </div>
            ) : null}
            <p className="mt-4 max-w-4xl whitespace-pre-wrap text-base leading-7 text-[var(--text-secondary)]">
              {turn.snapshot.narrative}
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <SummaryList
                empty="Lotura has not marked anything clear yet."
                items={turn.snapshot.clear}
                title="What seems clear"
              />
              <SummaryList
                empty="No validation needs have been identified yet."
                items={turn.snapshot.needsValidation}
                title="Needs validation"
                tone="warning"
              />
              <SummaryList
                empty="No possible conflicts have been identified."
                items={turn.snapshot.conflicts}
                title="Possible conflicts"
                tone="warning"
              />
              <SummaryList
                empty="No additional participant has been identified yet."
                items={turn.snapshot.participantsNeeded}
                title="Who else may need to participate"
              />
            </div>
            <details className="mt-5 rounded-[10px] border border-[var(--border)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                Correct Lotura&apos;s interpretation
              </summary>
              <form action={correctionAction} className="mt-4 space-y-4">
                <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
                <label className="block">
                  <FieldLabel>How should your correction be understood?</FieldLabel>
                  <Select defaultValue="known" name="epistemicState">
                    {states.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <FieldLabel>What did Lotura misunderstand or miss?</FieldLabel>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                    maxLength={10000}
                    name="responseText"
                    placeholder={`Correct the working interpretation in your own words. This becomes human evidence, not ${inquiryMode ? "a Process selection or organizational change" : "a canonical Process change"}.`}
                    required
                  />
                </label>
                {correctionState.status === "error" ? <Alert tone="error">{correctionState.message}</Alert> : null}
                <Button disabled={analystPending} size="sm" type="submit">
                  {correctionPending ? "Preserving correction…" : "Preserve correction"}
                </Button>
              </form>
            </details>
          </>
        ) : (
          <div className="mt-5">
            <Alert tone="warning">
              The analyst does not have a current turn yet. Your interview is intact; request one new turn to continue.
            </Alert>
          </div>
        )}
        <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
          <form action={refreshAction} aria-busy={refreshPending}>
            <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
            <AnalystRefreshButtons disabled={analystPending} canRefresh={!turn || turn.providerKey !== "openai"} />
          </form>
          <div aria-live="polite" role="status">
            {refreshPending ? (
              <Alert>
                <span className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
                  <span>Lotura is reviewing your saved answers and updating its working understanding. This may take a little while. Please keep this page open.</span>
                </span>
              </Alert>
            ) : refreshState.status === "success" ? (
              <Alert tone="success">{refreshState.message}</Alert>
            ) : null}
          </div>
          {!refreshPending && refreshState.status === "error" ? (
            <div role="alert"><Alert tone="error">{refreshState.message}</Alert></div>
          ) : null}
        </div>
      </Card>

      {turn && !turn.suggestion.answered ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border)] bg-[var(--workspace-accent-soft)] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge tone="accent">Lotura asks</Badge>
              <span className="text-xs text-[var(--text-tertiary)]">Adaptive follow-up</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {turn.snapshot.acknowledgement}
            </p>
            <h2 className="mt-4 max-w-4xl text-2xl font-semibold tracking-[-0.035em] text-[var(--text)] sm:text-3xl">
              {turn.suggestion.text}
            </h2>
            <p className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
              Why this question: {turn.suggestion.rationale}
            </p>
          </div>
          <form action={answerAction} className="space-y-5 p-5 sm:p-7">
            <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
            <input name="suggestionId" type="hidden" value={turn.suggestion.id} />
            <label className="block">
              <FieldLabel>How should this observation be understood?</FieldLabel>
              <Select
                name="epistemicState"
                onChange={(event) => setEvidenceChoice({
                  suggestionId: turn.suggestion.id,
                  value: event.target.value as keyof typeof stateLabels,
                })}
                value={epistemicState}
              >
                {states.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
                Lotura suggested this label; you decide what is preserved.
              </p>
            </label>
            <label className="block">
              <FieldLabel>{epistemicState === "unknown" ? "What is unknown? (optional)" : "Your answer"}</FieldLabel>
              <textarea
                autoFocus
                className="min-h-40 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                maxLength={10000}
                name="responseText"
                placeholder="Tell Lotura what actually happens today. It is useful to say you do not know or that someone else must validate it."
                required={epistemicState !== "unknown"}
              />
            </label>
            <Alert tone="warning">
              Do not enter donor, student, prospect, HR, medical, payment,
              credential, connection-string, or other sensitive record-level information.
            </Alert>
            {answerState.status === "error" ? <Alert tone="error">{answerState.message}</Alert> : null}
            {skipState.status === "error" ? <Alert tone="error">{skipState.message}</Alert> : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
              <div>
                <Button
                  disabled={analystPending}
                  formAction={skipAction}
                  formNoValidate
                  type="submit"
                >
                  {skipPending ? "Finding another question…" : "Skip this question"}
                </Button>
                <p className="mt-2 max-w-md text-xs leading-5 text-[var(--text-tertiary)]">
                  Skip moves to a different topic without creating an observation or ending the interview.
                </p>
              </div>
              <Button disabled={analystPending} type="submit" variant="primary">
                {answerPending ? "Preserving and thinking…" : "Send answer"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="neutral">Evidence transcript</Badge>
            <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">What you have told Lotura</h2>
          </div>
          <span className="text-xs text-[var(--text-tertiary)]">{observations.length} saved observations</span>
        </div>
        {observations.length > 0 ? (
          <div className="mt-5 space-y-4">
            {observations.map((observation) => (
              <div className="rounded-[10px] border border-[var(--border)] p-4" key={observation.id}>
                <p className="text-sm font-semibold leading-6 text-[var(--text)]">{observation.promptText}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                  {observation.responseText || "Unknown; no additional wording was provided."}
                </p>
                <div className="mt-3"><Badge tone={observation.epistemicState === "known" ? "neutral" : "warning"}>{stateLabels[observation.epistemicState]}</Badge></div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
            Your first answer will appear here as durable human evidence.
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Finished for now?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Finish when this conversation has captured enough useful evidence. Uncertainty can move forward unresolved. The next step is human review.
            </p>
          </div>
          <form action={inquiryMode ? finishInquiryDiscoveryAnalystAction : finishDiscoveryAnalystAction}>
            <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
            <Button disabled={analystPending} type="submit">Finish interview</Button>
          </form>
        </div>
      </Card>
    </section>
  );
}
