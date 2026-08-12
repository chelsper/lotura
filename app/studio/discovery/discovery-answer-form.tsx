"use client";

import { useActionState, useState } from "react";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { answerDiscoveryQuestionAction } from "./actions";

const states = [
  ["known", "Known"],
  ["assumed", "Assumed"],
  ["unknown", "Unknown"],
  ["needs_validation", "Needs validation"],
  ["conflicting_observation", "Conflicting observation"],
] as const;

export function DiscoveryAnswerForm({
  promptKey,
  revision,
  sessionId,
}: {
  promptKey: string;
  revision: number;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    answerDiscoveryQuestionAction,
    initialDiscoveryActionState,
  );
  const [epistemicState, setEpistemicState] = useState("known");
  return (
    <form action={action} className="space-y-5">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="expectedRevision" type="hidden" value={revision} />
      <input name="promptKey" type="hidden" value={promptKey} />
      <label className="block">
        <FieldLabel>How should this observation be understood?</FieldLabel>
        <Select
          name="epistemicState"
          onChange={(event) => setEpistemicState(event.target.value)}
          value={epistemicState}
        >
          {states.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </label>
      <label className="block">
        <FieldLabel>{epistemicState === "unknown" ? "What is unknown? (optional)" : "Your observation"}</FieldLabel>
        <textarea
          className="min-h-40 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={10000}
          name="responseText"
          placeholder={epistemicState === "unknown" ? "Leave blank, or describe the question that remains open." : "Document what currently happens. Preserve gaps and disagreements honestly."}
          required={epistemicState !== "unknown"}
        />
      </label>
      <Alert tone="warning">
        Do not include donor, student, prospect, gift, wealth, HR, password, credential, or connection-string information. Record sanitized operational knowledge only.
      </Alert>
      <p className="text-xs leading-5 text-[var(--text-tertiary)]">
        Your response is saved only after you select Preserve and continue. Unsubmitted text may be lost if you leave or refresh this page.
      </p>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="flex justify-end border-t border-[var(--border)] pt-5">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Preserving observation…" : "Preserve and continue"}
        </Button>
      </div>
    </form>
  );
}
