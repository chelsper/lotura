"use client";

import { useMemo, useState } from "react";

import type {
  FlowAnalysisResult,
  FlowEvidence,
  FlowFinding,
} from "@/lib/flow-analysis.mjs";

type ConcentrationKey = keyof FlowAnalysisResult["concentrations"];
type ScenarioKey =
  | "role-vacancy"
  | "role-restructuring"
  | "system-unavailable"
  | "process-change";

const concentrationLabels: Record<ConcentrationKey, string> = {
  roles: "Role reach",
  exceptions: "Exceptions",
  systems: "Systems",
  dependencies: "Dependency depth",
};

const scenarioLabels: Record<ScenarioKey, string> = {
  "role-vacancy": "Role becomes vacant",
  "role-restructuring": "Role is restructured",
  "system-unavailable": "System is unavailable",
  "process-change": "Process changes",
};

function formatAsOf(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function EvidenceBadge({ evidence }: { evidence: FlowEvidence }) {
  const classes: Record<FlowEvidence, string> = {
    "Direct impact": "border-[#efd9c4] bg-[#fff6eb] text-[#8a5727]",
    "Potential indirect impact":
      "border-[#dbe2ec] bg-[#f3f6fa] text-[#4f637b]",
    "Review recommended": "border-[#d6e6df] bg-[#edf7f3] text-[#356b5e]",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${classes[evidence]}`}
    >
      {evidence}
    </span>
  );
}

function FindingCard({
  finding,
  onOpenProcess,
}: {
  finding: FlowFinding;
  onOpenProcess: (processId: string) => void;
}) {
  return (
    <article className="rounded-[20px] border border-[#dfe5de] bg-white p-4 shadow-[0_8px_24px_rgba(50,69,61,0.04)] sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <EvidenceBadge evidence={finding.evidence} />
          <h4 className="mt-3 text-base font-semibold tracking-[-0.015em] text-[#173a32]">
            {finding.title}
          </h4>
          <p className="mt-1.5 text-sm leading-6 text-[#60746d]">
            {finding.summary}
          </p>
        </div>
        {finding.processIds.length > 0 ? (
          <button
            className="shrink-0 rounded-xl border border-[#d7e0da] bg-[#f8faf7] px-3 py-2 text-xs font-semibold text-[#315f53] transition hover:border-[#a9c4ba] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215c50]"
            onClick={() => onOpenProcess(finding.processIds[0])}
            type="button"
          >
            Open in Explorer
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {finding.facts.map((item) => (
          <div
            className="rounded-xl bg-[#f6f8f5] px-3 py-2.5"
            key={`${finding.id}-${item.label}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#7c8e87]">
              {item.label}
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-[#35544c]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <details className="mt-4 border-t border-[#ebefea] pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#41675d] marker:text-[#82958e]">
          How this was determined
        </summary>
        <p className="mt-2 text-xs leading-5 text-[#667a73]">
          {finding.howDetermined}
        </p>
        {finding.limitation ? (
          <p className="mt-2 rounded-xl bg-[#faf6ef] px-3 py-2 text-xs leading-5 text-[#80684d]">
            Interpretation limit: {finding.limitation}
          </p>
        ) : null}
      </details>
    </article>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#668078]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#153b32]">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667a73]">
        {description}
      </p>
    </div>
  );
}

function ResponsibilitySummary({ analysis }: { analysis: FlowAnalysisResult }) {
  const labels = {
    explicit: "Explicit",
    inherited: "Inherited",
    unclear: "Unclear",
    unstaffed: "Unstaffed",
    retired: "Retired",
  } as const;

  return (
    <article className="rounded-[22px] border border-[#dfe5de] bg-[#f9fbf8] p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <EvidenceBadge evidence="Review recommended" />
          <h3 className="mt-3 text-base font-semibold text-[#183b33]">
            Step responsibility basis
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#64776f]">
            Missing step-level roles inherit the process owner before FLOW checks
            clarity and staffing.
          </p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(labels).map(([key, label]) => (
            <div
              className="min-w-[58px] rounded-xl bg-white px-2 py-2 text-center"
              key={key}
            >
              <p className="text-lg font-semibold text-[#204a40]">
                {
                  analysis.responsibilityCounts[
                    key as keyof typeof analysis.responsibilityCounts
                  ]
                }
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#82928c]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
      <details className="mt-4 border-t border-[#e3e9e3] pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#41675d] marker:text-[#82958e]">
          How this was determined
        </summary>
        <p className="mt-2 text-xs leading-5 text-[#667a73]">
          FLOW uses ProcessStep.responsibleRoleId when present. When it is absent,
          FLOW inherits Process.ownerRoleId, then evaluates the selected role&apos;s
          status and current assignment at the visible as-of time.
        </p>
      </details>
    </article>
  );
}

function EmptyFinding({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#cfdad3] bg-white/60 px-5 py-8 text-center text-sm text-[#6d8079]">
      {children}
    </div>
  );
}

export function FlowAnalysis({
  analysis,
  onOpenProcess,
}: {
  analysis: FlowAnalysisResult;
  onOpenProcess: (processId: string) => void;
}) {
  const [concentration, setConcentration] =
    useState<ConcentrationKey>("roles");
  const [scenario, setScenario] = useState<ScenarioKey>("role-vacancy");
  const [selectedEntityId, setSelectedEntityId] = useState("");

  const scenarioOptions = useMemo(() => {
    if (scenario === "role-vacancy" || scenario === "role-restructuring") {
      return analysis.scenarios.roles.map((item) => ({
        id: item.roleId,
        name: item.roleName,
      }));
    }
    if (scenario === "system-unavailable") {
      return analysis.scenarios.systems.map((item) => ({
        id: item.systemIds[0],
        name: item.title.replace(/^If /, "").replace(/ becomes unavailable$/, ""),
      }));
    }
    return analysis.scenarios.processes.map((item) => ({
      id: item.processIds[0],
      name: item.title.replace(/^If /, "").replace(/ changes$/, ""),
    }));
  }, [analysis.scenarios, scenario]);

  const effectiveEntityId = scenarioOptions.some(
    (option) => option.id === selectedEntityId,
  )
    ? selectedEntityId
    : (scenarioOptions[0]?.id ?? "");

  const selectedFinding = useMemo(() => {
    if (scenario === "role-vacancy" || scenario === "role-restructuring") {
      const role = analysis.scenarios.roles.find(
        (item) => item.roleId === effectiveEntityId,
      );
      return scenario === "role-vacancy"
        ? role?.vacancy ?? null
        : role?.restructuring ?? null;
    }
    if (scenario === "system-unavailable") {
      return (
        analysis.scenarios.systems.find(
          (item) => item.systemIds[0] === effectiveEntityId,
        ) ?? null
      );
    }
    return (
      analysis.scenarios.processes.find(
        (item) => item.processIds[0] === effectiveEntityId,
      ) ?? null
    );
  }, [analysis.scenarios, effectiveEntityId, scenario]);

  const concentrationFindings = analysis.concentrations[concentration];

  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-[26px] border border-[#dfe5de] bg-white p-5 shadow-[0_10px_30px_rgba(49,65,58,0.05)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <SectionIntro
            description="Current ownership, role coverage, and responsibility findings based on the operating model as documented."
            eyebrow="Coverage and clarity"
            title="Current gaps"
          />
          <div className="rounded-xl border border-[#dfe5de] bg-[#f8faf7] px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7d8f88]">
              Reproducible as of
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[#385b52]">
              {formatAsOf(analysis.asOf)} UTC
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <ResponsibilitySummary analysis={analysis} />
          {analysis.currentGaps.length > 0 ? (
            analysis.currentGaps.map((item) => (
              <FindingCard
                finding={item}
                key={item.id}
                onOpenProcess={onOpenProcess}
              />
            ))
          ) : (
            <EmptyFinding>
              No current ownership, coverage, or responsibility gaps were found at
              this as-of time.
            </EmptyFinding>
          )}
        </div>
      </section>

      <section className="rounded-[26px] border border-[#dfe5de] bg-white p-5 shadow-[0_10px_30px_rgba(49,65,58,0.05)] sm:p-6">
        <SectionIntro
          description="Raw operating-model reach and concentration, shown as evidence rather than a composite risk score."
          eyebrow="Documented footprint"
          title="Concentrations"
        />
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Concentration analysis">
          {(Object.keys(concentrationLabels) as ConcentrationKey[]).map((key) => (
            <button
              aria-selected={concentration === key}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                concentration === key
                  ? "bg-[#18483e] text-white"
                  : "border border-[#dfe5de] bg-[#f8faf7] text-[#506b63] hover:bg-white"
              }`}
              key={key}
              onClick={() => setConcentration(key)}
              role="tab"
              type="button"
            >
              {concentrationLabels[key]}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {concentrationFindings.length > 0 ? (
            concentrationFindings.map((item) => (
              <FindingCard
                finding={item}
                key={item.id}
                onOpenProcess={onOpenProcess}
              />
            ))
          ) : (
            <EmptyFinding>No concentration evidence is available.</EmptyFinding>
          )}
        </div>
      </section>

      <section className="rounded-[26px] border border-[#dfe5de] bg-white p-5 shadow-[0_10px_30px_rgba(49,65,58,0.05)] sm:p-6">
        <SectionIntro
          description="Explore a deterministic change scenario. Direct impact, potential indirect impact, and review recommended are kept distinct."
          eyebrow="Scenario review"
          title="What changes?"
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#71857d]">
              Scenario
            </span>
            <select
              className="mt-1.5 h-11 w-full rounded-xl border border-[#d9e1db] bg-[#fafbf9] px-3 text-sm text-[#36564d] outline-none focus:border-[#5f857b] focus:ring-3 focus:ring-[#dbeae4]"
              onChange={(event) => {
                setScenario(event.target.value as ScenarioKey);
                setSelectedEntityId("");
              }}
              value={scenario}
            >
              {(Object.keys(scenarioLabels) as ScenarioKey[]).map((key) => (
                <option key={key} value={key}>
                  {scenarioLabels[key]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#71857d]">
              Operating-model record
            </span>
            <select
              className="mt-1.5 h-11 w-full rounded-xl border border-[#d9e1db] bg-[#fafbf9] px-3 text-sm text-[#36564d] outline-none focus:border-[#5f857b] focus:ring-3 focus:ring-[#dbeae4]"
              onChange={(event) => setSelectedEntityId(event.target.value)}
              value={effectiveEntityId}
            >
              {scenarioOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          {selectedFinding ? (
            <FindingCard
              finding={selectedFinding}
              onOpenProcess={onOpenProcess}
            />
          ) : (
            <EmptyFinding>No scenario evidence is available.</EmptyFinding>
          )}
        </div>
      </section>
    </div>
  );
}
