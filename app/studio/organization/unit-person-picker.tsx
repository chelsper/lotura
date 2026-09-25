"use client";

import Link from "next/link";
import { useState } from "react";

import type { OrganizationPerson, OrganizationStructureData, OrganizationUnit } from "@/lib/organization-structure-data.mjs";

import { Button, RequiredMark, Select } from "../../ui/primitives";
import { StructureCreateForm } from "./structure-create-form";

function personContext(person: OrganizationPerson) {
  const assignments = person.assignments.map(({ position }) =>
    `${position.title}${position.unit ? ` (${position.unit.name})` : ""}`,
  );
  return assignments.length ? assignments.join("; ") : "No current job title recorded";
}

export function UnitPersonPicker({ data, unit }: { data: OrganizationStructureData; unit: OrganizationUnit }) {
  const people = data.people.filter((person) => person.status === "active");
  const [mode, setMode] = useState<"existing" | "new">(people.length ? "existing" : "new");
  const [personId, setPersonId] = useState("");
  const [creating, setCreating] = useState(false);
  const selected = people.find((person) => person.id === personId);

  return (
    <div>
      <div aria-label="Add person options" className="mb-5 flex flex-wrap gap-2" role="group">
        <Button aria-pressed={mode === "existing"} disabled={creating} onClick={() => setMode("existing")} type="button" variant={mode === "existing" ? "primary" : "secondary"}>Choose existing person</Button>
        <Button aria-pressed={mode === "new"} disabled={creating} onClick={() => setMode("new")} type="button" variant={mode === "new" ? "primary" : "secondary"}>Create new person</Button>
      </div>

      <div hidden={mode !== "existing"}>
        {people.length ? (
          <form action="/studio/organization/people/new" className="grid gap-4" method="get">
            <input name="unit" type="hidden" value={unit.id} />
            <p className="text-sm text-[var(--text-secondary)]">Choose someone already in Lotura. You’ll pick their job title in this Unit next.</p>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Person<RequiredMark /></span>
              <Select name="person" onChange={(event) => setPersonId(event.target.value)} required value={personId}>
                <option value="">Choose a person</option>
                {people.map((person) => {
                  const context = personContext(person);
                  const ambiguous = people.some((other) => other.id !== person.id && other.name === person.name && personContext(other) === context);
                  return <option key={person.id} value={person.id}>{person.name} — {context}{ambiguous ? ` · Record ${person.id.slice(-8)}` : ""}</option>;
                })}
              </Select>
            </label>
            {selected ? <Link className="text-sm text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/people/${encodeURIComponent(selected.id)}`}>View {selected.name}’s existing record →</Link> : null}
            <p className="text-xs text-[var(--text-secondary)]">This won’t create a duplicate person or change their current assignments. Nothing changes until you save an assignment.</p>
            <div><Button disabled={!selected} type="submit" variant="primary">Continue with this person</Button></div>
          </form>
        ) : <p className="text-sm text-[var(--text-secondary)]">No active people are recorded yet. Choose Create new person to add someone.</p>}
      </div>

      {/* Keep entered creation details when switching between the two choices. */}
      <div hidden={mode !== "new"}>
        <StructureCreateForm data={data} entityType="person" initialUnitStableKey={unit.id} onPendingChange={setCreating} />
      </div>
    </div>
  );
}
