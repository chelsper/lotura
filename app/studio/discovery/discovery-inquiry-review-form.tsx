"use client";

import { useActionState, useState } from "react";

import {
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS,
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS,
  type DiscoveryInquiryReviewOutcomeKind,
} from "@/lib/discovery-inquiry-review-model.mjs";

import { Alert, Button, Card, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { finishDiscoveryInquiryReviewAction } from "./actions";

type ProcessOption = {
  id: string;
  name: string;
  status: "draft" | "active";
};

export function DiscoveryInquiryReviewForm({
  expectedRevision,
  inquiryId,
  processes,
  sessionId,
  supersedesReviewId,
}: {
  expectedRevision: number;
  inquiryId: string;
  processes: ProcessOption[];
  sessionId: string;
  supersedesReviewId: string | null;
}) {
  const [state, action, pending] = useActionState(
    finishDiscoveryInquiryReviewAction,
    initialDiscoveryActionState,
  );
  const [selected, setSelected] = useState<
    DiscoveryInquiryReviewOutcomeKind[]
  >([]);

  function toggle(kind: DiscoveryInquiryReviewOutcomeKind) {
    setSelected((current) => current.includes(kind)
      ? current.filter((value) => value !== kind)
      : [...current, kind]);
  }

  return (
    <form action={action} className="space-y-5">
      <input name="inquiryId" type="hidden" value={inquiryId} />
      <input name="sessionId" type="hidden" value={sessionId} />
      <input
        name="expectedRevision"
        type="hidden"
        value={expectedRevision}
      />
      <input
        name="supersedesReviewId"
        type="hidden"
        value={supersedesReviewId || ""}
      />

      <div className="space-y-3">
        {DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS.map((kind) => {
          const details = DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS[kind];
          const checked = selected.includes(kind);
          return (
            <Card className="p-4 sm:p-5" key={kind}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  checked={checked}
                  className="mt-1 size-4 accent-[var(--workspace-accent)]"
                  name="outcomeKind"
                  onChange={() => toggle(kind)}
                  type="checkbox"
                  value={kind}
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--text)]">
                    {details.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                    {details.description}
                  </span>
                </span>
              </label>

              {checked && kind === "connect_existing_process" ? (
                <label className="mt-4 block border-t border-[var(--border)] pt-4">
                  <FieldLabel>Existing Process</FieldLabel>
                  <Select name="processKey" required>
                    <option value="">Choose a Process</option>
                    {processes.map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.name} — {process.status === "draft"
                          ? "Working draft"
                          : "Active"}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}

              {checked ? (
                <label className="mt-4 block">
                  <FieldLabel>
                    {details.requiresExplanation
                      ? "What should someone understand next?"
                      : "Context (optional)"}
                  </FieldLabel>
                  <textarea
                    className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                    maxLength={2000}
                    name={`explanation_${kind}`}
                    placeholder={kind === "additional_validation_required"
                      ? "For example: Finance should validate the handoff."
                      : "Preserve why this conclusion fits the reviewed evidence."}
                    required={details.requiresExplanation}
                  />
                </label>
              ) : null}
            </Card>
          );
        })}
      </div>

      <label className="block">
        <FieldLabel>Overall note (optional)</FieldLabel>
        <textarea
          className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          name="reviewNote"
          placeholder="What is most important to remember from this review?"
        />
      </label>

      {state.status === "error" ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}
      <Alert tone="info">
        Finishing this review preserves understanding only. It does not create,
        propose, approve, or change a Process.
      </Alert>
      <Button
        disabled={pending || selected.length === 0}
        type="submit"
        variant="primary"
      >
        {pending ? "Preserving review…" : "Finish review"}
      </Button>
    </form>
  );
}
