import Link from "next/link";

import { cn } from "../ui/primitives";

export type OrganizationNavigationView = "units" | "positions" | "people" | "roles";

const destinations: Array<{
  id: OrganizationNavigationView;
  label: string;
  href: string;
}> = [
  { id: "units", label: "Organization Units", href: "/studio/organization?view=units" },
  { id: "positions", label: "Job titles", href: "/studio/organization?view=positions" },
  { id: "people", label: "People", href: "/studio/organization?view=people" },
  { id: "roles", label: "Responsibilities", href: "/studio/responsibilities" },
];

export function OrganizationNavigation({
  activeView,
  preserveScroll = false,
  unit,
}: {
  activeView: OrganizationNavigationView;
  preserveScroll?: boolean;
  unit?: { id: string; name: string };
}) {
  const scopedDestinations = unit ? destinations.map((item) => ({
    ...item,
    href: item.id === "units"
      ? `/studio/organization/units/${encodeURIComponent(unit.id)}`
      : `${item.href}${item.id === "roles" ? "?" : "&"}unit=${encodeURIComponent(unit.id)}`,
  })) : destinations;
  return (
    <nav aria-label="Organization and responsibilities" className="my-5">
      {unit ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-[var(--text-secondary)]">
            In <Link className="font-medium text-[var(--workspace-accent)] hover:underline" href={`/studio/organization/units/${encodeURIComponent(unit.id)}`}>{unit.name}</Link>
          </p>
          <Link className="text-xs font-medium text-[var(--workspace-accent)] hover:underline" href="/studio/organization?view=units">All units →</Link>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
      {scopedDestinations.map((item) => (
        <Link
          aria-current={activeView === item.id ? "page" : undefined}
          className={cn(
            "inline-flex min-h-10 items-center rounded-[10px] border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]",
            activeView === item.id
              ? "border-[var(--workspace-accent-border)] bg-[var(--workspace-accent-subtle)] text-[var(--workspace-accent)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]",
          )}
          href={item.href}
          key={item.id}
          scroll={!preserveScroll}
        >
          {item.label}
        </Link>
      ))}
      </div>
    </nav>
  );
}
