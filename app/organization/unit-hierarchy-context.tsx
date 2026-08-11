import Link from "next/link";

import type {
  OrganizationStructureData,
  OrganizationUnit,
} from "@/lib/organization-structure-data.mjs";
import { organizationUnitPath } from "@/lib/organization-unit-hierarchy.mjs";

import { ArrowIcon, OrganizationIcon } from "../ui/icons";
import { Card } from "../ui/primitives";

function unitHref(basePath: string, id: string) {
  return `${basePath}/units/${encodeURIComponent(id)}`;
}

export function UnitHierarchyContext({
  addChildHref,
  basePath,
  data,
  unit,
}: {
  addChildHref?: string;
  basePath: string;
  data: OrganizationStructureData;
  unit: OrganizationUnit;
}) {
  const path = organizationUnitPath(data.units, unit.id);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <OrganizationIcon className="size-3.5" />
            Organizational hierarchy
          </p>
          <h2 className="mt-2 text-base font-semibold text-[var(--text)]">
            Where this Unit sits
          </h2>
        </div>
        {addChildHref ? (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
            href={addChildHref}
          >
            Add child Unit
          </Link>
        ) : null}
      </div>

      <nav aria-label="Organization Unit hierarchy path" className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
        {path.map((item, index) => (
          <span className="flex items-center gap-1.5" key={item.id}>
            {index > 0 ? <span aria-hidden="true" className="text-[var(--text-tertiary)]">/</span> : null}
            {item.id === unit.id ? (
              <span className="font-medium text-[var(--text)]">{item.name}</span>
            ) : (
              <Link
                className="text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]"
                href={unitHref(basePath, item.id)}
              >
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Direct child Units
          </p>
          <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
            {unit.children.length}
          </span>
        </div>
        {unit.children.length > 0 ? (
          <div className="mt-2 divide-y divide-[var(--border)] rounded-[10px] border border-[var(--border)]">
            {unit.children.map((child) => {
              const fullChild = data.units.find((item) => item.id === child.id);
              return (
                <Link
                  className="group flex items-center justify-between gap-3 px-3 py-3 text-xs transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)]"
                  href={unitHref(basePath, child.id)}
                  key={child.id}
                >
                  <span>
                    <span className="font-medium text-[var(--text)]">{child.name}</span>
                    <span className="mt-0.5 block text-[var(--text-tertiary)]">
                      {fullChild?.children.length ?? 0} child {(fullChild?.children.length ?? 0) === 1 ? "Unit" : "Units"} · {fullChild?.positions.length ?? 0} {(fullChild?.positions.length ?? 0) === 1 ? "Position" : "Positions"}
                    </span>
                  </span>
                  <ArrowIcon className="size-3.5 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
            No child Organization Units are currently recorded.
          </p>
        )}
      </div>

      <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-4 text-[var(--text-tertiary)]">
        Unit nesting describes organizational structure only. It does not establish Position reporting, Process ownership, or operational responsibility.
      </p>
    </Card>
  );
}
