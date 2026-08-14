"use client";

import { useActionState } from "react";

import type { ProposalReviewDecisionRecord } from "@/lib/discovery-data";
import { PROPOSAL_REVIEW_DISPOSITION_LABELS } from "@/lib/proposal-review-model.mjs";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import {
  beginProposalReviewAction,
  finishProposalReviewAction,
  saveProposalReviewDecisionAction,
} from "./actions";
import { initialDiscoveryActionState } from "./action-state";

const textAreaClass =
  "min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]";

export function BeginProposalReviewForm({
  expectedMappingRevision,
  sessionId,
}: {
  expectedMappingRevision: number;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    beginProposalReviewAction,
    initialDiscoveryActionState,
  );
  return (
    <form action={action} className="space-y-3">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input
        name="expectedMappingRevision"
        type="hidden"
        value={expectedMappingRevision}
      />
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Button disabled={pending} type="submit" variant="primary">
        {pending ? "Starting review…" : "Begin proposal review"}
      </Button>
    </form>
  );
}

export function ProposalReviewDecisionForm({
  currentDecision,
  expectedReviewRevision,
  itemId,
  sessionId,
}: {
  currentDecision: ProposalReviewDecisionRecord | null;
  expectedReviewRevision: number;
  itemId: string;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    saveProposalReviewDecisionAction,
    initialDiscoveryActionState,
  );
  return (
    <form action={action} className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="itemId" type="hidden" value={itemId} />
      <input
        name="expectedReviewRevision"
        type="hidden"
        value={expectedReviewRevision}
      />
      <label className="block">
        <FieldLabel>What is your review decision?</FieldLabel>
        <Select
          defaultValue={currentDecision?.disposition ?? ""}
          name="disposition"
          required
        >
          <option disabled value="">Choose a decision</option>
          {Object.entries(PROPOSAL_REVIEW_DISPOSITION_LABELS).map(
            ([value, label]) => <option key={value} value={value}>{label}</option>,
          )}
        </Select>
      </label>
      <label className="block">
        <FieldLabel>Explanation</FieldLabel>
        <textarea
          className={textAreaClass}
          defaultValue={currentDecision?.reviewNote ?? ""}
          maxLength={4000}
          name="reviewNote"
          placeholder="Required when a change is not approved or needs more validation."
        />
      </label>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="flex justify-end">
        <Button disabled={pending} size="sm" type="submit" variant="primary">
          {pending
            ? "Saving…"
            : currentDecision
              ? "Record a new decision"
              : "Save decision"}
        </Button>
      </div>
    </form>
  );
}

export function FinishProposalReviewForm({
  canFinish,
  expectedReviewRevision,
  sessionId,
}: {
  canFinish: boolean;
  expectedReviewRevision: number;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    finishProposalReviewAction,
    initialDiscoveryActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input
        name="expectedReviewRevision"
        type="hidden"
        value={expectedReviewRevision}
      />
      <label className="block">
        <FieldLabel>Why is this review being completed this way?</FieldLabel>
        <textarea
          className={textAreaClass}
          maxLength={4000}
          name="completionNote"
          placeholder="Summarize the basis for the review result."
          required
        />
      </label>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Button disabled={!canFinish || pending} type="submit" variant="primary">
        {pending ? "Finishing review…" : "Finish review"}
      </Button>
    </form>
  );
}
