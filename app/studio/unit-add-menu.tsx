import Link from "next/link";

import type { OrganizationUnit } from "@/lib/organization-structure-data.mjs";

export function UnitAddMenu({ unit }: { unit: Pick<OrganizationUnit, "id" | "name" | "status"> }) {
  if (unit.status !== "active") return null;
  const unitKey = encodeURIComponent(unit.id);
  const choices = [
    { title: "Job title", description: "Add a position to this Unit.", href: `/studio/organization/positions/new?unit=${unitKey}` },
    { title: "Person", description: "Add someone, then choose their job title.", href: `/studio/organization/people/new?unit=${unitKey}` },
    { title: "Child Unit", description: "Add a team within this Unit.", href: `/studio/organization/units/new?parent=${unitKey}` },
  ];
  return (
    <details className="relative">
      <summary className="cursor-pointer rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">Add to this Unit</summary>
      <nav aria-label={`Add to ${unit.name}`} className="absolute right-0 z-10 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
        {choices.map((choice) => (
          <Link className="block rounded-lg p-3 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]" href={choice.href} key={choice.href}>
            <span className="block text-sm font-semibold text-[var(--workspace-accent)]">{choice.title}</span>
            <span className="mt-1 block text-xs text-[var(--text-secondary)]">{choice.description}</span>
          </Link>
        ))}
      </nav>
    </details>
  );
}
