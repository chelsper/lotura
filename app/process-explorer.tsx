"use client";

import { useMemo, useState } from "react";

import type {
  AssignmentType,
  DependencyType,
  ExplorerDependency,
  ExplorerProcess,
  ProcessExplorerData,
  SystemType,
} from "@/lib/process-explorer-data";

type IconProps = { className?: string };

function SearchIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronIcon({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20">
      <path d="m7.5 5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function ArrowIcon({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20">
      <path d="M4 10h12m-4-4 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function FlowIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="6" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.25 6h7.5M7.4 7.8l3.45 8.15m5.75-8.15-3.45 8.15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function RoleIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 19.25c.55-3.15 3.05-5.25 6.5-5.25s5.95 2.1 6.5 5.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function SystemIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <rect x="3.75" y="5" width="16.5" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 20h7M12 16.5V20" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function ExceptionIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M12 3.75 21 19.5H3L12 3.75Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="M12 9v4.5m0 2.75v.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function LayersIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m12 4 8.25 4.25L12 12.5 3.75 8.25 12 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="m4 12.25 8 4.1 8-4.1M4 16.25l8 4.1 8-4.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

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

function ProcessListCard({ process, selected, onOpen }: { process: ExplorerProcess; selected: boolean; onOpen: () => void }) {
  const connectionCount = process.upstream.length + process.downstream.length;

  return (
    <button
      aria-pressed={selected}
      className={`group w-full rounded-[22px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215c50] focus-visible:ring-offset-2 ${
        selected
          ? "border-[#255e52] bg-[#17483f] text-white shadow-[0_16px_40px_rgba(21,68,58,0.18)]"
          : "border-[#dfe4dc] bg-white text-[#17332d] hover:-translate-y-0.5 hover:border-[#aebdb5] hover:shadow-[0_12px_32px_rgba(41,63,55,0.08)]"
      }`}
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${selected ? "text-[#bce4d6]" : "text-[#648078]"}`}>
            <span className="size-1.5 rounded-full bg-[#e59a45]" />
            {process.status}
          </div>
          <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.015em]">{process.name}</h3>
        </div>
        <span className={`mt-1 grid size-8 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5 ${selected ? "bg-white/10 text-white" : "bg-[#f0f3ee] text-[#42655d]"}`}>
          <ChevronIcon />
        </span>
      </div>

      <div className={`mt-4 flex items-center gap-2 border-t pt-3 ${selected ? "border-white/12" : "border-[#edf0eb]"}`}>
        <div className={`grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${selected ? "bg-[#d8eee6] text-[#17483f]" : "bg-[#e8efeb] text-[#2d5b50]"}`}>
          {process.ownerRole?.currentAssignee ? getInitials(process.ownerRole.currentAssignee.name) : "—"}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[11px] ${selected ? "text-[#a9cec2]" : "text-[#70847e]"}`}>Owner</p>
          <p className="truncate text-xs font-medium">{process.ownerRole?.name ?? "Unassigned"}</p>
        </div>
        <span className={`shrink-0 text-[11px] ${selected ? "text-[#bce4d6]" : "text-[#70847e]"}`}>
          {pluralize(connectionCount, "connection")}
        </span>
      </div>
    </button>
  );
}

function DependencyCard({ dependency, direction, onOpen }: { dependency: ExplorerDependency; direction: "upstream" | "downstream"; onOpen: () => void }) {
  return (
    <button
      className="group w-full rounded-2xl border border-[#e1e6df] bg-[#fbfcfa] p-3.5 text-left transition hover:border-[#afbeb6] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215c50]"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${direction === "upstream" ? "rotate-180 bg-[#eef0f8] text-[#53608a]" : "bg-[#e7f2ed] text-[#2d695c]"}`}>
          <ArrowIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-[#1a3a33]">{dependency.processName}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#6f837c]">{dependencyLabels[dependency.type]}</p>
        </div>
        <ChevronIcon className="mt-1 size-4 text-[#8da098] transition-transform group-hover:translate-x-0.5" />
      </div>
      {dependency.description ? <p className="mt-3 text-xs leading-relaxed text-[#647770]">{dependency.description}</p> : null}
    </button>
  );
}

function ProcessDetail({ process, onOpenProcess }: { process: ExplorerProcess; onOpenProcess: (processId: string) => void }) {
  const connectionCount = process.upstream.length + process.downstream.length;

  return (
    <article id="process-detail" className="scroll-mt-4 overflow-hidden rounded-[28px] border border-[#dfe4dc] bg-white shadow-[0_24px_80px_rgba(37,57,50,0.08)]">
      <header className="relative overflow-hidden border-b border-[#e7ebe5] px-5 py-6 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-24 -top-32 size-72 rounded-full bg-[#eaf3ee] blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#cae1d8] bg-[#eff8f4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#286153]">
              <span className="size-1.5 rounded-full bg-[#2f8a70]" />
              {process.status}
            </span>
            <span className="rounded-full border border-[#e1e6df] bg-white px-3 py-1 text-[11px] font-medium text-[#6c7f78]">Read-only definition</span>
          </div>

          <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#12352e] sm:text-[42px]">{process.name}</h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#5b7069] sm:text-base">{process.purpose ?? "No purpose has been recorded."}</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Metric icon={<LayersIcon className="size-4" />} label="Definition" value={pluralize(process.steps.length, "step")} />
            <Metric icon={<SystemIcon className="size-4" />} label="Operating context" value={pluralize(process.systems.length, "system")} />
            <Metric icon={<FlowIcon className="size-4" />} label="Process network" value={pluralize(connectionCount, "connection")} />
          </div>
        </div>
      </header>

      <div className="grid gap-8 px-5 py-7 sm:px-8 sm:py-9 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="steps-heading">
            <SectionHeading eyebrow="Operational definition" id="steps-heading" title="Ordered steps" count={pluralize(process.steps.length, "step")} />
            <ol className="space-y-3">
              {process.steps.map((step, index) => (
                <li key={step.id} className="relative flex gap-4 rounded-2xl border border-[#e3e8e1] bg-[#fcfdfb] p-4 sm:p-5">
                  {index < process.steps.length - 1 ? <span className="absolute left-[35px] top-14 h-[calc(100%-32px)] w-px bg-[#d7e0da] sm:left-[39px]" /> : null}
                  <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8f1ed] text-sm font-semibold text-[#24594d]">{step.position}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="text-[15px] font-semibold text-[#183930]">{step.title}</h4>
                      {step.responsibleRole ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f3ef] px-2.5 py-1 text-[11px] font-medium text-[#536a63]">
                          <RoleIcon className="size-3.5" />
                          {step.responsibleRole.name}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#60736d]">{step.instructions}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="exceptions-heading">
            <SectionHeading eyebrow="Alternate paths" id="exceptions-heading" title="Exceptions" count={pluralize(process.exceptions.length, "exception")} warm />
            {process.exceptions.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {process.exceptions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f8ead8] text-[#9a642d]"><ExceptionIcon className="size-4.5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold leading-snug text-[#453524]">{item.name}</h4>
                          {item.status === "inactive" ? <span className="rounded-full bg-[#ebe9e4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#79746b]">Retired</span> : null}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-[#9a7854]">{item.stepTitle ? `Step: ${item.stepTitle}` : "Process-level exception"}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 border-t border-[#f0e6d8] pt-3">
                      <ExceptionText label="When" text={item.condition} />
                      <ExceptionText label="Response" text={item.response} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d9dfd8] p-6 text-sm text-[#71837d]">No exceptions are recorded for this process.</div>
            )}
          </section>

          <section aria-labelledby="systems-heading">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#657e91]">Enabling context</p>
              <h3 id="systems-heading" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#173a32]">Systems used</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {process.systems.map((system) => (
                <div key={system.id} className="rounded-2xl border border-[#dfe5e5] bg-[#fafcfc] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8f0f2] text-[#486e7a]"><SystemIcon className="size-4.5" /></span>
                    <div>
                      <h4 className="text-sm font-semibold text-[#1c3c3a]">{system.name}</h4>
                      <p className="mt-0.5 text-[11px] font-medium text-[#71858a]">{systemTypeLabels[system.type]}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#617478]">{system.usage}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6 2xl:border-l 2xl:border-[#e8ece7] 2xl:pl-7">
          <section aria-labelledby="ownership-heading">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#72867f]">Accountability</p>
            <h3 id="ownership-heading" className="mt-1 text-base font-semibold text-[#173a32]">Ownership</h3>
            <div className="mt-3 rounded-2xl bg-[#163f37] p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#c9e4db]"><RoleIcon className="size-5" /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#a8ccc0]">Owner role</p>
                  <p className="mt-1 text-sm font-semibold leading-snug">{process.ownerRole?.name ?? "Unassigned"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d9eee6] text-xs font-bold text-[#19483e]">
                  {process.ownerRole?.currentAssignee ? getInitials(process.ownerRole.currentAssignee.name) : "—"}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#a8ccc0]">Current assignment</p>
                  <p className="mt-0.5 truncate text-sm font-medium">{process.ownerRole?.currentAssignee?.name ?? "No active primary assignment"}</p>
                  {process.ownerRole?.currentAssignee ? <p className="mt-0.5 text-[11px] text-[#b8d8ce]">{assignmentLabels[process.ownerRole.currentAssignee.assignmentType]}</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="dependencies-heading">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#72867f]">Process network</p>
                <h3 id="dependencies-heading" className="mt-1 text-base font-semibold text-[#173a32]">Dependencies</h3>
              </div>
              <FlowIcon className="size-5 text-[#678078]" />
            </div>
            <div className="mt-4 space-y-5">
              <DependencyList direction="upstream" dependencies={process.upstream} onOpenProcess={onOpenProcess} />
              <DependencyList direction="downstream" dependencies={process.downstream} onOpenProcess={onOpenProcess} />
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e2e7e0] bg-[#fafbf9] p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[#6d8079]">{icon}{label}</div>
      <p className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[#173a32]">{value}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, id, title, count, warm = false }: { eyebrow: string; id: string; title: string; count: string; warm?: boolean }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${warm ? "text-[#9a6a35]" : "text-[#72867f]"}`}>{eyebrow}</p>
        <h3 id={id} className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#173a32]">{title}</h3>
      </div>
      <span className="text-xs text-[#7b8d87]">{count}</span>
    </div>
  );
}

function ExceptionText({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#a17a52]">{label}</p>
      <p className="mt-1 text-xs leading-5 text-[#69543e]">{text}</p>
    </div>
  );
}

function DependencyList({ direction, dependencies, onOpenProcess }: { direction: "upstream" | "downstream"; dependencies: ExplorerDependency[]; onOpenProcess: (processId: string) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold capitalize text-[#4f655e]">{direction}</p>
        <span className="text-[11px] text-[#84948f]">{dependencies.length}</span>
      </div>
      <div className="space-y-2">
        {dependencies.length > 0 ? (
          dependencies.map((dependency) => (
            <DependencyCard
              key={`${dependency.processId}-${dependency.type}`}
              dependency={dependency}
              direction={direction}
              onOpen={() => onOpenProcess(dependency.processId)}
            />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-[#dfe4de] px-3 py-4 text-center text-xs text-[#85958f]">No {direction} dependencies</p>
        )}
      </div>
    </div>
  );
}

export function ProcessExplorer({ data }: { data: ProcessExplorerData }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [systemFilter, setSystemFilter] = useState("");
  const [selectedProcessId, setSelectedProcessId] = useState(data.processes[0]?.id ?? "");

  const filteredProcesses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return data.processes.filter((process) => {
      const matchesName = process.name.toLocaleLowerCase().includes(normalizedQuery);
      const matchesRole = !roleFilter || process.roleIds.includes(roleFilter);
      const matchesSystem = !systemFilter || process.systems.some((system) => system.id === systemFilter);
      return matchesName && matchesRole && matchesSystem;
    });
  }, [data.processes, query, roleFilter, systemFilter]);

  const selectedProcess = filteredProcesses.find((process) => process.id === selectedProcessId) ?? filteredProcesses[0] ?? null;
  const activeFilterCount = [query.trim(), roleFilter, systemFilter].filter(Boolean).length;

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

  return (
    <div className="min-h-screen bg-[#f4f6f2] text-[#18362f]">
      <header className="border-b border-[#dce2da] bg-[#f8faf7]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#15463d] text-white shadow-[0_8px_22px_rgba(21,70,61,0.2)]"><FlowIcon className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-[19px] font-semibold leading-none tracking-[-0.035em] text-[#143b33]">Lotura</p>
              <p className="mt-1 truncate text-[11px] font-medium text-[#71837d]">{data.organization.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-[#d9e1da] bg-white px-3 py-1.5 text-xs font-medium text-[#61746e] sm:inline-flex"><span className="size-1.5 rounded-full bg-[#4d9a7e]" />Fictional workspace</span>
            <span className="rounded-full bg-[#e9eeea] px-3 py-1.5 text-xs font-semibold text-[#536860]">Read only</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] bg-[#133f36] px-5 py-7 text-white sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 -top-12 size-52 rounded-full border border-white/10" />
          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#afd3c6]"><LayersIcon className="size-4" />Operating model</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-[44px]">Process Explorer</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c3dcd3] sm:text-[15px]">See how work moves across roles, systems, exceptions, and process boundaries—not just what the procedure says.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Processes", value: data.processes.length },
                { label: "Roles", value: data.roles.length },
                { label: "Systems", value: data.systems.length },
              ].map((stat) => (
                <div key={stat.label} className="min-w-[82px] rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur sm:min-w-[102px] sm:px-4">
                  <p className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#acd0c3]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Process filters" className="mt-5 rounded-[22px] border border-[#dfe4dc] bg-white p-3 shadow-[0_10px_30px_rgba(49,65,58,0.05)]">
          <div className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_minmax(180px,280px)_minmax(180px,280px)_auto]">
            <label className="relative block">
              <span className="sr-only">Search by process name</span>
              <SearchIcon className="absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#71837d]" />
              <input className="h-11 w-full rounded-[14px] border border-[#dfe5de] bg-[#fafbf9] pl-10 pr-4 text-sm text-[#173830] outline-none transition placeholder:text-[#91a09b] focus:border-[#5f857b] focus:bg-white focus:ring-3 focus:ring-[#dbeae4]" onChange={(event) => setQuery(event.target.value)} placeholder="Search process names…" type="search" value={query} />
            </label>
            <FilterSelect icon={<RoleIcon className="size-4.5" />} label="Filter by role" value={roleFilter} onChange={setRoleFilter} options={data.roles.map((role) => ({ id: role.id, name: role.name }))} emptyLabel="All roles" />
            <FilterSelect icon={<SystemIcon className="size-4.5" />} label="Filter by system" value={systemFilter} onChange={setSystemFilter} options={data.systems.map((system) => ({ id: system.id, name: system.name }))} emptyLabel="All systems" />
            <button className="h-11 rounded-[14px] px-4 text-sm font-semibold text-[#416159] transition hover:bg-[#f0f3ef] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215c50]" disabled={activeFilterCount === 0} onClick={clearFilters} type="button">
              Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>
        </section>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
          <aside className="max-h-[520px] overflow-y-auto rounded-[26px] border border-[#dfe4dc] bg-[#edf1ec] p-3 xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)]">
            <div className="flex items-center justify-between px-2 pb-3 pt-1">
              <div>
                <p className="text-sm font-semibold text-[#24473e]">All processes</p>
                <p aria-live="polite" className="mt-0.5 text-xs text-[#71837d]">Showing {filteredProcesses.length} of {data.processes.length}</p>
              </div>
              <span className="grid size-8 place-items-center rounded-xl bg-white text-[#59726a]"><LayersIcon className="size-4" /></span>
            </div>
            {filteredProcesses.length > 0 ? (
              <div className="space-y-2.5">
                {filteredProcesses.map((process) => <ProcessListCard key={process.id} process={process} selected={process.id === selectedProcess?.id} onOpen={() => openProcessFromList(process.id)} />)}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#cbd5ce] bg-white/60 px-5 py-10 text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-2xl bg-white text-[#6e837b]"><SearchIcon className="size-5" /></span>
                <p className="mt-3 text-sm font-semibold text-[#38564e]">No matching processes</p>
                <p className="mt-1 text-xs leading-5 text-[#75877f]">Try another name, role, or system.</p>
                <button className="mt-4 text-xs font-semibold text-[#246253] underline decoration-[#a9c4ba] underline-offset-4" onClick={clearFilters} type="button">Clear filters</button>
              </div>
            )}
          </aside>

          {selectedProcess ? (
            <ProcessDetail process={selectedProcess} onOpenProcess={openConnectedProcess} />
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-[28px] border border-dashed border-[#cdd7d0] bg-white/60 p-8 text-center">
              <div><FlowIcon className="mx-auto size-8 text-[#698078]" /><p className="mt-3 text-sm font-semibold text-[#36564d]">Select a process to explore its operating context.</p></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FilterSelect({ icon, label, value, onChange, options, emptyLabel }: { icon: React.ReactNode; label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }>; emptyLabel: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71837d]">{icon}</span>
      <select className="h-11 w-full appearance-none rounded-[14px] border border-[#dfe5de] bg-[#fafbf9] pl-10 pr-9 text-sm text-[#3f5851] outline-none transition focus:border-[#5f857b] focus:bg-white focus:ring-3 focus:ring-[#dbeae4]" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      <ChevronIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 rotate-90 text-[#71837d]" />
    </label>
  );
}
