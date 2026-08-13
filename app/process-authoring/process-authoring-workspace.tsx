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
  changeProcessStepResponsibilityAction,
  changeProcessOwnerAction,
  createExceptionAction,
  createProcessStepAction,
  deactivateExceptionAction,
  linkProcessSystemAction,
  reorderProcessStepAction,
  unlinkProcessSystemAction,
  updateExceptionAction,
  updateProcessDefinitionAction,
  updateProcessSystemUsageAction,
  updateProcessStepAction,
} from "./actions";
import { initialProcessAuthoringActionState } from "./action-state";

const actionLabels: Record<OperatingModelChangeSummary["action"], string> = {
  create_draft: "Draft created",
  update_definition: "Definition updated",
  change_owner: "Owner Role changed",
  create_step: "Step added",
  update_step: "Step wording updated",
  reorder_steps: "Step order updated",
  change_step_responsibility: "Step responsibility changed",
  create_system: "System added",
  update_system: "System updated",
  deactivate_system: "System deactivated",
  link_system: "System linked",
  update_system_usage: "System usage updated",
  unlink_system: "System unlinked",
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

function HiddenStepIdentity({
  context,
  step,
}: {
  context: ProcessAuthoringContext;
  step: ProcessAuthoringContext["steps"][number];
}) {
  return (
    <>
      <HiddenIdentity context={context} />
      <input name="stepStableKey" type="hidden" value={step.stableKey} />
      <input name="expectedStepRevision" type="hidden" value={step.revision} />
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

function RoleOptions({ context }: { context: ProcessAuthoringContext }) {
  return context.roles.map((role) => (
    <option disabled={role.status !== "active"} key={role.id} value={role.id}>
      {role.name}{role.status !== "active" ? " — inactive" : ""}
    </option>
  ));
}

function StepResponsibilitySummary({
  context,
  responsibleRoleId,
}: {
  context: ProcessAuthoringContext;
  responsibleRoleId: string | null;
}) {
  const explicitRole = context.roles.find((role) => role.id === responsibleRoleId);
  const ownerRole = context.roles.find((role) => role.id === context.process.ownerRoleId);
  if (explicitRole) {
    return (
      <p className="text-xs text-[var(--text-secondary)]">
        Responsible Role: <span className="font-medium text-[var(--text)]">{explicitRole.name}</span> · Explicit responsibility
      </p>
    );
  }
  if (ownerRole) {
    return (
      <p className="text-xs text-[var(--text-secondary)]">
        Responsible Role: <span className="font-medium text-[var(--text)]">{ownerRole.name}</span> · Inherited from Process Owner
      </p>
    );
  }
  return (
    <p className="text-xs font-medium text-[var(--warning)]">
      Unclear responsibility — no explicit Responsible Role or Process Owner is documented.
    </p>
  );
}

function AddStepForm({ context, today }: { context: ProcessAuthoringContext; today: string }) {
  const [state, action, pending] = useActionState(
    createProcessStepAction,
    initialProcessAuthoringActionState,
  );
  return (
    <form action={action} className="space-y-5">
      <HiddenIdentity context={context} />
      <label className="block">
        <FieldLabel>Step title</FieldLabel>
        <Input maxLength={255} name="title" placeholder="Describe one clear unit of work" required />
      </label>
      <label className="block">
        <FieldLabel>Instructions</FieldLabel>
        <textarea
          className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={5000}
          name="instructions"
          placeholder="What happens in this Step?"
        />
      </label>
      <label className="block">
        <FieldLabel>Responsible Operational Role</FieldLabel>
        <Select defaultValue="" name="responsibleRoleKey">
          <option value="">Inherit from Process Owner</option>
          <RoleOptions context={context} />
        </Select>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          {context.process.ownerRoleId
            ? "A blank selection inherits responsibility from the Process Owner. It does not mean nobody is responsible."
            : "A blank selection remains unclear until a Process Owner is documented."}
        </span>
      </label>
      <ChangeFields today={today} />
      <label className="block">
        <FieldLabel>Reason</FieldLabel>
        <textarea
          className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          name="reason"
          placeholder="Why is this Step being added?"
          required
        />
      </label>
      {state.status !== "idle" ? (
        <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Adding…" : "Add Step"}
        </Button>
      </div>
    </form>
  );
}

function StepDefinitionForm({
  context,
  step,
  today,
}: {
  context: ProcessAuthoringContext;
  step: ProcessAuthoringContext["steps"][number];
  today: string;
}) {
  const [state, action, pending] = useActionState(
    updateProcessStepAction,
    initialProcessAuthoringActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <HiddenStepIdentity context={context} step={step} />
      <label className="block">
        <FieldLabel>Step title</FieldLabel>
        <Input defaultValue={step.title} maxLength={255} name="title" required />
      </label>
      <label className="block">
        <FieldLabel>Instructions</FieldLabel>
        <textarea
          className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          defaultValue={step.instructions}
          maxLength={5000}
          name="instructions"
        />
      </label>
      <ChangeFields today={today} />
      <label className="block">
        <FieldLabel>Reason</FieldLabel>
        <Input maxLength={2000} name="reason" placeholder="Why is this wording changing?" required />
      </label>
      {state.status !== "idle" ? <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert> : null}
      <div className="flex justify-end">
        <Button disabled={pending} size="sm" type="submit" variant="primary">{pending ? "Saving…" : "Save wording"}</Button>
      </div>
    </form>
  );
}

function StepResponsibilityForm({
  context,
  step,
  today,
}: {
  context: ProcessAuthoringContext;
  step: ProcessAuthoringContext["steps"][number];
  today: string;
}) {
  const [state, action, pending] = useActionState(
    changeProcessStepResponsibilityAction,
    initialProcessAuthoringActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <HiddenStepIdentity context={context} step={step} />
      <label className="block">
        <FieldLabel>Responsible Operational Role</FieldLabel>
        <Select defaultValue={step.responsibleRoleId ?? ""} name="responsibleRoleKey">
          <option value="">Inherit from Process Owner</option>
          <RoleOptions context={context} />
        </Select>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          Responsibility is assigned only to an Operational Role. Person, Position, coverage, and reporting context are not inferred.
        </span>
      </label>
      <ChangeFields today={today} />
      <label className="block">
        <FieldLabel>Reason</FieldLabel>
        <Input maxLength={2000} name="reason" placeholder="Why is responsibility changing?" required />
      </label>
      {state.status !== "idle" ? <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert> : null}
      <div className="flex justify-end">
        <Button disabled={pending} size="sm" type="submit" variant="primary">{pending ? "Saving…" : "Save responsibility"}</Button>
      </div>
    </form>
  );
}

function StepReorderForm({
  context,
  index,
  step,
  today,
}: {
  context: ProcessAuthoringContext;
  index: number;
  step: ProcessAuthoringContext["steps"][number];
  today: string;
}) {
  const [state, action, pending] = useActionState(
    reorderProcessStepAction,
    initialProcessAuthoringActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <HiddenStepIdentity context={context} step={step} />
      <ChangeFields today={today} />
      <label className="block">
        <FieldLabel>Reason</FieldLabel>
        <Input maxLength={2000} name="reason" placeholder="Why should this Step move?" required />
      </label>
      {state.status !== "idle" ? <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={pending || index === 0} name="direction" size="sm" type="submit" value="earlier">Move earlier</Button>
        <Button disabled={pending || index === context.steps.length - 1} name="direction" size="sm" type="submit" value="later">Move later</Button>
      </div>
    </form>
  );
}

function StepsWorkspace({ context, today }: { context: ProcessAuthoringContext; today: string }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)]">How the work happens</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Ordered Steps</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Maintain the documented sequence and assign responsibility only where it has been validated.
          </p>
        </div>
        <Badge>{context.steps.length} documented {context.steps.length === 1 ? "Step" : "Steps"}</Badge>
      </div>

      <Card className="p-4 sm:p-6">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-[var(--workspace-accent)]">Add a Step</summary>
          <div className="mt-5 border-t border-[var(--border)] pt-5"><AddStepForm context={context} today={today} /></div>
        </details>
      </Card>

      {context.steps.length > 0 ? (
        <div className="space-y-3">
          {context.steps.map((step, index) => (
            <Card className="p-4 sm:p-5" key={step.stableKey}>
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--workspace-accent)]">{step.position}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[var(--text)]">{step.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">{step.instructions || "No instructions documented."}</p>
                  <div className="mt-3"><StepResponsibilitySummary context={context} responsibleRoleId={step.responsibleRoleId} /></div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 lg:grid-cols-3">
                <details className="rounded-[10px] border border-[var(--border)] p-3">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--text)]">Edit wording</summary>
                  <div className="mt-4"><StepDefinitionForm context={context} step={step} today={today} /></div>
                </details>
                <details className="rounded-[10px] border border-[var(--border)] p-3">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--text)]">Set responsibility</summary>
                  <div className="mt-4"><StepResponsibilityForm context={context} step={step} today={today} /></div>
                </details>
                <details className="rounded-[10px] border border-[var(--border)] p-3">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--text)]">Change order</summary>
                  <div className="mt-4"><StepReorderForm context={context} index={index} step={step} today={today} /></div>
                </details>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Alert tone="warning">No Steps are documented yet. Add the first Step without implying that the Process is complete or approved.</Alert>
      )}
      <Alert>
        Step removal is not available in this slice. Existing Steps and any scoped Exceptions remain preserved until a governed retirement lifecycle is approved.
      </Alert>
    </section>
  );
}

function LinkSystemForm({ context, today }: { context: ProcessAuthoringContext; today: string }) {
  const [state, action, pending] = useActionState(
    linkProcessSystemAction,
    initialProcessAuthoringActionState,
  );
  const linkedKeys = new Set(context.systemLinks.map((item) => item.stableKey));
  const availableSystems = context.systems.filter(
    (item) => item.status === "active" && !linkedKeys.has(item.stableKey),
  );

  return (
    <form action={action} className="space-y-4">
      <HiddenIdentity context={context} />
      <label className="block">
        <FieldLabel>Existing System</FieldLabel>
        <Select defaultValue="" disabled={availableSystems.length === 0} name="systemStableKey" required>
          <option disabled value="">Select a System</option>
          {availableSystems.map((item) => (
            <option key={item.stableKey} value={item.stableKey}>{item.name}</option>
          ))}
        </Select>
      </label>
      <label className="block">
        <FieldLabel>How this Process uses the System</FieldLabel>
        <textarea
          className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={5000}
          name="usage"
          placeholder="Describe the documented use without implying criticality."
          required
        />
      </label>
      <ChangeFields today={today} />
      <label className="block">
        <FieldLabel>Reason</FieldLabel>
        <Input maxLength={2000} name="reason" placeholder="Why should this relationship be recorded?" required />
      </label>
      {availableSystems.length === 0 ? (
        <Alert>Every active System is already linked. Add another canonical System from Technology if needed.</Alert>
      ) : null}
      {state.status !== "idle" ? <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert> : null}
      <div className="flex justify-end">
        <Button disabled={pending || availableSystems.length === 0} type="submit" variant="primary">
          {pending ? "Linking…" : "Link System"}
        </Button>
      </div>
    </form>
  );
}

function SystemRelationshipEditor({
  context,
  relationship,
  today,
}: {
  context: ProcessAuthoringContext;
  relationship: ProcessAuthoringContext["systemLinks"][number];
  today: string;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateProcessSystemUsageAction,
    initialProcessAuthoringActionState,
  );
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(
    unlinkProcessSystemAction,
    initialProcessAuthoringActionState,
  );

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text)]">{relationship.name}</h3>
            <Badge tone={relationship.status === "active" ? "success" : "neutral"}>{relationship.status}</Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{relationship.systemType.replaceAll("_", " ")}</p>
        </div>
        <Link className="text-xs font-medium text-[var(--workspace-accent)] hover:underline" href={`/studio/technology/systems/${relationship.stableKey}`}>View System</Link>
      </div>
      <form action={updateAction} className="mt-4 space-y-4">
        <HiddenIdentity context={context} />
        <input name="systemStableKey" type="hidden" value={relationship.stableKey} />
        <label className="block">
          <FieldLabel>Documented use</FieldLabel>
          <textarea
            className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
            defaultValue={relationship.usage}
            maxLength={5000}
            name="usage"
            required
          />
        </label>
        <ChangeFields today={today} />
        <label className="block"><FieldLabel>Reason</FieldLabel><Input maxLength={2000} name="reason" placeholder="Why is the documented use changing?" required /></label>
        {updateState.status !== "idle" ? <Alert tone={updateState.status === "success" ? "success" : "error"}>{updateState.message}</Alert> : null}
        <div className="flex justify-end"><Button disabled={updatePending} size="sm" type="submit" variant="primary">{updatePending ? "Saving…" : "Save usage"}</Button></div>
      </form>
      <details className="mt-4 border-t border-[var(--border)] pt-4">
        <summary className="cursor-pointer text-xs font-medium text-[var(--error)]">Unlink from current Process</summary>
        <form action={unlinkAction} className="mt-4 space-y-4">
          <HiddenIdentity context={context} />
          <input name="systemStableKey" type="hidden" value={relationship.stableKey} />
          <input name="changeKind" type="hidden" value="organizational_change" />
          <label className="block"><FieldLabel>Effective date</FieldLabel><Input defaultValue={today} max={today} name="effectiveDate" required type="date" /></label>
          <label className="block"><FieldLabel>Reason</FieldLabel><Input maxLength={2000} name="reason" placeholder="Why is this relationship no longer current?" required /></label>
          <p className="text-xs leading-5 text-[var(--text-tertiary)]">This removes only the current Process-System relationship. The System and append-only history remain.</p>
          {unlinkState.status !== "idle" ? <Alert tone={unlinkState.status === "success" ? "success" : "error"}>{unlinkState.message}</Alert> : null}
          <Button disabled={unlinkPending} size="sm" type="submit" variant="destructive">{unlinkPending ? "Unlinking…" : "Unlink System"}</Button>
        </form>
      </details>
    </Card>
  );
}

function SystemsWorkspace({ context, today }: { context: ProcessAuthoringContext; today: string }) {
  return (
    <section className="mt-7 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Technology</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Systems used</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">Link canonical Systems and state how the work uses them. A link documents reach; it does not establish criticality, performance, or risk.</p>
        </div>
        <Link className="text-sm font-medium text-[var(--workspace-accent)] hover:underline" href="/studio/technology">Open Technology</Link>
      </div>
      <Card className="p-4 sm:p-6"><details><summary className="cursor-pointer text-sm font-semibold text-[var(--workspace-accent)]">Link an existing System</summary><div className="mt-5 border-t border-[var(--border)] pt-5"><LinkSystemForm context={context} today={today} /></div></details></Card>
      {context.systemLinks.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">{context.systemLinks.map((item) => <SystemRelationshipEditor context={context} key={item.stableKey} relationship={item} today={today} />)}</div>
      ) : <Alert>No Systems are linked to this Process. This may be accurate or may need validation.</Alert>}
    </section>
  );
}

function ExceptionFields({ context, current }: { context: ProcessAuthoringContext; current?: ProcessAuthoringContext["exceptions"][number] }) {
  return (
    <>
      <label className="block"><FieldLabel>Exception name</FieldLabel><Input defaultValue={current?.name ?? ""} maxLength={255} name="name" placeholder="Name the legitimate alternate path" required /></label>
      <label className="block"><FieldLabel>When it applies</FieldLabel><textarea className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]" defaultValue={current?.condition ?? ""} maxLength={5000} name="condition" required /></label>
      <label className="block"><FieldLabel>Alternate response</FieldLabel><textarea className="min-h-20 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-6 text-[var(--text)] outline-none transition focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--focus-soft)]" defaultValue={current?.response ?? ""} maxLength={5000} name="response" required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><FieldLabel>Scope</FieldLabel><Select defaultValue={current?.processStepStableKey ?? ""} name="stepStableKey"><option value="">Process-wide</option>{context.steps.map((step) => <option key={step.stableKey} value={step.stableKey}>Step {step.position}: {step.title}</option>)}</Select></label>
        <label className="block"><FieldLabel>Owner Operational Role</FieldLabel><Select defaultValue={current?.ownerRoleId ?? ""} name="ownerRoleKey"><option value="">Not assigned</option><RoleOptions context={context} /></Select></label>
      </div>
    </>
  );
}

function AddExceptionForm({ context, today }: { context: ProcessAuthoringContext; today: string }) {
  const [state, action, pending] = useActionState(createExceptionAction, initialProcessAuthoringActionState);
  return (
    <form action={action} className="space-y-4">
      <HiddenIdentity context={context} />
      <ExceptionFields context={context} />
      <ChangeFields today={today} />
      <label className="block"><FieldLabel>Reason</FieldLabel><Input maxLength={2000} name="reason" placeholder="Why should this alternate path be documented?" required /></label>
      {state.status !== "idle" ? <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert> : null}
      <div className="flex justify-end"><Button disabled={pending} type="submit" variant="primary">{pending ? "Adding…" : "Add Exception"}</Button></div>
    </form>
  );
}

function ExceptionEditor({ context, exception, today }: { context: ProcessAuthoringContext; exception: ProcessAuthoringContext["exceptions"][number]; today: string }) {
  const [updateState, updateAction, updatePending] = useActionState(updateExceptionAction, initialProcessAuthoringActionState);
  const [deactivateState, deactivateAction, deactivatePending] = useActionState(deactivateExceptionAction, initialProcessAuthoringActionState);
  const scopedStep = context.steps.find((step) => step.stableKey === exception.processStepStableKey);
  const ownerRole = context.roles.find((role) => role.id === exception.ownerRoleId);
  return (
    <Card className={`p-4 sm:p-5 ${exception.status !== "active" ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[var(--text)]">{exception.name}</h3><Badge tone={exception.status === "active" ? "warning" : "neutral"}>{exception.status}</Badge></div><p className="mt-1 text-xs text-[var(--text-tertiary)]">{scopedStep ? `Step ${scopedStep.position}: ${scopedStep.title}` : "Process-wide"} · Owner Role: {ownerRole?.name ?? "Not assigned"}</p></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]"><span className="font-medium text-[var(--text)]">When:</span> {exception.condition}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]"><span className="font-medium text-[var(--text)]">Alternate response:</span> {exception.response}</p>
      {exception.status === "active" ? (
        <>
          <details className="mt-4 border-t border-[var(--border)] pt-4"><summary className="cursor-pointer text-xs font-medium text-[var(--workspace-accent)]">Edit Exception</summary><form action={updateAction} className="mt-4 space-y-4"><HiddenIdentity context={context} /><input name="exceptionStableKey" type="hidden" value={exception.stableKey} /><input name="expectedExceptionRevision" type="hidden" value={exception.revision} /><ExceptionFields context={context} current={exception} /><ChangeFields today={today} /><label className="block"><FieldLabel>Reason</FieldLabel><Input maxLength={2000} name="reason" placeholder="Why is this alternate path changing?" required /></label>{updateState.status !== "idle" ? <Alert tone={updateState.status === "success" ? "success" : "error"}>{updateState.message}</Alert> : null}<div className="flex justify-end"><Button disabled={updatePending} size="sm" type="submit" variant="primary">{updatePending ? "Saving…" : "Save Exception"}</Button></div></form></details>
          <details className="mt-4 border-t border-[var(--border)] pt-4"><summary className="cursor-pointer text-xs font-medium text-[var(--error)]">Remove from current draft</summary><form action={deactivateAction} className="mt-4 space-y-4"><HiddenIdentity context={context} /><input name="exceptionStableKey" type="hidden" value={exception.stableKey} /><input name="expectedExceptionRevision" type="hidden" value={exception.revision} /><input name="changeKind" type="hidden" value="organizational_change" /><label className="block"><FieldLabel>Effective date</FieldLabel><Input defaultValue={today} max={today} name="effectiveDate" required type="date" /></label><label className="block"><FieldLabel>Reason</FieldLabel><Input maxLength={2000} name="reason" placeholder="Why is this alternate path no longer current?" required /></label><p className="text-xs leading-5 text-[var(--text-tertiary)]">This deactivates the Exception without erasing its identity or history.</p>{deactivateState.status !== "idle" ? <Alert tone={deactivateState.status === "success" ? "success" : "error"}>{deactivateState.message}</Alert> : null}<Button disabled={deactivatePending} size="sm" type="submit" variant="destructive">{deactivatePending ? "Removing…" : "Remove from current draft"}</Button></form></details>
        </>
      ) : <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-tertiary)]">This Exception is preserved in history and is not part of the current draft.</p>}
    </Card>
  );
}

function ExceptionsWorkspace({ context, today }: { context: ProcessAuthoringContext; today: string }) {
  return (
    <section className="mt-7 space-y-5">
      <div><p className="text-xs font-medium text-[var(--text-tertiary)]">Alternate paths</p><h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Exceptions</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">Document legitimate alternate paths, not every error or unresolved problem. Uncertain observations should remain identified as needing validation.</p></div>
      <Card className="p-4 sm:p-6"><details><summary className="cursor-pointer text-sm font-semibold text-[var(--workspace-accent)]">Add an Exception</summary><div className="mt-5 border-t border-[var(--border)] pt-5"><AddExceptionForm context={context} today={today} /></div></details></Card>
      {context.exceptions.length > 0 ? <div className="grid gap-4 lg:grid-cols-2">{context.exceptions.map((item) => <ExceptionEditor context={context} exception={item} key={item.stableKey} today={today} />)}</div> : <Alert>No Exceptions are documented. That may be accurate or may need validation.</Alert>}
    </section>
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
          Maintain the current documented Process without treating it as formally approved.
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

      <StepsWorkspace context={context} today={today} />
      <SystemsWorkspace context={context} today={today} />
      <ExceptionsWorkspace context={context} today={today} />

      <Alert className="mt-7">Process dependencies remain read-only in this slice. They are never inferred from shared Systems, Units, Roles, or reporting relationships.</Alert>

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
          <Alert>No authoring change history exists for this Process yet. Earlier canonical records were not given synthetic history.</Alert>
        )}
      </section>
    </div>
  );
}
