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
import { OrganizationNavigation } from "./organization-navigation";

type StudioEntity = OrganizationUnit | OrganizationPosition | OrganizationPerson;

function documentedUnit(entity: StudioEntity, entityType: StructureEntityType) {
  if (entityType === "organization_unit") return entity as OrganizationUnit;
  if (entityType === "position") return (entity as OrganizationPosition).unit ?? undefined;
  const units = new Map(
    (entity as OrganizationPerson).assignments.flatMap(({ position }) => position.unit ? [[position.unit.id, position.unit] as const] : []),
  );
  return units.size === 1 ? units.values().next().value : undefined;
}

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
      <OrganizationNavigation
        activeView={entityType === "person" ? "people" : entityType === "position" ? "positions" : "units"}
        unit={documentedUnit(entity, entityType)}
      />
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
        <UnitRoster data={data} unit={entity as OrganizationUnit} />
      ) : null}

      {entityType === "position" ? (
        <PositionConnections position={entity as OrganizationPosition} />
      ) : null}

      {entityType === "person" && (entity as OrganizationPerson).assignments.length > 0 ? (
        <Card className="mt-6 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--text)]">Job titles</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            Job titles belong to Positions. Choose the Position you want to update; this does not change the person’s name or move them to a different job.
          </p>
          <ul className="mt-3 space-y-3">
            {(entity as OrganizationPerson).assignments.map((assignment) => (
              <li className="flex flex-wrap items-center justify-between gap-2" key={assignment.id}>
                <div>
                  <Link className="text-sm font-medium text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/positions/${encodeURIComponent(assignment.position.id)}`}>{assignment.position.title}</Link>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {assignment.position.unit ? <Link className="hover:text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/units/${encodeURIComponent(assignment.position.unit.id)}`}>{assignment.position.unit.name}</Link> : "No Organization Unit recorded"}
                  </p>
                </div>
                <Link className="text-sm font-medium text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/positions/${encodeURIComponent(assignment.position.id)}#edit-position`}>
                  Edit title →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

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

function PositionConnections({ position }: { position: OrganizationPosition }) {
  const links = [
    ...(position.unit ? [{ label: `Unit: ${position.unit.name}`, href: `/studio/organization/units/${encodeURIComponent(position.unit.id)}` }] : []),
    ...position.assignments.map((assignment) => ({ label: `${assignment.typeLabel}: ${assignment.person.name}`, href: `/studio/organization/people/${encodeURIComponent(assignment.person.id)}` })),
    ...position.mandates.filter((mandate) => mandate.role.stableKey).map((mandate) => ({ label: `Responsibility: ${mandate.role.name}`, href: `/studio/responsibilities/roles/${encodeURIComponent(mandate.role.stableKey!)}${position.unit ? `?unit=${encodeURIComponent(position.unit.id)}` : ""}` })),
    ...(position.primaryManager ? [{ label: `Reports to: ${position.primaryManager.position.title}`, href: `/studio/organization/positions/${encodeURIComponent(position.primaryManager.position.id)}` }] : []),
  ];
  if (links.length === 0) return null;
  return (
    <nav aria-label="Connected organizational records" className="mt-5 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--workspace-accent)] hover:bg-[var(--surface-subtle)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]" href={link.href} key={`${link.href}:${link.label}`}>
          {link.label} <span aria-hidden="true">→</span>
        </Link>
      ))}
    </nav>
  );
}

function UnitRoster({ data, unit }: { data: OrganizationStructureData; unit: OrganizationUnit }) {
  const positions = data.positions.filter((position) => position.unit?.id === unit.id);
  return (
    <section aria-labelledby="unit-people-job-titles" className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]" id="unit-people-job-titles">People and job titles</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">In this Unit only. Open a child Unit below to see its team.</p>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">{positions.length} {positions.length === 1 ? "Position" : "Positions"}</span>
      </div>
      <Card className="mt-3 overflow-hidden">
        {positions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs text-[var(--text-secondary)]">
                <tr><th className="px-4 py-3 font-medium" scope="col">Job title</th><th className="px-4 py-3 font-medium" scope="col">People</th></tr>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="p-5 text-sm text-[var(--text-secondary)]">No job titles have been recorded directly in this Unit yet.</p>}
      </Card>
    </section>
  );
}
