"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import type { OrganizationPerson, OrganizationPosition, OrganizationStructureData, OrganizationUnit } from "@/lib/organization-structure-data.mjs";
import { positionPickerOptions } from "@/lib/structure-picker-options";
import { establishPositionAssignmentAction } from "../../organization/actions";
import { initialStructureActionState } from "../../organization/action-state";
import { ChangeMetadataFields } from "../../organization/structure-administration-panel";
import { Alert, Button, RequiredMark, Select } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/searchable-select";

type EmbeddedPlacement = {
  onDirty: () => void;
  onPendingChange: (pending: boolean) => void;
  onSaveUnconfirmed: () => void;
  onSaved: (message: string) => void;
  disabled?: boolean;
};

function AssignmentForm({ person, position, onPendingChange, onSaved, onDirty, onSaveUnconfirmed, disabled = false, embedded = false }: {
  person: OrganizationPerson;
  position: OrganizationPosition;
  onPendingChange: (pending: boolean) => void;
  onSaved: () => void;
  onDirty: () => void;
  onSaveUnconfirmed: () => void;
  disabled?: boolean;
  embedded?: boolean;
}) {
  const [saveUnconfirmed, setSaveUnconfirmed] = useState(false);
  const [state, setState] = useState(initialStructureActionState);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const hasIncumbent = position.assignments.some((assignment) => assignment.type === "incumbent");
  const unavailable = disabled || pending || saveUnconfirmed || state.status === "success" || !position.revision || position.status !== "active" || person.status !== "active";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || unavailable) return;
    const formData = new FormData(event.currentTarget);
    submitting.current = true;
    setPending(true);
    onPendingChange(true);
    try {
      const result = await establishPositionAssignmentAction(initialStructureActionState, formData);
      setState(result);
      if (result.status === "success") onSaved();
      else if (embedded) {
        // The existing action does not distinguish rejected writes from lost responses.
        // Reconcile the saved record before allowing another attempt in this panel.
        setSaveUnconfirmed(true);
        onSaveUnconfirmed();
      }
    } catch {
      setSaveUnconfirmed(true);
      onSaveUnconfirmed();
      setState({ status: "error", message: embedded ? "We couldn’t confirm the assignment. Close this panel and refresh the Unit before trying again." : "We couldn’t confirm the assignment. Refresh this page before trying again." });
    } finally {
      submitting.current = false;
      setPending(false);
      onPendingChange(false);
    }
  }

  return (
    <form method="post" onChange={onDirty} onSubmit={save} className="mt-4">
      <fieldset className="grid gap-4" disabled={unavailable}>
        <input name="personStableKey" type="hidden" value={person.id} />
        <input name="positionStableKey" type="hidden" value={position.id} />
        <input name="expectedRevision" type="hidden" value={position.revision} />
        {hasIncumbent ? <Alert tone="info">Someone already fills this position. Adding an assignment does not replace them.</Alert> : null}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">How are they filling this position?<RequiredMark /></span>
          <Select defaultValue={hasIncumbent ? "" : "incumbent"} name="assignmentType" required>
            {hasIncumbent ? <option value="">Choose the assignment</option> : <option value="incumbent">Regular occupant</option>}
            <option value="job_share">Job share</option>
            <option value="interim">Interim</option>
            <option value="acting">Acting</option>
            <option value="backup">Backup</option>
          </Select>
        </label>
        <ChangeMetadataFields />
        <p className="text-xs text-[var(--text-secondary)]">Responsibilities and app access stay unchanged.</p>
        <Button disabled={unavailable} type="submit" variant="primary">{pending ? "Saving assignment…" : "Save assignment"}</Button>
      </fieldset>
      {state.status !== "idle" ? <div aria-live="polite" className="mt-4"><Alert tone={state.status === "success" ? "success" : "error"}>{state.status === "success" ? embedded ? "Job title assigned." : "Job title assigned. You can return to the Unit." : `${state.message} The person’s record is still saved.`}</Alert></div> : null}
      {embedded && saveUnconfirmed ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Close this panel and refresh the Unit before trying again. Do not create the person again.</p> : null}
    </form>
  );
}

export function UnitPersonPlacement({ data, person, unit, embedded }: { data: OrganizationStructureData; person: OrganizationPerson; unit: OrganizationUnit; embedded?: EmbeddedPlacement }) {
  const router = useRouter();
  const [selection, setSelection] = useState<{ personId: string; unitId: string; position: OrganizationPosition } | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const assignmentDirty = useRef(false);
  const positions = data.positions.filter((position) => position.status === "active" && position.unit?.id === unit.id && !position.assignments.some((assignment) => assignment.person.id === person.id));
  // A route refresh must not silently replace the revision under an unfinished form.
  const position = selection?.personId === person.id && selection.unitId === unit.id ? selection.position : undefined;
  const currentOptions = positions.map((item) => item.id === position?.id ? position : item);
  const options = position && !positions.some((item) => item.id === position.id) ? [...currentOptions, position] : currentOptions;
  const disabled = Boolean(embedded?.disabled || pending || saved || unconfirmed || person.status !== "active" || unit.status !== "active");
  const assignedHere = person.assignments.some((assignment) => assignment.position.unit?.id === unit.id);

  return (
    <section aria-label="Choose a job title">
      <p className="mb-4 text-sm text-[var(--text-secondary)]">{assignedHere ? `${person.name} already has a job title here. Add another only if needed.` : `Choose a job title for ${person.name}, or do this later.`}</p>
      {saved ? <Alert tone="success">{embedded ? "Job title assigned." : "Job title assigned. You can return to the Unit."}</Alert> : options.length ? <>
        <SearchableSelect label={`Job title in ${unit.name} (optional)`} disabled={disabled} onChange={(event) => {
            if (disabled || event.target.value === position?.id) return;
            const next = positions.find((item) => item.id === event.target.value);
            if (event.target.value && !next) return;
            if (position && assignmentDirty.current && !window.confirm("Choose another job title? Unsaved assignment details will be cleared.")) return;
            assignmentDirty.current = false;
            setSelection(next ? { personId: person.id, unitId: unit.id, position: next } : null);
            embedded?.onDirty();
          }} options={positionPickerOptions(options)} placeholder="Choose when you’re ready" value={position?.id ?? ""} />
        {position ? <AssignmentForm disabled={disabled} embedded={Boolean(embedded)} key={`${person.id}:${position.id}`} onDirty={() => { assignmentDirty.current = true; embedded?.onDirty(); }} onPendingChange={(value) => { setPending(value); embedded?.onPendingChange(value); }} onSaveUnconfirmed={() => { setUnconfirmed(true); embedded?.onSaveUnconfirmed(); }} onSaved={() => {
          setSaved(true);
          assignmentDirty.current = false;
          if (embedded) embedded.onSaved(`Job title assigned to ${person.name}.`);
          else router.refresh();
        }} person={person} position={position} /> : null}
      </> : <p className="text-sm text-[var(--text-secondary)]">There are no other active job titles available in this Unit. {embedded ? "Close this panel to add a job title, then assign this saved person from the roster." : <>You can <Link className="font-medium text-[var(--workspace-accent)]" href={`/studio/organization/positions/new?unit=${encodeURIComponent(unit.id)}`}>add a job title</Link> first and assign this saved person from the roster.</>}</p>}
      {!embedded ? <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium text-[var(--workspace-accent)]">
        {pending ? <span aria-disabled="true">Saving assignment…</span> : <>
          <Link href={`/studio/organization/units/${encodeURIComponent(unit.id)}#unit-people-job-titles`} prefetch={false}>{saved || assignedHere ? `Back to ${unit.name}` : "Do this later"}</Link>
          <Link href={`/studio/organization/people/${encodeURIComponent(person.id)}`} prefetch={false}>View {person.name}’s record</Link>
        </>}
      </div> : null}
      {!saved && !assignedHere ? <p className="mt-2 text-xs text-[var(--text-secondary)]">Their record stays saved. They’ll appear on this Unit’s roster once you assign a job title.</p> : null}
    </section>
  );
}
