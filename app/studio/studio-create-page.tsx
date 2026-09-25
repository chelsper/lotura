import Link from "next/link";

import type { OrganizationPerson, OrganizationStructureData } from "@/lib/organization-structure-data.mjs";

import { Alert, Card } from "../ui/primitives";
import { StructureCreateForm } from "./organization/structure-create-form";
import { UnitPersonPlacement } from "./organization/unit-person-placement";
import { UnitPersonPicker } from "./organization/unit-person-picker";

type CreationType = "organization_unit" | "position" | "person";

export function StudioCreatePage({
  data,
  entityType,
  initialUnitStableKey,
  savedPerson,
}: {
  data: OrganizationStructureData;
  entityType: CreationType;
  initialUnitStableKey?: string;
  savedPerson?: OrganizationPerson;
}) {
  const unit = data.units.find((item) => item.id === initialUnitStableKey && item.status === "active");
  const backHref = unit ? `/studio/organization/units/${encodeURIComponent(unit.id)}` : "/studio/organization";
  const presentation = {
    organization_unit: {
      description: unit ? `Add a team within ${unit.name}. People and job titles can be added later.` : "Add a team or department. People and job titles can be added later.",
      label: unit ? "child Unit" : "Organization Unit",
    },
    person: {
      description: unit ? `Choose someone already in Lotura or create a new person. Assign their job title in ${unit.name} now or later.` : "Add a person to the organization. A job title can wait; this does not create a login.",
      label: "person",
    },
    position: {
      description: unit ? `Add a job title in ${unit.name}. People, managers, and responsibilities can wait.` : "Add a job title. People, managers, and responsibilities can wait.",
      label: "job title",
    },
  }[entityType];

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--workspace-accent)]" href="/studio">
          Workspace Studio
        </Link>
        <span aria-hidden="true">/</span>
        <Link className="hover:text-[var(--workspace-accent)]" href="/studio/organization">
          Organization
        </Link>
        <span aria-hidden="true">/</span>
        {unit ? <><Link className="hover:text-[var(--workspace-accent)]" href={backHref}>{unit.name}</Link><span aria-hidden="true">/</span></> : null}
        <span className="text-[var(--text-secondary)]">{savedPerson ? "Choose a job title" : `Add ${presentation.label}`}</span>
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-7 sm:pb-9">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">Organization Builder</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
          {savedPerson ? `Choose a job title for ${savedPerson.name}` : `Add ${presentation.label}`}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          {savedPerson ? "Choose a job title below, or leave it for later. Their record is already saved." : presentation.description}
        </p>
      </header>

      {!unit ? <Alert className="mt-6" tone="warning">Review possible duplicates before adding a separate record.</Alert> : null}
      <Card className="mt-5 p-4 sm:p-6">
        {savedPerson && unit ? <UnitPersonPlacement data={data} person={savedPerson} unit={unit} /> : entityType === "person" && unit ? <UnitPersonPicker data={data} unit={unit} /> : <StructureCreateForm
          data={data}
          entityType={entityType}
          initialUnitStableKey={initialUnitStableKey}
        />}
      </Card>
      {!savedPerson ? <Link className="mt-5 inline-block text-sm font-medium text-[var(--workspace-accent)]" href={backHref}>Cancel and return to {unit?.name ?? "Organization"}</Link> : null}
    </div>
  );
}
