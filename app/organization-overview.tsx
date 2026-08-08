import Link from "next/link";

import type { ProcessExplorerData } from "@/lib/process-explorer-data";
import type { OperatingModelSource } from "@/lib/process-explorer-source-policy.mjs";

import {
  ArrowIcon,
  ExceptionIcon,
  FlowIcon,
  LayersIcon,
  RoleIcon,
  SystemIcon,
} from "./ui/icons";
import { Badge, Card } from "./ui/primitives";

const operatingModelParts = [
  {
    icon: LayersIcon,
    name: "Processes",
    question: "What repeatable work exists?",
  },
  {
    icon: RoleIcon,
    name: "Roles and people",
    question: "Who remains accountable, and who fills that responsibility now?",
  },
  {
    icon: SystemIcon,
    name: "Systems",
    question: "What technology and records support the work?",
  },
  {
    icon: ExceptionIcon,
    name: "Exceptions",
    question: "What legitimate alternate paths preserve how work really happens?",
  },
  {
    icon: FlowIcon,
    name: "Dependencies",
    question: "What does each Process rely on or affect?",
  },
];

export function OrganizationOverview({
  data,
  source,
}: {
  data: ProcessExplorerData;
  source: OperatingModelSource;
}) {
  const recommendedProcess =
    (source.kind !== "neon"
      ? data.processes.find(
          (process) => process.name === "Receive a service request",
        )
      : undefined) ?? data.processes[0];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-[var(--border)] pb-8 sm:pb-10">
        <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
          <LayersIcon className="size-3.5" />
          Organization overview
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
              {data.organization.name}
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">
              An operating model is the connected picture of how work gets
              done: what work exists, who owns it, what supports it, and what
              it affects.
            </p>
          </div>
          <Badge tone="neutral">
            {data.processes.length} documented Processes
          </Badge>
        </div>
      </header>

      <section aria-labelledby="model-parts" className="py-8 sm:py-10">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            The connected picture
          </p>
          <h2
            className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]"
            id="model-parts"
          >
            The organization is more than its Process documents
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Lotura keeps the work and its surrounding context together so you
            can understand responsibility, resilience, and change.
          </p>
        </div>

        <div className="mt-6 grid gap-px overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--border)] md:grid-cols-2 lg:grid-cols-5">
          {operatingModelParts.map((part) => {
            const Icon = part.icon;
            return (
              <article className="bg-[var(--surface)] p-4" key={part.name}>
                <Icon className="size-4 text-[var(--workspace-accent)]" />
                <h3 className="mt-4 text-sm font-semibold text-[var(--text)]">
                  {part.name}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-[var(--text-secondary)]">
                  {part.question}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {recommendedProcess ? (
        <section aria-labelledby="start-process" className="pb-8 sm:pb-12">
          <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]">
            <div className="p-5 sm:p-7">
              <p className="text-xs font-medium text-[var(--workspace-accent)]">
                Recommended first Process
              </p>
              <h2
                className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]"
                id="start-process"
              >
                {recommendedProcess.name}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                {recommendedProcess.purpose ??
                  "Open this Process to see its purpose, ownership, systems, exceptions, dependencies, and steps together."}
              </p>
              <Link
                className="group mt-6 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-[var(--workspace-accent-foreground)] transition-colors hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] focus-visible:ring-offset-2"
                href={`/explorer/${encodeURIComponent(recommendedProcess.id)}`}
              >
                Follow this Process
                <ArrowIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] p-5 lg:border-l lg:border-t-0 lg:p-7">
              <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
                What you will see
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                <li>Why this work exists</li>
                <li>Which Role owns it—and who fills that Role now</li>
                <li>What supports the work and what it affects next</li>
                <li>How exceptions preserve legitimate alternate paths</li>
              </ul>
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
