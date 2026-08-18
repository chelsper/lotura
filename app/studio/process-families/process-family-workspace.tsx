"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { ProcessFamilyContext } from "@/lib/process-family-data";

import { Alert, Badge, Button, Card, FieldLabel, Input, Select } from "../../ui/primitives";
import {
  addProcessFamilyMembershipAction,
  deactivateProcessFamilyAction,
  endProcessFamilyMembershipAction,
  updateProcessFamilyAction,
} from "./actions";
import { initialProcessFamilyActionState } from "./action-state";

const textareaClass =
  "min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]";

const historyLabels: Record<ProcessFamilyContext["history"][number]["action"], string> = {
  create_process_family: "Process Family added",
  update_process_family: "Process Family updated",
  deactivate_process_family: "Process Family deactivated",
  add_process_family_membership: "Process added to Family",
  end_process_family_membership: "Process membership ended",
};

function utcDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function FamilyIdentity({ context }: { context: ProcessFamilyContext }) {
  return (
    <>
      <input name="familyStableKey" type="hidden" value={context.stableKey} />
      <input name="expectedFamilyRevision" type="hidden" value={context.revision} />
    </>
  );
}

function ChangeFields({ today }: { today: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <FieldLabel>How should this change be understood?</FieldLabel>
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
  );
}

function MembershipEndForm({
  context,
  member,
  today,
}: {
  context: ProcessFamilyContext;
  member: ProcessFamilyContext["members"][number];
  today: string;
}) {
  const [state, action, pending] = useActionState(
    endProcessFamilyMembershipAction,
    initialProcessFamilyActionState,
  );
  return (
    <details className="mt-3 border-t border-[var(--border)] pt-3">
      <summary className="cursor-pointer text-xs font-medium text-[var(--workspace-accent)]">End this Family membership</summary>
      <form action={action} className="mt-3 space-y-3">
        <FamilyIdentity context={context} />
        <input name="membershipStableKey" type="hidden" value={member.membershipStableKey} />
        <input name="expectedMembershipRevision" type="hidden" value={member.membershipRevision} />
        <ChangeFields today={today} />
        <label className="block">
          <FieldLabel>Reason</FieldLabel>
          <textarea className={textareaClass} maxLength={2000} name="reason" placeholder="Why is this Process no longer part of this Family?" required />
        </label>
        {state.status !== "idle" ? <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert> : null}
        <Button disabled={pending} size="sm" type="submit" variant="destructive">
          {pending ? "Ending…" : "End membership"}
        </Button>
      </form>
    </details>
  );
}

export function ProcessFamilyWorkspace({ context, today }: { context: ProcessFamilyContext; today: string }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateProcessFamilyAction,
    initialProcessFamilyActionState,
  );
  const [addState, addAction, addPending] = useActionState(
    addProcessFamilyMembershipAction,
    initialProcessFamilyActionState,
  );
  const [deactivateState, deactivateAction, deactivatePending] = useActionState(
    deactivateProcessFamilyAction,
    initialProcessFamilyActionState,
  );
  const activeKeys = new Set(
    context.members.filter((item) => item.status === "active").map((item) => item.process.stableKey),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--text)]" href="/studio">Workspace Studio</Link>
        <span className="mx-2">/</span>
        <Link className="hover:text-[var(--text)]" href="/studio/process-families">Process Families</Link>
        <span className="mx-2">/</span>
        <span>{context.name}</span>
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={context.status === "active" ? "success" : "neutral"}>{context.status === "active" ? "Current" : "Inactive"}</Badge>
          <Badge>Operating Model · Process Family</Badge>
        </div>
        <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.045em] text-[var(--text)]">{context.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Understand and maintain an explicit grouping of related Processes. Membership records common context; it does not create inheritance or a dependency.
        </p>
      </header>

      <Alert className="mt-5" tone="info">
        Each member Process keeps its own purpose, Steps, responsibilities, Systems, Exceptions, governance, and history.
      </Alert>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Definition</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Family details</h2>
            <form action={updateAction} className="mt-5 space-y-5">
              <FamilyIdentity context={context} />
              <label className="block">
                <FieldLabel>Family name</FieldLabel>
                <Input defaultValue={context.name} disabled={context.status !== "active"} maxLength={255} name="name" required />
              </label>
              <label className="block">
                <FieldLabel>Description</FieldLabel>
                <textarea className={textareaClass} defaultValue={context.description ?? ""} disabled={context.status !== "active"} maxLength={5000} name="description" />
              </label>
              <ChangeFields today={today} />
              <label className="block">
                <FieldLabel>Reason</FieldLabel>
                <textarea className={textareaClass} disabled={context.status !== "active"} maxLength={2000} name="reason" placeholder="Why is this Family definition changing?" required />
              </label>
              {updateState.status !== "idle" ? <Alert tone={updateState.status === "success" ? "success" : "error"}>{updateState.message}</Alert> : null}
              <div className="flex justify-end">
                <Button disabled={updatePending || context.status !== "active"} type="submit" variant="primary">{updatePending ? "Saving…" : "Save Family"}</Button>
              </div>
            </form>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Explicit membership</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Processes in this Family</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">A Process may belong to more than one Family. Lotura does not choose a primary Family.</p>
            <div className="mt-4 space-y-3">
              {context.members.length > 0 ? context.members.map((member) => (
                <article className="rounded-[10px] border border-[var(--border)] p-4" key={member.membershipStableKey}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link className="text-sm font-semibold text-[var(--text)] hover:text-[var(--workspace-accent)]" href={`/studio/processes/${encodeURIComponent(member.process.id)}`}>{member.process.name}</Link>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{member.process.purpose ?? "Purpose needs validation."}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge tone={member.process.status === "draft" ? "warning" : member.process.status === "active" ? "success" : "neutral"}>{member.process.status === "draft" ? "Working draft" : member.process.status}</Badge>
                      <Badge tone={member.status === "active" ? "accent" : "neutral"}>{member.status === "active" ? "Current member" : "Ended"}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">Effective {utcDate(member.effectiveFrom)} UTC{member.effectiveUntil ? ` · Ended ${utcDate(member.effectiveUntil)} UTC` : ""}</p>
                  {member.status === "active" && context.status === "active" ? <MembershipEndForm context={context} member={member} today={today} /> : null}
                </article>
              )) : <p className="text-sm text-[var(--text-tertiary)]">No Processes have been explicitly added to this Family.</p>}
            </div>

            {context.status === "active" ? (
              <form action={addAction} className="mt-6 space-y-4 border-t border-[var(--border)] pt-5">
                <FamilyIdentity context={context} />
                <h3 className="text-sm font-semibold text-[var(--text)]">Add an existing Process</h3>
                <label className="block">
                  <FieldLabel>Process</FieldLabel>
                  <Select defaultValue="" name="processStableKey" required>
                    <option disabled value="">Select a Process</option>
                    {context.processOptions.map((process) => (
                      <option disabled={activeKeys.has(process.stableKey)} key={process.stableKey} value={process.stableKey}>{process.name}{activeKeys.has(process.stableKey) ? " — already a member" : ""}</option>
                    ))}
                  </Select>
                </label>
                <ChangeFields today={today} />
                <label className="block">
                  <FieldLabel>Reason</FieldLabel>
                  <textarea className={textareaClass} maxLength={2000} name="reason" placeholder="Why does this Process belong in this Family?" required />
                </label>
                {addState.status !== "idle" ? <Alert tone={addState.status === "success" ? "success" : "error"}>{addState.message}</Alert> : null}
                <Button disabled={addPending || context.processOptions.length === 0} type="submit" variant="primary">{addPending ? "Adding…" : "Add Process to Family"}</Button>
              </form>
            ) : null}
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Lifecycle</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Deactivate this Family</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Deactivation preserves the Family and its history. End every current Process membership first.</p>
            <form action={deactivateAction} className="mt-4 space-y-4">
              <FamilyIdentity context={context} />
              <ChangeFields today={today} />
              <label className="block"><FieldLabel>Reason</FieldLabel><textarea className={textareaClass} maxLength={2000} name="reason" placeholder="Why is this Family no longer current?" required /></label>
              {context.activeMemberCount > 0 ? <Alert tone="warning">End {context.activeMemberCount} current {context.activeMemberCount === 1 ? "membership" : "memberships"} before deactivation.</Alert> : null}
              {deactivateState.status !== "idle" ? <Alert tone={deactivateState.status === "success" ? "success" : "error"}>{deactivateState.message}</Alert> : null}
              <Button disabled={deactivatePending || context.status !== "active" || context.activeMemberCount > 0} type="submit" variant="destructive">{deactivatePending ? "Deactivating…" : "Deactivate Family"}</Button>
            </form>
          </Card>
        </div>

        <Card className="h-fit p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Append-only activity</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Family history</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">This records operating-model maintenance. It is not an approved Process version history.</p>
          <div className="mt-4 space-y-4">
            {context.history.length > 0 ? context.history.map((item) => (
              <article className="border-l-2 border-[var(--border-strong)] pl-3" key={item.id}>
                <p className="text-xs font-medium text-[var(--text)]">{historyLabels[item.action]}</p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-tertiary)]">Effective {utcDate(item.effectiveAt)} UTC · recorded {utcDate(item.createdAt)} UTC</p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{item.reason}</p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Administrator: {item.actorIdentifier}</p>
              </article>
            )) : <p className="text-xs text-[var(--text-tertiary)]">No Family history is recorded yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
