"use client";

import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";

import type { OrganizationPosition, OrganizationStructureData, OrganizationUnit } from "@/lib/organization-structure-data.mjs";
import { initialStructureActionState } from "../organization/action-state";
import { Alert, Button, Input, RequiredMark } from "../ui/primitives";
import { CreationMetadataFields } from "./organization/structure-create-form";
import { createUnitPositionAction } from "./unit-position-create-action";
import { UnitRosterEditor } from "./unit-roster-editor";

type SavedJob = { id: string; title: string; another: boolean };

export function UnitPositionCreateForm({ data, unit, recentTitles = [], onSaved, onDirty, onPendingChange, onSaveUnconfirmed }: {
  data: OrganizationStructureData;
  unit: OrganizationUnit;
  recentTitles?: string[];
  onSaved: (job: SavedJob) => void;
  onDirty: () => void;
  onPendingChange: (pending: boolean) => void;
  onSaveUnconfirmed: () => void;
}) {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const submitting = useRef(false);
  const normalizedTitle = title.trim().toLocaleLowerCase();
  const duplicate = normalizedTitle && (data.positions.some((position) => position.status === "active" && position.unit?.id === unit.id && position.title.trim().toLocaleLowerCase() === normalizedTitle) || recentTitles.some((item) => item.trim().toLocaleLowerCase() === normalizedTitle));
  const disabled = pending || locked || unit.status !== "active";

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || disabled) return;
    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const another = submitter?.value === "another";
    submitting.current = true;
    setPending(true);
    setMessage("");
    onPendingChange(true);
    startTransition(async () => {
      try {
        const result = await createUnitPositionAction(initialStructureActionState, formData);
        if (result.status === "success" && result.stableKey) {
          setLocked(true);
          onSaved({ id: result.stableKey, title: title.trim(), another });
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
        setMessage("We couldn’t confirm the save. Close this panel and refresh the Unit before trying again, so we don’t add the same job twice.");
      } finally {
        submitting.current = false;
        setPending(false);
        onPendingChange(false);
      }
    });
  }

  return <form onChange={onDirty} onSubmit={save}>
    <fieldset className="grid gap-4" disabled={disabled}>
      <input name="organizationUnitStableKey" type="hidden" value={unit.id} />
      <p className="text-xs text-[var(--text-secondary)]">* Required. People, managers, and responsibilities can wait.</p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Job title<RequiredMark /></span>
        <Input autoFocus maxLength={255} name="title" onChange={(event) => setTitle(event.target.value)} placeholder="For example, Services Coordinator" required value={title} />
      </label>
      <p className="text-sm text-[var(--text-secondary)]">In {unit.name}. After saving, you can choose an existing person or manager here.</p>
      {duplicate ? <Alert tone="warning">
        <p>A job with this title already exists in this Unit. Add another only if it is a separate position.</p>
        <label className="mt-3 flex items-start gap-2 text-sm" key={normalizedTitle}>
          <input className="mt-1 size-4" name="acknowledgePossibleDuplicate" required type="checkbox" value="confirmed" />
          <span>I checked: this is a separate job.<RequiredMark /></span>
        </label>
      </Alert> : null}
      <div><CreationMetadataFields reason={reason} setReason={setReason} /></div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={disabled} type="submit" value="save" variant="primary">{pending ? "Saving…" : "Save job title"}</Button>
        <Button disabled={disabled} type="submit" value="another">Save and add another</Button>
      </div>
    </fieldset>
    {message ? <div aria-live="polite" className="mt-4"><Alert tone="error">{message}</Alert></div> : null}
  </form>;
}

export function UnitPositionCreatePanel({ data, unit, refreshing, onClose, onSaved }: {
  data: OrganizationStructureData;
  unit: OrganizationUnit;
  refreshing: boolean;
  onClose: (refresh?: boolean) => void;
  onSaved: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [saved, setSaved] = useState<SavedJob | null>(null);
  const [recentTitles, setRecentTitles] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ mode: "person" | "manager"; position: OrganizationPosition; data: OrganizationStructureData } | null>(null);
  const [waitingRevision, setWaitingRevision] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const position = saved ? data.positions.find((item) => item.id === saved.id && item.unit?.id === unit.id && item.status === "active") : undefined;
  const ready = Boolean(position?.revision && position.revision !== waitingRevision && !refreshing && !unconfirmed);

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
  useEffect(() => { if (saved && !editor && !saved.another) heading.current?.focus(); }, [saved, editor]);

  function canLeave() { return !pending && (!dirty || window.confirm("Discard your unsaved changes? Saved job details will stay saved.")); }
  function close() { if (canLeave()) onClose(unconfirmed); }
  function created(job: SavedJob) {
    setSaved(job);
    setRecentTitles((titles) => [...titles, job.title]);
    setDirty(false);
    setWaitingRevision(null);
    setNotice(`${job.title} was added to ${unit.name}.`);
    onSaved(`${job.title} added.`);
  }

  return <dialog aria-labelledby="unit-create-job-title" className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-xl overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-xl backdrop:bg-black/30 sm:p-7" onCancel={(event) => { event.preventDefault(); close(); }} ref={dialog}>
    <div className="mb-5 flex items-start justify-between gap-4">
      <div><p className="text-xs text-[var(--text-secondary)]">{unit.name}</p><h2 className="mt-2 text-xl font-semibold outline-none" id="unit-create-job-title" ref={heading} tabIndex={-1}>{editor ? editor.mode === "person" ? "Choose a person" : "Choose a manager" : saved && !saved.another ? "Job title saved" : "Add job title"}</h2></div>
      <Button disabled={pending} onClick={close} size="sm" type="button">Close</Button>
    </div>
    {notice ? <p aria-live="polite" className="mb-4 text-sm text-[var(--workspace-accent)]" role="status">{notice}</p> : null}
    {editor ? <>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">For {editor.position.title}. This is optional; the job title is already saved.</p>
      <UnitRosterEditor data={editor.data} mode={editor.mode} onDirty={() => setDirty(true)} onPendingChange={setPending} onSaveUnconfirmed={() => setUnconfirmed(true)} onSaved={(message) => {
        setWaitingRevision(editor.position.revision);
        setEditor(null);
        setDirty(false);
        setNotice(message);
        onSaved(message);
      }} position={editor.position} />
      <Button className="mt-4" disabled={pending || unconfirmed} onClick={() => { if (canLeave()) { setEditor(null); setDirty(false); } }} type="button">Back to saved job</Button>
    </> : !saved || saved.another ? <UnitPositionCreateForm data={data} key={saved?.id ?? "first"} onDirty={() => setDirty(true)} onPendingChange={setPending} onSaveUnconfirmed={() => setUnconfirmed(true)} onSaved={created} recentTitles={recentTitles} unit={unit} /> : <>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">You can stop here, or add a little more. Nothing is assigned automatically.</p>
      {position ? <dl className="mb-5 grid gap-3 rounded-xl border border-[var(--border)] p-4 text-sm">
        <div><dt className="text-[var(--text-secondary)]">Job title</dt><dd className="font-medium">{position.title}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">People</dt><dd>{position.assignments.length ? position.assignments.map((item) => `${item.person.name} (${item.typeLabel})`).join(", ") : "Not yet recorded"}</dd></div>
        <div><dt className="text-[var(--text-secondary)]">Reports to</dt><dd>{position.primaryManager?.position.title ?? "Not yet recorded"}</dd></div>
      </dl> : null}
      {!ready ? <p className="mb-4 text-sm text-[var(--text-secondary)]">{refreshing ? "Updating the roster…" : "Your job title is saved. Refresh the roster to check its latest details before adding more."}</p> : null}
      <div className="flex flex-wrap gap-3">
        {!position?.assignments.length ? <Button disabled={!ready} onClick={() => { if (position && ready) setEditor({ mode: "person", position, data }); }} type="button">Add a person (optional)</Button> : null}
        {!position?.primaryManager ? <Button disabled={!ready} onClick={() => { if (position && ready) setEditor({ mode: "manager", position, data }); }} type="button">Add a manager (optional)</Button> : null}
        <Button onClick={close} type="button" variant="primary">Done for now</Button>
        <Button disabled={!ready} onClick={() => { if (saved && ready) setSaved({ ...saved, another: true }); }} type="button">Add another job title</Button>
        {!ready && !refreshing ? <Button onClick={() => onSaved("Checking the saved job…")} type="button">Refresh roster</Button> : null}
      </div>
    </>}
  </dialog>;
}
