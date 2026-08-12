"use client";

import { useActionState, useState } from "react";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { correctDiscoveryObservationAction } from "./actions";

export function DiscoveryCorrectionForm({
  observationId,
  revision,
  sessionId,
}: {
  observationId: string;
  revision: number;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    correctDiscoveryObservationAction,
    initialDiscoveryActionState,
  );
  const [epistemicState, setEpistemicState] = useState("needs_validation");
  return (
    <form action={action} className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="observationId" type="hidden" value={observationId} />
      <input name="expectedRevision" type="hidden" value={revision} />
      <label className="block">
        <FieldLabel>Corrected interpretation</FieldLabel>
        <Select name="epistemicState" onChange={(event) => setEpistemicState(event.target.value)} value={epistemicState}>
          <option value="known">Known</option>
          <option value="assumed">Assumed</option>
          <option value="unknown">Unknown</option>
          <option value="needs_validation">Needs validation</option>
          <option value="conflicting_observation">Conflicting observation</option>
        </Select>
      </label>
      <label className="block">
        <FieldLabel>New observation</FieldLabel>
        <textarea
          className="min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none"
          maxLength={10000}
          name="responseText"
          required={epistemicState !== "unknown"}
        />
      </label>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Button disabled={pending} size="sm" type="submit">
        {pending ? "Appending…" : "Append correction"}
      </Button>
    </form>
  );
}
