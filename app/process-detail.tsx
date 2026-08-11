import Link from "next/link";

import type {
  CoverageType,
  DependencyType,
  ExplorerDependency,
  ExplorerProcess,
  SystemType,
} from "@/lib/process-explorer-data";

import {
  ArrowIcon,
  ExceptionIcon,
  FlowIcon,
  RoleIcon,
  SystemIcon,
} from "./ui/icons";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  ExpandableSection,
} from "./ui/primitives";

const coverageLabels: Record<CoverageType, string> = {
  permanent: "Permanent",
  interim: "Interim",
  acting: "Acting",
  delegated: "Delegated",
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

function processHref(processId: string) {
  return `/explorer/${encodeURIComponent(processId)}`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProcessSummary({ process }: { process: ExplorerProcess }) {
  const dependencyCount = process.upstream.length + process.downstream.length;
  const currentCoverage = process.ownerRole?.currentCoverage ?? [];

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
          Owner Role
        </p>
        <p className="mt-1.5 text-sm font-semibold text-[var(--text)]">
          {process.ownerRole?.name ?? "Not recorded"}
        </p>
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-tertiary)]">
          The durable responsibility for this Process.
        </p>
      </div>
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
          Current Role coverage
        </p>
        <div className="mt-1.5 space-y-2">
          {currentCoverage.length > 0 ? currentCoverage.map((coverage, index) => (
            <div className="flex items-center gap-2.5" key={`${coverage.name}:${coverage.coverageType}:${index}`}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--workspace-accent-subtle)] text-[10px] font-semibold text-[var(--workspace-accent)]">
                {getInitials(coverage.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text)]">
                  {coverage.name}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {coverageLabels[coverage.coverageType]} coverage
                  {coverage.mandateType === "primary" ? " · Primary mandate" : null}
                  {coverage.mandateType === "shared" ? ` · Shared mandate${coverage.scope ? ` — ${coverage.scope}` : ""}` : null}
                </p>
              </div>
            </div>
          )) : (
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--workspace-accent-subtle)] text-[10px] font-semibold text-[var(--workspace-accent)]">
                —
              </span>
              <p className="text-sm font-semibold text-[var(--text)]">
                No current Role coverage
              </p>
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-tertiary)]">
          People explicitly covering an active mandate for the Owner Role in this snapshot.
        </p>
      </div>
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
          Connected context
        </p>
        <p className="mt-1.5 text-sm font-semibold text-[var(--text)]">
          {pluralize(process.systems.length, "system")} · {pluralize(process.exceptions.length, "exception")} · {pluralize(dependencyCount, "process dependency", "process dependencies")}
        </p>
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-tertiary)]">
          What supports, alters, or connects to this work.
        </p>
      </div>
    </div>
  );
}

function OwnershipPrinciple() {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-[var(--surface-subtle)] px-3 py-2.5">
      <RoleIcon className="mt-0.5 size-4 shrink-0 text-[var(--workspace-accent)]" />
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        <strong className="font-medium text-[var(--text)]">Responsibilities remain. People change.</strong>{" "}
        Lotura separates the accountable Role from the people currently covering it.
      </p>
    </div>
  );
}

function Systems({ process }: { process: ExplorerProcess }) {
  if (process.systems.length === 0) {
    return (
      <EmptyState title="No Systems recorded">
        This Process has no directly linked Systems.
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
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {system.name}
              </h3>
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

function Exceptions({ process }: { process: ExplorerProcess }) {
  if (process.exceptions.length === 0) {
    return (
      <EmptyState title="No Exceptions recorded">
        No legitimate alternate paths are documented for this Process.
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
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {item.name}
                </h3>
                {item.status === "inactive" ? <Badge>Retired</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {item.stepTitle ? `Applies at: ${item.stepTitle}` : "Applies to the whole Process"}
                {item.ownerRole ? ` · Owner Role: ${item.ownerRole.name}` : ""}
              </p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-[var(--warning)]">When</dt>
                  <dd className="mt-1 leading-6 text-[var(--text-secondary)]">{item.condition}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--warning)]">Response</dt>
                  <dd className="mt-1 leading-6 text-[var(--text-secondary)]">{item.response}</dd>
                </div>
              </dl>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function DependencyGroup({
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
        <span className="text-[11px] text-[var(--text-tertiary)]">{dependencies.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {dependencies.length > 0 ? (
          dependencies.map((dependency) => (
            <Link
              className="group block rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
              href={processHref(dependency.processId)}
              key={`${dependency.processId}-${dependency.type}`}
            >
              <div className="flex items-start gap-2">
                <ArrowIcon className={`mt-0.5 size-3.5 shrink-0 text-[var(--text-tertiary)] ${direction === "upstream" ? "rotate-180" : ""}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-5 text-[var(--text)]">{dependency.processName}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{dependencyLabels[dependency.type]}</p>
                </div>
                <span className="text-[11px] font-medium text-[var(--workspace-accent)]">View</span>
              </div>
              {dependency.description ? (
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{dependency.description}</p>
              ) : null}
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

function Steps({ process }: { process: ExplorerProcess }) {
  if (process.steps.length === 0) {
    return (
      <EmptyState title="No Steps recorded">
        This Process does not yet contain an operational sequence.
      </EmptyState>
    );
  }

  return (
    <ol>
      {process.steps.map((step, index) => (
        <li className="relative flex gap-3 pb-5 last:pb-0" key={step.id}>
          {index < process.steps.length - 1 ? (
            <span className="absolute bottom-0 left-[15px] top-8 w-px bg-[var(--border)]" />
          ) : null}
          <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent-subtle)] text-[11px] font-semibold text-[var(--workspace-accent)]">
            {step.position}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-5 text-[var(--text)]">{step.title}</h3>
              <Chip>
                <RoleIcon className="size-3.5" />
                Responsible Role: {step.responsibleRole?.name ?? (process.ownerRole ? `${process.ownerRole.name} (inherited)` : "Not established")}
              </Chip>
            </div>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{step.instructions}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ProcessDetail({
  authoringEnabled = false,
  process,
}: {
  authoringEnabled?: boolean;
  process: ExplorerProcess;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link className="hover:text-[var(--workspace-accent)]" href="/overview">Overview</Link>
        <span aria-hidden="true">/</span>
        <Link className="hover:text-[var(--workspace-accent)]" href="/explorer">Explorer</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--text-secondary)]">{process.name}</span>
      </nav>

      <header className="mt-5 border-b border-[var(--border)] pb-7 sm:pb-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              dot
              tone={process.status === "active" ? "success" : process.status === "draft" ? "warning" : "neutral"}
            >
              {process.status}
            </Badge>
            <Badge>Documented Process</Badge>
          </div>
          {authoringEnabled ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent-subtle)] px-3 text-xs font-medium text-[var(--workspace-accent)] transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
              href={`/explorer/${encodeURIComponent(process.id)}/maintain`}
            >
              Maintain Process
            </Link>
          ) : null}
        </div>
        <h1 className="mt-4 max-w-4xl text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
          {process.name}
        </h1>
        <div className="mt-5 max-w-3xl">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Purpose</p>
          <p className="mt-1.5 text-[15px] leading-7 text-[var(--text-secondary)]">
            {process.purpose ?? "No purpose has been recorded."}
          </p>
        </div>
        <ProcessSummary process={process} />
        <OwnershipPrinciple />
      </header>

      <section aria-labelledby="connected-context" className="py-7 sm:py-9">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Before the sequence</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]" id="connected-context">
            Understand the connected context
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Systems, legitimate alternate paths, and Process dependencies explain how this work actually operates—not just how its Steps read.
          </p>
        </div>
        <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
          <ExpandableSection
            count={pluralize(process.systems.length, "system")}
            defaultOpen
            description="Technology, services, or records directly used by this Process."
            eyebrow="Supporting context"
            title="Systems used"
          >
            <Systems process={process} />
          </ExpandableSection>
          <ExpandableSection
            count={pluralize(process.exceptions.length, "exception")}
            defaultOpen
            description="Legitimate alternate paths when the usual Process does not apply."
            eyebrow="Operational reality"
            title="Exceptions"
          >
            <Exceptions process={process} />
          </ExpandableSection>
        </div>
        <Card className="mt-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <FlowIcon className="size-4 text-[var(--workspace-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Process dependencies</h2>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <DependencyGroup dependencies={process.upstream} direction="upstream" />
            <DependencyGroup dependencies={process.downstream} direction="downstream" />
          </div>
        </Card>
      </section>

      <section aria-labelledby="process-steps" className="border-t border-[var(--border)] py-7 sm:py-9">
        <ExpandableSection
          count={pluralize(process.steps.length, "step")}
          defaultOpen
          description="The documented sequence and the Role responsible at each point."
          eyebrow="Operational definition"
          title="Steps"
        >
          <Steps process={process} />
        </ExpandableSection>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] py-6">
        <p className="text-xs text-[var(--text-tertiary)]">Continue from one Process into the wider operating model.</p>
        <Link className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--workspace-accent)]" href="/explorer">
          Explore all Processes
          <ArrowIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </footer>
    </div>
  );
}
