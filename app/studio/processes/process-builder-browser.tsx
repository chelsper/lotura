"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ArrowIcon, LayersIcon } from "@/app/ui/icons";
import { Badge, Card, SearchField } from "@/app/ui/primitives";

export type ProcessBuilderSummary = {
  dependencyCount: number;
  exceptionCount: number;
  families: Array<{ name: string; stableKey: string; status: "active" | "inactive" }>;
  id: string;
  name: string;
  ownerRoleName: string | null;
  purpose: string | null;
  status: "draft" | "active" | "archived";
  stepCount: number;
  systemCount: number;
};

export function ProcessBuilderBrowser({
  processes,
}: {
  processes: ProcessBuilderSummary[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProcessBuilderSummary["status"]>("all");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return processes.filter(
      (process) =>
        (status === "all" || process.status === status) &&
        (!normalized ||
          process.name.toLowerCase().includes(normalized) ||
          process.purpose?.toLowerCase().includes(normalized) ||
          process.ownerRoleName?.toLowerCase().includes(normalized) ||
          process.families.some((family) =>
            family.name.toLowerCase().includes(normalized),
          )),
    );
  }, [processes, query, status]);

  return (
    <section aria-labelledby="process-builder-inventory" className="mt-6">
      <h2 className="sr-only" id="process-builder-inventory">Process inventory</h2>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <SearchField
          label="Search Processes"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by Process, purpose, or Owner Role"
          value={query}
        />
        <label>
          <span className="sr-only">Filter Processes by status</span>
          <select
            className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-focus-ring)]"
            onChange={(event) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="draft">Working drafts</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {visible.map((process) => (
          <Link
            className="group block"
            href={`/studio/processes/${encodeURIComponent(process.id)}`}
            key={process.id}
          >
            <Card className="p-4 transition-colors group-hover:border-[var(--border-strong)] group-hover:bg-[var(--surface-hover)] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <LayersIcon className="size-4 text-[var(--workspace-accent)]" />
                    <h3 className="font-semibold text-[var(--text)]">{process.name}</h3>
                    <Badge tone={process.status === "draft" ? "warning" : process.status === "active" ? "success" : "neutral"}>
                      {process.status === "draft" ? "Working draft" : process.status}
                    </Badge>
                    {!process.ownerRoleName ? <Badge tone="warning">Owner needs validation</Badge> : null}
                    {process.families.map((family) => (
                      <Badge key={family.stableKey} tone="accent">Family: {family.name}</Badge>
                    ))}
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
                    {process.purpose ?? "Purpose needs validation."}
                  </p>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                    Owner Role: {process.ownerRoleName ?? "Not assigned"} · {process.stepCount} {process.stepCount === 1 ? "Step" : "Steps"} · {process.systemCount} {process.systemCount === 1 ? "System" : "Systems"} · {process.exceptionCount} {process.exceptionCount === 1 ? "Exception" : "Exceptions"} · {process.dependencyCount} {process.dependencyCount === 1 ? "dependency" : "dependencies"}
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
          No Processes match this view.
        </Card>
      ) : null}
    </section>
  );
}
