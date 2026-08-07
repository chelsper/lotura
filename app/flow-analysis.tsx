"use client";

import { useMemo, useState } from "react";

import type {
  FlowAnalysisResult,
  FlowEvidence,
  FlowFinding,
} from "@/lib/flow-analysis.mjs";

import { ArrowIcon, FlowIcon, InfoIcon } from "./ui/icons";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FieldLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
  cn,
} from "./ui/primitives";

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
  const tones = {
    "Direct impact": "warning",
    "Potential indirect impact": "info",
    "Review recommended": "accent",
  } as const;

  return <Badge tone={tones[evidence]}>{evidence}</Badge>;
}

function Finding({
  finding,
  onOpenProcess,
}: {
  finding: FlowFinding;
  onOpenProcess: (processId: string) => void;
}) {
  return (
    <article className="px-4 py-5 sm:px-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 max-w-3xl">
          <EvidenceBadge evidence={finding.evidence} />
          <h3 className="mt-2.5 text-[15px] font-semibold leading-6 tracking-[-0.01em] text-[var(--text)]">
            {finding.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {finding.summary}
          </p>
        </div>
        {finding.processIds.length > 0 ? (
          <Button
            className="self-start"
            onClick={() => onOpenProcess(finding.processIds[0])}
            size="sm"
            variant="ghost"
          >
            Open in Explorer
            <ArrowIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-x-5 gap-y-3 rounded-[10px] bg-[var(--surface-subtle)] px-3.5 py-3 sm:grid-cols-2 xl:grid-cols-3">
        {finding.facts.map((item) => (
          <div key={`${finding.id}-${item.label}`}>
            <dt className="text-[11px] font-medium text-[var(--text-tertiary)]">
              {item.label}
            </dt>
            <dd className="mt-0.5 break-words text-xs leading-5 text-[var(--text-secondary)]">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <details className="group mt-4 border-t border-[var(--border)] pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          <span className="grid size-5 place-items-center rounded-md bg-[var(--surface-subtle)] text-[var(--text-tertiary)]">
            <InfoIcon className="size-3" />
          </span>
          How this was determined
        </summary>
        <p className="mt-2 max-w-4xl pl-7 text-xs leading-5 text-[var(--text-secondary)]">
          {finding.howDetermined}
        </p>
        {finding.limitation ? (
          <p className="mt-2 ml-7 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-subtle)] px-3 py-2 text-xs leading-5 text-[var(--warning)]">
            Interpretation limit: {finding.limitation}
          </p>
        ) : null}
      </details>
    </article>
  );
}

function FindingList({
  emptyMessage,
  findings,
  onOpenProcess,
}: {
  emptyMessage: string;
  findings: FlowFinding[];
  onOpenProcess: (processId: string) => void;
}) {
  if (findings.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <Card className="divide-y divide-[var(--border)] overflow-hidden">
      {findings.map((finding) => (
        <Finding
          finding={finding}
          key={finding.id}
          onOpenProcess={onOpenProcess}
        />
      ))}
    </Card>
  );
}

function SectionIntro({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium text-[var(--text-tertiary)]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[var(--text)] sm:text-[22px]">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function ResponsibilitySummary({ analysis }: { analysis: FlowAnalysisResult }) {
  const rows = [
    {
      basis: "Explicit",
      count: analysis.responsibilityCounts.explicit,
      meaning: "A responsible Role is recorded on the Step.",
    },
    {
      basis: "Inherited",
      count: analysis.responsibilityCounts.inherited,
      meaning: "The Step inherits responsibility from the Process owner.",
    },
    {
      basis: "Unclear",
      count: analysis.responsibilityCounts.unclear,
      meaning: "Neither the Step nor its Process establishes responsibility.",
    },
    {
      basis: "Unstaffed",
      count: analysis.responsibilityCounts.unstaffed,
      meaning: "The responsible Role has no current primary assignment.",
    },
    {
      basis: "Retired",
      count: analysis.responsibilityCounts.retired,
      meaning: "The responsible Role is inactive.",
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-start sm:px-5">
        <div>
          <EvidenceBadge evidence="Review recommended" />
          <h3 className="mt-2 text-sm font-semibold text-[var(--text)]">
            Step responsibility basis
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">
            Missing step-level Roles inherit the Process owner before FLOW checks
            clarity and staffing.
          </p>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">
          {rows.reduce((sum, row) => sum + row.count, 0)} Steps reviewed
        </p>
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHeadCell>Responsibility</TableHeadCell>
            <TableHeadCell className="w-20 text-right">Steps</TableHeadCell>
            <TableHeadCell className="hidden sm:table-cell">Meaning</TableHeadCell>
          </tr>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.basis}>
              <TableCell className="font-medium text-[var(--text)]">
                {row.basis}
              </TableCell>
              <TableCell className="text-right font-mono text-[var(--text)]">
                {row.count}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{row.meaning}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <details className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
        <summary className="cursor-pointer text-xs font-medium text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          How this was determined
        </summary>
        <p className="mt-2 max-w-4xl text-xs leading-5 text-[var(--text-secondary)]">
          FLOW uses ProcessStep.responsibleRoleId when present. When it is absent,
          FLOW inherits Process.ownerRoleId, then evaluates the selected Role’s
          status and current assignment at the visible as-of time.
        </p>
      </details>
    </Card>
  );
}

function AnalysisSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-[var(--border)] pb-8 last:border-b-0", className)}>
      {children}
    </section>
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
    <div className="space-y-8 pt-6 sm:pt-8">
      <AnalysisSection>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <SectionIntro
            description="Current ownership, Role coverage, and responsibility findings based on the operating model as documented."
            eyebrow="Coverage and clarity"
            title="Current gaps"
          />
          <div className="shrink-0 text-left lg:text-right">
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Reproducible as of
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
              {formatAsOf(analysis.asOf)} UTC
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <ResponsibilitySummary analysis={analysis} />
          <FindingList
            emptyMessage="No current ownership, coverage, or responsibility gaps were found."
            findings={analysis.currentGaps}
            onOpenProcess={onOpenProcess}
          />
        </div>
      </AnalysisSection>

      <AnalysisSection>
        <SectionIntro
          description="Documented operating-model reach, presented as inspectable evidence rather than a composite risk score."
          eyebrow="Documented footprint"
          title="Concentrations"
        />
        <div
          aria-label="Concentration analysis"
          className="mt-4 flex flex-wrap gap-1.5"
          role="tablist"
        >
          {(Object.keys(concentrationLabels) as ConcentrationKey[]).map((key) => (
            <Button
              aria-selected={concentration === key}
              key={key}
              onClick={() => setConcentration(key)}
              role="tab"
              size="sm"
              variant={concentration === key ? "primary" : "secondary"}
            >
              {concentrationLabels[key]}
            </Button>
          ))}
        </div>
        <div className="mt-3">
          <FindingList
            emptyMessage="No concentration evidence is available."
            findings={concentrationFindings}
            onOpenProcess={onOpenProcess}
          />
        </div>
      </AnalysisSection>

      <AnalysisSection>
        <SectionIntro
          description="Explore a deterministic change scenario. Direct impact, potential indirect impact, and review recommended remain distinct."
          eyebrow="Scenario review"
          title="What changes?"
        />

        <Card className="mt-5 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <FieldLabel>Scenario</FieldLabel>
              <Select
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
              </Select>
            </label>
            <label>
              <FieldLabel>Operating-model record</FieldLabel>
              <Select
                onChange={(event) => setSelectedEntityId(event.target.value)}
                value={effectiveEntityId}
              >
                {scenarioOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--text-tertiary)]">
            <FlowIcon className="mt-0.5 size-3.5 shrink-0" />
            Connectivity identifies a review set. It does not prove operational
            failure or require a particular change.
          </p>
        </Card>

        <div className="mt-3">
          {selectedFinding ? (
            <Card className="overflow-hidden">
              <Finding
                finding={selectedFinding}
                onOpenProcess={onOpenProcess}
              />
            </Card>
          ) : (
            <EmptyState title="No scenario evidence is available." />
          )}
        </div>
      </AnalysisSection>
    </div>
  );
}
