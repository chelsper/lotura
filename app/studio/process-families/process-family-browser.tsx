"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ProcessFamilySummary } from "@/lib/process-family-data";

import { ArrowIcon, LayersIcon } from "../../ui/icons";
import { Badge, Card, SearchField } from "../../ui/primitives";

export function ProcessFamilyBrowser({ families }: { families: ProcessFamilySummary[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return families;
    return families.filter((family) =>
      [family.name, family.description, ...family.memberProcessNames]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [families, query]);

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          className="w-full sm:max-w-md"
          label="Search Process Families"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Process Families"
          value={query}
        />
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-[var(--workspace-accent-foreground)] transition hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
          href="/studio/process-families/new"
        >
          Add Process Family
        </Link>
      </div>

      <Card className="overflow-hidden">
        {visible.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {visible.map((family) => (
              <Link
                className="group flex items-start justify-between gap-4 p-4 transition-colors hover:bg-[var(--surface-hover)] sm:p-5"
                href={`/studio/process-families/${family.stableKey}`}
                key={family.stableKey}
              >
                <div className="flex min-w-0 gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--workspace-accent-subtle)] text-[var(--workspace-accent)]">
                    <LayersIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[var(--text)]">{family.name}</h2>
                      <Badge tone={family.status === "active" ? "success" : "neutral"}>
                        {family.status === "active" ? "Current" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {family.description ?? "No Family description is recorded."}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                      {family.activeMemberCount} current {family.activeMemberCount === 1 ? "Process" : "Processes"}
                    </p>
                  </div>
                </div>
                <ArrowIcon className="mt-2 size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-[var(--text)]">
              {families.length === 0 ? "No Process Families are recorded yet." : "No Process Families match this search."}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
              {families.length === 0
                ? "This does not mean the Processes are unrelated. Add a Family only when the grouping is understood."
                : "Clear the search to see the full catalog."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
