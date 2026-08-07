"use client";

import { useMemo, useState } from "react";

import type { FlowAnalysisResult } from "@/lib/flow-analysis.mjs";
import type {
  AssignmentType,
  DependencyType,
  ExplorerDependency,
  ExplorerProcess,
  ProcessExplorerData,
  SystemType,
} from "@/lib/process-explorer-data";
import type { OperatingModelSource } from "@/lib/process-explorer-source-policy.mjs";

import { FlowAnalysis } from "./flow-analysis";
import {
  ArrowIcon,
  CheckIcon,
  ChevronIcon,
  ExceptionIcon,
  ExplorerIcon,
  FlowIcon,
  LayersIcon,
  RoleIcon,
  SystemIcon,
} from "./ui/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ExpandableSection,
  SearchField,
  Select,
  SidePanel,
  cn,
} from "./ui/primitives";

type ProductMode = "explorer" | "analysis";

const assignmentLabels: Record<AssignmentType, string> = {
  permanent: "Permanent",
  interim: "Interim",
  acting: "Acting",
  backup: "Backup",
};

const dependencyLabels: Record<DependencyType, string> = {
  requires: "Requires",
  receives_from: "Receives from",
  provides_to: "Provides to",
  triggers: "Triggers",
};

const systemTypeLabels: Record<SystemType, string> = {
  software: "Software",
  external_service: "External service",
  manual_record: "Manual record",
  other: "Other",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatAsOf(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function SourceStatus({
  asOf,
  source,
}: {
  asOf: string;
  source: OperatingModelSource;
}) {
  const tone =
    source.kind === "neon"
      ? "success"
      : source.kind === "demo-fallback"
        ? "warning"
        : "neutral";

  return (
    <div>
      <Badge dot tone={tone}>
        {source.label}
      </Badge>
      <p className="mt-2 text-[11px] leading-4 text-[var(--text-tertiary)]">
        As of {formatAsOf(asOf)} UTC
      </p>
    </div>
  );
}

function ProductNavigation({
  mode,
  onChange,
}: {
  mode: ProductMode;
  onChange: (mode: ProductMode) => void;
}) {
  const items = [
    { id: "explorer" as const, icon: ExplorerIcon, label: "Explorer" },
    { id: "analysis" as const, icon: FlowIcon, label: "FLOW Analysis" },
  ];

  return (
    <nav
      aria-label="Product view"
      className="space-y-1 max-lg:flex max-lg:gap-1 max-lg:space-y-0"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;

        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] max-lg:w-auto",
              active
                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
            )}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function AppShell({
  asOf,
  children,
  mode,
  onModeChange,
  organizationName,
  source,
}: {
  asOf: string;
  children: React.ReactNode;
  mode: ProductMode;
  onModeChange: (mode: ProductMode) => void;
  organizationName: string;
  source: OperatingModelSource;
}) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <div className="border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--accent)] text-white">
              <FlowIcon className="size-4" />
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.035em]">
              Lotura
            </span>
          </div>
          <p className="mt-4 text-[11px] font-medium text-[var(--text-tertiary)]">
            Workspace
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--text)]">
            {organizationName}
          </p>
        </div>

        <div className="flex-1 px-3 py-4">
          <ProductNavigation mode={mode} onChange={onModeChange} />
        </div>

        <div className="border-t border-[var(--border)] px-5 py-4">
          <SourceStatus asOf={asOf} source={source} />
          <p className="mt-3 text-[11px] font-medium text-[var(--text-tertiary)]">
            Read-only workspace
          </p>
        </div>
      </aside>

      <div className="lg:pl-[232px]">
        <header className="border-b border-[var(--border)] bg-[var(--surface)] lg:hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[var(--accent)] text-white">
                <FlowIcon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-[-0.02em]">Lotura</p>
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                  {organizationName}
                </p>
              </div>
            </div>
            <Badge
              dot
              tone={
                source.kind === "neon"
                  ? "success"
                  : source.kind === "demo-fallback"
                    ? "warning"
                    : "neutral"
              }
            >
              {source.label}
            </Badge>
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 pb-3 sm:px-5">
            <ProductNavigation mode={mode} onChange={onModeChange} />
          </div>
        </header>

        <main className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function PageHeader({
  analysis,
  data,
  mode,
}: {
  analysis: FlowAnalysisResult;
  data: ProcessExplorerData;
  mode: ProductMode;
}) {
  const stats =
    mode === "explorer"
      ? [
          { label: "Processes", value: data.processes.length },
          { label: "Roles", value: data.roles.length },
          { label: "Systems", value: data.systems.length },
        ]
      : [
          { label: "Current findings", value: analysis.currentGaps.length },
          { label: "Processes", value: data.processes.length },
          {
            label: "Scenarios",
            value:
              analysis.scenarios.roles.length * 2 +
              analysis.scenarios.systems.length +
              analysis.scenarios.processes.length,
          },
        ];

  return (
    <header className="border-b border-[var(--border)] pb-6 sm:pb-8">
      <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
        {mode === "explorer" ? (
          <LayersIcon className="size-3.5" />
        ) : (
          <FlowIcon className="size-3.5" />
        )}
        {mode === "explorer" ? "Operating model" : "Deterministic analysis"}
      </p>
      <div className="mt-3 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div className="max-w-3xl">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[var(--text)] sm:text-[36px]">
            {mode === "explorer" ? "Process Explorer" : "FLOW Analysis"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {mode === "explorer"
              ? "See how work connects across roles, people, systems, exceptions, and process boundaries."
              : "Interpret ownership, coverage, concentration, and change impact through explainable operating-model evidence."}
          </p>
        </div>
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {stats.map((stat) => (
            <div className="min-w-[76px]" key={stat.label}>
              <dt className="text-[11px] text-[var(--text-tertiary)]">
                {stat.label}
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-[-0.025em] text-[var(--text)]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-4 font-mono text-[10px] text-[var(--text-tertiary)] lg:hidden">
        As of {formatAsOf(analysis.asOf)} UTC
      </p>
    </header>
  );
}

function ProcessListRow({
  onOpen,
  process,
  selected,
}: {
  onOpen: () => void;
  process: ExplorerProcess;
  selected: boolean;
}) {
  const connectionCount = process.upstream.length + process.downstream.length;

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "group relative w-full border-b border-[var(--border)] px-3 py-3.5 text-left transition-colors last:border-b-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]",
        selected
          ? "bg-[var(--accent-subtle)]"
          : "bg-[var(--surface)] hover:bg-[var(--surface-subtle)]",
      )}
      onClick={onOpen}
      type="button"
    >
      {selected ? (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--accent)]" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
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
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]">
            {process.name}
          </h3>
          <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
            {process.ownerRole?.name ?? "No owner role"}
          </p>
        </div>
        <ChevronIcon
          className={cn(
            "mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
            selected ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]",
          )}
        />
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
        {pluralize(process.steps.length, "step")} · {pluralize(connectionCount, "connection")}
      </p>
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

function ProcessFilters({
  activeFilterCount,
  clearFilters,
  data,
  query,
  roleFilter,
  setQuery,
  setRoleFilter,
  setSystemFilter,
  systemFilter,
}: {
  activeFilterCount: number;
  clearFilters: () => void;
  data: ProcessExplorerData;
  query: string;
  roleFilter: string;
  setQuery: (value: string) => void;
  setRoleFilter: (value: string) => void;
  setSystemFilter: (value: string) => void;
  systemFilter: string;
}) {
  return (
    <Card className="mt-5 p-2.5">
      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(170px,240px)_minmax(170px,240px)_auto]">
        <SearchField
          label="Search by process name"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search processes"
          value={query}
        />
        <FilterSelect
          emptyLabel="All roles"
          label="Filter by role"
          onChange={setRoleFilter}
          options={data.roles.map((role) => ({ id: role.id, name: role.name }))}
          value={roleFilter}
        />
        <FilterSelect
          emptyLabel="All systems"
          label="Filter by system"
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
  );
}

function ProcessIndex({
  filteredProcesses,
  onOpenProcess,
  selectedProcessId,
  total,
}: {
  filteredProcesses: ExplorerProcess[];
  onOpenProcess: (processId: string) => void;
  selectedProcessId: string | null;
  total: number;
}) {
  return (
    <Card className="max-h-[520px] overflow-hidden xl:sticky xl:top-6 xl:max-h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Processes</h2>
          <p aria-live="polite" className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Showing {filteredProcesses.length} of {total}
          </p>
        </div>
        <LayersIcon className="size-4 text-[var(--text-tertiary)]" />
      </div>
      <div className="max-h-[445px] overflow-y-auto xl:max-h-[calc(100vh-117px)]">
        {filteredProcesses.length > 0 ? (
          filteredProcesses.map((process) => (
            <ProcessListRow
              key={process.id}
              onOpen={() => onOpenProcess(process.id)}
              process={process}
              selected={process.id === selectedProcessId}
            />
          ))
        ) : (
          <div className="p-3">
            <EmptyState title="No matching processes">
              Try another name, Role, or System.
            </EmptyState>
          </div>
        )}
      </div>
    </Card>
  );
}

function ProcessMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      <span className="text-[var(--text-tertiary)]">{icon}</span>
      <span>{label}</span>
      <span className="font-medium text-[var(--text)]">{value}</span>
    </div>
  );
}

function Steps({ process }: { process: ExplorerProcess }) {
  if (process.steps.length === 0) {
    return (
      <EmptyState title="No steps recorded">
        This process does not yet contain an operational sequence.
      </EmptyState>
    );
  }

  return (
    <ol className="space-y-0">
      {process.steps.map((step, index) => (
        <li className="relative flex gap-3 pb-5 last:pb-0" key={step.id}>
          {index < process.steps.length - 1 ? (
            <span className="absolute bottom-0 left-[15px] top-8 w-px bg-[var(--border)]" />
          ) : null}
          <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[11px] font-semibold text-[var(--accent)]">
            {step.position}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="text-sm font-semibold leading-5 text-[var(--text)]">
                {step.title}
              </h4>
              {step.responsibleRole ? (
                <Chip>
                  <RoleIcon className="size-3.5" />
                  {step.responsibleRole.name}
                </Chip>
              ) : null}
            </div>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
              {step.instructions}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Exceptions({ process }: { process: ExplorerProcess }) {
  if (process.exceptions.length === 0) {
    return (
      <EmptyState title="No exceptions recorded">
        No alternate paths are documented for this process.
      </EmptyState>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {process.exceptions.map((item) => (
        <article className="py-4 first:pt-0 last:pb-0" key={item.id}>
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--warning-subtle)] text-[var(--warning)]">
              <ExceptionIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-[var(--text)]">
                  {item.name}
                </h4>
                {item.status === "inactive" ? (
                  <Badge tone="neutral">Retired</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {item.stepTitle ? `Step: ${item.stepTitle}` : "Process-level exception"}
                {item.ownerRole ? ` · ${item.ownerRole.name}` : ""}
              </p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-[var(--warning)]">When</dt>
                  <dd className="mt-1 leading-6 text-[var(--text-secondary)]">
                    {item.condition}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--warning)]">Response</dt>
                  <dd className="mt-1 leading-6 text-[var(--text-secondary)]">
                    {item.response}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Systems({ process }: { process: ExplorerProcess }) {
  if (process.systems.length === 0) {
    return (
      <EmptyState title="No systems recorded">
        This process has no directly linked Systems.
      </EmptyState>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {process.systems.map((system) => (
        <article
          className="grid gap-2 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(170px,0.7fr)_minmax(0,1.3fr)] sm:gap-5"
          key={system.id}
        >
          <div className="flex items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--info-subtle)] text-[var(--info)]">
              <SystemIcon className="size-4" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text)]">
                {system.name}
              </h4>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                {systemTypeLabels[system.type]}
                {system.status === "inactive" ? " · Retired" : ""}
              </p>
            </div>
          </div>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {system.usage}
          </p>
        </article>
      ))}
    </div>
  );
}

function DependencyCard({
  dependency,
  direction,
  onOpen,
}: {
  dependency: ExplorerDependency;
  direction: "upstream" | "downstream";
  onOpen: () => void;
}) {
  return (
    <button
      className="group w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 text-[var(--text-tertiary)]",
            direction === "upstream" && "rotate-180",
          )}
        >
          <ArrowIcon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-5 text-[var(--text)]">
            {dependency.processName}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
            {dependencyLabels[dependency.type]}
          </p>
        </div>
        <ChevronIcon className="mt-0.5 size-3.5 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
      </div>
      {dependency.description ? (
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
          {dependency.description}
        </p>
      ) : null}
    </button>
  );
}

function DependencyList({
  dependencies,
  direction,
  onOpenProcess,
}: {
  dependencies: ExplorerDependency[];
  direction: "upstream" | "downstream";
  onOpenProcess: (processId: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium capitalize text-[var(--text-secondary)]">
          {direction}
        </h4>
        <span className="text-[11px] tabular-nums text-[var(--text-tertiary)]">
          {dependencies.length}
        </span>
      </div>
      <div className="space-y-2">
        {dependencies.length > 0 ? (
          dependencies.map((dependency) => (
            <DependencyCard
              dependency={dependency}
              direction={direction}
              key={`${dependency.processId}-${dependency.type}`}
              onOpen={() => onOpenProcess(dependency.processId)}
            />
          ))
        ) : (
          <p className="rounded-[10px] border border-dashed border-[var(--border-strong)] px-3 py-4 text-center text-xs text-[var(--text-tertiary)]">
            No {direction} dependencies
          </p>
        )}
      </div>
    </div>
  );
}

function OwnershipPanel({ process }: { process: ExplorerProcess }) {
  return (
    <SidePanel className="bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Accountability
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-[var(--text)]">
            Ownership
          </h3>
        </div>
        <RoleIcon className="size-4 text-[var(--text-tertiary)]" />
      </div>
      <div className="mt-4 border-l-2 border-[var(--accent)] pl-3">
        <p className="text-[11px] text-[var(--text-tertiary)]">Owner Role</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-[var(--text)]">
          {process.ownerRole?.name ?? "Unassigned"}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-2.5 border-t border-[var(--border)] pt-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-subtle)] text-[10px] font-semibold text-[var(--accent)]">
          {process.ownerRole?.currentAssignee
            ? getInitials(process.ownerRole.currentAssignee.name)
            : "—"}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Current assignment
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-[var(--text)]">
            {process.ownerRole?.currentAssignee?.name ??
              "No active primary assignment"}
          </p>
          {process.ownerRole?.currentAssignee ? (
            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
              {assignmentLabels[process.ownerRole.currentAssignee.assignmentType]}
            </p>
          ) : null}
        </div>
      </div>
    </SidePanel>
  );
}

function ProcessDetail({
  onOpenProcess,
  process,
}: {
  onOpenProcess: (processId: string) => void;
  process: ExplorerProcess;
}) {
  const connectionCount = process.upstream.length + process.downstream.length;

  return (
    <Card className="scroll-mt-4 overflow-hidden" id="process-detail">
      <header className="border-b border-[var(--border)] px-5 py-6 sm:px-6 sm:py-7">
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
          <Badge tone="neutral">Read-only definition</Badge>
        </div>
        <h2 className="mt-4 max-w-4xl text-[26px] font-semibold leading-tight tracking-[-0.04em] text-[var(--text)] sm:text-[32px]">
          {process.name}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-[15px]">
          {process.purpose ?? "No purpose has been recorded."}
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] pt-4">
          <ProcessMetric
            icon={<CheckIcon className="size-3.5" />}
            label="Definition"
            value={pluralize(process.steps.length, "step")}
          />
          <ProcessMetric
            icon={<SystemIcon className="size-3.5" />}
            label="Systems"
            value={String(process.systems.length)}
          />
          <ProcessMetric
            icon={<FlowIcon className="size-3.5" />}
            label="Connections"
            value={String(connectionCount)}
          />
        </div>
      </header>

      <div className="grid gap-6 p-4 sm:p-5 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-3">
          <ExpandableSection
            count={pluralize(process.steps.length, "step")}
            defaultOpen
            description="The documented sequence and responsible Roles."
            eyebrow="Operational definition"
            title="Ordered steps"
          >
            <Steps process={process} />
          </ExpandableSection>

          <ExpandableSection
            count={pluralize(process.exceptions.length, "exception")}
            defaultOpen
            description="Alternate paths and the conditions that trigger them."
            eyebrow="Operational variation"
            title="Exceptions"
          >
            <Exceptions process={process} />
          </ExpandableSection>

          <ExpandableSection
            count={pluralize(process.systems.length, "system")}
            defaultOpen
            description="Software, services, and records directly used by this Process."
            eyebrow="Enabling context"
            title="Systems used"
          >
            <Systems process={process} />
          </ExpandableSection>
        </div>

        <div className="space-y-3">
          <OwnershipPanel process={process} />
          <SidePanel className="bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
                  Process network
                </p>
                <h3 className="mt-0.5 text-sm font-semibold text-[var(--text)]">
                  Dependencies
                </h3>
              </div>
              <FlowIcon className="size-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="mt-4 space-y-5">
              <DependencyList
                dependencies={process.upstream}
                direction="upstream"
                onOpenProcess={onOpenProcess}
              />
              <DependencyList
                dependencies={process.downstream}
                direction="downstream"
                onOpenProcess={onOpenProcess}
              />
            </div>
          </SidePanel>
        </div>
      </div>
    </Card>
  );
}

export function ProcessExplorer({
  analysis,
  data,
  source,
}: {
  analysis: FlowAnalysisResult;
  data: ProcessExplorerData;
  source: OperatingModelSource;
}) {
  const [mode, setMode] = useState<ProductMode>("explorer");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [systemFilter, setSystemFilter] = useState("");
  const [selectedProcessId, setSelectedProcessId] = useState(
    data.processes[0]?.id ?? "",
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

  function openConnectedProcess(processId: string) {
    clearFilters();
    setSelectedProcessId(processId);
  }

  function openProcessFromList(processId: string) {
    setSelectedProcessId(processId);

    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => {
        document
          .getElementById("process-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function openProcessFromAnalysis(processId: string) {
    clearFilters();
    setSelectedProcessId(processId);
    setMode("explorer");
    requestAnimationFrame(() => {
      document
        .getElementById("process-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <AppShell
      asOf={analysis.asOf}
      mode={mode}
      onModeChange={setMode}
      organizationName={data.organization.name}
      source={source}
    >
      {source.notice ? (
        <Alert className="mb-5" tone="warning">
          {source.notice}
        </Alert>
      ) : null}

      <PageHeader analysis={analysis} data={data} mode={mode} />

      {mode === "explorer" ? (
        <>
          <ProcessFilters
            activeFilterCount={activeFilterCount}
            clearFilters={clearFilters}
            data={data}
            query={query}
            roleFilter={roleFilter}
            setQuery={setQuery}
            setRoleFilter={setRoleFilter}
            setSystemFilter={setSystemFilter}
            systemFilter={systemFilter}
          />
          <div className="mt-4 grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
            <ProcessIndex
              filteredProcesses={filteredProcesses}
              onOpenProcess={openProcessFromList}
              selectedProcessId={selectedProcess?.id ?? null}
              total={data.processes.length}
            />
            {selectedProcess ? (
              <ProcessDetail
                onOpenProcess={openConnectedProcess}
                process={selectedProcess}
              />
            ) : (
              <Card className="p-5">
                <EmptyState title="Select a process">
                  Choose a Process to inspect its operating context.
                </EmptyState>
              </Card>
            )}
          </div>
        </>
      ) : (
        <FlowAnalysis
          analysis={analysis}
          onOpenProcess={openProcessFromAnalysis}
        />
      )}
    </AppShell>
  );
}
