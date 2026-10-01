"use client";

import { useActionState, useMemo, useState } from "react";

import type { OrganizationStructureData } from "@/lib/organization-structure-data.mjs";
import { initialStructureActionState } from "@/app/organization/action-state";
import { Alert, Button, Card, FieldLabel, Input, RequiredMark, Select } from "@/app/ui/primitives";

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
      <p className="text-xs text-[var(--text-secondary)] lg:col-span-2">* Required; other fields are optional.</p>
      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--text)]">Responsibility</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Name the work, such as “Gift receipt preparation,” not a person or job title. The responsibility stays the same when people change.
        </p>
        <label className="mt-4 block">
          <FieldLabel>Responsibility name<RequiredMark /></FieldLabel>
          <Input maxLength={255} name="newRoleName" required />
        </label>
        <label className="mt-3 block">
          <FieldLabel>Responsibility description (optional)</FieldLabel>
          <textarea
            className="min-h-28 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]"
            maxLength={2000}
            name="newRoleDescription"
          />
        </label>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--text)]">First job title responsible</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Choose the job title that holds this responsibility. This does not rename the job, change its reporting line, or automatically assign the work to its people. Record who does the work separately after saving.
        </p>
        <label className="mt-4 block">
          <FieldLabel>Job title<RequiredMark /></FieldLabel>
          <Select
            name="positionStableKey"
            onChange={(event) => setPositionStableKey(event.target.value)}
            required
            value={positionStableKey}
          >
            <option value="">Choose a job title</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title} — {position.unit?.name ?? "No Unit recorded"}
              </option>
            ))}
          </Select>
        </label>
        <input name="expectedRevision" type="hidden" value={selected?.revision ?? ""} />
        <label className="mt-3 block">
          <FieldLabel>This job title’s part<RequiredMark /></FieldLabel>
          <Select
            name="mandateType"
            onChange={(event) => setMandateType(event.target.value as typeof mandateType)}
            required
            value={mandateType}
          >
            <option value="primary">Primary accountability</option>
            <option value="shared">Shared responsibility</option>
          </Select>
        </label>
        <label className="mt-3 block">
          <FieldLabel>{mandateType === "shared" ? <>Which part does this job title handle?<RequiredMark /></> : "Scope (optional)"}</FieldLabel>
          <Input maxLength={2000} name="scope" required={mandateType === "shared"} />
        </label>
      </Card>

      <Card className="p-4 lg:col-span-2 sm:p-5">
        <input name="changeKind" type="hidden" value="organizational_change" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Type of change</FieldLabel>
            <p className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              Organizational change
            </p>
          </div>
          <label>
            <FieldLabel>Effective date<RequiredMark /></FieldLabel>
            <Input defaultValue={new Date().toISOString().slice(0, 10)} name="effectiveDate" required type="date" />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Reason for change<RequiredMark /></FieldLabel>
            <textarea
              className="min-h-24 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]"
              maxLength={2000}
              name="reason"
              placeholder="Why are you adding this responsibility and linking it to this job title?"
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
          {pending ? "Creating responsibility and link…" : "Create responsibility and job title link"}
        </Button>
      </Card>
    </form>
  );
}
