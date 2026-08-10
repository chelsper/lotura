import Link from "next/link";

import type {
  OrganizationStructureData,
  OrganizationUnit,
} from "@/lib/organization-structure-data.mjs";
import type { StructureChangeSummary } from "@/lib/organization-structure-administration";

import { ArrowIcon, OrganizationIcon, RoleIcon } from "../ui/icons";
import { Alert, Badge, Card, EmptyState } from "../ui/primitives";
import { StructureContext } from "./structure-context";
import { StructureAdministrationPanel } from "./structure-administration-panel";

function unitHref(id: string) {
  return `/organization/units/${encodeURIComponent(id)}`;
}

function positionHref(id: string) {
  return `/organization/positions/${encodeURIComponent(id)}`;
}

function processHref(id: string) {
  return `/explorer/${encodeURIComponent(id)}`;
}

export function OrganizationUnitDetail({
  administrationEnabled,
  changes,
  data,
  unit,
}: {
  administrationEnabled: boolean;
  changes: StructureChangeSummary[];
  data: OrganizationStructureData;
  unit: OrganizationUnit;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--workspace-accent)]" href="/organization">
          Organization
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--text-secondary)]">{unit.name}</span>
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-7 sm:pb-9">
        <div className="flex flex-wrap gap-2">
          <Badge tone={unit.status === "active" ? "success" : "neutral"}>
            {unit.status}
          </Badge>
          {unit.isProvisional ? <Badge tone="warning">Provisional Unit</Badge> : null}
        </div>
        <h1 className="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
          {unit.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Review the Positions documented within this Unit and how their
          Operational Roles connect the structure to Processes.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <OrganizationIcon className="size-3.5" />
            Unit hierarchy
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] text-[var(--text-tertiary)]">Parent Unit</dt>
              <dd className="mt-1 text-sm text-[var(--text)]">
                {unit.parent ? (
                  <Link className="font-medium hover:text-[var(--workspace-accent)]" href={unitHref(unit.parent.id)}>
                    {unit.parent.name}
                  </Link>
                ) : (
                  "No parent Unit recorded"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--text-tertiary)]">Child Units</dt>
              <dd className="mt-1 text-sm text-[var(--text)]">
                {unit.children.length > 0
                  ? unit.children.map((child, index) => (
                      <span key={child.id}>
                        {index > 0 ? ", " : null}
                        <Link className="font-medium hover:text-[var(--workspace-accent)]" href={unitHref(child.id)}>
                          {child.name}
                        </Link>
                      </span>
                    ))
                  : "No child Units recorded"}
              </dd>
            </div>
          </dl>
        </Card>
        <StructureContext compact data={data} />
      </div>

      {unit.isProvisional ? (
        <Alert className="mt-4" tone="warning">
          Provisional Unit — hierarchy has not been established. Lotura is
          preserving the reviewed source grouping without inferring where this
          Unit belongs.
        </Alert>
      ) : null}

      <section aria-labelledby="unit-positions" className="py-7 sm:py-9">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Structural seats</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]" id="unit-positions">
              Positions in this Unit
            </h2>
          </div>
          <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
            {unit.positions.length}
          </span>
        </div>
        <Card className="mt-4 overflow-hidden">
          {unit.positions.length > 0 ? (
            unit.positions.map((position) => (
              <Link
                className="group flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)] sm:px-5"
                href={positionHref(position.id)}
                key={position.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text)]">{position.title}</h3>
                    <Badge tone={position.occupancy.tone}>{position.occupancy.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {position.assignments.length > 0
                      ? position.assignments
                          .map((assignment) => `${assignment.person.name} · ${assignment.typeLabel}`)
                          .join("; ")
                      : "No current Person recorded"}
                  </p>
                </div>
                <ArrowIcon className="size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))
          ) : (
            <div className="p-5">
              <EmptyState title="No Positions recorded">
                This Unit has no current Position records in the snapshot.
              </EmptyState>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-5 pb-8 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Across Unit boundaries</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Cross-Unit reporting</h2>
          <div className="mt-4 space-y-3">
            {unit.crossUnitRelationships.length > 0 ? (
              unit.crossUnitRelationships.map((relationship) => (
                <div className="rounded-[10px] border border-[var(--border)] p-3" key={relationship.id}>
                  <Badge>{relationship.typeLabel}</Badge>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                    <Link className="font-medium text-[var(--text)] hover:text-[var(--workspace-accent)]" href={positionHref(relationship.subordinate.id)}>
                      {relationship.subordinate.title}
                    </Link>{" "}
                    reports to{" "}
                    <Link className="font-medium text-[var(--text)] hover:text-[var(--workspace-accent)]" href={positionHref(relationship.manager.id)}>
                      {relationship.manager.title}
                    </Link>
                    .
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs leading-5 text-[var(--text-tertiary)]">No cross-Unit reporting relationships are recorded for this Unit.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <RoleIcon className="size-3.5" /> Operational responsibility
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Roles and connected Processes</h2>
          <div className="mt-4 space-y-4">
            {unit.roles.length > 0 ? (
              unit.roles.map((role) => (
                <div key={`${role.id}-${role.mandateType}-${role.scope ?? ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text)]">{role.name}</p>
                    <Badge>{role.mandateTypeLabel}</Badge>
                  </div>
                  {role.scope ? <p className="mt-1 text-xs text-[var(--text-tertiary)]">Scope: {role.scope}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-tertiary)]">No current role mandates are documented for Positions in this Unit.</p>
            )}
          </div>
          {unit.processes.length > 0 ? (
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Processes reached through those Roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unit.processes.map((process) => (
                  <Link className="rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--workspace-accent-border)] hover:text-[var(--workspace-accent)]" href={processHref(process.id)} key={process.id}>
                    {process.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </section>
      {administrationEnabled ? (
        <StructureAdministrationPanel
          changes={changes}
          data={data}
          entity={unit}
          entityType="organization_unit"
        />
      ) : null}
    </div>
  );
}
