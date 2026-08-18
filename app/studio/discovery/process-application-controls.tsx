"use client";

import { useActionState } from "react";

import type { DiscoveryMappingAction } from "@/lib/discovery-mapping-model.mjs";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import { applyProposalReviewAction } from "./actions";
import { initialDiscoveryActionState } from "./action-state";

const textAreaClass =
  "min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]";

export type ApprovedApplicationItem = {
  action: DiscoveryMappingAction;
  id: string;
  label: string;
};

export function ProcessApplicationForm({
  approvedItems,
  documentedProcessFingerprint,
  reviewId,
  sessionId,
}: {
  approvedItems: ApprovedApplicationItem[];
  documentedProcessFingerprint: string;
  reviewId: string;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    applyProposalReviewAction,
    initialDiscoveryActionState,
  );
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="space-y-6">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedReviewId" type="hidden" value={reviewId} />
      <input
        name="expectedDocumentedFingerprint"
        type="hidden"
        value={documentedProcessFingerprint}
      />

      <div className="space-y-4">
        {approvedItems.map((item, index) => (
          <label className="block" key={item.id}>
            <FieldLabel>{index + 1}. {item.label}</FieldLabel>
            <Select name={`classification:${item.id}`} required>
              <option disabled value="">Choose how to understand this change</option>
              <option value="correction">Correction to documented information</option>
              <option value="organizational_change">Organizational change</option>
            </Select>
          </label>
        ))}
      </div>

      <label className="block">
        <FieldLabel>Why should these approved changes take effect?</FieldLabel>
        <textarea
          className={textAreaClass}
          maxLength={4000}
          name="reason"
          placeholder="Explain the basis for applying the complete approved package."
          required
        />
      </label>

      <label className="block max-w-sm">
        <FieldLabel>Effective date</FieldLabel>
        <input
          className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)]"
          defaultValue={today}
          max={today}
          name="effectiveDate"
          required
          type="date"
        />
      </label>

      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Alert tone="warning">
        All approved changes will be applied together. The prior documented state will remain available as a version. If any check fails, no partial change will be retained.
      </Alert>
      <Button disabled={pending} type="submit" variant="primary">
        {pending ? "Applying approved changes…" : "Apply all approved changes"}
      </Button>
    </form>
  );
}
