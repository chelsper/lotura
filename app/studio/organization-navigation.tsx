import Link from "next/link";

import { cn } from "../ui/primitives";

export type OrganizationNavigationView = "units" | "positions" | "people" | "roles";

const destinations: Array<{
  id: OrganizationNavigationView;
  label: string;
  href: string;
}> = [
  { id: "units", label: "Organization Units", href: "/studio/organization?view=units" },
  { id: "positions", label: "Positions", href: "/studio/organization?view=positions" },
  { id: "people", label: "People", href: "/studio/organization?view=people" },
  { id: "roles", label: "Operational Roles", href: "/studio/responsibilities" },
];

export function OrganizationNavigation({
  activeView,
  preserveScroll = false,
}: {
  activeView: OrganizationNavigationView;
  preserveScroll?: boolean;
}) {
  return (
    <nav aria-label="Organization and responsibilities" className="my-5 flex flex-wrap gap-2">
      {destinations.map((item) => (
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
    </nav>
  );
}
