"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { OrganizationPosition, OrganizationStructureData, OrganizationUnit } from "@/lib/organization-structure-data.mjs";

import { Badge, Button, Card } from "../ui/primitives";
import { UnitRosterEditor, type UnitRosterEditMode } from "./unit-roster-editor";

const editorModes: Array<{ id: UnitRosterEditMode; label: string }> = [
  { id: "title", label: "Job title" },
  { id: "person", label: "Person" },
  { id: "manager", label: "Reports to" },
];

function RosterEditPanel({ data, position, onClose, onSaved }: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<UnitRosterEditMode>("title");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    if (!dirty && !pending) return;
    function preventLosingEdits(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", preventLosingEdits);
    return () => window.removeEventListener("beforeunload", preventLosingEdits);
  }, [dirty, pending]);

  function canLeave() {
    return !pending && (!dirty || window.confirm("Discard your unsaved changes?"));
  }

  return (
    <dialog
      aria-describedby="unit-roster-edit-description"
      aria-labelledby="unit-roster-edit-title"
      className="fixed inset-y-0 right-0 left-auto m-0 max-h-dvh h-dvh w-full max-w-xl overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-xl backdrop:bg-black/30 sm:p-7"
      onCancel={(event) => {
        event.preventDefault();
        if (canLeave()) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">{position.unit?.name}</p>
          <h2 className="mt-2 text-xl font-semibold" id="unit-roster-edit-title">Edit {position.title}</h2>
        </div>
        <Button aria-label="Close editor" disabled={pending} onClick={() => { if (canLeave()) onClose(); }} size="sm" type="button">Close</Button>
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]" id="unit-roster-edit-description">Update one thing at a time. You’ll stay in this Unit.</p>
      <div aria-label="What to edit" className="mt-5 flex flex-wrap gap-2" role="group">
        {editorModes.map((item) => (
          <Button
            aria-pressed={mode === item.id}
            disabled={pending}
            key={item.id}
            onClick={() => {
              if (mode !== item.id && canLeave()) {
                setDirty(false);
                setMode(item.id);
              }
            }}
            type="button"
            variant={mode === item.id ? "primary" : "secondary"}
          >{item.label}</Button>
        ))}
      </div>
      <p className="mt-5 text-xs text-[var(--text-tertiary)]">* Required. Each saved change keeps its history.</p>
      <UnitRosterEditor
        data={data}
        key={mode}
        mode={mode}
        onDirty={() => setDirty(true)}
        onPendingChange={setPending}
        onSaved={onSaved}
        position={position}
      />
      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <Link
          aria-disabled={pending}
          className="text-sm text-[var(--workspace-accent)] hover:underline aria-disabled:opacity-40"
          href={`/studio/organization/positions/${encodeURIComponent(position.id)}`}
          onClick={(event) => { if (!canLeave()) event.preventDefault(); }}
        >Open full job details →</Link>
      </div>
    </dialog>
  );
}

export function UnitRoster({ data, unit }: { data: OrganizationStructureData; unit: OrganizationUnit }) {
  const router = useRouter();
  // Keep the opened snapshot's revision with its inputs if another route refresh arrives.
  const [selection, setSelection] = useState<{ data: OrganizationStructureData; position: OrganizationPosition } | null>(null);
  const [notice, setNotice] = useState("");
  const [refreshing, startRefresh] = useTransition();
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  const positions = data.positions.filter((position) => position.unit?.id === unit.id);

  useEffect(() => {
    if (!selection && !refreshing && editTrigger.current) {
      editTrigger.current.focus();
      editTrigger.current = null;
    }
  }, [selection, refreshing]);

  function saved(message: string) {
    setSelection(null);
    setNotice(message || "Saved. Your Unit roster is up to date.");
    startRefresh(() => router.refresh());
  }

  return (
    <section aria-labelledby="unit-people-job-titles" className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]" id="unit-people-job-titles">People and job titles</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">In this Unit only. Choose Edit to update someone’s job title, assignment, or manager here.</p>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">{positions.length} {positions.length === 1 ? "Position" : "Positions"}</span>
      </div>
      <p aria-live="polite" className="mt-2 text-sm text-[var(--workspace-accent)]" role="status">{refreshing ? "Saved. Updating the roster…" : notice}</p>
      <Card className="mt-3 overflow-hidden">
        {positions.length ? (
          <div aria-label="Unit roster" className="overflow-x-auto" role="region" tabIndex={0}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">Job title</th>
                  <th className="px-4 py-3 font-medium" scope="col">People</th>
                  <th className="px-4 py-3 font-medium" scope="col">Reports to<span className="mt-0.5 block font-normal text-[var(--text-tertiary)]">Primary manager</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {positions.map((position) => (
                  <tr key={position.id}>
                    <th className="px-4 py-4 align-top font-normal" scope="row">
                      <Link className="font-medium text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/positions/${encodeURIComponent(position.id)}#edit-position`}>{position.title} <span aria-hidden="true">→</span></Link>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone={position.occupancy.tone}>{position.occupancy.label}</Badge>
                        {position.status !== "active" ? <Badge>{position.status}</Badge> : null}
                      </div>
                      {position.status === "active" ? (
                        <Button aria-label={`Edit ${position.title}`} className="mt-3" disabled={refreshing} onClick={(event) => { editTrigger.current = event.currentTarget; setNotice(""); setSelection({ data, position }); }} size="sm" type="button">Edit</Button>
                      ) : null}
                    </th>
                    <td className="px-4 py-4 align-top">
                      {position.assignments.length ? (
                        <ul className="space-y-2">
                          {position.assignments.map((assignment) => (
                            <li key={assignment.id}>
                              <Link className="font-medium text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/people/${encodeURIComponent(assignment.person.id)}`}>{assignment.person.name}</Link>
                              <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{assignment.typeLabel}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <span className="text-[var(--text-secondary)]">No current Person recorded</span>}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {position.primaryManager ? (
                        <>
                          <Link className="font-medium text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/positions/${encodeURIComponent(position.primaryManager.position.id)}`}>{position.primaryManager.position.title}</Link>
                          {position.primaryManager.position.unit ? <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{position.primaryManager.position.unit.name}</span> : null}
                        </>
                      ) : <span className="text-[var(--text-secondary)]">Not recorded</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="p-5 text-sm text-[var(--text-secondary)]">No job titles have been recorded directly in this Unit yet.</p>}
      </Card>
      {selection ? <RosterEditPanel data={selection.data} onClose={() => setSelection(null)} onSaved={saved} position={selection.position} /> : null}
    </section>
  );
}
