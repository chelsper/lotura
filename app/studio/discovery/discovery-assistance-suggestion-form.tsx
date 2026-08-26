"use client";

import { useActionState, useState } from "react";

import type { DiscoveryAssistanceSuggestionRecord } from "@/lib/discovery-assistance-data";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import {
  decideInquiryDiscoverySuggestionAction,
  decideProcessDiscoverySuggestionAction,
  dismissDiscoverySuggestionAction,
} from "./actions";

const states = [
  ["known", "Known"],
  ["assumed", "Assumed"],
  ["unknown", "Unknown"],
  ["needs_validation", "Needs validation"],
  ["conflicting_observation", "Conflicting observation"],
] as const;

type Props = {
  inquiryId?: string;
  providerKey: string;
  revision: number;
  sessionId: string;
  sessionKind: "process" | "inquiry";
  standardPromptText: string;
  suggestion: DiscoveryAssistanceSuggestionRecord;
};

export function DiscoveryAssistanceSuggestionForm({
  inquiryId,
  providerKey,
  revision,
  sessionId,
  sessionKind,
  standardPromptText,
  suggestion,
}: Props) {
  const decideAction = sessionKind === "process"
    ? decideProcessDiscoverySuggestionAction
    : decideInquiryDiscoverySuggestionAction;
  const [decisionState, decisionAction, decisionPending] = useActionState(
    decideAction,
    initialDiscoveryActionState,
  );
  const [dismissState, dismissAction, dismissPending] = useActionState(
    dismissDiscoverySuggestionAction,
    initialDiscoveryActionState,
  );
  const [epistemicState, setEpistemicState] = useState("known");
  const clarity = suggestion.kind === "clarity_draft";

  if (suggestion.decision) {
    return (
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 opacity-70">
        <p className="text-sm font-semibold text-[var(--text)]">
          {suggestion.decision.disposition === "skipped" || suggestion.decision.disposition === "rejected"
            ? "Suggestion not used"
            : "Suggestion reviewed"}
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          This choice is preserved in the assistance history.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-accent)]">
          Suggested by Lotura
        </p>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          {providerKey === "openai" ? "OpenAI assistance" : "Mocked assistance"} · review required
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
        {suggestion.rationale}
      </p>

      <form action={decisionAction} className="mt-4 space-y-4">
        {inquiryId ? <input name="inquiryId" type="hidden" value={inquiryId} /> : null}
        <input name="sessionId" type="hidden" value={sessionId} />
        <input name="suggestionId" type="hidden" value={suggestion.id} />
        <input name="expectedRevision" type="hidden" value={revision} />
        <input name="promptKey" type="hidden" value={suggestion.promptKey} />

        {clarity ? (
          <>
            <div>
              <FieldLabel>What you wrote</FieldLabel>
              <p className="whitespace-pre-wrap rounded-[10px] bg-[var(--surface-subtle)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
                {suggestion.originalText}
              </p>
            </div>
            <input name="finalPromptText" type="hidden" value={standardPromptText} />
            <label className="block">
              <FieldLabel>Clearer draft — edit before preserving</FieldLabel>
              <textarea
                className="min-h-32 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                defaultValue={suggestion.suggestedText}
                maxLength={10000}
                name="finalResponseText"
                required={epistemicState !== "unknown"}
              />
            </label>
          </>
        ) : (
          <>
            <label className="block">
              <FieldLabel>Suggested question — edit if needed</FieldLabel>
              <textarea
                className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                defaultValue={suggestion.suggestedText}
                maxLength={2000}
                name="finalPromptText"
                required
              />
            </label>
            <label className="block">
              <FieldLabel>{epistemicState === "unknown" ? "What remains unknown? (optional)" : "Your answer"}</FieldLabel>
              <textarea
                className="min-h-32 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                maxLength={10000}
                name="finalResponseText"
                required={epistemicState !== "unknown"}
              />
            </label>
          </>
        )}

        <label className="block">
          <FieldLabel>How should your answer be understood?</FieldLabel>
          <Select
            name="epistemicState"
            onChange={(event) => setEpistemicState(event.target.value)}
            value={epistemicState}
          >
            {states.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </label>
        <Alert tone="info">
          The suggestion is not evidence. Only the answer you review and preserve becomes an observation, with the suggestion kept as separate provenance.
          Using one question will leave the other suggestions in this set unused.
        </Alert>
        {decisionState.status === "error" ? <Alert tone="error">{decisionState.message}</Alert> : null}
        <Button disabled={decisionPending} size="sm" type="submit" variant="primary">
          {decisionPending ? "Preserving…" : clarity ? "Preserve reviewed answer" : "Use this question and continue"}
        </Button>
      </form>

      <form action={dismissAction} className="mt-3">
        {inquiryId ? <input name="inquiryId" type="hidden" value={inquiryId} /> : null}
        <input name="sessionId" type="hidden" value={sessionId} />
        <input name="sessionKind" type="hidden" value={sessionKind} />
        <input name="suggestionId" type="hidden" value={suggestion.id} />
        <input name="expectedRevision" type="hidden" value={revision} />
        <input name="promptKey" type="hidden" value={suggestion.promptKey} />
        <input name="disposition" type="hidden" value={clarity ? "rejected" : "skipped"} />
        {dismissState.status === "error" ? <Alert className="mb-3" tone="error">{dismissState.message}</Alert> : null}
        <Button disabled={dismissPending} size="sm" type="submit" variant="secondary">
          {dismissPending ? "Saving choice…" : clarity ? "Keep my original wording" : "Skip this suggestion"}
        </Button>
      </form>
    </div>
  );
}
