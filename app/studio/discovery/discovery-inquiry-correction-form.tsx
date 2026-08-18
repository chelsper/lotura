"use client";

import { useActionState, useState } from "react";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { correctInquiryDiscoveryObservationAction } from "./actions";

const states = [
  ["known", "Known"],
  ["assumed", "Assumed"],
  ["unknown", "Unknown"],
  ["needs_validation", "Needs validation"],
  ["conflicting_observation", "Conflicting observation"],
] as const;

export function DiscoveryInquiryCorrectionForm({
  currentEpistemicState,
  currentResponseText,
  inquiryId,
  observationId,
  revision,
  sessionId,
}: {
  currentEpistemicState: (typeof states)[number][0];
  currentResponseText: string | null;
  inquiryId: string;
  observationId: string;
  revision: number;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    correctInquiryDiscoveryObservationAction,
    initialDiscoveryActionState,
  );
  const [evidenceState, setEvidenceState] = useState(currentEpistemicState);

  return (
    <form action={action} className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
      <input name="inquiryId" type="hidden" value={inquiryId} />
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="observationId" type="hidden" value={observationId} />
      <input name="expectedRevision" type="hidden" value={revision} />
      <label className="block">
        <FieldLabel>Corrected label</FieldLabel>
        <Select
          name="epistemicState"
          onChange={(event) => setEvidenceState(
            event.target.value as (typeof states)[number][0],
          )}
          value={evidenceState}
        >
          {states.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </label>
      <label className="block">
        <FieldLabel>Corrected answer</FieldLabel>
        <textarea
          className="min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          defaultValue={currentResponseText || ""}
          maxLength={10000}
          name="responseText"
          required={evidenceState !== "unknown"}
        />
      </label>
      {state.status === "error" ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}
      <Button disabled={pending} size="sm" type="submit">
        {pending ? "Preserving correction…" : "Preserve correction"}
      </Button>
    </form>
  );
}
