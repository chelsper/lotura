"use client";

import { useRef, useState, type FormEvent } from "react";

import type { OrganizationPosition, OrganizationStructureData, StructureMandate } from "@/lib/organization-structure-data.mjs";
import { personPickerOptions } from "@/lib/structure-picker-options";
import { establishRoleCoverageAction } from "../organization/actions";
import { initialStructureActionState, type StructureActionState } from "../organization/action-state";
import { ChangeMetadataFields } from "../organization/structure-administration-panel";
import { Alert, Button, Input, RequiredMark, Select } from "../ui/primitives";
import { SearchableSelect } from "../ui/searchable-select";

const coverageTypes = [
  { value: "permanent", label: "Normally handles this work" },
  { value: "interim", label: "Filling in for now (interim)" },
  { value: "acting", label: "Acting in this responsibility" },
  { value: "delegated", label: "Handling delegated work" },
  { value: "backup", label: "Provides backup" },
];

export function UnitResponsibilityCoverageForm({ data, position, mandate, onSaved, onPendingChange, onSaveUnconfirmed, onDirty, onCancel }: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
  mandate: StructureMandate;
  onSaved: (message: string) => void;
  onPendingChange: (pending: boolean) => void;
  onSaveUnconfirmed: () => void;
  onDirty: () => void;
  onCancel: () => void;
}) {
  const [personStableKey, setPersonStableKey] = useState("");
  const [coverageType, setCoverageType] = useState("");
  const [state, setState] = useState<StructureActionState>(initialStructureActionState);
  const [pending, setPending] = useState(false);
  const [saveUnconfirmed, setSaveUnconfirmed] = useState(false);
  const submitting = useRef(false);
  const people = data.people.filter((person) => person.status === "active");
  const selectedPerson = people.find((person) => person.id === personStableKey);
  const currentMandate = position.mandates.find((item) => item.id === mandate.id);
  const unavailable = position.status !== "active" || mandate.role.status !== "active" || !mandate.revision ||
    !currentMandate || currentMandate.revision !== mandate.revision || currentMandate.role.id !== mandate.role.id;
  const disabled = pending || saveUnconfirmed || state.status === "success" || unavailable;
  const duplicate = mandate.coverage.some((item) => item.person.id === personStableKey && item.type === coverageType);
  const validChoice = Boolean(selectedPerson) && coverageTypes.some((type) => type.value === coverageType) && !duplicate;
  const needsContext = Boolean(coverageType) && coverageType !== "permanent";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || disabled || !validChoice) return;
    const formData = new FormData(event.currentTarget);
    if (formData.get("personStableKey") !== selectedPerson?.id || formData.get("coverageType") !== coverageType ||
      formData.get("positionStableKey") !== position.id || formData.get("mandateRecordKey") !== mandate.id ||
      formData.get("expectedRevision") !== mandate.revision) return;
    if (needsContext && !String(formData.get("coverageReason") ?? "").trim()) return;
    submitting.current = true;
    setPending(true);
    onPendingChange(true);
    setState(initialStructureActionState);
    let result: StructureActionState | undefined;
    try {
      result = await establishRoleCoverageAction(initialStructureActionState, formData);
      setState(result);
    } catch {
      setSaveUnconfirmed(true);
      onSaveUnconfirmed();
      setState({ status: "error", message: "We couldn't confirm the save. Your entries are still here. Close this panel and refresh the Unit before trying again." });
    } finally {
      submitting.current = false;
      setPending(false);
      onPendingChange(false);
    }
    if (result?.status === "success") onSaved("Person added to this responsibility. Job titles and reporting lines are unchanged.");
  }

  return (
    <section aria-label="Who does this work?" className="mt-4 space-y-4">
      <Button disabled={pending || saveUnconfirmed || state.status === "success"} onClick={() => { if (!submitting.current && !pending && !saveUnconfirmed && state.status !== "success") onCancel(); }} size="sm" type="button">Back to responsibilities</Button>
      <div>
        <h3 className="font-semibold">Who does this work?</h3>
        <p className="mt-1 text-sm">{mandate.role.name} · {position.title}</p>
        {mandate.scope ? <p className="mt-1 text-xs text-[var(--text-secondary)]">Scope: {mandate.scope}</p> : null}
      </div>
      <div className="rounded-[10px] border border-[var(--border)] p-3 text-sm">
        <p className="font-medium">Currently recorded</p>
        {mandate.coverage.length ? <ul className="mt-2 space-y-2">{mandate.coverage.map((item) => <li key={item.id}>
          {item.person.name} · {coverageTypes.find((type) => type.value === item.type)?.label ?? item.typeLabel}
          {item.reason ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.reason}</p> : null}
        </li>)}</ul> : <p className="mt-1 text-[var(--text-secondary)]">Not yet recorded. You can leave this for later.</p>}
      </div>
      <p className="text-sm text-[var(--text-secondary)]">Choose someone explicitly. This adds to the people recorded here; it does not replace anyone or change their job title or reporting line.</p>
      {unavailable ? <p className="text-sm text-[var(--text-secondary)]">This responsibility isn’t available for changes. Refresh the Unit or open full job details.</p> : !people.length ? <p className="text-sm text-[var(--text-secondary)]">No active people are available. You can add someone through the Unit roster and return later.</p> : <form onChange={onDirty} onSubmit={save}>
        <fieldset className="grid gap-4" disabled={disabled}>
          <input name="positionStableKey" type="hidden" value={position.id} />
          <input name="mandateRecordKey" type="hidden" value={mandate.id} />
          <input name="expectedRevision" type="hidden" value={mandate.revision} />
          <SearchableSelect label="Person" name="personStableKey" onChange={(event) => setPersonStableKey(event.target.value)} options={personPickerOptions(people)} placeholder="Choose an existing person" required value={personStableKey} />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">How are they helping?<RequiredMark /></span>
            <Select name="coverageType" onChange={(event) => setCoverageType(event.target.value)} required value={coverageType}>
              <option value="">Choose how they help</option>
              {coverageTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
          </label>
          {duplicate ? <p role="status" className="text-sm text-[var(--text-secondary)]">This person is already recorded in that capacity. Nothing needs to be added.</p> : null}
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">{needsContext ? <>What are they covering, and why?<RequiredMark /></> : "Coverage details (optional)"}</span>
            <Input maxLength={2000} name="coverageReason" required={needsContext} />
            {needsContext ? <span className="mt-2 block text-xs text-[var(--text-secondary)]">This stays recorded until you explicitly end it in full job details; it does not expire automatically.</span> : null}
          </label>
          <div className="rounded-[10px] border border-[var(--border)] p-3">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Record this change</p>
            <div className="mt-3 grid gap-3"><ChangeMetadataFields fixedKind="organizational_change" /></div>
          </div>
          <Button disabled={disabled || !validChoice} type="submit" variant="primary">{pending ? "Saving…" : "Save person"}</Button>
        </fieldset>
        {state.status !== "idle" ? <div aria-live="polite" className="mt-4"><Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert></div> : null}
      </form>}
    </section>
  );
}
