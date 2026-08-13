"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { TechnologyRoleOption } from "@/lib/technology-authoring-data";

import { Alert, Button, Card, FieldLabel, Input, Select } from "../../ui/primitives";
import { createSystemAction } from "./actions";
import { initialTechnologyActionState } from "./action-state";

export function SystemCreateForm({
  roles,
  today,
}: {
  roles: TechnologyRoleOption[];
  today: string;
}) {
  const [state, action, pending] = useActionState(
    createSystemAction,
    initialTechnologyActionState,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--text)]" href="/studio">Workspace Studio</Link>
        <span className="mx-2">/</span>
        <Link className="hover:text-[var(--text)]" href="/studio/technology">Technology</Link>
        <span className="mx-2">/</span>
        <span>Add System</span>
      </nav>
      <header className="mt-5 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-medium text-[var(--workspace-accent)]">Technology Builder</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.045em] text-[var(--text)]">Add System</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Add a System to the Technology catalog. Adding it does not establish criticality, institutional approval, or a Process relationship.
        </p>
      </header>

      <Alert className="mt-6" tone="warning">
        Search the Technology catalog before adding a System. Similar names may describe the same technology.
      </Alert>

      <Card className="mt-5 p-5 sm:p-6">
        <form action={action} className="space-y-5">
          <label className="block">
            <FieldLabel>System name</FieldLabel>
            <Input maxLength={255} name="name" required />
          </label>
          <label className="block">
            <FieldLabel>Description</FieldLabel>
            <textarea
              className="min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
              maxLength={5000}
              name="description"
              placeholder="What technology or operational record is this?"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>System type</FieldLabel>
              <Select defaultValue="software" name="systemType">
                <option value="software">Software</option>
                <option value="external_service">External service</option>
                <option value="manual_record">Manual record</option>
                <option value="other">Other</option>
              </Select>
            </label>
            <label className="block">
              <FieldLabel>Owner Operational Role</FieldLabel>
              <Select defaultValue="" name="ownerRoleKey">
                <option value="">Not assigned</option>
                {roles.map((role) => (
                  <option disabled={role.status !== "active"} key={role.id} value={role.id}>
                    {role.name}{role.status !== "active" ? " — inactive" : ""}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="block">
            <FieldLabel>Reference URL</FieldLabel>
            <Input name="url" placeholder="https://" type="url" />
            <span className="mt-1.5 block text-xs text-[var(--text-tertiary)]">Optional. Do not enter passwords or private connection URLs.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>How should this addition be understood?</FieldLabel>
              <Select defaultValue="correction" name="changeKind">
                <option value="correction">Correction to the documented model</option>
                <option value="organizational_change">Change in how the organization operates</option>
              </Select>
            </label>
            <label className="block">
              <FieldLabel>Effective date</FieldLabel>
              <Input defaultValue={today} max={today} name="effectiveDate" required type="date" />
            </label>
          </div>
          <label className="block">
            <FieldLabel>Reason</FieldLabel>
            <textarea
              className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
              maxLength={2000}
              name="reason"
              placeholder="Why is this System being added?"
              required
            />
          </label>
          {state.status !== "idle" ? (
            <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>
          ) : null}
          <div className="flex justify-end">
            <Button disabled={pending} type="submit" variant="primary">
              {pending ? "Adding…" : "Add System"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
