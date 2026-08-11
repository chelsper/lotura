"use client";

import { useActionState, useState } from "react";

import { Alert, Button, FieldLabel, Input, Select } from "../ui/primitives";
import { createDraftProcessAction } from "./actions";
import { initialProcessAcquisitionActionState } from "./action-state";

type RoleOption = {
  id: string;
  name: string;
};

export function ProcessAcquisitionForm({
  contextRoleId,
  roles,
}: {
  contextRoleId: string | null;
  roles: RoleOption[];
}) {
  const [state, action, pending] = useActionState(
    createDraftProcessAction,
    initialProcessAcquisitionActionState,
  );
  const [ownerRoleKey, setOwnerRoleKey] = useState("");

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <FieldLabel>Process name</FieldLabel>
        <Input maxLength={255} name="name" required />
      </label>

      <label className="block">
        <FieldLabel>Purpose, if known</FieldLabel>
        <textarea
          className="min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={5000}
          name="purpose"
          placeholder="What repeatable work does this Process accomplish? An incomplete answer is acceptable in a Draft."
        />
      </label>

      <label className="block">
        <FieldLabel>Intended Owner Role</FieldLabel>
        <Select
          name="ownerRoleKey"
          onChange={(event) => setOwnerRoleKey(event.target.value)}
          value={ownerRoleKey}
        >
          <option value="">Not assigned yet</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}{role.id === contextRoleId ? " — starting context" : ""}
            </option>
          ))}
        </Select>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          A Draft may remain unowned. Starting from a Role does not assign that
          Role automatically.
        </span>
      </label>

      {ownerRoleKey ? (
        <label className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
          <input
            className="mt-1 size-4 accent-[var(--workspace-accent)]"
            name="ownerConfirmed"
            required
            type="checkbox"
            value="yes"
          />
          <span>
            Confirm this Operational Role as the intended Process owner for the
            Draft. This is an explicit responsibility decision, not an
            inference from Position, title, reporting, or Role context.
          </span>
        </label>
      ) : null}

      <label className="block">
        <FieldLabel>Reason for creating this Draft</FieldLabel>
        <textarea
          className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          name="reason"
          placeholder="Why should this Draft Process be added to the operating model?"
          required
        />
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          This reason becomes part of the append-only operating-model change history.
        </span>
      </label>

      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <p className="max-w-xl text-xs leading-5 text-[var(--text-tertiary)]">
          This creates only a Draft Process shell. It does not approve, activate,
          publish, or complete the Process definition.
        </p>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Creating Draft…" : "Create Draft Process"}
        </Button>
      </div>
    </form>
  );
}
