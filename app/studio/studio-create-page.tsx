import Link from "next/link";

import type { OrganizationStructureData } from "@/lib/organization-structure-data.mjs";

import { Alert, Card } from "../ui/primitives";
import { StructureCreateForm } from "./organization/structure-create-form";

type CreationType = "organization_unit" | "position" | "person";

export function StudioCreatePage({
  data,
  entityType,
}: {
  data: OrganizationStructureData;
  entityType: CreationType;
}) {
  const presentation = {
    organization_unit: {
      description: "Add a durable grouping for Positions without inferring reporting relationships or operational responsibility.",
      label: "Organization Unit",
    },
    person: {
      description: "Add a human being to the organizational model without creating a Lotura account or assigning a Position.",
      label: "Person",
    },
    position: {
      description: "Add a durable structural seat. Position occupancy and Operational Roles are attached separately.",
      label: "Position",
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
        <span className="text-[var(--text-secondary)]">Add {presentation.label}</span>
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-7 sm:pb-9">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">Organization Builder</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
          Add {presentation.label}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          {presentation.description}
        </p>
      </header>

      <Alert className="mt-6" tone="warning">
        Canonical existence does not establish institutional approval. Review possible duplicates and record the reason and effective date honestly.
      </Alert>
      <Card className="mt-5 p-4 sm:p-6">
        <StructureCreateForm data={data} entityType={entityType} />
      </Card>
    </div>
  );
}
