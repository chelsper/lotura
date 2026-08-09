import Link from "next/link";

import type {
  OrganizationPosition,
  OrganizationStructureData,
} from "@/lib/organization-structure-data.mjs";

import { RoleIcon, SystemIcon } from "../ui/icons";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  ExpandableSection,
} from "../ui/primitives";
import { formatOperatingModelTimestamp } from "../workspace-shell";
import { FocusedHierarchy } from "./focused-hierarchy";
import { StructureContext } from "./structure-context";

function personHref(id: string) {
  return `/organization/people/${encodeURIComponent(id)}`;
}

function unitHref(id: string) {
  return `/organization/units/${encodeURIComponent(id)}`;
}

function processHref(id: string) {
  return `/explorer/${encodeURIComponent(id)}`;
}

function period(from: string, until: string | null) {
  return `${formatOperatingModelTimestamp(from)} UTC${until ? ` – ${formatOperatingModelTimestamp(until)} UTC` : " – present"}`;
}

export function PositionDetail({
  data,
  position,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--workspace-accent)]" href="/organization">
          Organization
        </Link>
        {position.unit ? (
          <>
            <span aria-hidden="true">/</span>
            <Link className="hover:text-[var(--workspace-accent)]" href={unitHref(position.unit.id)}>
              {position.unit.name}
            </Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="text-[var(--text-secondary)]">{position.title}</span>
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-7 sm:pb-9">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={position.status === "active" ? "success" : "neutral"}>{position.status}</Badge>
          <Badge tone={position.occupancy.tone}>{position.occupancy.label}</Badge>
        </div>
        <h1 className="mt-4 max-w-4xl text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
          {position.title}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {position.unit ? (
            <Link className="font-medium hover:text-[var(--workspace-accent)]" href={unitHref(position.unit.id)}>
              {position.unit.name}
            </Link>
          ) : (
            "No Organization Unit is recorded for this Position."
          )}
        </p>
        <div className="mt-5 grid gap-px overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
          {[
            ["Position", "Durable structural seat"],
            ["Operational Role", "Durable responsibility"],
            ["Person", "Current human coverage"],
          ].map(([label, description]) => (
            <div className="bg-[var(--surface-subtle)] p-3.5" key={label}>
              <p className="text-xs font-semibold text-[var(--text)]">{label}</p>
              <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{description}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          Position is structural. Operational Role is responsibility. Person is current human coverage.
        </p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)]">Position assignments</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Current occupants and coverage</h2>
            </div>
            <span className="text-xs tabular-nums text-[var(--text-tertiary)]">{position.assignments.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {position.assignments.length > 0 ? (
              position.assignments.map((assignment) => (
                <div className="rounded-[10px] border border-[var(--border)] p-3" key={assignment.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link className="text-sm font-semibold text-[var(--text)] hover:text-[var(--workspace-accent)]" href={personHref(assignment.person.id)}>
                      {assignment.person.name}
                    </Link>
                    <Badge tone={["acting", "interim"].includes(assignment.type) ? "warning" : "neutral"}>
                      {assignment.typeLabel}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{period(assignment.effectiveFrom, assignment.effectiveUntil)}</p>
                  {assignment.reason ? <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{assignment.reason}</p> : null}
                </div>
              ))
            ) : (
              <EmptyState title={position.occupancy.id === "vacant" ? "Vacant Position" : "No current Assignment recorded"}>
                {position.occupancy.id === "vacant"
                  ? "This vacancy is shown only because the snapshot states that vacancy evidence is complete for its reviewed scope."
                  : "Lotura cannot infer a vacancy from missing Assignment evidence."}
              </EmptyState>
            )}
          </div>
        </Card>
        <StructureContext compact data={data} />
      </div>

      <div className="mt-5">
        <FocusedHierarchy position={position} />
      </div>

      <section aria-labelledby="responsibility" className="py-7 sm:py-9">
        <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
          <RoleIcon className="size-3.5" /> Operating-model responsibility
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]" id="responsibility">
          Operational Roles held by this Position
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Role mandates connect the structural Position to durable operational
          responsibility. A title or reporting line never creates this connection automatically.
        </p>

        <div className="mt-5 space-y-4">
          {position.mandates.length > 0 ? (
            position.mandates.map((mandate) => (
              <ExpandableSection
                count={`${mandate.processes.length} ${mandate.processes.length === 1 ? "Process" : "Processes"}`}
                defaultOpen
                description={mandate.scope ? `Scope: ${mandate.scope}` : "No narrower scope is recorded."}
                eyebrow={mandate.typeLabel}
                key={mandate.id}
                title={mandate.role.name}
              >
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-tertiary)]">Role coverage</p>
                    <div className="mt-3 space-y-2">
                      {mandate.coverage.length > 0 ? (
                        mandate.coverage.map((coverage) => (
                          <div className="rounded-[10px] border border-[var(--border)] p-3" key={coverage.id}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Link className="text-xs font-semibold text-[var(--text)] hover:text-[var(--workspace-accent)]" href={personHref(coverage.person.id)}>
                                {coverage.person.name}
                              </Link>
                              <Badge tone={coverage.type === "permanent" ? "neutral" : "warning"}>{coverage.typeLabel}</Badge>
                            </div>
                            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{period(coverage.effectiveFrom, coverage.effectiveUntil)}</p>
                            {coverage.reason ? <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{coverage.reason}</p> : null}
                          </div>
                        ))
                      ) : (
                        <Alert tone="warning">This role mandate has no current person-level role coverage recorded.</Alert>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[var(--text-tertiary)]">Connected Processes</p>
                    <div className="mt-3 space-y-2">
                      {mandate.processes.length > 0 ? (
                        mandate.processes.map((process) => (
                          <Link className="block rounded-[10px] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]" href={processHref(process.id)} key={process.id}>
                            <p className="text-xs font-semibold text-[var(--text)]">{process.name}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{process.relationships.join(" · ")}</p>
                          </Link>
                        ))
                      ) : (
                        <p className="text-xs leading-5 text-[var(--text-tertiary)]">No Processes are connected through this Operational Role.</p>
                      )}
                    </div>
                  </div>
                </div>
              </ExpandableSection>
            ))
          ) : (
            <Alert tone="warning">
              No current role mandates are recorded for this Position. Lotura
              does not infer Operational Roles from the Position title or reporting hierarchy.
            </Alert>
          )}
        </div>
      </section>

      <section className="grid gap-5 pb-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <SystemIcon className="size-3.5" /> Systems through connected Processes
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {position.systems.length > 0 ? (
              position.systems.map((system) => (
                <div className="rounded-[10px] border border-[var(--border)] p-3" key={system.id}>
                  <p className="text-sm font-semibold text-[var(--text)]">{system.name}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{system.usage}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-tertiary)]">No Systems are reached through this Position’s documented Operational Roles.</p>
            )}
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Effective structural record</p>
          <p className="mt-2 text-sm font-medium text-[var(--text)]">{period(position.effectiveFrom, position.effectiveUntil)}</p>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            All current Assignments, reporting relationships, mandates, and
            coverage on this page are evaluated at the common visible as-of timestamp.
          </p>
        </Card>
      </section>
    </div>
  );
}
