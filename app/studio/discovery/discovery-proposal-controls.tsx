"use client";

import { useActionState } from "react";

import type {
  DiscoveryProposalDecisionRecord,
} from "@/lib/discovery-data";
import { DISCOVERY_PROPOSAL_DISPOSITION_LABELS } from "@/lib/discovery-proposal-model.mjs";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import {
  finishDiscoveryProposalAction,
  finishDiscoveryReviewByExceptionAction,
  saveDiscoveryProposalDecisionAction,
} from "./actions";
import { initialDiscoveryActionState } from "./action-state";

export function DiscoveryProposalDecisionForm({
  currentDecision,
  expectedProposalRevision,
  observationId,
  sessionId,
}: {
  currentDecision: DiscoveryProposalDecisionRecord | null;
  expectedProposalRevision: number;
  observationId: string;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    saveDiscoveryProposalDecisionAction,
    initialDiscoveryActionState,
  );

  return (
    <form action={action} className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="observationId" type="hidden" value={observationId} />
      <input
        name="expectedProposalRevision"
        type="hidden"
        value={expectedProposalRevision}
      />
      <label className="block">
        <FieldLabel>What should happen with this answer?</FieldLabel>
        <Select
          defaultValue={currentDecision?.disposition ?? ""}
          name="disposition"
          required
        >
          <option disabled value="">Choose an option</option>
          {Object.entries(DISCOVERY_PROPOSAL_DISPOSITION_LABELS).map(
            ([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ),
          )}
        </Select>
      </label>
      <label className="block">
        <FieldLabel>Review note (optional)</FieldLabel>
        <textarea
          className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          defaultValue={currentDecision?.reviewNote ?? ""}
          maxLength={2000}
          name="reviewNote"
          placeholder="Add context for the next reviewer."
        />
      </label>
      <p className="rounded-[8px] bg-[var(--surface-subtle)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
        Selecting evidence does not rewrite or change the documented Process. If changes are selected, the next workspace lets you ask Lotura to organize an editable proposal draft before anything enters governance.
      </p>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="flex justify-end">
        <Button disabled={pending} size="sm" type="submit" variant="primary">
          {pending ? "Saving…" : currentDecision ? "Change choice" : "Save choice"}
        </Button>
      </div>
    </form>
  );
}

export function FinishDiscoveryProposalForm({
  canFinish,
  expectedProposalRevision,
  sessionId,
}: {
  canFinish: boolean;
  expectedProposalRevision: number;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    finishDiscoveryProposalAction,
    initialDiscoveryActionState,
  );
  return (
    <form action={action} className="space-y-3">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input
        name="expectedProposalRevision"
        type="hidden"
        value={expectedProposalRevision}
      />
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Button disabled={!canFinish || pending} type="submit" variant="primary">
        {pending ? "Finishing…" : "Finish proposed update"}
      </Button>
    </form>
  );
}

export function FinishDiscoveryReviewByExceptionForm({
  canFinish,
  expectedProposalRevision,
  mode,
  sessionId,
}: {
  canFinish: boolean;
  expectedProposalRevision: number;
  mode: "no_changes" | "selected_changes";
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    finishDiscoveryReviewByExceptionAction,
    initialDiscoveryActionState,
  );
  const noChanges = mode === "no_changes";
  return (
    <form action={action} className="space-y-3">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="reviewMode" type="hidden" value={mode} />
      <input
        name="expectedProposalRevision"
        type="hidden"
        value={expectedProposalRevision}
      />
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Button disabled={!canFinish || pending} type="submit" variant="primary">
        {pending
          ? "Finishing…"
          : noChanges
            ? "Finish with no changes"
            : "Finish selected changes"}
      </Button>
    </form>
  );
}
