"use client";

import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";

import type { OrganizationStructureData, OrganizationUnit } from "@/lib/organization-structure-data.mjs";
import { personPickerOptions } from "@/lib/structure-picker-options";
import { initialStructureActionState } from "../organization/action-state";
import { Alert, Button, Input, RequiredMark } from "../ui/primitives";
import { SearchableSelect } from "../ui/searchable-select";
import { CreationMetadataFields } from "./organization/structure-create-form";
import { UnitPersonPlacement } from "./organization/unit-person-placement";
import { createUnitPersonAction } from "./unit-person-create-action";

type SelectedPerson = { id: string; name: string; created: boolean };

export function UnitPersonCreateForm({ data, unit, onSaved, onDirty, onPendingChange, onSaveUnconfirmed }: {
  data: OrganizationStructureData;
  unit: OrganizationUnit;
  onSaved: (person: SelectedPerson) => void;
  onDirty: () => void;
  onPendingChange: (pending: boolean) => void;
  onSaveUnconfirmed: () => void;
}) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const submitting = useRef(false);
  const normalizedName = name.trim().toLocaleLowerCase();
  const duplicate = normalizedName && data.people.some((person) => person.name.trim().toLocaleLowerCase() === normalizedName);
  const disabled = pending || locked || unit.status !== "active";

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || disabled) return;
    const formData = new FormData(event.currentTarget);
    submitting.current = true;
    setPending(true);
    setMessage("");
    onPendingChange(true);
    startTransition(async () => {
      try {
        const result = await createUnitPersonAction(initialStructureActionState, formData);
        if (result.status === "success" && result.stableKey) {
          setLocked(true);
          onSaved({ id: result.stableKey, name: name.trim(), created: true });
        } else {
          setMessage(result.message);
          if (result.saveUnconfirmed || result.status === "success") {
            setLocked(true);
            onSaveUnconfirmed();
          }
        }
      } catch {
        setLocked(true);
        onSaveUnconfirmed();
        setMessage("We couldn’t confirm the save. Close this panel and refresh before trying again, so we don’t create a duplicate person.");
      } finally {
        submitting.current = false;
        setPending(false);
        onPendingChange(false);
      }
    });
  }

  return <form method="post" onChange={onDirty} onSubmit={save}>
    <fieldset className="grid gap-4" disabled={disabled}>
      <input name="organizationUnitStableKey" type="hidden" value={unit.id} />
      <p className="text-xs text-[var(--text-secondary)]">* Required. A job title can be assigned after saving, or later.</p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Person’s name<RequiredMark /></span>
        <Input autoFocus maxLength={255} name="displayName" onChange={(event) => setName(event.target.value)} required value={name} />
      </label>
      {duplicate ? <Alert tone="warning">
        <p>A person with this name is already recorded. Choose the existing person unless this is someone different.</p>
        <label className="mt-3 flex items-start gap-2 text-sm" key={normalizedName}>
          <input className="mt-1 size-4" name="acknowledgePossibleDuplicate" required type="checkbox" value="confirmed" />
          <span>I checked: this is a different person.<RequiredMark /></span>
        </label>
      </Alert> : null}
      <CreationMetadataFields reason={reason} setReason={setReason} />
      <p className="text-xs text-[var(--text-secondary)]">This saves a person’s record, not a login or a Unit assignment.</p>
      <div><Button disabled={disabled} type="submit" variant="primary">{pending ? "Saving person…" : "Save person"}</Button></div>
    </fieldset>
    {message ? <div aria-live="polite" className="mt-4"><Alert tone="error">{message}</Alert></div> : null}
  </form>;
}

export function UnitPersonCreatePanel({ data, unit, refreshing, onClose, onSaved }: {
  data: OrganizationStructureData;
  unit: OrganizationUnit;
  refreshing: boolean;
  onClose: (refresh?: boolean) => void;
  onSaved: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState<"existing" | "new">(data.people.some((person) => person.status === "active") ? "existing" : "new");
  const [personId, setPersonId] = useState("");
  const [selected, setSelected] = useState<SelectedPerson | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const people = data.people.filter((person) => person.status === "active");
  const person = selected ? people.find((item) => item.id === selected.id) : undefined;
  const chosen = people.find((item) => item.id === personId);
  const disabled = pending || unconfirmed || refreshing || unit.status !== "active";

  useEffect(() => {
    const current = dialog.current;
    current?.showModal();
    return () => current?.close();
  }, []);
  useEffect(() => {
    if (!dirty && !pending) return;
    function protect(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, pending]);
  useEffect(() => { if (selected) heading.current?.focus(); }, [selected]);

  function canLeave() { return !pending && (!dirty || window.confirm("Discard your unsaved changes? Saved person details will stay saved.")); }
  function close() { if (canLeave()) onClose(unconfirmed); }
  function changeMode(next: typeof mode) {
    if (!disabled && mode !== next && canLeave()) { setMode(next); setDirty(false); }
  }

  return <dialog aria-labelledby="unit-add-person-title" className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-xl overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-xl backdrop:bg-black/30 sm:p-7" onCancel={(event) => { event.preventDefault(); close(); }} ref={dialog}>
    <div className="mb-5 flex items-start justify-between gap-4">
      <div><p className="text-xs text-[var(--text-secondary)]">{unit.name}</p><h2 className="mt-2 text-xl font-semibold outline-none" id="unit-add-person-title" ref={heading} tabIndex={-1}>{selected ? selected.name : "Add person"}</h2></div>
      <Button disabled={pending} onClick={close} size="sm" type="button">Close</Button>
    </div>
    {notice ? <p aria-live="polite" className="mb-4 text-sm text-[var(--workspace-accent)]" role="status">{notice}</p> : null}
    {!selected ? <>
      <div aria-label="Add person options" className="mb-5 flex flex-wrap gap-2" role="group">
        <Button aria-pressed={mode === "existing"} disabled={disabled} onClick={() => changeMode("existing")} type="button" variant={mode === "existing" ? "primary" : "secondary"}>Choose existing person</Button>
        <Button aria-pressed={mode === "new"} disabled={disabled} onClick={() => changeMode("new")} type="button" variant={mode === "new" ? "primary" : "secondary"}>Create new person</Button>
      </div>
      {mode === "existing" ? <div className="grid gap-4">
        <SearchableSelect disabled={disabled} label="Person" onChange={(event) => setPersonId(event.target.value)} options={personPickerOptions(people)} placeholder="Choose a person" searchPlaceholder="Search name, job title, or Unit" value={personId} />
        <p className="text-xs text-[var(--text-secondary)]">Reuse their existing record. Nothing changes until you save a job assignment.</p>
        <div><Button disabled={disabled || !chosen} onClick={() => { if (!disabled && chosen) { setSelected({ id: chosen.id, name: chosen.name, created: false }); setDirty(false); } }} type="button" variant="primary">Continue with this person</Button></div>
      </div> : <UnitPersonCreateForm data={data} onDirty={() => setDirty(true)} onPendingChange={setPending} onSaveUnconfirmed={() => setUnconfirmed(true)} onSaved={(saved) => {
        setSelected(saved);
        setDirty(false);
        setNotice(`${saved.name} is saved in People. You can assign a job title now or later.`);
        onSaved(`${saved.name} saved in People. A Unit assignment is optional.`);
      }} unit={unit} />}
    </> : <>
      {person ? <UnitPersonPlacement data={data} embedded={{
        disabled,
        onDirty: () => setDirty(true),
        onPendingChange: setPending,
        onSaveUnconfirmed: () => setUnconfirmed(true),
        onSaved: (message) => { setDirty(false); setNotice(message); onSaved(message); },
      }} key={person.id} person={person} unit={unit} /> : <p className="text-sm text-[var(--text-secondary)]">{refreshing ? "Updating the roster…" : "Refresh the roster to check this person’s latest details before assigning a job title."}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button disabled={pending} onClick={close} type="button" variant="primary">Done for now</Button>
        <Button disabled={disabled || !person} onClick={() => { if (!disabled && person && canLeave()) { setSelected(null); setPersonId(""); setDirty(false); setNotice(""); setMode("existing"); } }} type="button">Choose another person</Button>
        {!person && !refreshing && !unconfirmed ? <Button onClick={() => onSaved("Checking the person’s record…")} type="button">Refresh roster</Button> : null}
      </div>
    </>}
  </dialog>;
}
