"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import type { OrganizationPerson, OrganizationPosition, OrganizationStructureData, OrganizationUnit } from "@/lib/organization-structure-data.mjs";
import { establishPositionAssignmentAction } from "../../organization/actions";
import { initialStructureActionState } from "../../organization/action-state";
import { ChangeMetadataFields } from "../../organization/structure-administration-panel";
import { Alert, Button, RequiredMark, Select } from "../../ui/primitives";

function AssignmentForm({ person, position, onPendingChange, onSaved }: { person: OrganizationPerson; position: OrganizationPosition; onPendingChange: (pending: boolean) => void; onSaved: () => void }) {
  const [saveUnconfirmed, setSaveUnconfirmed] = useState(false);
  const [state, setState] = useState(initialStructureActionState);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const hasIncumbent = position.assignments.some((assignment) => assignment.type === "incumbent");
  const unavailable = pending || saveUnconfirmed || state.status === "success" || !position.revision;

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
    } catch {
      setSaveUnconfirmed(true);
      setState({ status: "error", message: "We couldn’t confirm the assignment. Refresh this page before trying again." });
    } finally {
      submitting.current = false;
      setPending(false);
      onPendingChange(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-4">
      <fieldset className="grid gap-4" disabled={unavailable}>
        <input name="personStableKey" type="hidden" value={person.id} />
        <input name="positionStableKey" type="hidden" value={position.id} />
        <input name="expectedRevision" type="hidden" value={position.revision} />
        {hasIncumbent ? <Alert tone="info">This job title already has a regular occupant. Adding an assignment does not replace them.</Alert> : null}
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
      {state.status !== "idle" ? <div aria-live="polite" className="mt-4"><Alert tone={state.status === "success" ? "success" : "error"}>{state.status === "success" ? "Job title assigned. You can return to the Unit." : `${state.message} The Person record is still saved.`}</Alert></div> : null}
    </form>
  );
}

export function UnitPersonPlacement({ data, person, unit }: { data: OrganizationStructureData; person: OrganizationPerson; unit: OrganizationUnit }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const positions = data.positions.filter((position) => position.status === "active" && position.unit?.id === unit.id && !position.assignments.some((assignment) => assignment.person.id === person.id));
  const position = positions.find((item) => item.id === selectedId);
  const assignedHere = person.assignments.some((assignment) => assignment.position.unit?.id === unit.id);

  return (
    <section aria-label="Choose a job title">
      <p className="mb-4 text-sm text-[var(--text-secondary)]">{assignedHere ? `${person.name} already has an assignment in this Unit. You can add another only if needed.` : `${person.name} has no assignment in this Unit yet. Choose a job title to add them to its roster, or leave this for later.`}</p>
      {saved ? <Alert tone="success">Job title assigned. You can return to the Unit.</Alert> : positions.length ? <>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Job title in {unit.name} (optional)</span>
          <Select disabled={pending} onChange={(event) => {
            if (position && !window.confirm("Choose another job title? Unsaved assignment details will be cleared.")) return;
            setSelectedId(event.target.value);
          }} value={selectedId}>
            <option value="">Choose when you’re ready</option>
            {positions.map((item) => <option key={item.id} value={item.id}>{item.title}{item.assignments.length ? ` — ${item.assignments.map((assignment) => assignment.person.name).join(", ")}` : " — no current person recorded"}</option>)}
          </Select>
        </label>
        {position ? <AssignmentForm key={position.id} onPendingChange={setPending} onSaved={() => { setSaved(true); router.refresh(); }} person={person} position={position} /> : null}
      </> : <p className="text-sm text-[var(--text-secondary)]">There are no other active job titles available in this Unit. You can <Link className="font-medium text-[var(--workspace-accent)]" href={`/studio/organization/positions/new?unit=${encodeURIComponent(unit.id)}`}>add a job title</Link> first and assign this saved person from the roster.</p>}
      <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium text-[var(--workspace-accent)]">
        {pending ? <span aria-disabled="true">Saving assignment…</span> : <>
          <Link href={`/studio/organization/units/${encodeURIComponent(unit.id)}#unit-people-job-titles`} prefetch={false}>Back to {unit.name}</Link>
          <Link href={`/studio/organization/people/${encodeURIComponent(person.id)}`} prefetch={false}>View {person.name}’s record</Link>
        </>}
      </div>
    </section>
  );
}
