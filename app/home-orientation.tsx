import Link from "next/link";

import type { OperatingModelSource } from "@/lib/process-explorer-source-policy.mjs";
import type { WorkspaceConfiguration } from "@/lib/workspace-configuration.mjs";

import {
  ArrowIcon,
  ExplorerIcon,
  FlowIcon,
  InfoIcon,
  LayersIcon,
} from "./ui/icons";
import { Badge } from "./ui/primitives";
import { formatOperatingModelTimestamp } from "./workspace-shell";

const vocabulary = [
  {
    term: "Process",
    definition: "Repeatable work performed to achieve an outcome.",
    example: "Receive a service request",
  },
  {
    term: "Role",
    definition:
      "Durable organizational responsibility that exists independently of one person.",
    example: "Client Services Lead",
  },
  {
    term: "Assignment",
    definition:
      "The person currently filling a Role, including permanent, interim, acting, or backup coverage.",
    example: "Amara Patel currently fills the Client Services Lead Role",
  },
  {
    term: "System",
    definition:
      "Technology, an external service, or an operational record used by the work.",
    example: "Relay CRM",
  },
  {
    term: "Exception",
    definition:
      "A legitimate alternate path used when the standard Process does not apply.",
    example: "Required information is missing",
  },
  {
    term: "Dependency",
    definition:
      "A connection showing how one Process relies on, supplies, or triggers another.",
    example: "Receiving a request triggers eligibility assessment",
  },
  {
    term: "FLOW",
    definition:
      "An evidence-based review of the operating model for gaps, concentrations, and possible change impact.",
    example: "Reviewing acting coverage before it becomes outdated",
  },
];

function sourceTone(source: OperatingModelSource) {
  if (source.kind === "neon") return "success" as const;
  if (source.kind === "demo-fallback") return "warning" as const;
  return "neutral" as const;
}

export function HomeOrientation({
  asOf,
  configuration,
  source,
}: {
  asOf: string;
  configuration: WorkspaceConfiguration;
  source: OperatingModelSource;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <section className="border-b border-[var(--border)] pb-8 sm:pb-10">
        <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
          <LayersIcon className="size-3.5" />
          Organization workspace
        </p>
        <h1 className="mt-4 max-w-4xl text-[34px] font-semibold leading-[1.08] tracking-[-0.05em] text-[var(--text)] sm:text-[46px]">
          Understand how your organization works.
        </h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)] sm:text-base">
          Lotura shows how work connects across processes, roles, people,
          systems, exceptions, and dependencies—so you can understand
          responsibility, find gaps, and review change before acting.
        </p>

        <div className="mt-7 grid gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-3 sm:p-5">
          <div>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Organization
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">
              {configuration.appearance.displayName}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Data source
            </p>
            <div className="mt-1">
              <Badge dot tone={sourceTone(source)}>
                {source.label}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Operating-model snapshot
            </p>
            <p className="mt-1 font-mono text-[11px] leading-5 text-[var(--text-secondary)]">
              {formatOperatingModelTimestamp(asOf)} UTC
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Explore only — nothing you do here changes data.
        </p>
      </section>

      <section aria-labelledby="start-heading" className="py-8 sm:py-10">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            Start here
          </p>
          <h2
            className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]"
            id="start-heading"
          >
            Choose what you want to understand
          </h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Link
            className="group rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
            href="/explorer"
          >
            <ExplorerIcon className="size-5 text-[var(--workspace-accent)]" />
            <h3 className="mt-4 text-base font-semibold text-[var(--text)]">
              Explore a process
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
              See who owns the work, how it is performed, what it uses, and
              which processes it depends on.
            </p>
            <span className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[var(--workspace-accent)]">
              Open Explorer
              <ArrowIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            className="group rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
            href="/flow"
          >
            <FlowIcon className="size-5 text-[var(--workspace-accent)]" />
            <h3 className="mt-4 text-base font-semibold text-[var(--text)]">
              Review FLOW findings
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
              See evidence-based items that may deserve attention before
              something changes.
            </p>
            <span className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[var(--workspace-accent)]">
              Open FLOW Analysis
              <ArrowIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <a
            className="group rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
            href="#how-lotura-works"
          >
            <InfoIcon className="size-5 text-[var(--workspace-accent)]" />
            <h3 className="mt-4 text-base font-semibold text-[var(--text)]">
              See how Lotura works
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
              Learn the core terms used throughout the operating model.
            </p>
            <span className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[var(--workspace-accent)]">
              Learn the vocabulary
              <ArrowIcon className="size-3.5 rotate-90 transition-transform group-hover:translate-y-0.5" />
            </span>
          </a>
        </div>
      </section>

      <details
        className="group scroll-mt-6 rounded-[14px] border border-[var(--border)] bg-[var(--surface)]"
        id="how-lotura-works"
        open
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[14px] px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] sm:px-6">
          <span>
            <span className="block text-xs font-medium text-[var(--text-tertiary)]">
              Core vocabulary
            </span>
            <span className="mt-1 block text-xl font-semibold tracking-[-0.025em] text-[var(--text)]">
              How Lotura works
            </span>
            <span className="mt-1.5 block max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Lotura models the organization through connected records. Each
              record answers a different question about how work gets done.
            </span>
          </span>
          <span className="text-xs font-medium text-[var(--workspace-accent)] group-open:hidden">
            Show terms
          </span>
          <span className="hidden text-xs font-medium text-[var(--text-tertiary)] group-open:block">
            Hide terms
          </span>
        </summary>
        <div className="border-t border-[var(--border)] px-5 py-5 sm:px-6">
          <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
            {vocabulary.map((item) => (
              <article className="bg-[var(--surface)] p-4" key={item.term}>
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {item.term}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {item.definition}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-[var(--text-tertiary)]">
                  Example: {item.example}
                </p>
              </article>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
