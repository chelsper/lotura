"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { TechnologySystemSummary } from "@/lib/technology-authoring-data";

import { ArrowIcon, SystemIcon } from "../../ui/icons";
import { Badge, Card, SearchField } from "../../ui/primitives";

function systemTypeLabel(value: TechnologySystemSummary["systemType"]) {
  return {
    software: "Software",
    external_service: "External service",
    manual_record: "Manual record",
    other: "Other",
  }[value];
}

export function TechnologyBrowser({
  systems,
}: {
  systems: TechnologySystemSummary[];
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return systems;
    return systems.filter((item) =>
      [item.name, item.description, systemTypeLabel(item.systemType)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [query, systems]);

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          className="w-full sm:max-w-md"
          label="Search Systems"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Systems"
          value={query}
        />
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-[var(--workspace-accent-foreground)] transition hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
          href="/studio/technology/new"
        >
          Add System
        </Link>
      </div>

      <Card className="overflow-hidden">
        {visible.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {visible.map((item) => (
              <Link
                className="group flex items-start justify-between gap-4 p-4 transition-colors hover:bg-[var(--surface-hover)] sm:p-5"
                href={`/studio/technology/systems/${item.stableKey}`}
                key={item.stableKey}
              >
                <div className="flex min-w-0 gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--workspace-accent-subtle)] text-[var(--workspace-accent)]">
                    <SystemIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[var(--text)]">{item.name}</h2>
                      <Badge tone={item.status === "active" ? "success" : "neutral"}>
                        {item.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                      <Badge>{systemTypeLabel(item.systemType)}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {item.description ?? "No System description is recorded."}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                      {item.processCount} documented Process {item.processCount === 1 ? "link" : "links"}
                    </p>
                  </div>
                </div>
                <ArrowIcon className="mt-2 size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-[var(--text)]">No Systems match this search.</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">Clear the search or add a System.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
