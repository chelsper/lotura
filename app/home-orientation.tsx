import Link from "next/link";

import type { OperatingModelSource } from "@/lib/process-explorer-source-policy.mjs";
import type { WorkspaceConfiguration } from "@/lib/workspace-configuration.mjs";

import { ArrowIcon, InfoIcon, LayersIcon } from "./ui/icons";
import { Badge } from "./ui/primitives";
import { formatOperatingModelTimestamp } from "./workspace-shell";

const vocabulary = [
  ["Process", "Repeatable work performed to achieve an outcome."],
  ["Role", "Durable responsibility that exists independently of one person."],
  ["Assignment", "The person currently filling a Role."],
  ["System", "Technology, a service, or a record used by the work."],
  ["Exception", "A legitimate alternate path when the usual Process does not apply."],
  ["Dependency", "A connection showing how one Process relates to another."],
  ["FLOW", "An evidence-based review of the connected operating model."],
] as const;

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
  const isFictionalSample = source.kind !== "neon";

  return (
    <div className="mx-auto max-w-6xl">
      <section className="grid min-h-[calc(100vh-7rem)] content-center gap-10 py-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:gap-16 lg:py-12">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <LayersIcon className="size-3.5" />
            Organization workspace
          </p>
          <h1 className="mt-5 max-w-4xl text-[42px] font-semibold leading-[1.04] tracking-[-0.055em] text-[var(--text)] sm:text-[58px]">
            See how your organization really works.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)] sm:text-[17px]">
            Lotura connects work, ownership, people, systems, exceptions, and
            dependencies—so you can understand the organization before
            changing it.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--workspace-accent)] px-4 text-sm font-medium text-[var(--workspace-accent-foreground)] transition-colors hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] focus-visible:ring-offset-2"
              href="/overview"
            >
              See {configuration.appearance.displayName}’s organization
              <ArrowIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              className="inline-flex h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
              href="#how-lotura-works"
            >
              <InfoIcon className="size-4" />
              See how Lotura works
            </a>
          </div>
        </div>

        <aside className="self-center rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              You are viewing
            </p>
            <Badge dot tone={sourceTone(source)}>
              {source.label}
            </Badge>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-[-0.025em] text-[var(--text)]">
            {configuration.appearance.displayName}
          </p>
          {isFictionalSample ? (
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              This sample follows a service request from intake through
              eligibility, delivery, billing, and recovery.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              This workspace is showing the connected operating model from the
              live database.
            </p>
          )}
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Data current as of
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {formatOperatingModelTimestamp(asOf)} UTC
            </p>
            <p className="mt-3 text-[11px] font-medium leading-5 text-[var(--text-tertiary)]">
              Explore only — nothing you do here changes data.
            </p>
          </div>
        </aside>
      </section>

      <details
        className="group scroll-mt-6 rounded-[14px] border border-[var(--border)] bg-[var(--surface)]"
        id="how-lotura-works"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[14px] px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] sm:px-6">
          <span>
            <span className="block text-xs font-medium text-[var(--text-tertiary)]">
              A quick guide
            </span>
            <span className="mt-1 block text-xl font-semibold tracking-[-0.025em] text-[var(--text)]">
              How Lotura works
            </span>
            <span className="mt-1.5 block max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Lotura connects the records that explain how an organization gets
              work done.
            </span>
          </span>
          <span className="text-xs font-medium text-[var(--workspace-accent)] group-open:hidden">
            Show the terms
          </span>
          <span className="hidden text-xs font-medium text-[var(--text-tertiary)] group-open:block">
            Hide the terms
          </span>
        </summary>
        <div className="grid gap-px border-t border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {vocabulary.map(([term, definition]) => (
            <article className="bg-[var(--surface)] p-4" key={term}>
              <h2 className="text-sm font-semibold text-[var(--text)]">{term}</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {definition}
              </p>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}
