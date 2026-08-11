"use client";

import { useActionState, useMemo, useState } from "react";

import type { OrganizationStructureData } from "@/lib/organization-structure-data.mjs";
import { initialStructureActionState } from "@/app/organization/action-state";
import { Alert, Button, Card, FieldLabel, Input, Select } from "@/app/ui/primitives";

import { createOperationalRoleWithMandateAction } from "./actions";

export function RoleCreateForm({ data }: { data: OrganizationStructureData }) {
  const [state, action, pending] = useActionState(
    createOperationalRoleWithMandateAction,
    initialStructureActionState,
  );
  const [positionStableKey, setPositionStableKey] = useState("");
  const [mandateType, setMandateType] = useState<"primary" | "shared">("primary");
  const positions = useMemo(
    () => data.positions.filter((position) => position.status === "active"),
    [data.positions],
  );
  const selected = positions.find((position) => position.id === positionStableKey);

  return (
    <form action={action} className="mt-6 grid gap-5 lg:grid-cols-2">
      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--text)]">Operational Role</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Name the durable responsibility—not the current Person or Position title.
        </p>
        <label className="mt-4 block">
          <FieldLabel>Role name</FieldLabel>
          <Input maxLength={255} name="newRoleName" required />
        </label>
        <label className="mt-3 block">
          <FieldLabel>Responsibility description, if established</FieldLabel>
          <textarea
            className="min-h-28 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]"
            maxLength={2000}
            name="newRoleDescription"
          />
        </label>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--text)]">First Position mandate</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Allocate the new Role deliberately. The Position’s title, occupant, and reporting line remain context only. Human coverage remains a separate decision.
        </p>
        <label className="mt-4 block">
          <FieldLabel>Position</FieldLabel>
          <Select
            name="positionStableKey"
            onChange={(event) => setPositionStableKey(event.target.value)}
            required
            value={positionStableKey}
          >
            <option value="">Select a Position</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title} — {position.unit?.name ?? "No Organization Unit"}
              </option>
            ))}
          </Select>
        </label>
        <input name="expectedRevision" type="hidden" value={selected?.revision ?? ""} />
        <label className="mt-3 block">
          <FieldLabel>Mandate type</FieldLabel>
          <Select
            name="mandateType"
            onChange={(event) => setMandateType(event.target.value as typeof mandateType)}
            value={mandateType}
          >
            <option value="primary">Primary accountability</option>
            <option value="shared">Shared responsibility</option>
          </Select>
        </label>
        <label className="mt-3 block">
          <FieldLabel>{mandateType === "shared" ? "Shared scope" : "Narrower scope, if documented"}</FieldLabel>
          <Input maxLength={2000} name="scope" required={mandateType === "shared"} />
        </label>
      </Card>

      <Card className="p-4 lg:col-span-2 sm:p-5">
        <input name="changeKind" type="hidden" value="organizational_change" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>How this change is understood</FieldLabel>
            <p className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              Organizational change
            </p>
          </div>
          <label>
            <FieldLabel>Effective date</FieldLabel>
            <Input defaultValue={new Date().toISOString().slice(0, 10)} name="effectiveDate" required type="date" />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Reason</FieldLabel>
            <textarea
              className="min-h-24 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]"
              maxLength={2000}
              name="reason"
              placeholder="Explain why this Role and mandate should become part of the current responsibility model."
              required
            />
          </label>
        </div>
        {state.status !== "idle" ? (
          <Alert className="mt-4" tone={state.status === "success" ? "success" : "error"}>
            {state.message}
          </Alert>
        ) : null}
        <Button className="mt-4" disabled={pending || !selected} type="submit" variant="primary">
          {pending ? "Creating Role and mandate…" : "Create Role and first mandate"}
        </Button>
      </Card>
    </form>
  );
}
