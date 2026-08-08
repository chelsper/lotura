"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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
    "Direct impact": "evidence-direct",
    "Potential indirect impact": "evidence-indirect",
    "Review recommended": "evidence-review",
  } as const;

  return <Badge tone={tones[evidence]}>{evidence}</Badge>;
}

function countPhrase(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatFactValue(label: string, value: string | number) {
  if (
    typeof value === "string" &&
    (label === "Effective from" || label === "Effective until")
  ) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.valueOf())) {
      return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(parsed);
    }
  }

  return value;
}

function plainLanguageMethod(value: string) {
  return value
    .replaceAll("ProcessStep.responsibleRoleId", "the responsible Role recorded on the Step")
    .replaceAll("Process.ownerRoleId", "the Process owner Role")
    .replaceAll("active primary Role assignments", "current primary Role assignments")
    .replaceAll("active primary Role assignment", "current primary Role assignment")
    .replaceAll("active primary role assignments", "current Role assignments")
    .replaceAll("active primary role assignment", "current Role assignment")
    .replaceAll("visible as-of time", "visible snapshot time")
    .replaceAll("as-of time", "snapshot time")
    .replaceAll("selected temporary assignment types", "interim and acting coverage")
    .replaceAll("The schema", "The current operating model")
    .replaceAll("the schema", "the current operating model");
}

function roleReachSummary(finding: FlowFinding) {
  const facts = new Map(finding.facts.map((item) => [item.label, item.value]));
  const processes = Number(facts.get("Processes owned") ?? 0);
  const steps = Number(facts.get("Responsible steps") ?? 0);
  const exceptions = Number(facts.get("Exceptions owned") ?? 0);
  const systems = Number(facts.get("Systems owned") ?? 0);

  return `${finding.title} owns ${countPhrase(processes, "process", "processes")} and is responsible for ${countPhrase(steps, "step")}. It also owns ${countPhrase(exceptions, "exception")} and ${countPhrase(systems, "system")}.`;
}

export function EvidenceLegend() {
  const items: Array<{ evidence: FlowEvidence; definition: string }> = [
    {
      evidence: "Direct impact",
      definition:
        "The selected change explicitly touches a recorded operating-model relationship.",
    },
    {
      evidence: "Potential indirect impact",
      definition:
        "A connected part of the operating model may also be affected.",
    },
    {
      evidence: "Review recommended",
      definition:
        "The model identifies a question that needs human judgment or more evidence.",
    },
  ];

  return (
    <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Evidence language
        </span>
        <span className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <EvidenceBadge evidence={item.evidence} key={item.evidence} />
          ))}
        </span>
        <span className="text-[11px] text-[var(--workspace-accent)] group-open:hidden">
          What these mean
        </span>
        <span className="hidden text-[11px] text-[var(--text-tertiary)] group-open:block">
          Hide definitions
        </span>
      </summary>
      <dl className="mt-3 grid gap-3 border-t border-[var(--border)] pt-3 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.evidence}>
            <dt className="text-xs font-medium text-[var(--text)]">
              {item.evidence}
            </dt>
            <dd className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
              {item.definition}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function Finding({
  defaultExplanationOpen = false,
  finding,
  presentation = "finding",
}: {
  defaultExplanationOpen?: boolean;
  finding: FlowFinding;
  presentation?: "finding" | "reach";
}) {
  const sourceSummary =
    presentation === "reach" && finding.id.startsWith("reach-")
      ? roleReachSummary(finding)
      : finding.summary;
  const summary = sourceSummary.startsWith(`${finding.evidence}: `)
    ? sourceSummary.slice(finding.evidence.length + 2)
    : sourceSummary;

  return (
    <article className="px-4 py-5 sm:px-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 max-w-3xl">
          {presentation === "reach" ? (
            <Badge tone="neutral">Documented reach</Badge>
          ) : (
            <EvidenceBadge evidence={finding.evidence} />
          )}
          <h3 className="mt-2.5 text-[15px] font-semibold leading-6 tracking-[-0.01em] text-[var(--text)]">
            {finding.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {summary}
          </p>
          {finding.id.startsWith("temporary-") ? (
            <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
              Interim or acting coverage may be intentional. Review whether it
              remains current and appropriately time-bounded.
            </p>
          ) : null}
        </div>
        {finding.processIds.length > 0 ? (
          <Link
            className="self-start"
            href={`/explorer/${encodeURIComponent(finding.processIds[0])}`}
          >
            <span className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-transparent px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]">
            View affected process
            <ArrowIcon className="size-3.5" />
            </span>
          </Link>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-x-5 gap-y-3 rounded-[10px] bg-[var(--surface-subtle)] px-3.5 py-3 sm:grid-cols-2 xl:grid-cols-3">
        {finding.facts.map((item) => (
          <div key={`${finding.id}-${item.label}`}>
            <dt className="text-[11px] font-medium text-[var(--text-tertiary)]">
              {item.label}
            </dt>
            <dd className="mt-0.5 break-words text-xs leading-5 text-[var(--text-secondary)]">
              {formatFactValue(item.label, item.value)}
            </dd>
          </div>
        ))}
      </dl>

      <details
        className="group mt-4 border-t border-[var(--border)] pt-3"
        open={defaultExplanationOpen}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          <span className="grid size-5 place-items-center rounded-md bg-[var(--surface-subtle)] text-[var(--text-tertiary)]">
            <InfoIcon className="size-3" />
          </span>
          How this was determined
        </summary>
        <p className="mt-2 max-w-4xl pl-7 text-xs leading-5 text-[var(--text-secondary)]">
          {plainLanguageMethod(finding.howDetermined)}
        </p>
        {finding.limitation ? (
          <p className="mt-2 ml-7 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-subtle)] px-3 py-2 text-xs leading-5 text-[var(--warning)]">
            What the model cannot show: {plainLanguageMethod(finding.limitation)}
          </p>
        ) : null}
      </details>
    </article>
  );
}

function FindingList({
  emptyMessage,
  findings,
  openFirstExplanation = false,
  presentation = "finding",
}: {
  emptyMessage: string;
  findings: FlowFinding[];
  openFirstExplanation?: boolean;
  presentation?: "finding" | "reach";
}) {
  if (findings.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <Card className="divide-y divide-[var(--border)] overflow-hidden">
      {findings.map((finding, index) => (
        <Finding
          defaultExplanationOpen={openFirstExplanation && index === 0}
          finding={finding}
          key={finding.id}
          presentation={presentation}
        />
      ))}
    </Card>
  );
}

function ConcentrationList({ findings }: { findings: FlowFinding[] }) {
  if (findings.length === 0) {
    return <EmptyState title="No concentration evidence is available." />;
  }

  return (
    <Card className="overflow-hidden">
      <ol className="divide-y divide-[var(--border)]">
        {findings.map((finding, index) => (
          <li className="grid gap-3 px-4 py-4 sm:grid-cols-[28px_minmax(0,1fr)] sm:px-5" key={finding.id}>
            <span className="text-xs font-medium tabular-nums text-[var(--text-tertiary)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text)]">{finding.title}</h3>
                    <Badge tone="neutral">Documented reach</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {finding.id.startsWith("reach-") ? roleReachSummary(finding) : finding.summary}
                  </p>
                </div>
                {finding.processIds[0] ? (
                  <Link
                    className="shrink-0 text-xs font-medium text-[var(--workspace-accent)] hover:underline"
                    href={`/explorer/${encodeURIComponent(finding.processIds[0])}`}
                  >
                    View Process
                  </Link>
                ) : null}
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {finding.facts.map((fact) => (
                  <div className="flex items-baseline gap-1.5" key={`${finding.id}-${fact.label}`}>
                    <dt className="text-[11px] text-[var(--text-tertiary)]">{fact.label}</dt>
                    <dd className="text-xs font-medium text-[var(--text)]">{formatFactValue(fact.label, fact.value)}</dd>
                  </div>
                ))}
              </dl>
              <details className="mt-3">
                <summary className="cursor-pointer list-none text-[11px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                  How this was determined
                </summary>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  {plainLanguageMethod(finding.howDetermined)}
                </p>
                {finding.limitation ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
                    What the model cannot show: {plainLanguageMethod(finding.limitation)}
                  </p>
                ) : null}
              </details>
            </div>
          </li>
        ))}
      </ol>
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
    <details className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
      <summary className="flex cursor-pointer list-none flex-col justify-between gap-3 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] sm:flex-row sm:items-start sm:px-5">
        <span>
          <span className="block text-sm font-semibold text-[var(--text)]">
            How FLOW evaluates step responsibility
          </span>
          <span className="mt-1 block max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">
            FLOW uses the responsible Role recorded on a Step. If none is
            recorded, it checks the Process owner before evaluating Role status
            and current coverage.
          </span>
        </span>
        <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
          {rows.reduce((sum, row) => sum + row.count, 0)} steps reviewed
        </span>
      </summary>
      <div className="border-t border-[var(--border)]">
        <Table>
          <TableHeader>
            <tr>
              <TableHeadCell>Responsibility</TableHeadCell>
              <TableHeadCell className="w-20 text-right">Steps</TableHeadCell>
              <TableHeadCell>Meaning</TableHeadCell>
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
                <TableCell className="min-w-56">{row.meaning}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t border-[var(--border)] px-4 py-3 text-xs leading-5 text-[var(--text-secondary)] sm:px-5">
          How this was determined: FLOW first uses the responsible Role recorded
          on the Step. When none is recorded, it inherits the Process owner Role,
          then checks whether that Role is active and currently filled at the
          visible snapshot time.
        </p>
      </div>
    </details>
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

export function FlowAnalysis({ analysis }: { analysis: FlowAnalysisResult }) {
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
  const scenarioQuestion: Record<ScenarioKey, string> = {
    "role-vacancy": "What might need review if a Role becomes vacant?",
    "role-restructuring": "What might need review if a Role is restructured?",
    "system-unavailable": "What might need review if a System becomes unavailable?",
    "process-change": "What might need review if a Process changes?",
  };

  return (
    <div className="space-y-8 pt-4 sm:pt-5">
      <AnalysisSection>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <SectionIntro
            description="Ownership, Role coverage, and responsibility questions based on the operating model as documented."
            eyebrow="Coverage and clarity"
            title="Items to review"
          />
          <div className="shrink-0 text-left lg:text-right">
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Data current as of
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              {formatAsOf(analysis.asOf)} UTC
            </p>
          </div>
        </div>

        <div className="mt-4">
          <FindingList
            emptyMessage="No current ownership, coverage, or responsibility gaps were found."
            findings={analysis.currentGaps}
            openFirstExplanation
          />
        </div>
      </AnalysisSection>

      <AnalysisSection>
        <SectionIntro
          description="Choose a documented Role, System, or Process to identify a review set before change. Connectivity does not prove operational failure or require a particular decision."
          eyebrow="Consider change safely"
          title="Explore a what-if"
        />

        <Card className="mt-5 p-4 sm:p-5">
          <h3 className="text-base font-semibold tracking-[-0.015em] text-[var(--text)]">
            {scenarioQuestion[scenario]}
          </h3>
          <p className="mt-1 text-xs font-medium text-[var(--evidence-review)]">
            Exploring this scenario changes and approves nothing.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label>
              <FieldLabel>What changes?</FieldLabel>
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
              <FieldLabel>
                {scenario === "system-unavailable"
                  ? "Which System?"
                  : scenario === "process-change"
                    ? "Which Process?"
                    : "Which Role?"}
              </FieldLabel>
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
            The result separates recorded direct impact, possible indirect impact,
            and questions that need human review.
          </p>
        </Card>

        <div className="mt-3">
          {selectedFinding ? (
            <Card className="overflow-hidden">
              <Finding finding={selectedFinding} />
            </Card>
          ) : (
            <EmptyState title="No scenario evidence is available." />
          )}
        </div>
      </AnalysisSection>

      <AnalysisSection>
        <SectionIntro
          description="Shows documented operational reach. It does not measure workload, performance, importance, or risk."
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
          <ConcentrationList findings={concentrationFindings} />
        </div>
      </AnalysisSection>

      <AnalysisSection>
        <SectionIntro
          description="Review the definitions and evidence rules used to produce these reproducible findings."
          eyebrow="Methodology"
          title="How FLOW reads the operating model"
        />
        <div className="mt-5">
          <ResponsibilitySummary analysis={analysis} />
        </div>
      </AnalysisSection>
    </div>
  );
}
