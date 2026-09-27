"use client";

import Link from "next/link";
import { useState } from "react";

import type { OrganizationStructureData, OrganizationUnit } from "@/lib/organization-structure-data.mjs";
import { personPickerOptions } from "@/lib/structure-picker-options";

import { Button } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/searchable-select";
import { StructureCreateForm } from "./structure-create-form";

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
            <SearchableSelect
              emptyContent={<Button disabled={creating} onClick={() => setMode("new")} type="button">Create new person</Button>}
              label="Person"
              name="person"
              onChange={(event) => setPersonId(event.target.value)}
              options={personPickerOptions(people)}
              placeholder="Choose a person"
              required
              value={personId}
            />
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
