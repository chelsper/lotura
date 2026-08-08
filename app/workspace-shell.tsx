import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import { workspaceAccessContext } from "@/lib/authentication";
import type { OperatingModelSource } from "@/lib/process-explorer-source-policy.mjs";
import type { WorkspaceConfiguration } from "@/lib/workspace-configuration.mjs";

import { ExplorerIcon, FlowIcon, HomeIcon } from "./ui/icons";
import { Alert, Badge, cn } from "./ui/primitives";

export type WorkspaceView = "overview" | "explorer" | "flow";

const navigation = [
  {
    id: "overview" as const,
    href: "/overview",
    icon: HomeIcon,
    label: "Overview",
  },
  {
    id: "explorer" as const,
    href: "/explorer",
    icon: ExplorerIcon,
    label: "Explorer",
  },
  {
    id: "flow" as const,
    href: "/flow",
    icon: FlowIcon,
    label: "FLOW",
  },
];

export function formatOperatingModelTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function sourceTone(source: OperatingModelSource) {
  if (source.kind === "neon") return "success" as const;
  if (source.kind === "demo-fallback") return "warning" as const;
  return "neutral" as const;
}

function WorkspaceNavigation({
  activeView,
}: {
  activeView?: WorkspaceView;
}) {
  return (
    <nav
      aria-label="Product"
      className="space-y-1 max-lg:flex max-lg:gap-1 max-lg:space-y-0"
    >
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] max-lg:w-auto",
              active
                ? "bg-[var(--workspace-accent-subtle)] text-[var(--workspace-accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
            )}
            href={item.href}
            key={item.id}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceIdentity({
  configuration,
}: {
  configuration: WorkspaceConfiguration;
}) {
  const { appearance } = configuration;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-label={appearance.logo.accessibleLabel}
        className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[var(--workspace-accent)] text-[11px] font-semibold text-[var(--workspace-accent-foreground)]"
        role="img"
      >
        {appearance.logo.kind === "image" ? (
          // Configuration accepts an approved HTTPS asset host at runtime.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="size-7 object-contain"
            referrerPolicy="no-referrer"
            src={appearance.logo.src}
          />
        ) : (
          appearance.logo.text
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
          {appearance.scopeLabel ?? "Organization"}
        </p>
        <p className="truncate text-sm font-medium text-[var(--text)]">
          {appearance.displayName}
        </p>
      </div>
    </div>
  );
}

async function WorkspaceSessionControl() {
  const access = await workspaceAccessContext();
  if (access.mode !== "temporary-password" || !access.authenticated) return null;

  return (
    <form action="/auth/logout" className="mt-3" method="post">
      <button
        className="text-[11px] font-medium text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}

function SourceStatus({
  asOf,
  source,
}: {
  asOf: string;
  source: OperatingModelSource;
}) {
  return (
    <div>
      <Badge dot tone={sourceTone(source)}>
        {source.label}
      </Badge>
      <p className="mt-2 text-[11px] leading-4 text-[var(--text-tertiary)]">
        Data current as of
      </p>
      <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-secondary)]">
        {formatOperatingModelTimestamp(asOf)} UTC
      </p>
    </div>
  );
}

export function WorkspacePageHeader({
  description,
  eyebrow,
  stats,
  title,
}: {
  description: string;
  eyebrow: ReactNode;
  stats?: Array<{ label: string; value: number }>;
  title: string;
}) {
  return (
    <header className="border-b border-[var(--border)] pb-6 sm:pb-8">
      <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
        {eyebrow}
      </p>
      <div className="mt-3 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div className="max-w-3xl">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[var(--text)] sm:text-[36px]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
        {stats ? (
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
        ) : null}
      </div>
    </header>
  );
}

export function WorkspaceShell({
  activeView,
  asOf,
  children,
  configuration,
  source,
}: {
  activeView?: WorkspaceView;
  asOf: string;
  children: ReactNode;
  configuration: WorkspaceConfiguration;
  source: OperatingModelSource;
}) {
  const { accent } = configuration.appearance;
  const style = {
    "--workspace-accent": accent.base,
    "--workspace-accent-hover": accent.hover,
    "--workspace-accent-subtle": accent.subtle,
    "--workspace-accent-border": accent.border,
    "--workspace-accent-foreground": accent.foreground,
    "--workspace-focus-ring": accent.focus,
  } as CSSProperties;

  return (
    <div
      className="min-h-screen bg-[var(--canvas)] text-[var(--text)]"
      style={style}
    >
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <div className="border-b border-[var(--border)] px-5 py-5">
          <Link
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
            href="/"
          >
            <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--workspace-accent)] text-[var(--workspace-accent-foreground)]">
              <FlowIcon className="size-4" />
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.035em]">
              Lotura
            </span>
          </Link>
          <div className="mt-5">
            <WorkspaceIdentity configuration={configuration} />
          </div>
        </div>

        <div className="flex-1 px-3 py-4">
          <WorkspaceNavigation activeView={activeView} />
        </div>

        <div className="border-t border-[var(--border)] px-5 py-4">
          <SourceStatus asOf={asOf} source={source} />
          {configuration.knowledgeState ? (
            <div className="mt-3">
              <Badge
                dot
                tone={
                  configuration.knowledgeState.tone === "informational"
                    ? "info"
                    : configuration.knowledgeState.tone
                }
              >
                {configuration.knowledgeState.label}
              </Badge>
            </div>
          ) : null}
          <p className="mt-3 text-[11px] font-medium leading-4 text-[var(--text-tertiary)]">
            Explore only — nothing you do here changes data.
          </p>
          <WorkspaceSessionControl />
        </div>
      </aside>

      <div className="lg:pl-[232px]">
        <header className="border-b border-[var(--border)] bg-[var(--surface)] lg:hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <WorkspaceIdentity configuration={configuration} />
            <div className="flex shrink-0 flex-col items-end">
              <Badge dot tone={sourceTone(source)}>
                {source.label}
              </Badge>
              <WorkspaceSessionControl />
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 pb-3 sm:px-5">
            <WorkspaceNavigation activeView={activeView} />
          </div>
        </header>

        <main className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          {configuration.knowledgeState ? (
            <Alert
              className="mb-5"
              tone={
                configuration.knowledgeState.tone === "informational"
                  ? "info"
                  : configuration.knowledgeState.tone
              }
            >
              <p className="font-medium">{configuration.knowledgeState.label}</p>
              <p className="mt-0.5 text-xs leading-5 opacity-90">
                {configuration.knowledgeState.description}
              </p>
            </Alert>
          ) : null}
          {source.notice ? (
            <Alert className="mb-5" tone="warning">
              {source.notice}
            </Alert>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
