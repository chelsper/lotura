import Link from "next/link";

import type {
  OrganizationPerson,
  OrganizationStructureData,
} from "@/lib/organization-structure-data.mjs";
import type { StructureChangeSummary } from "@/lib/organization-structure-administration";

import { RoleIcon } from "../ui/icons";
import { Alert, Badge, Card, EmptyState } from "../ui/primitives";
import { formatOperatingModelTimestamp } from "../workspace-shell";
import { StructureAdministrationPanel } from "./structure-administration-panel";
import { StructureContext } from "./structure-context";

function positionHref(id: string) {
  return `/organization/positions/${encodeURIComponent(id)}`;
}

function processHref(id: string) {
  return `/explorer/${encodeURIComponent(id)}`;
}

function period(from: string, until: string | null) {
  return `${formatOperatingModelTimestamp(from)} UTC${until ? ` – ${formatOperatingModelTimestamp(until)} UTC` : " – present"}`;
}

export function PersonDetail({
  administrationEnabled,
  changes,
  data,
  person,
}: {
  administrationEnabled: boolean;
  changes: StructureChangeSummary[];
  data: OrganizationStructureData;
  person: OrganizationPerson;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--workspace-accent)]" href="/organization">
          Organization
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--text-secondary)]">{person.name}</span>
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-7 sm:pb-9">
        <div className="flex flex-wrap gap-2">
          <Badge tone={person.status === "active" ? "success" : "neutral"}>{person.status}</Badge>
          <Badge>Organizational context only</Badge>
        </div>
        <h1 className="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
          {person.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          This page shows only documented Position and Operational Role context.
          A Person in the organizational model is not necessarily a Lotura User.
        </p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Current structural occupancy</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Position Assignments</h2>
          <div className="mt-4 space-y-3">
            {person.assignments.length > 0 ? (
              person.assignments.map((assignment) => (
                <Link
                  className="block rounded-[10px] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
                  href={positionHref(assignment.position.id)}
                  key={assignment.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{assignment.position.title}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{assignment.position.unit?.name ?? "No Organization Unit recorded"}</p>
                    </div>
                    <Badge tone={["acting", "interim"].includes(assignment.type) ? "warning" : "neutral"}>{assignment.typeLabel}</Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">{period(assignment.effectiveFrom, assignment.effectiveUntil)}</p>
                </Link>
              ))
            ) : (
              <EmptyState title="No current Position Assignment">
                No current structural seat is connected to this Person in the snapshot.
              </EmptyState>
            )}
          </div>
        </Card>
        <StructureContext compact data={data} />
      </div>

      <section className="grid gap-5 py-7 sm:py-9 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Derived through Positions</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Reporting context</h2>
          <div className="mt-4 space-y-4">
            {person.reportingContexts.length > 0 ? (
              person.reportingContexts.map((context) => (
                <div className="rounded-[10px] border border-[var(--border)] p-3" key={context.position.id}>
                  <Link className="text-xs font-semibold text-[var(--text)] hover:text-[var(--workspace-accent)]" href={positionHref(context.position.id)}>
                    {context.position.title}
                  </Link>
                  <dl className="mt-3 space-y-2 text-xs leading-5">
                    <div>
                      <dt className="text-[var(--text-tertiary)]">Manager Position</dt>
                      <dd className="text-[var(--text-secondary)]">
                        {context.primaryManager ? (
                          <Link className="font-medium text-[var(--text)] hover:text-[var(--workspace-accent)]" href={positionHref(context.primaryManager.position.id)}>
                            {context.primaryManager.position.title}
                          </Link>
                        ) : (
                          "Not recorded"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-tertiary)]">Direct-report Positions</dt>
                      <dd className="text-[var(--text-secondary)]">{context.directReports.length}</dd>
                    </div>
                  </dl>
                </div>
              ))
            ) : (
              <p className="text-xs leading-5 text-[var(--text-tertiary)]">Reporting context cannot be derived without a current Position Assignment.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <RoleIcon className="size-3.5" /> Documented human coverage
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Operational Role coverage</h2>
          <div className="mt-4 space-y-3">
            {person.coverages.length > 0 ? (
              person.coverages.map((coverage) => (
                <div className="rounded-[10px] border border-[var(--border)] p-3" key={coverage.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text)]">{coverage.role.name}</p>
                    <Badge tone={coverage.type === "permanent" ? "neutral" : "warning"}>{coverage.typeLabel}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Through{" "}
                    <Link className="font-medium text-[var(--text)] hover:text-[var(--workspace-accent)]" href={positionHref(coverage.position.id)}>
                      {coverage.position.title}
                    </Link>
                    {coverage.scope ? ` · Scope: ${coverage.scope}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{period(coverage.effectiveFrom, coverage.effectiveUntil)}</p>
                  {coverage.reason ? <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{coverage.reason}</p> : null}
                </div>
              ))
            ) : (
              <Alert tone="info">
                No current role coverage is recorded. Position occupancy alone does not prove operational responsibility.
              </Alert>
            )}
          </div>
        </Card>
      </section>

      <Card className="mb-8 p-4 sm:p-5">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">Reached only through documented role coverage</p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Connected Processes</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {person.processes.length > 0 ? (
            person.processes.map((process) => (
              <Link className="rounded-[10px] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]" href={processHref(process.id)} key={process.id}>
                <p className="text-xs font-semibold text-[var(--text)]">{process.name}</p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{process.relationships.join(" · ")}</p>
              </Link>
            ))
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">No Processes are reached through this Person’s documented role coverage.</p>
          )}
        </div>
      </Card>
      {administrationEnabled ? (
        <StructureAdministrationPanel
          changes={changes}
          data={data}
          entity={person}
          entityType="person"
        />
      ) : null}
    </div>
  );
}
