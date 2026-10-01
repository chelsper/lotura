"use client";

import Link from "next/link";

import type { OrganizationPosition, StructureMandate } from "@/lib/organization-structure-data.mjs";

import { Badge, Button, Card } from "../ui/primitives";

export function UnitAtAGlance({ positions, onChooseCoverage, disabled = false }: {
  positions: OrganizationPosition[];
  onChooseCoverage: (position: OrganizationPosition, mandate: StructureMandate, trigger: HTMLButtonElement) => void;
  disabled?: boolean;
}) {
  const links = positions.flatMap((position) => position.mandates.map((mandate) => ({ position, mandate })));
  const roleCount = new Set(links.map(({ mandate }) => mandate.role.id)).size;
  const processes = [...new Map(links.flatMap(({ mandate }) => mandate.processes.map((process) => [process.id, process] as const))).values()]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const activeLinks = links.filter(({ position, mandate }) => position.status === "active" && mandate.role.status === "active");
  const missingPeople = activeLinks.filter(({ mandate }) => mandate.coverage.length === 0);

  function coverageRow({ position, mandate }: typeof links[number]) {
    return <li className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] py-3 first:border-t-0" key={`${position.id}:${mandate.id}`}>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{mandate.role.name}</p>
        <p className="mt-1 break-words text-xs text-[var(--text-secondary)]">{position.title}{mandate.scope ? ` · ${mandate.scope}` : ""}</p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">Person not yet recorded</p>
      </div>
      {position.revision && mandate.revision ? <Button
        aria-label={`Who does this work? ${mandate.role.name} — ${position.title}${mandate.scope ? ` — ${mandate.scope}` : ""}`}
        disabled={disabled}
        onClick={(event) => { if (!disabled) onChooseCoverage(position, mandate, event.currentTarget); }}
        size="sm"
        type="button"
      >Who does this work?</Button> : <Link className="text-xs font-medium text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/positions/${encodeURIComponent(position.id)}`}>Open job details →</Link>}
    </li>;
  }

  return <Card className="mt-6 p-4 sm:p-5">
    <section aria-labelledby="unit-at-a-glance">
      <h2 className="text-xl font-semibold" id="unit-at-a-glance" tabIndex={-1}>Your Unit at a glance</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">What’s recorded in this Unit. Add more whenever it’s useful.</p>
      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-[10px] bg-[var(--surface-subtle)] p-3">
        {[
          { label: "Job titles", count: positions.length },
          { label: "Linked responsibilities", count: roleCount },
          { label: "Connected Processes", count: processes.length },
        ].map(({ label, count }) => <div className="flex flex-col-reverse justify-end gap-1" key={label}>
          <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{count}</dd>
        </div>)}
      </dl>

      {missingPeople.length ? <div className="mt-4">
        <h3 className="text-sm font-semibold">Add people when you’re ready</h3>
        <ul className="mt-1">{missingPeople.slice(0, 3).map(coverageRow)}</ul>
        {missingPeople.length > 3 ? <details className="mt-1 text-sm">
          <summary className="cursor-pointer font-medium text-[var(--workspace-accent)]">Show {missingPeople.length - 3} more</summary>
          <ul className="mt-2">{missingPeople.slice(3).map(coverageRow)}</ul>
        </details> : null}
      </div> : <p className="mt-4 text-sm text-[var(--text-secondary)]">{activeLinks.length
        ? "Each active responsibility link has a person recorded. You can revisit these in the roster."
        : "You can link responsibilities from the roster when you’re ready."}</p>}

      {processes.length ? <details className="mt-4 border-t border-[var(--border)] pt-3 text-sm">
        <summary className="cursor-pointer font-medium text-[var(--workspace-accent)]">Explore {processes.length} connected {processes.length === 1 ? "Process" : "Processes"}</summary>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">Connected through documented responsibilities. These Processes may also involve other Units.</p>
        <ul className="mt-3 space-y-2">{processes.map((process) => <li className="flex flex-wrap items-center gap-2" key={process.id}>
          <Link className="break-words font-medium text-[var(--workspace-accent)] hover:underline" href={`/explorer/${encodeURIComponent(process.id)}`}>{process.name} →</Link>
          {process.status === "draft" ? <Badge>Draft</Badge> : process.status === "archived" ? <Badge>Archived</Badge> : null}
        </li>)}</ul>
      </details> : <p className="mt-3 text-xs text-[var(--text-tertiary)]">Connected Processes: not yet recorded.</p>}
    </section>
  </Card>;
}
