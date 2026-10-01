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
import { StructureEditingDisclosure } from "./structure-editing-disclosure";
import { UnitRoster } from "./unit-roster";

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
      description: `${unit.positions.length} ${unit.positions.length === 1 ? "job title" : "job titles"} · ${unit.parent ? `Within ${unit.parent.name}` : "No parent Unit recorded"}`,
      label: "Organization Unit",
      title: unit.name,
    };
  }
  if (entityType === "position") {
    const position = entity as OrganizationPosition;
    return {
      browseHref: `/organization/positions/${encodeURIComponent(position.id)}`,
      description: `${position.unit?.name ?? "Organization Unit not yet recorded"} · ${position.occupancy.id === "not_established" ? "Person not yet recorded" : position.occupancy.label}`,
      label: "Job title",
      title: position.title,
    };
  }
  const person = entity as OrganizationPerson;
  return {
    browseHref: `/organization/people/${encodeURIComponent(person.id)}`,
    description:
      person.assignments.length > 0
        ? person.assignments.map((item) => item.position.title).join(" · ")
        : "Job title not yet recorded",
    label: "Person",
    title: person.name,
  };
}

export function StudioStructureDetail({
  changes,
  data,
  entity,
  entityType,
  workDiscoveryEnabled = false,
}: {
  changes: StructureChangeSummary[];
  data: OrganizationStructureData;
  entity: StudioEntity;
  entityType: StructureEntityType;
  workDiscoveryEnabled?: boolean;
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
            Explore connections <ArrowIcon className="size-3.5" />
          </Link>
        </div>
      </header>

      {entityType === "organization_unit" ? (
        <UnitRoster data={data} unit={entity as OrganizationUnit} />
      ) : null}

      {entityType === "position" && entity.status === "active" && workDiscoveryEnabled ? (
        <Card className="mt-6 flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">What does this job involve?</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Describe the work first. Sort out responsibilities and processes with Lotura.</p>
          </div>
          <Link className="shrink-0 rounded-lg bg-[var(--workspace-accent)] px-4 py-3 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]" href={`/studio/organization/positions/${encodeURIComponent(entity.id)}/describe-work`}>
            Help me describe this work →
          </Link>
        </Card>
      ) : null}

      {entityType === "position" ? (
        <PositionOverview position={entity as OrganizationPosition} />
      ) : null}

      {entityType === "person" && (entity as OrganizationPerson).assignments.length > 0 ? (
        <Card className="mt-6 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--text)]">Job titles</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            Open a job title to see the people, responsibilities, and work connected to it.
          </p>
          <details className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            <summary className="cursor-pointer font-medium text-[var(--workspace-accent)]">About job titles</summary>
            <p className="mt-2">A job title names a Position—the place someone fills in the organization. Editing the title changes it for everyone assigned to that Position, not just this person.</p>
          </details>
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

      <StructureEditingDisclosure
        key={`${entityType}:${entity.id}`}
        editAnchor={entityType === "position" ? "edit-position" : undefined}
        label={entityType === "position" ? "Edit job details and view history" : entityType === "person" ? "Edit person details and view history" : "Edit Unit details and view history"}
      >
        <StructureAdministrationPanel
          changes={changes}
          data={data}
          entity={entity}
          entityType={entityType}
        />
      </StructureEditingDisclosure>
    </div>
  );
}

function PositionOverview({ position }: { position: OrganizationPosition }) {
  const processes = [...new Map(position.mandates.flatMap((mandate) => mandate.processes.map((process) => [process.id, process] as const))).values()]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const linkClass = "font-medium text-[var(--workspace-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]";
  return <Card className="mt-6 p-4 sm:p-5">
    <section aria-labelledby="job-overview">
      <h2 className="text-xl font-semibold text-[var(--text)]" id="job-overview">This job at a glance</h2>
      <dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-[var(--text-secondary)]">People in this job</dt>
          <dd className="mt-2">
            {position.assignments.length ? <ul className="space-y-2">{position.assignments.map((assignment) => <li key={assignment.id}>
              <Link className={linkClass} href={`/studio/organization/people/${encodeURIComponent(assignment.person.id)}`}>{assignment.person.name} →</Link>
              <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">{assignment.typeLabel}</span>
            </li>)}</ul> : <span className="text-[var(--text-secondary)]">{position.occupancy.id === "vacant" ? "Vacant" : "Person not yet recorded"}</span>}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--text-secondary)]">Organization Unit</dt>
          <dd className="mt-2">{position.unit ? <Link className={linkClass} href={`/studio/organization/units/${encodeURIComponent(position.unit.id)}`}>{position.unit.name} →</Link> : <span className="text-[var(--text-secondary)]">Not yet recorded</span>}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--text-secondary)]">Reports to <span className="text-xs font-normal">· Primary manager</span></dt>
          <dd className="mt-2">{position.primaryManager ? <Link className={linkClass} href={`/studio/organization/positions/${encodeURIComponent(position.primaryManager.position.id)}`}>{position.primaryManager.position.title} →</Link> : <span className="text-[var(--text-secondary)]">Not yet recorded</span>}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--text-secondary)]">Linked responsibilities</dt>
          <dd className="mt-2">{position.mandates.length ? <ul className="space-y-2">{position.mandates.map((mandate) => <li key={mandate.id}>
            {mandate.role.stableKey ? <Link className={linkClass} href={`/studio/responsibilities/roles/${encodeURIComponent(mandate.role.stableKey)}${position.unit ? `?unit=${encodeURIComponent(position.unit.id)}` : ""}`}>{mandate.role.name} →</Link> : <span>{mandate.role.name}</span>}
            {mandate.typeLabel || mandate.scope ? <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">{[mandate.typeLabel, mandate.scope].filter(Boolean).join(" · ")}</span> : null}
          </li>)}</ul> : <span className="text-[var(--text-secondary)]">Not yet recorded</span>}</dd>
        </div>
      </dl>
      {processes.length ? <details className="mt-5 border-t border-[var(--border)] pt-4 text-sm">
        <summary className="cursor-pointer font-medium text-[var(--workspace-accent)]">Explore {processes.length} connected {processes.length === 1 ? "Process" : "Processes"}</summary>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">Connected through recorded responsibilities. A connection does not by itself mean ownership.</p>
        <ul className="mt-3 space-y-2">{processes.map((process) => <li className="flex flex-wrap items-center gap-2" key={process.id}>
          <Link className={linkClass} href={`/explorer/${encodeURIComponent(process.id)}`}>{process.name} →</Link>
          {process.status === "draft" ? <Badge>Draft</Badge> : process.status === "archived" ? <Badge>Archived</Badge> : null}
        </li>)}</ul>
      </details> : <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-tertiary)]">Connected Processes: not yet recorded.</p>}
    </section>
  </Card>;
}
