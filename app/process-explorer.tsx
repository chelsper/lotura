"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  ExplorerDependency,
  ExplorerProcess,
  ProcessExplorerData,
} from "@/lib/process-explorer-data";

import { ArrowIcon, ChevronIcon, FlowIcon, LayersIcon } from "./ui/icons";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SearchField,
  Select,
  cn,
} from "./ui/primitives";

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function processHref(processId: string) {
  return `/explorer/${encodeURIComponent(processId)}`;
}

function ProcessListRow({
  onSelect,
  process,
  selected,
}: {
  onSelect: () => void;
  process: ExplorerProcess;
  selected: boolean;
}) {
  const dependencyCount = process.upstream.length + process.downstream.length;

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "group relative w-full border-b border-[var(--border)] px-4 py-4 text-left transition-colors last:border-b-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)]",
        selected
          ? "bg-[var(--workspace-accent-subtle)]"
          : "bg-[var(--surface)] hover:bg-[var(--surface-subtle)]",
      )}
      onClick={onSelect}
      type="button"
    >
      {selected ? (
        <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-[var(--workspace-accent)]" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              dot
              tone={
                process.status === "active"
                  ? "success"
                  : process.status === "draft"
                    ? "warning"
                    : "neutral"
              }
            >
              {process.status}
            </Badge>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {pluralize(dependencyCount, "process dependency", "process dependencies")}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]">
            {process.name}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Owner Role: {process.ownerRole?.name ?? "Not recorded"}
          </p>
        </div>
        <ChevronIcon
          className={cn(
            "mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
            selected
              ? "text-[var(--workspace-accent)]"
              : "text-[var(--text-tertiary)]",
          )}
        />
      </div>
    </button>
  );
}

function FilterSelect({
  emptyLabel,
  label,
  onChange,
  options,
  value,
}: {
  emptyLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <Select onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </Select>
    </label>
  );
}

function DependencyPreview({
  dependencies,
  direction,
}: {
  dependencies: ExplorerDependency[];
  direction: "upstream" | "downstream";
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {direction === "upstream" ? "Upstream" : "Downstream"}
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-tertiary)]">
            {direction === "upstream"
              ? "Processes this work relies on"
              : "Processes that receive or follow this work"}
          </p>
        </div>
        <span className="text-[11px] tabular-nums text-[var(--text-tertiary)]">
          {dependencies.length}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {dependencies.length > 0 ? (
          dependencies.map((dependency) => (
            <Link
              className="group flex items-start gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
              href={processHref(dependency.processId)}
              key={`${dependency.processId}-${dependency.type}`}
            >
              <ArrowIcon
                className={cn(
                  "mt-0.5 size-3.5 shrink-0 text-[var(--text-tertiary)]",
                  direction === "upstream" && "rotate-180",
                )}
              />
              <span className="min-w-0 flex-1 text-xs font-medium leading-5 text-[var(--text)]">
                {dependency.processName}
              </span>
              <ChevronIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))
        ) : (
          <p className="rounded-[10px] border border-dashed border-[var(--border-strong)] px-3 py-4 text-center text-xs text-[var(--text-tertiary)]">
            No {direction} dependencies recorded
          </p>
        )}
      </div>
    </div>
  );
}

function ProcessPreview({ process }: { process: ExplorerProcess }) {
  return (
    <Card className="scroll-mt-4 overflow-hidden" id="process-preview">
      <div className="border-b border-[var(--border)] p-5 sm:p-6">
        <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
          Selected Process
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
          {process.name}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          {process.purpose ?? "No purpose has been recorded."}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
          <span>
            Owner Role: <strong className="font-medium text-[var(--text)]">{process.ownerRole?.name ?? "Not recorded"}</strong>
          </span>
          <span>{pluralize(process.steps.length, "step")}</span>
          <span>{pluralize(process.systems.length, "system")}</span>
        </div>
        <Link
          className="group mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-[var(--workspace-accent-foreground)] transition-colors hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] focus-visible:ring-offset-2"
          href={processHref(process.id)}
        >
          View process
          <ArrowIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <FlowIcon className="size-4 text-[var(--workspace-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Local process dependencies
          </h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
          A focused view of the Processes immediately connected to this work.
        </p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <DependencyPreview dependencies={process.upstream} direction="upstream" />
          <DependencyPreview dependencies={process.downstream} direction="downstream" />
        </div>
      </div>
    </Card>
  );
}

export function ProcessExplorer({
  data,
  initialProcessId,
}: {
  data: ProcessExplorerData;
  initialProcessId?: string;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [systemFilter, setSystemFilter] = useState("");
  const [selectedProcessId, setSelectedProcessId] = useState(
    data.processes.some((process) => process.id === initialProcessId)
      ? (initialProcessId ?? "")
      : (data.processes[0]?.id ?? ""),
  );

  const filteredProcesses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return data.processes.filter((process) => {
      const matchesName = process.name
        .toLocaleLowerCase()
        .includes(normalizedQuery);
      const matchesRole = !roleFilter || process.roleIds.includes(roleFilter);
      const matchesSystem =
        !systemFilter ||
        process.systems.some((system) => system.id === systemFilter);

      return matchesName && matchesRole && matchesSystem;
    });
  }, [data.processes, query, roleFilter, systemFilter]);

  const selectedProcess =
    filteredProcesses.find((process) => process.id === selectedProcessId) ??
    filteredProcesses[0] ??
    null;
  const activeFilterCount = [query.trim(), roleFilter, systemFilter].filter(
    Boolean,
  ).length;

  function clearFilters() {
    setQuery("");
    setRoleFilter("");
    setSystemFilter("");
  }

  function selectProcess(processId: string) {
    setSelectedProcessId(processId);

    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => {
        document
          .getElementById("process-preview")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <>
      <Card className="mt-5 p-2.5">
        <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(170px,240px)_minmax(170px,240px)_auto]">
          <SearchField
            label="Search by process name"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Processes"
            value={query}
          />
          <FilterSelect
            emptyLabel="All Roles"
            label="Filter by Role"
            onChange={setRoleFilter}
            options={data.roles.map((role) => ({ id: role.id, name: role.name }))}
            value={roleFilter}
          />
          <FilterSelect
            emptyLabel="All Systems"
            label="Filter by System"
            onChange={setSystemFilter}
            options={data.systems.map((system) => ({
              id: system.id,
              name: system.name,
            }))}
            value={systemFilter}
          />
          <Button
            disabled={activeFilterCount === 0}
            onClick={clearFilters}
            variant="ghost"
          >
            Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="max-h-[560px] overflow-hidden xl:sticky xl:top-6 xl:max-h-[calc(100vh-48px)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Processes</h2>
              <p aria-live="polite" className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                Showing {filteredProcesses.length} of {data.processes.length}
              </p>
            </div>
            <LayersIcon className="size-4 text-[var(--text-tertiary)]" />
          </div>
          <p className="border-b border-[var(--border)] px-4 py-2 text-[11px] leading-4 text-[var(--text-tertiary)] xl:hidden">
            Tap a process to preview its dependencies below, then choose View process.
          </p>
          <div className="max-h-[475px] overflow-y-auto xl:max-h-[calc(100vh-111px)]">
            {filteredProcesses.length > 0 ? (
              filteredProcesses.map((process) => (
                <ProcessListRow
                  key={process.id}
                  onSelect={() => selectProcess(process.id)}
                  process={process}
                  selected={process.id === selectedProcess?.id}
                />
              ))
            ) : (
              <div className="p-3">
                <EmptyState title="No matching Processes">
                  Try another name, Role, or System.
                </EmptyState>
              </div>
            )}
          </div>
        </Card>

        {selectedProcess ? (
          <ProcessPreview process={selectedProcess} />
        ) : (
          <Card className="p-5">
            <EmptyState title="No Process selected">
              Adjust the filters to choose a documented Process.
            </EmptyState>
          </Card>
        )}
      </div>
    </>
  );
}
