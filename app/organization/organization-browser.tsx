"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  OrganizationPerson,
  OrganizationPosition,
  OrganizationStructureData,
  OrganizationUnit,
} from "@/lib/organization-structure-data.mjs";
import type { OrganizationUnitHierarchyNode } from "@/lib/organization-unit-hierarchy.mjs";
import {
  buildOrganizationUnitHierarchy,
  organizationUnitPath,
} from "@/lib/organization-unit-hierarchy.mjs";

import {
  ArrowIcon,
  OrganizationIcon,
  RoleIcon,
} from "../ui/icons";
import {
  Badge,
  Card,
  EmptyState,
  SearchField,
  cn,
} from "../ui/primitives";

type BrowserView = "units" | "positions" | "people";

function entityHref(basePath: string, type: BrowserView, id: string) {
  return `${basePath}/${type}/${encodeURIComponent(id)}`;
}

function UnitRow({
  basePath,
  hierarchyPath,
  unit,
}: {
  basePath: string;
  hierarchyPath?: string;
  unit: OrganizationUnit;
}) {
  return (
    <Link
      className="group flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)] sm:px-5"
      href={entityHref(basePath, "units", unit.id)}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {unit.name}
          </h3>
          {unit.isProvisional ? <Badge tone="warning">Provisional</Badge> : null}
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {unit.positions.length} {unit.positions.length === 1 ? "Position" : "Positions"}
          {` · ${unit.children.length} direct ${unit.children.length === 1 ? "child Unit" : "child Units"}`}
        </p>
        {hierarchyPath ? (
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            {hierarchyPath}
          </p>
        ) : null}
      </div>
      <ArrowIcon className="size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--workspace-accent)]" />
    </Link>
  );
}

function UnitTreeNode({
  basePath,
  node,
}: {
  basePath: string;
  node: OrganizationUnitHierarchyNode;
}) {
  const [expanded, setExpanded] = useState(node.depth === 0);
  const hasChildren = node.children.length > 0;
  return (
    <div
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={false}
      role="treeitem"
    >
      <div
        className="flex items-center gap-2 border-b border-[var(--border)] pr-4 transition-colors hover:bg-[var(--surface-subtle)] sm:pr-5"
        style={{ paddingLeft: `${Math.min(node.depth, 8) * 20 + 12}px` }}
      >
        {hasChildren ? (
          <button
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.unit.name}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-sm text-[var(--text-tertiary)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
        ) : (
          <span aria-hidden="true" className="size-7 shrink-0" />
        )}
        <Link
          className="group flex min-w-0 flex-1 items-center justify-between gap-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)]"
          href={entityHref(basePath, "units", node.unit.id)}
        >
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-[var(--text)]">
                {node.unit.name}
              </span>
              {node.unit.isProvisional ? <Badge tone="warning">Provisional</Badge> : null}
            </span>
            <span className="mt-1 block text-xs text-[var(--text-secondary)]">
              {node.unit.positions.length} {node.unit.positions.length === 1 ? "Position" : "Positions"}
              {` · ${node.children.length} direct ${node.children.length === 1 ? "child" : "children"}`}
              {node.descendantCount > node.children.length
                ? ` · ${node.descendantCount} total descendants`
                : ""}
            </span>
          </span>
          <ArrowIcon className="size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--workspace-accent)]" />
        </Link>
      </div>
      {hasChildren && expanded ? (
        <div role="group">
          {node.children.map((child) => (
            <UnitTreeNode basePath={basePath} key={child.unit.id} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PositionRow({ basePath, position }: { basePath: string; position: OrganizationPosition }) {
  return (
    <Link
      className="group flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)] sm:px-5"
      href={entityHref(basePath, "positions", position.id)}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {position.title}
          </h3>
          <Badge tone={position.occupancy.tone}>{position.occupancy.label}</Badge>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {position.unit?.name ?? "No Organization Unit recorded"}
          {position.assignments.length > 0
            ? ` · ${position.assignments.map((item) => item.person.name).join(", ")}`
            : " · No current Person recorded"}
        </p>
      </div>
      <ArrowIcon className="size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--workspace-accent)]" />
    </Link>
  );
}

function PersonRow({ basePath, person }: { basePath: string; person: OrganizationPerson }) {
  return (
    <Link
      className="group flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)] sm:px-5"
      href={entityHref(basePath, "people", person.id)}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--text)]">{person.name}</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {person.assignments.length > 0
            ? person.assignments
                .map((item) => `${item.position.title} · ${item.typeLabel}`)
                .join("; ")
            : "No current Position Assignment recorded"}
        </p>
      </div>
      <ArrowIcon className="size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--workspace-accent)]" />
    </Link>
  );
}

export function OrganizationBrowser({
  basePath = "/organization",
  data,
}: {
  basePath?: string;
  data: OrganizationStructureData;
}) {
  const [view, setView] = useState<BrowserView>("units");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const results = useMemo(() => {
    const matches = (values: Array<string | null | undefined>) =>
      !normalizedQuery ||
      values.some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));

    return {
      units: data.units.filter((unit) =>
        matches([unit.name, unit.parent?.name, ...unit.positions.map((item) => item.title)]),
      ),
      positions: data.positions.filter((position) =>
        matches([
          position.title,
          position.unit?.name,
          ...position.assignments.map((item) => item.person.name),
          ...position.mandates.map((item) => item.role.name),
        ]),
      ),
      people: data.people.filter((person) =>
        matches([
          person.name,
          ...person.assignments.map((item) => item.position.title),
          ...person.coverages.map((item) => item.role.name),
        ]),
      ),
    };
  }, [data, normalizedQuery]);
  const unitHierarchy = useMemo(
    () => buildOrganizationUnitHierarchy(data.units),
    [data.units],
  );

  const tabs: Array<{ id: BrowserView; label: string; count: number }> = [
    { id: "units", label: "Organization Units", count: results.units.length },
    { id: "positions", label: "Positions", count: results.positions.length },
    { id: "people", label: "People", count: results.people.length },
  ];
  const leadership = data.positions.filter(
    (position) => !position.primaryManager && position.directReports.length > 0,
  );

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <SearchField
            label="Search Organization Units, Positions, and People"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Units, Positions, people, or Roles"
            value={query}
          />
          <div
            aria-label="Organization browser views"
            className="mt-4 flex gap-1 overflow-x-auto"
            role="tablist"
          >
            {tabs.map((tab) => (
              <button
                aria-selected={view === tab.id}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]",
                  view === tab.id
                    ? "bg-[var(--workspace-accent-subtle)] text-[var(--workspace-accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]",
                )}
                key={tab.id}
                onClick={() => setView(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
                <span className="tabular-nums text-[var(--text-tertiary)]">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div aria-live="polite">
          {view === "units" && !normalizedQuery ? (
            <div aria-label="Organization Unit hierarchy" role="tree">
              {unitHierarchy.map((node) => (
                <UnitTreeNode basePath={basePath} key={node.unit.id} node={node} />
              ))}
            </div>
          ) : null}
          {view === "units" && normalizedQuery
            ? results.units.map((unit) => (
                <UnitRow
                  basePath={basePath}
                  hierarchyPath={organizationUnitPath(data.units, unit.id)
                    .map((item) => item.name)
                    .join(" / ")}
                  key={unit.id}
                  unit={unit}
                />
              ))
            : null}
          {view === "positions" &&
            results.positions.map((position) => (
              <PositionRow basePath={basePath} key={position.id} position={position} />
            ))}
          {view === "people" &&
            results.people.map((person) => <PersonRow basePath={basePath} key={person.id} person={person} />)}
          {results[view].length === 0 ? (
            <div className="p-5">
              <EmptyState title="No matching structure records">
                Try a broader name, title, Unit, or Operational Role.
              </EmptyState>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <OrganizationIcon className="size-3.5" />
            Focused hierarchy
          </p>
          <h2 className="mt-2 text-base font-semibold text-[var(--text)]">
            Start with a leadership Position
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Follow one reporting branch at a time instead of opening an organization-wide canvas.
          </p>
          <div className="mt-4 space-y-2">
            {leadership.map((position) => (
              <Link
                className="group flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] p-3 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
                href={entityHref(basePath, "positions", position.id)}
                key={position.id}
              >
                <span>
                  {position.title}
                  <span className="mt-0.5 block font-normal text-[var(--text-tertiary)]">
                    {position.directReports.length} direct reports
                  </span>
                </span>
                <ArrowIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <RoleIcon className="size-3.5" />
            Structural context
          </p>
          <dl className="mt-3 space-y-2 text-xs leading-5">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-secondary)]">Provisional Units</dt>
              <dd className="font-medium text-[var(--text)]">{data.gaps.provisionalUnits}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-secondary)]">Confirmed vacancies</dt>
              <dd className="font-medium text-[var(--text)]">{data.gaps.confirmedVacancies}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-secondary)]">Roles without mandates</dt>
              <dd className="font-medium text-[var(--text)]">{data.gaps.rolesWithoutMandates}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-secondary)]">Mandates without coverage</dt>
              <dd className="font-medium text-[var(--text)]">{data.gaps.mandatesWithoutCoverage}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-4 text-[var(--text-tertiary)]">
            These are documented absences or provisional states, not a quality score or proof of organizational failure.
          </p>
        </Card>
      </div>
    </div>
  );
}
