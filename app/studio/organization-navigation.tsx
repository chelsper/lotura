import Link from "next/link";

import { cn } from "../ui/primitives";

export type OrganizationNavigationView = "units" | "positions" | "people" | "roles";

const destinations: Array<{
  id: OrganizationNavigationView;
  label: string;
  href: string;
}> = [
  { id: "units", label: "Units", href: "/studio/organization?view=units" },
  { id: "people", label: "People", href: "/studio/organization?view=people" },
  { id: "positions", label: "Job titles", href: "/studio/organization?view=positions" },
  { id: "roles", label: "Responsibilities", href: "/studio/responsibilities" },
];

export function OrganizationConceptGuide() {
  return (
    <details className="mt-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-[var(--workspace-accent)]">
        Job titles, responsibilities, processes — what’s the difference?
      </summary>
      <p className="mt-3 text-[var(--text-secondary)]">
        A job title tells you where someone sits. A responsibility tells you what they look after. A process tells you how the work happens.
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          ["Person", "The human doing the work. A person is not a login or a job title."],
          ["Job title (Position)", "A seat in the organization, such as Service Coordinator. It remains when the person changes; two seats can share a title."],
          ["Responsibility (Operational Role)", "An ongoing area of work, such as Request coordination. It can be shared across job titles; it is not another employee title."],
          ["Process", "Repeatable work with a start and an outcome, such as Handle a service request."],
        ].map(([term, meaning]) => (
          <div key={term}>
            <dt className="font-semibold text-[var(--text)]">{term}</dt>
            <dd className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{meaning}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--text-secondary)]">
        <p>A <strong>Unit</strong> groups the organization. A <strong>Process family</strong> groups related processes. A <strong>Step</strong> is part of a process. A <strong>System</strong> supports the work.</p>
        <p className="mt-2">A <strong>Policy</strong> sets rules for the work; it is not a parent process. A job title or manager does not automatically assign responsibility or process ownership.</p>
      </div>
    </details>
  );
}

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
      <OrganizationConceptGuide />
    </nav>
  );
}
