"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Button, Card, FieldLabel, Input, Select } from "../../ui/primitives";
import { createProcessFamilyAction } from "./actions";
import { initialProcessFamilyActionState } from "./action-state";

const textareaClass =
  "min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]";

export function ProcessFamilyCreateForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(
    createProcessFamilyAction,
    initialProcessFamilyActionState,
  );
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--text)]" href="/studio">Workspace Studio</Link>
        <span className="mx-2">/</span>
        <Link className="hover:text-[var(--text)]" href="/studio/process-families">Process Families</Link>
        <span className="mx-2">/</span>
        <span>Add Family</span>
      </nav>
      <header className="mt-5 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-medium text-[var(--workspace-accent)]">Operating Model</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.045em] text-[var(--text)]">Add Process Family</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Record a durable grouping for related Processes. A Family does not make its Processes inherit Steps, Roles, Systems, Exceptions, governance, or conclusions.
        </p>
      </header>
      <Alert className="mt-6" tone="warning">
        Search existing Families before adding one. Similar names may describe the same organizational grouping.
      </Alert>
      <Card className="mt-5 p-5 sm:p-6">
        <form action={action} className="space-y-5">
          <label className="block">
            <FieldLabel>Family name</FieldLabel>
            <Input maxLength={255} name="name" placeholder="Customer Onboarding" required />
          </label>
          <label className="block">
            <FieldLabel>Description</FieldLabel>
            <textarea className={textareaClass} maxLength={5000} name="description" placeholder="What connects the Processes in this Family?" />
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
            <textarea className={textareaClass} maxLength={2000} name="reason" placeholder="Why is this Process Family being documented?" required />
          </label>
          {state.status !== "idle" ? <Alert tone="error">{state.message}</Alert> : null}
          <div className="flex justify-end">
            <Button disabled={pending} type="submit" variant="primary">
              {pending ? "Adding…" : "Add Process Family"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
