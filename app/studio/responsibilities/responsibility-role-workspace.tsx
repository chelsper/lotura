"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  endRoleCoverageAction,
  endRoleMandateAction,
  establishRoleCoverageAction,
  establishRoleMandateAction,
} from "@/app/organization/actions";
import {
  initialStructureActionState,
  type StructureActionState,
} from "@/app/organization/action-state";
import { ArrowIcon } from "@/app/ui/icons";
import { Alert, Badge, Button, Card, FieldLabel, Input, RequiredMark, Select } from "@/app/ui/primitives";
import type { OrganizationStructureData } from "@/lib/organization-structure-data.mjs";
import type { ResponsibilityRole } from "@/lib/responsibility-builder";

import {
  inactivateOperationalRoleAction,
  updateOperationalRoleAction,
} from "./actions";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Result({ state }: { state: StructureActionState }) {
  return state.status === "idle" ? null : (
    <Alert className="sm:col-span-2" tone={state.status === "success" ? "success" : "error"}>
      {state.message}
    </Alert>
  );
}

function RequiredFieldsNote() {
  return <p className="text-xs text-[var(--text-secondary)] sm:col-span-2">* Required; other fields are optional.</p>;
}

function Metadata({ fixedKind = "organizational_change" }: { fixedKind?: "correction" | "organizational_change" }) {
  return (
    <>
      <input name="changeKind" type="hidden" value={fixedKind} />
      <label>
        <FieldLabel>Effective date<RequiredMark /></FieldLabel>
        <Input defaultValue={today()} name="effectiveDate" required type="date" />
      </label>
      <label className="sm:col-span-2">
        <FieldLabel>Reason for change<RequiredMark /></FieldLabel>
        <textarea
          className="min-h-24 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]"
          maxLength={2000}
          name="reason"
          required
        />
      </label>
    </>
  );
}

function EditRoleForm({ role }: { role: ResponsibilityRole }) {
  const [state, action, pending] = useActionState(updateOperationalRoleAction, initialStructureActionState);
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <RequiredFieldsNote />
      <input name="stableKey" type="hidden" value={role.stableKey ?? ""} />
      <input name="expectedRevision" type="hidden" value={role.revision ?? ""} />
      <label className="sm:col-span-2"><FieldLabel>Responsibility name<RequiredMark /></FieldLabel><Input defaultValue={role.name} maxLength={255} name="name" required /></label>
      <label className="sm:col-span-2">
        <FieldLabel>Responsibility description (optional)</FieldLabel>
        <textarea className="min-h-24 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]" defaultValue={role.description ?? ""} maxLength={2000} name="description" />
      </label>
      <label>
        <FieldLabel>Type of change<RequiredMark /></FieldLabel>
        <Select defaultValue="correction" name="changeKind" required><option value="correction">Correction to the current record</option><option value="organizational_change">Organizational change</option></Select>
      </label>
      <label><FieldLabel>Effective date<RequiredMark /></FieldLabel><Input defaultValue={today()} name="effectiveDate" required type="date" /></label>
      <label className="sm:col-span-2"><FieldLabel>Reason for change<RequiredMark /></FieldLabel><textarea className="min-h-20 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none" maxLength={2000} name="reason" placeholder="A short note, such as “Clarified the responsibility name.”" required /><span className="mt-1 block text-xs text-[var(--text-tertiary)]">Saved in the change history so others understand the update.</span></label>
      <Result state={state} />
      <Button disabled={pending} type="submit" variant="primary">{pending ? "Saving…" : "Save responsibility changes"}</Button>
    </form>
  );
}

function InactivateRoleForm({ role }: { role: ResponsibilityRole }) {
  const [state, action, pending] = useActionState(inactivateOperationalRoleAction, initialStructureActionState);
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <RequiredFieldsNote />
      <input name="stableKey" type="hidden" value={role.stableKey ?? ""} />
      <input name="expectedRevision" type="hidden" value={role.revision ?? ""} />
      <Alert className="sm:col-span-2" tone="warning">Lotura blocks removal while current or scheduled job title links, person assignments, Process responsibility, Exception ownership, or System ownership still use this responsibility.</Alert>
      <Metadata />
      <label className="flex items-start gap-2 text-xs leading-5 text-[var(--text-secondary)] sm:col-span-2">
        <input className="mt-1" name="confirmInactivation" required type="checkbox" value="confirmed" />
        <span>Make this responsibility inactive without deleting its identity or history.<RequiredMark /></span>
      </label>
      <Result state={state} />
      <Button disabled={pending} type="submit" variant="destructive">{pending ? "Making inactive…" : "Make responsibility inactive"}</Button>
    </form>
  );
}

function AddMandateForm({ data, role }: { data: OrganizationStructureData; role: ResponsibilityRole }) {
  const [state, action, pending] = useActionState(establishRoleMandateAction, initialStructureActionState);
  const [positionId, setPositionId] = useState("");
  const [mandateType, setMandateType] = useState<"primary" | "shared">("primary");
  const positions = useMemo(() => {
    const currentPositionIds = new Set(
      role.mandates.map((item) => item.position.id),
    );
    return data.positions.filter(
      (position) =>
        position.status === "active" && !currentPositionIds.has(position.id),
    );
  }, [data.positions, role.mandates]);
  const selected = positions.find((position) => position.id === positionId);
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <RequiredFieldsNote />
      <input name="roleKey" type="hidden" value={role.id} />
      <input name="positionStableKey" type="hidden" value={positionId} />
      <input name="expectedRevision" type="hidden" value={selected?.revision ?? ""} />
      <label className="sm:col-span-2"><FieldLabel>Job title<RequiredMark /></FieldLabel><Select onChange={(event) => setPositionId(event.target.value)} required value={positionId}><option value="">Choose a job title</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.title} — {position.unit?.name ?? "No Unit recorded"}</option>)}</Select></label>
      <label><FieldLabel>This job title’s part<RequiredMark /></FieldLabel><Select name="mandateType" onChange={(event) => setMandateType(event.target.value as typeof mandateType)} required value={mandateType}><option value="primary">Primary accountability</option><option value="shared">Shared responsibility</option></Select></label>
      <label><FieldLabel>{mandateType === "shared" ? <>Which part does this job title handle?<RequiredMark /></> : "Scope (optional)"}</FieldLabel><Input maxLength={2000} name="scope" required={mandateType === "shared"} /></label>
      <Metadata />
      <Result state={state} />
      <Button disabled={pending || !selected} type="submit" variant="primary">{pending ? "Linking…" : "Link job title to responsibility"}</Button>
    </form>
  );
}

function AddCoverageForm({ data, item }: { data: OrganizationStructureData; item: ResponsibilityRole["mandates"][number] }) {
  const [state, action, pending] = useActionState(establishRoleCoverageAction, initialStructureActionState);
  const [coverageType, setCoverageType] = useState("permanent");
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <RequiredFieldsNote />
      <input name="positionStableKey" type="hidden" value={item.position.id} />
      <input name="mandateRecordKey" type="hidden" value={item.mandate.id} />
      <input name="expectedRevision" type="hidden" value={item.mandate.revision} />
      <label className="sm:col-span-2"><FieldLabel>Who does this work?<RequiredMark /></FieldLabel><Select name="personStableKey" required><option value="">Choose a person</option>{data.people.filter((person) => person.status === "active").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Select></label>
      <label><FieldLabel>How are they helping?<RequiredMark /></FieldLabel><Select name="coverageType" onChange={(event) => setCoverageType(event.target.value)} required value={coverageType}><option value="permanent">Normally handles this work</option><option value="interim">Filling in for now (interim)</option><option value="acting">Acting in this responsibility</option><option value="delegated">Handling delegated work</option><option value="backup">Provides backup</option></Select></label>
      <label><FieldLabel>{coverageType === "permanent" ? "Work details (optional)" : <>What are they covering, and why?<RequiredMark /></>}</FieldLabel><Input maxLength={2000} name="coverageReason" required={coverageType !== "permanent"} /></label>
      <Metadata />
      <Result state={state} />
      <Button disabled={pending} type="submit" variant="primary">{pending ? "Saving…" : "Add person to this responsibility"}</Button>
    </form>
  );
}

function EndCoverageForm({ item, coverage }: { item: ResponsibilityRole["mandates"][number]; coverage: ResponsibilityRole["mandates"][number]["mandate"]["coverage"][number] }) {
  const [state, action, pending] = useActionState(endRoleCoverageAction, initialStructureActionState);
  return <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2"><RequiredFieldsNote /><input name="positionStableKey" type="hidden" value={item.position.id} /><input name="mandateRecordKey" type="hidden" value={item.mandate.id} /><input name="coverageRecordKey" type="hidden" value={coverage.id} /><input name="expectedRevision" type="hidden" value={coverage.revision} /><Metadata /><Result state={state} /><Button disabled={pending} type="submit" variant="destructive">{pending ? "Ending…" : "End this person’s recorded link"}</Button></form>;
}

function EndMandateForm({ item }: { item: ResponsibilityRole["mandates"][number] }) {
  const [state, action, pending] = useActionState(endRoleMandateAction, initialStructureActionState);
  return <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2"><RequiredFieldsNote /><input name="positionStableKey" type="hidden" value={item.position.id} /><input name="mandateRecordKey" type="hidden" value={item.mandate.id} /><input name="expectedRevision" type="hidden" value={item.mandate.revision} />{item.mandate.coverage.length ? <Alert className="sm:col-span-2" tone="warning">End each current person-to-work link first. Lotura will not end them automatically.</Alert> : null}<Metadata /><Result state={state} /><Button disabled={pending || item.mandate.coverage.length > 0} type="submit" variant="destructive">{pending ? "Ending…" : "End this job title’s link"}</Button></form>;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export function ResponsibilityRoleWorkspace({ data, role }: { data: OrganizationStructureData; role: ResponsibilityRole }) {
  return (
    <section className="py-7 sm:py-9">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="scroll-mt-6 p-4 sm:p-5" id="edit-role">
          <h2 className="text-sm font-semibold text-[var(--text)]">{role.status === "active" ? "Edit responsibility" : "Responsibility details"}</h2>
          {role.status === "active" ? (
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Rename this responsibility or update its description. Its connections stay in place, and the previous name stays in history.
            </p>
          ) : null}
          {role.status === "active" ? <EditRoleForm role={role} /> : <p className="mt-3 text-xs text-[var(--text-tertiary)]">Inactive responsibilities keep their identity and history. Making them active again is not available yet.</p>}
        </Card>
        <Card className="p-4 sm:p-5"><details><summary className="cursor-pointer text-sm font-semibold text-[var(--error)]">Make responsibility inactive</summary>{role.status === "active" ? <InactivateRoleForm role={role} /> : <p className="mt-3 text-xs text-[var(--text-tertiary)]">This responsibility is already inactive.</p>}</details></Card>
      </div>

      <Card className="mt-4 scroll-mt-6 p-4 sm:p-5" id="coverage">
        <h2 className="text-sm font-semibold text-[var(--text)]">Job titles responsible</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">These job titles are linked to this responsibility. Record who does the work separately; holding a job title does not automatically assign the work to that person.</p>
        <div className="mt-4 space-y-3">
          {role.mandates.map((item) => (
            <div className="rounded-[10px] border border-[var(--border)] p-3" key={item.mandate.id}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--text)]">{item.position.title}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{item.position.unit?.name ?? "No Unit recorded"} · {item.mandate.type === "primary" ? "Primary accountability" : "Shared responsibility"}{item.mandate.scope ? ` · ${item.mandate.scope}` : ""}</p></div><Link className="inline-flex items-center gap-1 text-xs font-medium text-[var(--workspace-accent)]" href={`/studio/organization/positions/${encodeURIComponent(item.position.id)}`}>View job details <ArrowIcon className="size-3" /></Link></div>
              <div className="mt-3 flex flex-wrap gap-2">{item.mandate.coverage.length ? item.mandate.coverage.map((coverage) => <Link className="rounded-full hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]" href={`/studio/organization/people/${encodeURIComponent(coverage.person.id)}`} key={coverage.id}><Badge tone="success">{coverage.person.name} · {coverage.typeLabel}<ArrowIcon className="ml-1 size-3" /></Badge></Link>) : <Badge tone="warning">Person not yet recorded</Badge>}</div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3"><summary className="cursor-pointer text-xs font-semibold">Who does this work?</summary><AddCoverageForm data={data} item={item} /></details>
                <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3"><summary className="cursor-pointer text-xs font-semibold text-[var(--error)]">End this job title’s link</summary><EndMandateForm item={item} /></details>
              </div>
              {item.mandate.coverage.map((coverage) => <details className="mt-2 rounded-[10px] bg-[var(--surface-subtle)] p-3" key={coverage.id}><summary className="cursor-pointer text-xs font-medium">End {coverage.person.name}’s link · {coverage.typeLabel}</summary><EndCoverageForm coverage={coverage} item={item} /></details>)}
            </div>
          ))}
          {role.mandates.length === 0 ? <Alert tone="warning">No job title is currently linked. This responsibility remains visible; review which job title should hold it.</Alert> : null}
        </div>
        {role.status === "active" ? <details className="mt-4 rounded-[10px] bg-[var(--surface-subtle)] p-3" open={role.mandates.length === 0}><summary className="cursor-pointer text-xs font-semibold">Link another job title</summary><AddMandateForm data={data} role={role} /></details> : null}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5"><h2 className="text-sm font-semibold text-[var(--text)]">Connected Processes</h2>{role.processes.length ? <ul className="mt-3 space-y-2">{role.processes.map((process) => <li key={process.id}><Link className="text-xs font-medium text-[var(--workspace-accent)] hover:underline" href={`/explorer/${encodeURIComponent(process.id)}`}>{process.name}</Link><p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{process.relationships.join(" · ")}</p></li>)}</ul> : <p className="mt-3 text-xs text-[var(--text-tertiary)]">No connected Process responsibility is documented.</p>}</Card>
        <Card className="p-4 sm:p-5"><h2 className="text-sm font-semibold text-[var(--text)]">Systems in connected work</h2><p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">Context only. A connection to this work does not mean this responsibility owns or affects every System shown.</p>{role.systems.length ? <ul className="mt-3 space-y-2">{role.systems.map((system) => <li className="text-xs text-[var(--text-secondary)]" key={system.id}>{system.name} · {system.usage}</li>)}</ul> : <p className="mt-3 text-xs text-[var(--text-tertiary)]">No connected Systems are documented.</p>}</Card>
      </div>

      <Card className="mt-4 p-4 sm:p-5"><h2 className="text-sm font-semibold text-[var(--text)]">Responsibility activity</h2><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Changes to this responsibility and its job title and person links are added without overwriting earlier entries. These records explain accepted changes; they do not establish approved organizational history on their own.</p>{role.activity.length ? <ol className="mt-4 divide-y divide-[var(--border)]">{role.activity.map((change) => <li className="py-3 first:pt-0 last:pb-0" key={change.id}><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-medium text-[var(--text)]">{change.action.replaceAll("_", " ")}</p><span className="text-[11px] text-[var(--text-tertiary)]">{formatTimestamp(change.createdAt)} UTC</span></div><p className="mt-1 text-xs text-[var(--text-secondary)]">{change.reason}</p><p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{change.changeKind === "correction" ? "Correction" : "Organizational change"} · {change.actorIdentifier}</p></li>)}</ol> : <p className="mt-3 text-xs text-[var(--text-tertiary)]">No changes have been recorded for this responsibility.</p>}</Card>
    </section>
  );
}
