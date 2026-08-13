"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { TechnologySystemContext } from "@/lib/technology-authoring-data";

import { Alert, Badge, Button, Card, FieldLabel, Input, Select } from "../../ui/primitives";
import { deactivateSystemAction, updateSystemAction } from "./actions";
import { initialTechnologyActionState } from "./action-state";

const actionLabels: Record<TechnologySystemContext["history"][number]["action"], string> = {
  create_draft: "Draft created",
  update_definition: "Process definition updated",
  change_owner: "Process owner changed",
  create_step: "Step added",
  update_step: "Step updated",
  reorder_steps: "Step order changed",
  change_step_responsibility: "Step responsibility changed",
  create_system: "System added",
  update_system: "System updated",
  deactivate_system: "System deactivated",
  link_system: "Process linked",
  update_system_usage: "Process usage updated",
  unlink_system: "Process unlinked",
  create_exception: "Exception added",
  update_exception: "Exception updated",
  deactivate_exception: "Exception deactivated",
};

function utcDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
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

function HiddenSystemIdentity({ context }: { context: TechnologySystemContext }) {
  return (
    <>
      <input name="systemStableKey" type="hidden" value={context.stableKey} />
      <input name="expectedSystemRevision" type="hidden" value={context.revision} />
    </>
  );
}

export function SystemWorkspace({
  context,
  today,
}: {
  context: TechnologySystemContext;
  today: string;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateSystemAction,
    initialTechnologyActionState,
  );
  const [deactivateState, deactivateAction, deactivatePending] = useActionState(
    deactivateSystemAction,
    initialTechnologyActionState,
  );

  return (
    <div className="mx-auto max-w-5xl">
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--text)]" href="/studio">Workspace Studio</Link>
        <span className="mx-2">/</span>
        <Link className="hover:text-[var(--text)]" href="/studio/technology">Technology</Link>
        <span className="mx-2">/</span>
        <span>{context.name}</span>
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={context.status === "active" ? "success" : "neutral"}>
            {context.status === "active" ? "Active" : "Inactive"}
          </Badge>
          <Badge>Technology · System</Badge>
        </div>
        <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.045em] text-[var(--text)]">{context.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Maintain this System and review the Processes that explicitly document its use. A connection does not prove criticality or risk.
        </p>
      </header>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Definition</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">System details</h2>
            <form action={updateAction} className="mt-5 space-y-5">
              <HiddenSystemIdentity context={context} />
              <label className="block">
                <FieldLabel>System name</FieldLabel>
                <Input defaultValue={context.name} maxLength={255} name="name" required />
              </label>
              <label className="block">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  className="min-h-28 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                  defaultValue={context.description ?? ""}
                  maxLength={5000}
                  name="description"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel>System type</FieldLabel>
                  <Select defaultValue={context.systemType} name="systemType">
                    <option value="software">Software</option>
                    <option value="external_service">External service</option>
                    <option value="manual_record">Manual record</option>
                    <option value="other">Other</option>
                  </Select>
                </label>
                <label className="block">
                  <FieldLabel>Owner Operational Role</FieldLabel>
                  <Select defaultValue={context.ownerRoleId ?? ""} name="ownerRoleKey">
                    <option value="">Not assigned</option>
                    {context.roles.map((role) => (
                      <option disabled={role.status !== "active"} key={role.id} value={role.id}>
                        {role.name}{role.status !== "active" ? " — inactive" : ""}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <label className="block">
                <FieldLabel>Reference URL</FieldLabel>
                <Input defaultValue={context.url ?? ""} name="url" placeholder="https://" type="url" />
                <span className="mt-1.5 block text-xs text-[var(--text-tertiary)]">Do not enter passwords or private connection URLs.</span>
              </label>
              <ChangeFields today={today} />
              <label className="block">
                <FieldLabel>Reason</FieldLabel>
                <textarea
                  className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
                  maxLength={2000}
                  name="reason"
                  placeholder="Why is this System definition changing?"
                  required
                />
              </label>
              {updateState.status !== "idle" ? (
                <Alert tone={updateState.status === "success" ? "success" : "error"}>{updateState.message}</Alert>
              ) : null}
              <div className="flex justify-end">
                <Button disabled={updatePending} type="submit" variant="primary">
                  {updatePending ? "Saving…" : "Save System"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Current relationships</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Processes using this System</h2>
            <div className="mt-4 space-y-3">
              {context.processes.length > 0 ? context.processes.map((process) => (
                <Link
                  className="block rounded-[10px] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
                  href={`/studio/processes/${encodeURIComponent(process.id)}`}
                  key={process.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text)]">{process.name}</p>
                    <Badge>{process.status === "draft" ? "Working draft" : process.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{process.usage}</p>
                </Link>
              )) : (
                <p className="text-sm text-[var(--text-tertiary)]">No documented Process currently uses this System.</p>
              )}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Lifecycle</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Remove from current Technology catalog</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Deactivation preserves the System and all prior history. Every current Process relationship must be removed first.
            </p>
            <form action={deactivateAction} className="mt-4 space-y-4">
              <HiddenSystemIdentity context={context} />
              <input name="changeKind" type="hidden" value="organizational_change" />
              <label className="block">
                <FieldLabel>Effective date</FieldLabel>
                <Input defaultValue={today} max={today} name="effectiveDate" required type="date" />
              </label>
              <label className="block">
                <FieldLabel>Reason</FieldLabel>
                <textarea
                  className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)]"
                  maxLength={2000}
                  name="reason"
                  placeholder="Why should this System leave the current catalog?"
                  required
                />
              </label>
              {context.processCount > 0 ? (
                <Alert tone="warning">Unlink {context.processCount} current Process {context.processCount === 1 ? "relationship" : "relationships"} before deactivation.</Alert>
              ) : null}
              {deactivateState.status !== "idle" ? (
                <Alert tone={deactivateState.status === "success" ? "success" : "error"}>{deactivateState.message}</Alert>
              ) : null}
              <Button
                disabled={deactivatePending || context.status !== "active" || context.processCount > 0}
                type="submit"
                variant="destructive"
              >
                {deactivatePending ? "Removing…" : "Deactivate System"}
              </Button>
            </form>
          </Card>
        </div>

        <Card className="h-fit p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Append-only activity</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">System history</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">This audit history is not an approved technology version history.</p>
          <div className="mt-4 space-y-4">
            {context.history.length > 0 ? context.history.map((item) => (
              <article className="border-l-2 border-[var(--border-strong)] pl-3" key={item.id}>
                <p className="text-xs font-medium text-[var(--text)]">{actionLabels[item.action]}</p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-tertiary)]">Recorded {utcDate(item.createdAt)} UTC</p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{item.reason}</p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Administrator: {item.actorIdentifier}</p>
              </article>
            )) : (
              <p className="text-xs text-[var(--text-tertiary)]">No System history is recorded yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
