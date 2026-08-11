"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ArrowIcon, RoleIcon } from "@/app/ui/icons";
import { Badge, Card, SearchField } from "@/app/ui/primitives";

export type ResponsibilitySummary = {
  coverageCount: number;
  description: string | null;
  mandateCount: number;
  name: string;
  processCount: number;
  stableKey: string;
  status: "active" | "inactive";
  systemCount: number;
};

export function ResponsibilityBrowser({
  roles,
}: {
  roles: ResponsibilitySummary[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return roles.filter(
      (role) =>
        (status === "all" || role.status === status) &&
        (!normalized ||
          role.name.toLowerCase().includes(normalized) ||
          role.description?.toLowerCase().includes(normalized)),
    );
  }, [query, roles, status]);

  return (
    <section className="mt-6" aria-labelledby="responsibility-inventory">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <SearchField
          label="Search Operational Roles"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Operational Roles"
          value={query}
        />
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]"
            onChange={(event) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {visible.map((role) => (
          <Link
            className="group block"
            href={`/studio/responsibilities/roles/${encodeURIComponent(role.stableKey)}`}
            key={role.stableKey}
          >
            <Card className="p-4 transition-colors group-hover:border-[var(--border-strong)] group-hover:bg-[var(--surface-hover)] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleIcon className="size-4 text-[var(--workspace-accent)]" />
                    <h2 className="font-semibold text-[var(--text)]">{role.name}</h2>
                    <Badge tone={role.status === "active" ? "success" : "neutral"}>
                      {role.status}
                    </Badge>
                    {role.mandateCount === 0 && role.status === "active" ? (
                      <Badge tone="warning">No current mandate</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
                    {role.description ?? "No responsibility description recorded."}
                  </p>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                    {role.mandateCount} {role.mandateCount === 1 ? "Position mandate" : "Position mandates"} · {role.coverageCount} current {role.coverageCount === 1 ? "coverage" : "coverages"} · {role.processCount} {role.processCount === 1 ? "Process" : "Processes"} · {role.systemCount} {role.systemCount === 1 ? "System" : "Systems"}
                  </p>
                </div>
                <ArrowIcon className="mt-1 size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--workspace-accent)]" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {visible.length === 0 ? (
        <Card className="mt-4 p-6 text-center text-sm text-[var(--text-secondary)]">
          No Operational Roles match this view.
        </Card>
      ) : null}
    </section>
  );
}
