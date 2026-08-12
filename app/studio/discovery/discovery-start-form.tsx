"use client";

import { useActionState } from "react";

import { Alert, Button, FieldLabel, Select } from "../../ui/primitives";
import { initialDiscoveryActionState } from "./action-state";
import { startDiscoverySessionAction } from "./actions";

export function DiscoveryStartForm({
  initialProcessId,
  processes,
}: {
  initialProcessId: string | null;
  processes: Array<{ id: string; name: string; status: string }>;
}) {
  const [state, action, pending] = useActionState(
    startDiscoverySessionAction,
    initialDiscoveryActionState,
  );
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <FieldLabel>Draft Process to explore</FieldLabel>
        <Select defaultValue={initialProcessId || ""} name="processKey" required>
          <option disabled value="">Choose a Process</option>
          {processes.map((process) => (
            <option key={process.id} value={process.id}>
              {process.name} — {process.status === "draft" ? "Working draft" : process.status}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <FieldLabel>Interview scope</FieldLabel>
        <textarea
          className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          name="scopeStatement"
          placeholder="Describe the part of the Process this interview covers and any intentional exclusions."
          required
        />
      </label>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <p className="max-w-xl text-xs leading-5 text-[var(--text-tertiary)]">
          This creates a discovery record only. It does not update, approve, or complete the Process.
        </p>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Starting interview…" : "Begin guided interview"}
        </Button>
      </div>
    </form>
  );
}
