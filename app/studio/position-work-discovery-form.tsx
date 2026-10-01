"use client";

import { startTransition, useActionState, useId, useState } from "react";

import { Alert, Button, Card, FieldLabel, RequiredMark, Select } from "../ui/primitives";
import { initialDiscoveryActionState } from "./discovery/action-state";
import { startPositionWorkDiscoveryAction } from "./position-work-discovery-actions";

const involvementOptions = [
  { value: "perform", label: "Does the work" },
  { value: "oversee", label: "Oversees the work" },
  { value: "support", label: "Helps someone else" },
  { value: "backup", label: "Provides backup" },
  { value: "mixed", label: "A mix of these" },
  { value: "unsure", label: "I’m not sure yet" },
];

export function PositionWorkDiscoveryForm({ position, requestId }: {
  position: {
    id: string;
    title: string;
    unit: { id: string; name: string } | null;
  };
  requestId: string;
}) {
  const [state, action, pending] = useActionState(
    startPositionWorkDiscoveryAction,
    initialDiscoveryActionState,
  );
  const [workDescription, setWorkDescription] = useState("");
  const [involvement, setInvolvement] = useState("");
  const [epistemicState, setEpistemicState] = useState("needs_validation");
  const fieldId = useId();

  return (
    <Card className="mt-6 p-4 sm:p-6">
      <p className="text-sm font-semibold text-[var(--text)]">{position.title}</p>
      {position.unit ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{position.unit.name}</p> : null}
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        Saved as interview notes. Nothing is assigned or changed.
      </p>
      <form
        aria-busy={pending}
        className="mt-5"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          // Dispatch explicitly so a returned action error does not reset native form controls.
          const formData = new FormData(event.currentTarget);
          startTransition(() => action(formData));
        }}
      >
        <input name="positionId" type="hidden" value={position.id} />
        <input name="requestId" type="hidden" value={requestId} />
        <fieldset className="min-w-0 space-y-5" disabled={pending}>
          <p className="text-xs text-[var(--text-tertiary)]">* Required.</p>
          <label className="block">
            <FieldLabel>What work does this job involve?<RequiredMark /></FieldLabel>
            <textarea
              aria-describedby={`${fieldId}-privacy`}
              className="min-h-36 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]"
              maxLength={4000}
              name="workDescription"
              onChange={(event) => setWorkDescription(event.target.value)}
              placeholder="Describe a few things the job involves. It is fine to say what you are unsure about."
              required
              value={workDescription}
            />
          </label>
          <p className="text-xs leading-5 text-[var(--text-secondary)]" id={`${fieldId}-privacy`}>
            Describe the work, not sensitive personal records. Leave out private HR, student, donor, medical, payment, and login details.
          </p>
          <fieldset aria-describedby={`${fieldId}-involvement`} className="min-w-0">
            <legend className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
              How does this job take part?<RequiredMark />
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {involvementOptions.map((option) => (
                <label className="flex cursor-pointer items-start gap-2 rounded-[10px] border border-[var(--border)] px-3 py-3 text-sm text-[var(--text)]" key={option.value}>
                  <input
                    checked={involvement === option.value}
                    className="mt-1 shrink-0 accent-[var(--workspace-accent)]"
                    name="involvement"
                    onChange={(event) => setInvolvement(event.target.value)}
                    required
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]" id={`${fieldId}-involvement`}>
              This describes the job’s involvement. It does not assign responsibility or process ownership.
            </p>
          </fieldset>
          <label className="block">
            <FieldLabel>How certain are you?<RequiredMark /></FieldLabel>
            <Select name="epistemicState" onChange={(event) => setEpistemicState(event.target.value)} required value={epistemicState}>
              <option value="known">Known — I can confirm this</option>
              <option value="assumed">Assumed — I think this is how it works</option>
              <option value="needs_validation">Needs validation — someone should confirm</option>
            </Select>
            <span className="mt-2 block text-xs leading-5 text-[var(--text-tertiary)]">
              Starts at Needs validation. Choose the label that fits what you know.
            </span>
          </label>
          <Button className="w-full sm:w-auto" disabled={pending} type="submit" variant="primary">
            {pending ? "Saving your starting point…" : "Save and continue"}
          </Button>
        </fieldset>
        <div aria-live="polite" className="mt-4" role="status">
          {pending ? <p className="text-sm text-[var(--text-secondary)]">Saving your starting point…</p> : state.status !== "idle" ? (
            <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
