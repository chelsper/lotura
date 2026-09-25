"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

import type {
  OrganizationPerson,
  OrganizationPosition,
  OrganizationStructureData,
} from "@/lib/organization-structure-data.mjs";
import {
  correctPositionReportingRelationshipAction,
  establishPositionAssignmentAction,
  establishPositionReportingRelationshipAction,
  replacePositionAssignmentAction,
  replacePositionReportingRelationshipAction,
  updateStructureEntityAction,
} from "../organization/actions";
import {
  initialStructureActionState,
  type StructureActionState,
} from "../organization/action-state";
import { ChangeMetadataFields } from "../organization/structure-administration-panel";
import { Alert, Button, Input, RequiredMark, Select } from "../ui/primitives";

export type UnitRosterEditMode = "title" | "person" | "manager";

type UnitRosterEditorProps = {
  data: OrganizationStructureData;
  position: OrganizationPosition;
  mode: UnitRosterEditMode;
  onSaved: (message: string) => void;
  onPendingChange: (pending: boolean) => void;
  onDirty: () => void;
};

function Field({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {label}{optional ? " (optional)" : <RequiredMark />}
      </span>
      {children}
    </label>
  );
}

function managerLabel(position: OrganizationPosition) {
  const people = position.assignments.map((assignment) => assignment.person.name);
  return `${position.title} — ${position.unit?.name ?? "No Unit recorded"}${people.length ? ` — ${people.join(", ")}` : ""}`;
}

function personLabel(person: OrganizationPerson) {
  const titles = person.assignments.map((assignment) => assignment.position.title);
  return `${person.name}${titles.length ? ` — ${titles.join(", ")}` : ""}`;
}

export function UnitRosterEditor({
  data,
  position,
  mode,
  onSaved,
  onPendingChange,
  onDirty,
}: UnitRosterEditorProps) {
  const [assignmentId, setAssignmentId] = useState(
    position.assignments.length === 1 ? position.assignments[0].id : "",
  );
  const [managerChange, setManagerChange] = useState<"correction" | "organizational_change">("correction");
  const [state, setState] = useState<StructureActionState>(initialStructureActionState);
  const [pending, setPending] = useState(false);
  const [saveUnconfirmed, setSaveUnconfirmed] = useState(false);
  const submitting = useRef(false);
  const selectionHasEdits = useRef(false);

  const assignment = position.assignments.find((item) => item.id === assignmentId);
  const hasAssignments = position.assignments.length > 0;
  const manager = position.primaryManager;
  const availablePeople = data.people.filter((person) =>
    person.status === "active" && !position.assignments.some((item) => item.person.id === person.id),
  );
  const managerPositions = data.positions.filter((candidate) =>
    candidate.status === "active" && candidate.id !== position.id &&
    (!manager || managerChange === "correction" || candidate.id !== manager.position.id),
  );
  const missingSelection = mode === "person" && hasAssignments && !assignment;
  const noChoices = (mode === "person" && availablePeople.length === 0) ||
    (mode === "manager" && managerPositions.length === 0);
  const missingRevision = !position.revision ||
    (mode === "person" && assignment && !assignment.revision) ||
    (mode === "manager" && manager && !manager.revision);
  const disabled = pending || saveUnconfirmed || state.status === "success" || position.status !== "active" || Boolean(missingRevision);

  function confirmSelectionChange() {
    if (selectionHasEdits.current && !window.confirm("Change this selection? Your person or manager choice and reporting note will reset. Your reason and date will stay here.")) return false;
    selectionHasEdits.current = false;
    return true;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || disabled || missingSelection || noChoices) return;
    const formData = new FormData(event.currentTarget);
    submitting.current = true;
    setPending(true);
    onPendingChange(true);
    setState(initialStructureActionState);
    let result: StructureActionState | undefined;
    try {
      const action = mode === "title"
        ? updateStructureEntityAction
        : mode === "person"
          ? hasAssignments ? replacePositionAssignmentAction : establishPositionAssignmentAction
          : !manager
            ? establishPositionReportingRelationshipAction
            : managerChange === "correction"
              ? correctPositionReportingRelationshipAction
              : replacePositionReportingRelationshipAction;
      result = await action(initialStructureActionState, formData);
      setState(result);
    } catch {
      setSaveUnconfirmed(true);
      setState({
        status: "error",
        message: "We couldn't confirm the save. Your entries are still here. Close this panel and refresh the Unit before trying again.",
      });
    } finally {
      submitting.current = false;
      setPending(false);
      onPendingChange(false);
    }
    if (result?.status === "success") onSaved(result.message);
  }

  return (
    <form onChange={(event) => {
      const name = event.target.name;
      if (["replacementPersonStableKey", "managerPositionStableKey", "relationshipReason"].includes(name)) selectionHasEdits.current = true;
      onDirty();
    }} onSubmit={save}>
      <fieldset className="grid gap-4" disabled={disabled}>
        {mode === "title" ? (
          <>
            <input name="entityType" type="hidden" value="position" />
            <input name="stableKey" type="hidden" value={position.id} />
            <input name="expectedRevision" type="hidden" value={position.revision} />
            <input name="organizationUnitStableKey" type="hidden" value={position.unit?.id ?? ""} />
            <Field label="Job title">
              <Input defaultValue={position.title} maxLength={255} name="title" required />
            </Field>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">This changes the title, not its people, Unit, or responsibilities.</p>
          </>
        ) : <input name="positionStableKey" type="hidden" value={position.id} />}

        {mode === "person" ? (
          <>
            {hasAssignments ? (
              <>
                {position.assignments.length > 1 ? (
                  <Field label="Whose assignment is changing?">
                    <Select onChange={(event) => { if (confirmSelectionChange()) setAssignmentId(event.target.value); }} required value={assignmentId}>
                      <option value="">Choose a current assignment</option>
                      {position.assignments.map((item) => <option key={item.id} value={item.id}>{item.person.name} — {item.typeLabel}</option>)}
                    </Select>
                  </Field>
                ) : <p className="text-sm text-[var(--text-secondary)]">Replacing {assignment?.person.name} · {assignment?.typeLabel}</p>}
                <input name="assignmentRecordKey" type="hidden" value={assignment?.id ?? ""} />
                <input name="expectedRevision" type="hidden" value={assignment?.revision ?? ""} />
              </>
            ) : <input name="expectedRevision" type="hidden" value={position.revision} />}
            <Field label={hasAssignments ? "New person" : "Person"}>
              <Select defaultValue="" key={assignmentId} name={hasAssignments ? "replacementPersonStableKey" : "personStableKey"} required>
                <option value="">Choose an existing person</option>
                {availablePeople.map((person) => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}
              </Select>
            </Field>
            {!hasAssignments ? (
              <Field label="How are they filling this position?">
                <Select defaultValue="incumbent" name="assignmentType" required>
                  <option value="incumbent">Regular occupant</option>
                  <option value="job_share">Job share</option>
                  <option value="interim">Interim</option>
                  <option value="acting">Acting</option>
                  <option value="backup">Backup</option>
                </Select>
              </Field>
            ) : null}
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{hasAssignments ? "The previous assignment stays in history. " : ""}Responsibilities and app access stay unchanged.</p>
          </>
        ) : null}

        {mode === "manager" ? (
          <>
            {manager ? (
              <>
                <Field label="What changed?">
                  <Select onChange={(event) => { if (confirmSelectionChange()) setManagerChange(event.target.value as typeof managerChange); }} required value={managerChange}>
                    <option value="correction">Correct the record — it was entered incorrectly</option>
                    <option value="organizational_change">Manager changed — keep the previous relationship in history</option>
                  </Select>
                </Field>
                <input name="reportingRecordKey" type="hidden" value={manager.id} />
                <input name="expectedRevision" type="hidden" value={manager.revision} />
                {managerChange === "correction" ? <input name="relationshipType" type="hidden" value={manager.type} /> : null}
              </>
            ) : <input name="expectedRevision" type="hidden" value={position.revision} />}
            <Field label="Reports to">
              <Select defaultValue={manager && managerChange === "correction" ? manager.position.id : ""} key={managerChange} name="managerPositionStableKey" required>
                <option value="">Choose a manager’s job title</option>
                {managerPositions.map((candidate) => <option key={candidate.id} value={candidate.id}>{managerLabel(candidate)}</option>)}
              </Select>
            </Field>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">Choose the manager’s position. Names help identify it; this doesn’t assign responsibilities.</p>
            <Field label="Reporting note" optional>
              <Input defaultValue={manager && managerChange === "correction" ? manager.reason ?? "" : ""} key={managerChange} maxLength={2000} name="relationshipReason" />
            </Field>
          </>
        ) : null}

        <div className="rounded-[10px] border border-[var(--border)] p-3">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Record this change</p>
          <div className="mt-3 grid gap-3">
            <ChangeMetadataFields fixedKind={mode === "manager" ? manager ? managerChange : "organizational_change" : mode === "person" && hasAssignments ? "organizational_change" : undefined} />
          </div>
        </div>
        {noChoices ? <p className="text-sm text-[var(--text-secondary)]">No other active {mode === "person" ? "people" : "job titles"} are available to choose.</p> : null}
        <Button disabled={disabled || missingSelection || noChoices} type="submit" variant="primary">{pending ? "Saving…" : "Save changes"}</Button>
      </fieldset>
      {missingRevision || position.status !== "active" ? <Alert className="mt-4" tone="warning">This record isn’t available for quick editing. Refresh the Unit or open its full details.</Alert> : null}
      {state.status !== "idle" ? <div aria-live="polite" className="mt-4"><Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert></div> : null}
    </form>
  );
}
