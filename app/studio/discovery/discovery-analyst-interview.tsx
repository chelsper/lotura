"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import type { DiscoveryAnalystTurnRecord } from "@/lib/discovery-analyst-data";
import type { DiscoveryObservationRecord } from "@/lib/discovery-data";

import { Alert, Badge, Button, Card, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState, type DiscoveryActionState } from "./action-state";
import {
  answerDiscoveryAnalystAction,
  answerInquiryDiscoveryAnalystAction,
  changeDiscoveryPauseAction,
  changeInquiryDiscoveryPauseAction,
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

type ReviewPanel = "evidence" | "references" | "understanding" | "validation";

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

function PauseSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending} type="submit">
      {pending ? "Pausing…" : "Pause here"}
    </Button>
  );
}

function FinishSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending} size="sm" type="submit">
      {pending ? "Finishing…" : "Finish & review"}
    </Button>
  );
}

function RefreshUnderstandingButton({ disabled, hasTurn }: { disabled: boolean; hasTurn: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending} name="focus" size="sm" type="submit" value="synthesize">
      {pending
        ? "Updating understanding…"
        : hasTurn
          ? "Try AI understanding again"
          : "Create AI understanding"}
    </Button>
  );
}

function ReviewButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      aria-expanded={active}
      onClick={onClick}
      size="sm"
      type="button"
      variant={active ? "primary" : "secondary"}
    >
      {children}
    </Button>
  );
}

export function DiscoveryAnalystInterview({
  inquiryId,
  observations,
  referenceCount = 0,
  referenceReview,
  revision,
  sessionId,
  sessionKind = "process",
  turn,
}: {
  inquiryId?: string;
  observations: DiscoveryObservationRecord[];
  referenceCount?: number;
  referenceReview?: ReactNode;
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
  const [breakOpen, setBreakOpen] = useState(false);
  const [reviewPanel, setReviewPanel] = useState<ReviewPanel | null>(null);
  const [evidenceChoice, setEvidenceChoice] = useState<{
    suggestionId?: string;
    value: keyof typeof stateLabels;
  }>({ suggestionId: turn?.suggestion.id, value: turn?.snapshot.suggestedEpistemicState ?? "known" });
  const epistemicState = evidenceChoice.suggestionId === turn?.suggestion.id
    ? evidenceChoice.value
    : turn?.snapshot.suggestedEpistemicState ?? "known";
  const draftKey = turn?.suggestion.id
    ? `lotura:discovery-answer:${sessionId}:${turn.suggestion.id}`
    : null;
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!draftKey) return;
    const storedDraft = window.localStorage.getItem(draftKey) ?? "";
    const restoreDraft = window.setTimeout(() => setDraft(storedDraft), 0);
    return () => window.clearTimeout(restoreDraft);
  }, [draftKey]);

  function updateDraft(value: string) {
    setDraft(value);
    if (!draftKey) return;
    if (value) window.localStorage.setItem(draftKey, value);
    else window.localStorage.removeItem(draftKey);
  }

  function toggleReview(panel: ReviewPanel) {
    setReviewPanel((current) => current === panel ? null : panel);
  }

  const validationCount = (turn?.snapshot.needsValidation.length ?? 0)
    + (turn?.snapshot.conflicts.length ?? 0);
  const pauseAction = inquiryMode ? changeInquiryDiscoveryPauseAction : changeDiscoveryPauseAction;
  const finishAction = inquiryMode ? finishInquiryDiscoveryAnalystAction : finishDiscoveryAnalystAction;
  const breakSummary = turn?.snapshot.narrative
    ? `${turn.snapshot.narrative.slice(0, 360)}${turn.snapshot.narrative.length > 360 ? "…" : ""}`
    : null;

  return (
    <section className="mt-6 space-y-5">
      <Card className="border-[var(--border-strong)] bg-[var(--surface)] p-4 shadow-sm lg:sticky lg:top-3 lg:z-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge dot tone="success">Interview in progress</Badge>
            <span className="text-sm font-medium text-[var(--text)]">
              {observations.length} {observations.length === 1 ? "answer" : "answers"} saved
            </span>
            {validationCount > 0 ? (
              <span className="text-xs text-[var(--text-tertiary)]">
                {validationCount} {validationCount === 1 ? "item" : "items"} to validate
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={analystPending}
              onClick={() => setBreakOpen((current) => !current)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Take a break
            </Button>
            <form action={finishAction}>
              <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
              <FinishSubmitButton disabled={analystPending} />
            </form>
          </div>
        </div>
      </Card>

      {breakOpen ? (
        <Card className="border-[var(--accent-border)] bg-[var(--accent-subtle)] p-5 sm:p-6">
          <Badge tone="accent">Your place is saved</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">Take a break without losing your work</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Your {observations.length} saved {observations.length === 1 ? "answer is" : "answers are"} already preserved. When you return, Lotura will resume with the current question and working understanding.
          </p>
          {draft ? (
            <Alert className="mt-4" tone="warning">
              You also have an unsent draft saved in this browser. It is not interview evidence until you send it.
            </Alert>
          ) : null}
          {breakSummary ? (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text)]">Where you left off: </span>
              {breakSummary}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <form action={pauseAction}>
              <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
              <input name="paused" type="hidden" value="yes" />
              <PauseSubmitButton disabled={analystPending} />
            </form>
            <Button onClick={() => setBreakOpen(false)} type="button" variant="ghost">
              Keep interviewing
            </Button>
          </div>
        </Card>
      ) : null}

      {turn && !turn.suggestion.answered ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border)] bg-[var(--workspace-accent-soft)] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge tone="accent">Current question</Badge>
              <span className="text-xs text-[var(--text-tertiary)]">
                {turn.providerKey === "openai" ? "Adaptive follow-up" : "Standard follow-up"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {turn.snapshot.acknowledgement}
            </p>
            <h2 className="mt-4 max-w-4xl text-2xl font-semibold tracking-[-0.035em] text-[var(--text)] sm:text-3xl">
              {turn.suggestion.text}
            </h2>
            <details className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
              <summary className="cursor-pointer font-medium">Why Lotura is asking</summary>
              <p className="mt-2">{turn.suggestion.rationale}</p>
            </details>
          </div>
          <form action={answerAction} className="space-y-5 p-5 sm:p-7">
            <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
            <input name="suggestionId" type="hidden" value={turn.suggestion.id} />
            <label className="block">
              <FieldLabel>How certain are you?</FieldLabel>
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
                onChange={(event) => updateDraft(event.target.value)}
                placeholder="Describe what actually happens today. It is useful to say you do not know or that someone else must validate it."
                required={epistemicState !== "unknown"}
                value={draft}
              />
              {draft ? (
                <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
                  Draft saved in this browser · Not evidence until sent
                </p>
              ) : null}
            </label>
            <details className="rounded-[10px] border border-[var(--warning-border)] bg-[var(--warning-subtle)] px-4 py-3 text-xs leading-5 text-[var(--warning)]">
              <summary className="cursor-pointer font-medium">Keep sensitive records out of this interview</summary>
              <p className="mt-2">
                Do not enter donor, student, prospect, HR, medical, payment, credential, connection-string, or other sensitive record-level information.
              </p>
            </details>
            {answerState.status === "error" ? <Alert tone="error">{answerState.message}</Alert> : null}
            {skipState.status === "error" ? <Alert tone="error">{skipState.message}</Alert> : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
              <Button
                disabled={analystPending}
                formAction={skipAction}
                formNoValidate
                type="submit"
                variant="ghost"
              >
                {skipPending ? "Finding another question…" : "Skip for now"}
              </Button>
              <Button disabled={analystPending} type="submit" variant="primary">
                {answerPending ? "Saving and thinking…" : "Send & continue"}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-5 sm:p-7">
          <Alert tone="warning">
            Lotura does not have a current question. Your saved answers are intact; open Review understanding to request a new AI turn.
          </Alert>
        </Card>
      )}

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="neutral">Review your progress</Badge>
            <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">Check where you are without ending the interview</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Open only the view you need. Reviewing saved information does not create a new AI request or change organizational knowledge.
            </p>
          </div>
          {turn ? (
            <span className="text-xs text-[var(--text-tertiary)]">
              {turn.providerKey === "openai" ? "OpenAI-assisted" : "Coverage fallback"}
            </span>
          ) : null}
        </div>
        <div aria-label="Interview review views" className="mt-5 flex flex-wrap gap-2">
          <ReviewButton active={reviewPanel === "understanding"} onClick={() => toggleReview("understanding")}>
            Review understanding
          </ReviewButton>
          <ReviewButton active={reviewPanel === "validation"} onClick={() => toggleReview("validation")}>
            Validation items · {validationCount}
          </ReviewButton>
          <ReviewButton active={reviewPanel === "evidence"} onClick={() => toggleReview("evidence")}>
            Saved answers · {observations.length}
          </ReviewButton>
          {referenceReview ? (
            <ReviewButton active={reviewPanel === "references"} onClick={() => toggleReview("references")}>
              References · {referenceCount}
            </ReviewButton>
          ) : null}
        </div>
      </Card>

      {reviewPanel === "understanding" ? (
        <Card className="p-5 sm:p-7" id="interview-understanding">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="accent">Working understanding · Not canonical</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
                {turn && turn.providerKey !== "openai"
                  ? "Your saved interview notes"
                  : "Here’s what Lotura understands so far"}
              </h2>
            </div>
          </div>
          {turn ? (
            <>
              {turn.providerKey !== "openai" ? (
                <div className="mt-4">
                  <Alert tone="warning">
                    The AI analyst did not return a usable response for this turn. These are saved-answer excerpts and a standard follow-up, not a new AI synthesis.
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
                  empty="No additional participant has been identified yet."
                  items={turn.snapshot.participantsNeeded}
                  title="Who else may need to participate"
                />
              </div>
            </>
          ) : (
            <div className="mt-5">
              <Alert tone="warning">
                Lotura does not have a current working understanding yet. Your interview is intact.
              </Alert>
            </div>
          )}
          {(!turn || turn.providerKey !== "openai") ? (
            <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
              <p className="text-xs leading-5 text-[var(--text-tertiary)]">
                This makes one AI request using the interview&apos;s saved, non-sensitive context.
              </p>
              <form action={refreshAction} aria-busy={refreshPending}>
                <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
                <RefreshUnderstandingButton disabled={analystPending} hasTurn={Boolean(turn)} />
              </form>
              <div aria-live="polite" role="status">
                {refreshPending ? (
                  <Alert>
                    <span className="flex items-start gap-3">
                      <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
                      <span>Lotura is reviewing your saved answers. Keep this page open while the working understanding updates.</span>
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
          ) : (
            <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--text-tertiary)]">
              Current through {observations.length} saved {observations.length === 1 ? "answer" : "answers"}. Lotura will update this after you send another answer.
            </p>
          )}
        </Card>
      ) : null}

      {reviewPanel === "validation" ? (
        <Card className="p-5 sm:p-7" id="interview-validation">
          <Badge tone="warning">Human review</Badge>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">What still needs attention</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            These items can remain unresolved. Lotura will preserve them for validation instead of asking you to guess.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <SummaryList
              empty="No validation needs have been identified yet."
              items={turn?.snapshot.needsValidation ?? []}
              title="Needs validation"
              tone="warning"
            />
            <SummaryList
              empty="No possible conflicts have been identified."
              items={turn?.snapshot.conflicts ?? []}
              title="Possible conflicts"
              tone="warning"
            />
          </div>
          {turn ? (
            <details className="mt-5 rounded-[10px] border border-[var(--border)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                Correct Lotura&apos;s interpretation
              </summary>
              <form action={correctionAction} className="mt-4 space-y-4">
                <HiddenContext inquiryId={inquiryId} revision={revision} sessionId={sessionId} />
                <label className="block">
                  <FieldLabel>How certain are you?</FieldLabel>
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
          ) : null}
        </Card>
      ) : null}

      {reviewPanel === "evidence" ? (
        <Card className="p-5 sm:p-7" id="interview-evidence">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge tone="neutral">Evidence transcript</Badge>
              <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">What you have told Lotura</h2>
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">{observations.length} saved</span>
          </div>
          {observations.length > 0 ? (
            <div className="mt-5 divide-y divide-[var(--border)] rounded-[10px] border border-[var(--border)]">
              {observations.map((observation, index) => (
                <details className="group p-4" key={observation.id}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-[var(--text-tertiary)]">Answer {index + 1}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--text)]">{observation.promptText}</p>
                      </div>
                      <Badge tone={observation.epistemicState === "known" ? "neutral" : "warning"}>
                        {stateLabels[observation.epistemicState]}
                      </Badge>
                    </div>
                    <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-[var(--text-secondary)] group-open:hidden">
                      {observation.responseText || "Unknown; no additional wording was provided."}
                    </p>
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap border-t border-[var(--border)] pt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    {observation.responseText || "Unknown; no additional wording was provided."}
                  </p>
                </details>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              Your first answer will appear here as durable human evidence.
            </p>
          )}
        </Card>
      ) : null}

      {referenceReview ? (
        <div className={reviewPanel === "references" ? "" : "hidden"} id="interview-references">
          {referenceReview}
        </div>
      ) : null}
    </section>
  );
}
