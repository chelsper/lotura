import Link from "next/link";

import type {
  OrganizationPerson,
  OrganizationPosition,
  OrganizationStructureData,
  OrganizationUnit,
} from "@/lib/organization-structure-data.mjs";
import { organizationUnitPath } from "@/lib/organization-unit-hierarchy.mjs";
import type {
  StructureChangeSummary,
  StructureEntityType,
} from "@/lib/organization-structure-administration";

import { StructureAdministrationPanel } from "../organization/structure-administration-panel";
import { UnitHierarchyContext } from "../organization/unit-hierarchy-context";
import { ArrowIcon } from "../ui/icons";
import { Badge, Card } from "../ui/primitives";

type StudioEntity = OrganizationUnit | OrganizationPosition | OrganizationPerson;

function entityPresentation(entity: StudioEntity, entityType: StructureEntityType) {
  if (entityType === "organization_unit") {
    const unit = entity as OrganizationUnit;
    return {
      browseHref: `/organization/units/${encodeURIComponent(unit.id)}`,
      description: `${unit.positions.length} ${unit.positions.length === 1 ? "Position" : "Positions"} · ${unit.parent ? `Within ${unit.parent.name}` : "Root Unit"}`,
      label: "Organization Unit",
      title: unit.name,
    };
  }
  if (entityType === "position") {
    const position = entity as OrganizationPosition;
    return {
      browseHref: `/organization/positions/${encodeURIComponent(position.id)}`,
      description: `${position.unit?.name ?? "No Organization Unit recorded"} · ${position.occupancy.label}`,
      label: "Position",
      title: position.title,
    };
  }
  const person = entity as OrganizationPerson;
  return {
    browseHref: `/organization/people/${encodeURIComponent(person.id)}`,
    description:
      person.assignments.length > 0
        ? person.assignments.map((item) => item.position.title).join(" · ")
        : "No current Position Assignment recorded",
    label: "Person",
    title: person.name,
  };
}

export function StudioStructureDetail({
  changes,
  data,
  entity,
  entityType,
}: {
  changes: StructureChangeSummary[];
  data: OrganizationStructureData;
  entity: StudioEntity;
  entityType: StructureEntityType;
}) {
  const presentation = entityPresentation(entity, entityType);
  const hierarchyPath =
    entityType === "organization_unit"
      ? organizationUnitPath(data.units, entity.id)
      : [];
  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--workspace-accent)]" href="/studio">
          Workspace Studio
        </Link>
        <span aria-hidden="true">/</span>
        <Link className="hover:text-[var(--workspace-accent)]" href="/studio/organization">
          Organization
        </Link>
        {hierarchyPath.length > 0 ? (
          hierarchyPath.map((item) => (
            <span className="flex items-center gap-2" key={item.id}>
              <span aria-hidden="true">/</span>
              {item.id === entity.id ? (
                <span className="text-[var(--text-secondary)]">{item.name}</span>
              ) : (
                <Link
                  className="hover:text-[var(--workspace-accent)]"
                  href={`/studio/organization/units/${encodeURIComponent(item.id)}`}
                >
                  {item.name}
                </Link>
              )}
            </span>
          ))
        ) : (
          <>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--text-secondary)]">{presentation.title}</span>
          </>
        )}
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-7 sm:pb-9">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{presentation.label}</Badge>
          <Badge tone={entity.status === "active" ? "success" : "neutral"}>
            {entity.status}
          </Badge>
        </div>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
              {presentation.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {presentation.description}
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)] hover:underline"
            href={presentation.browseHref}
          >
            View organizational context <ArrowIcon className="size-3.5" />
          </Link>
        </div>
      </header>

      {entityType === "organization_unit" ? (
        <div className="mt-6">
          <UnitHierarchyContext
            addChildHref={`/studio/organization/units/new?parent=${encodeURIComponent(entity.id)}`}
            basePath="/studio/organization"
            data={data}
            unit={entity as OrganizationUnit}
          />
        </div>
      ) : null}

      <Card className="mt-6 p-4 sm:p-5">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">How changes are recorded</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Imported source information remains unchanged. Every saved update changes the current documented structure and adds a history entry at the same time.
        </p>
      </Card>

      <StructureAdministrationPanel
        changes={changes}
        data={data}
        entity={entity}
        entityType={entityType}
      />
    </div>
  );
}
