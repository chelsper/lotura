"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import type {
  AuthoringRoleContext,
  OperatingModelChangeSummary,
  ProcessAuthoringContext,
} from "@/lib/operating-model-authoring-data";

import { Alert, Badge, Button, Card, FieldLabel, Input, Select } from "../ui/primitives";
import {
  changeProcessOwnerAction,
  updateProcessDefinitionAction,
} from "./actions";
import { initialProcessAuthoringActionState } from "./action-state";

const actionLabels: Record<OperatingModelChangeSummary["action"], string> = {
  create_draft: "Draft created",
  update_definition: "Definition updated",
  change_owner: "Owner Role changed",
};

function utcDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function HistoryState({ state }: { state: Record<string, unknown> }) {
  const entries = Object.entries(state);
  if (entries.length === 0) return <span>None</span>;
  return (
    <dl className="space-y-1">
      {entries.map(([key, value]) => (
        <div className="grid gap-1 sm:grid-cols-[110px_1fr]" key={key}>
          <dt className="text-[11px] font-medium text-[var(--text-tertiary)]">
            {key === "ownerRoleId" ? "Owner Role" : key === "ownerRoleName" ? "Owner Role name" : key}
          </dt>
          <dd className="break-words text-xs text-[var(--text-secondary)]">
            {value === null || value === "" ? "Not assigned" : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ChangeFields({ today }: { today: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <FieldLabel>How should this change be classified?</FieldLabel>
        <Select defaultValue="correction" name="changeKind">
          <option value="correction">Correction to the documented Process</option>
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

function HiddenIdentity({ context }: { context: ProcessAuthoringContext }) {
  return (
    <>
      <input name="processKey" type="hidden" value={context.process.id} />
      <input name="processStableKey" type="hidden" value={context.process.stableKey} />
      <input name="expectedRevision" type="hidden" value={context.process.revision} />
    </>
  );
}

function DefinitionForm({ context, today }: { context: ProcessAuthoringContext; today: string }) {
  const [state, action, pending] = useActionState(
    updateProcessDefinitionAction,
    initialProcessAuthoringActionState,
  );
  return (
    <form action={action} className="space-y-5">
      <HiddenIdentity context={context} />
      <label className="block">
        <FieldLabel>Process name</FieldLabel>
        <Input defaultValue={context.process.name} maxLength={255} name="name" required />
      </label>
      <label className="block">
        <FieldLabel>Purpose</FieldLabel>
        <textarea
          className="min-h-32 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          defaultValue={context.process.purpose ?? ""}
          maxLength={5000}
          name="purpose"
          placeholder="What repeatable work does this Process accomplish?"
        />
      </label>
      <ChangeFields today={today} />
      <label className="block">
        <FieldLabel>Reason</FieldLabel>
        <textarea
          className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          name="reason"
          placeholder="Why is this correction or operating change being recorded?"
          required
        />
      </label>
      {state.status !== "idle" ? (
        <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Saving…" : "Save definition"}
        </Button>
      </div>
    </form>
  );
}

function RoleContext({ role }: { role: AuthoringRoleContext | undefined }) {
  if (!role) {
    return (
      <Alert tone="warning">
        No Owner Role is assigned. A Draft may remain unresolved, but it must have an Owner Role before activation.
      </Alert>
    );
  }
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[var(--text)]">{role.name}</p>
        {role.status === "inactive" ? <Badge tone="warning">Retired Role</Badge> : <Badge tone="success">Active Role</Badge>}
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {role.description ?? "No Role description is recorded."}
      </p>
      <div className="mt-3 space-y-2">
        {role.mandates.length > 0 ? role.mandates.map((mandate) => (
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3" key={mandate.id}>
            <p className="text-xs font-medium text-[var(--text)]">
              Position mandate: {mandate.position.title}
              {mandate.position.status !== "active" ? " · Retired Position" : ""}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              {mandate.mandateType === "shared" ? `Shared mandate · ${mandate.scope ?? "Scope needs validation"}` : "Primary mandate"}
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Current coverage: {mandate.coverage.length > 0
                ? mandate.coverage.map((item) => `${item.person.name} (${item.coverageType})`).join(", ")
                : "Not assigned"}
            </p>
          </div>
        )) : (
          <p className="text-xs text-[var(--text-tertiary)]">Position mandate: Not configured · Current coverage: Not assigned</p>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[var(--text-tertiary)]">
        Position and person details provide current context only. They do not establish Process ownership.
      </p>
    </div>
  );
}

function OwnerForm({ context, today }: { context: ProcessAuthoringContext; today: string }) {
  const [state, action, pending] = useActionState(
    changeProcessOwnerAction,
    initialProcessAuthoringActionState,
  );
  const [selectedRoleId, setSelectedRoleId] = useState(context.process.ownerRoleId ?? "");
  const selectedRole = useMemo(
    () => context.roles.find((role) => role.id === selectedRoleId),
    [context.roles, selectedRoleId],
  );
  return (
    <form action={action} className="space-y-5">
      <HiddenIdentity context={context} />
      <label className="block">
        <FieldLabel>Owner Operational Role</FieldLabel>
        <Select name="ownerRoleKey" onChange={(event) => setSelectedRoleId(event.target.value)} value={selectedRoleId}>
          <option value="">Not assigned</option>
          {context.roles.map((role) => (
            <option disabled={role.status !== "active"} key={role.id} value={role.id}>
              {role.name}{role.status !== "active" ? " — inactive" : ""}
            </option>
          ))}
        </Select>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          Ownership is assigned only to an existing active Operational Role in this Organization. It is never inferred from a Person, Position title, or reporting line.
        </span>
      </label>
      <RoleContext role={selectedRole} />
      {selectedRoleId ? (
        <label className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
          <input className="mt-1 size-4 accent-[var(--workspace-accent)]" name="ownerConfirmed" required type="checkbox" value="yes" />
          <span>Confirm this Operational Role as the intended Process owner. This is an explicit responsibility decision.</span>
        </label>
      ) : (
        <p className="text-xs leading-5 text-[var(--text-tertiary)]">
          Ownership may be cleared only while this Process is a Draft.
        </p>
      )}
      <ChangeFields today={today} />
      <label className="block">
        <FieldLabel>Reason</FieldLabel>
        <textarea
          className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          name="reason"
          placeholder="Why should ownership change?"
          required
        />
      </label>
      {state.status !== "idle" ? (
        <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={pending || selectedRoleId === (context.process.ownerRoleId ?? "")} type="submit" variant="primary">
          {pending ? "Saving…" : "Save ownership"}
        </Button>
      </div>
    </form>
  );
}

export function ProcessAuthoringWorkspace({
  context,
  surface = "explorer",
  today,
}: {
  context: ProcessAuthoringContext;
  surface?: "explorer" | "studio";
  today: string;
}) {
  const processHref = `/explorer/${encodeURIComponent(context.process.id)}`;

  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        {surface === "studio" ? (
          <>
            <Link className="hover:text-[var(--workspace-accent)]" href="/studio">Workspace Studio</Link>
            <span aria-hidden="true">/</span>
            <Link className="hover:text-[var(--workspace-accent)]" href="/studio/processes">Processes</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--text-secondary)]">{context.process.name}</span>
          </>
        ) : (
          <>
            <Link className="hover:text-[var(--workspace-accent)]" href="/explorer">Explorer</Link>
            <span aria-hidden="true">/</span>
            <Link className="hover:text-[var(--workspace-accent)]" href={processHref}>{context.process.name}</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--text-secondary)]">Maintain Process</span>
          </>
        )}
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge dot tone={context.process.status === "draft" ? "warning" : context.process.status === "active" ? "success" : "neutral"}>{context.process.status}</Badge>
          <Badge tone="accent">Workspace Administrator</Badge>
        </div>
        <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">Maintain Process</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Maintain the current canonical Process definition and ownership without treating its existence as institutional approval.
        </p>
        {context.process.status === "draft" ? (
          <Alert className="mt-5" tone="warning">Working draft. This Process may remain incomplete, unresolved, or in need of validation.</Alert>
        ) : null}
      </header>

      <div className="grid gap-5 py-7 lg:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Definition</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Name and purpose</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Status is shown for context and is not changed in this authoring slice.</p>
          </div>
          <DefinitionForm context={context} today={today} />
        </Card>
        <Card className="p-4 sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Ownership & responsibility</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Owner Role</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Responsibilities remain. People change.</p>
          </div>
          <OwnerForm context={context} today={today} />
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">How the work happens</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Current read-only context</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Steps, responsible Roles, Systems, Exceptions, and Process dependencies remain visible on Process Detail. Their authoring controls are intentionally deferred to later slices.</p>
        <Link className="mt-4 inline-flex text-sm font-medium text-[var(--workspace-accent)] hover:underline" href={processHref}>View complete Process Detail</Link>
      </Card>

      <Card className="mt-5 p-4 sm:p-6">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">Governance</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Configured context</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-[var(--text-tertiary)]">Administration</dt><dd className="mt-1 font-medium text-[var(--text)]">Workspace Administrator</dd></div>
          <div><dt className="text-xs text-[var(--text-tertiary)]">Stewardship</dt><dd className="mt-1 font-medium text-[var(--text)]">Not assigned</dd></div>
          <div><dt className="text-xs text-[var(--text-tertiary)]">Contribution and approval</dt><dd className="mt-1 font-medium text-[var(--text)]">Not configured</dd></div>
          <div><dt className="text-xs text-[var(--text-tertiary)]">Detailed evidence state</dt><dd className="mt-1 font-medium text-[var(--text)]">Needs validation</dd></div>
        </dl>
      </Card>

      <section className="py-7">
        <div className="mb-4">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Append-only record</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Process change history</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">This audit history explains canonical changes. It is not approved Process version history.</p>
        </div>
        {context.history.length > 0 ? (
          <div className="space-y-3">
            {context.history.map((change) => (
              <Card className="p-4" key={change.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{actionLabels[change.action]}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">Recorded {utcDate(change.createdAt)} UTC · Effective {utcDate(change.effectiveAt)} UTC</p>
                  </div>
                  <Badge>{change.changeKind === "correction" ? "Correction" : "Organizational change"}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{change.reason}</p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Administrator: {change.actorIdentifier}</p>
                <details className="mt-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--text)]">Review before and after</summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div><p className="mb-2 text-[11px] font-medium text-[var(--text-tertiary)]">Before</p><HistoryState state={change.beforeState} /></div>
                    <div><p className="mb-2 text-[11px] font-medium text-[var(--text-tertiary)]">After</p><HistoryState state={change.afterState} /></div>
                  </div>
                </details>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>No Slice A change history exists for this Process yet. Earlier canonical records were not given synthetic history.</Alert>
        )}
      </section>
    </div>
  );
}
