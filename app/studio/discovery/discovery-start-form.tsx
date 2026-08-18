"use client";

import { useActionState, useState } from "react";

import { Alert, Button, cn, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { startDiscoverySessionAction } from "./actions";

export function DiscoveryStartForm({
  initialProcessId,
  processes,
}: {
  initialProcessId: string | null;
  processes: Array<{ id: string; name: string; status: string }>;
}) {
  const [scopeMode, setScopeMode] = useState<"whole" | "part">("whole");
  const [state, action, pending] = useActionState(
    startDiscoverySessionAction,
    initialDiscoveryActionState,
  );
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <FieldLabel>Which process do you want to discuss?</FieldLabel>
        <Select defaultValue={initialProcessId || ""} name="processKey" required>
          <option disabled value="">Choose a process</option>
          {processes.map((process) => (
            <option key={process.id} value={process.id}>
              {process.name} — {process.status === "draft" ? "Working draft" : process.status}
            </option>
          ))}
        </Select>
      </label>
      <fieldset>
        <legend className="text-xs font-medium text-[var(--text-secondary)]">
          What part of this work are we discussing?
        </legend>
        <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
          Choose the whole process unless you want this interview to focus on one specific part.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-[10px] border p-3 transition",
              scopeMode === "whole"
                ? "border-[var(--workspace-accent)] bg-[var(--accent-subtle)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]",
            )}
          >
            <input
              checked={scopeMode === "whole"}
              className="mt-1 size-4 accent-[var(--workspace-accent)]"
              name="scopeMode"
              onChange={() => setScopeMode("whole")}
              type="radio"
              value="whole"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--text)]">The whole process</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                Talk through the work from beginning to end.
              </span>
            </span>
          </label>
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-[10px] border p-3 transition",
              scopeMode === "part"
                ? "border-[var(--workspace-accent)] bg-[var(--accent-subtle)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]",
            )}
          >
            <input
              checked={scopeMode === "part"}
              className="mt-1 size-4 accent-[var(--workspace-accent)]"
              name="scopeMode"
              onChange={() => setScopeMode("part")}
              type="radio"
              value="part"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--text)]">One part of the process</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                Focus on a particular stage, handoff, or exception.
              </span>
            </span>
          </label>
        </div>
        {scopeMode === "part" ? (
          <label className="mt-4 block">
            <FieldLabel>What should we focus on?</FieldLabel>
            <textarea
              className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
              maxLength={2000}
              name="scopeDetails"
              placeholder="For example: Focus on the handoff from intake through final review. Leave out downstream reporting."
              required
            />
            <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
              A short answer is fine. Say where the discussion starts or ends, or what should be left out.
            </span>
          </label>
        ) : null}
      </fieldset>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <p className="max-w-xl text-xs leading-5 text-[var(--text-tertiary)]">
          This starts an interview and saves your answers for review. It does not change the documented process.
        </p>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Starting interview…" : "Start interview"}
        </Button>
      </div>
    </form>
  );
}
