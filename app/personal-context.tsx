import Link from "next/link";

import type { PersonalContext } from "@/lib/personal-context.mjs";

import {
  ArrowIcon,
  FlowIcon,
  LayersIcon,
  OrganizationIcon,
  RoleIcon,
  SystemIcon,
} from "./ui/icons";
import { Alert, Badge, Card, EmptyState } from "./ui/primitives";

const dependencyLabels: Record<string, string> = {
  provides_to: "Provides to",
  receives_from: "Receives from",
  requires: "Requires",
  triggers: "Triggers",
};

function PositionLink({
  people,
  position,
}: {
  people: Array<{ id: string; name: string }>;
  position: { id: string; title: string; unit: { name: string } | null };
}) {
  return (
    <Link
      className="group block rounded-[10px] border border-[var(--border)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      href={`/organization/positions/${encodeURIComponent(position.id)}`}
    >
      <p className="text-sm font-semibold text-[var(--text)]">
        {position.title}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {people.length > 0
          ? people.map((person) => person.name).join(", ")
          : "No current Person recorded"}
        {position.unit ? ` · ${position.unit.name}` : ""}
      </p>
      <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[var(--workspace-accent)]">
        Open Position <ArrowIcon className="size-3" />
      </p>
    </Link>
  );
}

function ProcessCard({
  authoringEnabled,
  process,
}: {
  authoringEnabled: boolean;
  process: PersonalContext["ownedProcesses"][number];
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {process.relationships.map((relationship) => (
              <Badge
                key={relationship}
                tone={relationship === "Owns Process" ? "accent" : "neutral"}
              >
                {relationship}
              </Badge>
            ))}
            <Badge tone={process.status === "draft" ? "warning" : "success"}>
              {process.status === "draft" ? "Working draft" : process.status}
            </Badge>
          </div>
          <Link
            className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-[var(--text)] hover:text-[var(--workspace-accent)]"
            href={`/explorer/${encodeURIComponent(process.id)}`}
          >
            {process.name} <ArrowIcon className="size-3.5" />
          </Link>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
        {process.purpose ?? "No Process purpose is recorded yet."}
      </p>

      {process.families.length > 0 ? (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Process Families
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {process.families.map((family) =>
              authoringEnabled ? (
                <Link
                  className="rounded-full border border-[var(--workspace-accent-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--workspace-accent)] hover:bg-[var(--workspace-accent-subtle)]"
                  href={`/studio/process-families/${encodeURIComponent(family.stableKey)}`}
                  key={family.stableKey}
                >
                  {family.name}
                </Link>
              ) : (
                <Badge key={family.stableKey}>{family.name}</Badge>
              ),
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Systems
          </p>
          <div className="mt-2 space-y-2">
            {process.systems.length > 0 ? (
              process.systems.map((system) => {
                const content = (
                  <>
                    <span className="font-medium text-[var(--text)]">
                      {system.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-tertiary)]">
                      {system.usage}
                    </span>
                  </>
                );
                return authoringEnabled && system.stableKey ? (
                  <Link
                    className="block text-xs hover:text-[var(--workspace-accent)]"
                    href={`/studio/technology/systems/${encodeURIComponent(system.stableKey)}`}
                    key={system.id}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="text-xs" key={system.id}>
                    {content}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[var(--text-tertiary)]">
                No connected System is documented.
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Process dependencies
          </p>
          <div className="mt-2 space-y-2">
            {process.dependencies.length > 0 ? (
              process.dependencies.map((dependency) => (
                <Link
                  className="block text-xs leading-5 text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]"
                  href={`/explorer/${encodeURIComponent(dependency.processId)}`}
                  key={`${dependency.direction}:${dependency.processId}:${dependency.type}`}
                >
                  <span className="font-medium text-[var(--text)]">
                    {dependencyLabels[dependency.type] ?? dependency.type}
                  </span>{" "}
                  {dependency.processName} →
                </Link>
              ))
            ) : (
              <p className="text-xs text-[var(--text-tertiary)]">
                No Process dependencies are documented.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function PersonalContextView({
  authoringEnabled,
  context,
  discoveryEnabled,
  organizationName,
}: {
  authoringEnabled: boolean;
  context: PersonalContext;
  discoveryEnabled: boolean;
  organizationName: string;
}) {
  const processCount =
    context.ownedProcesses.length + context.participatedProcesses.length;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-[var(--border)] pb-7 sm:pb-9">
        <p className="flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
          <RoleIcon className="size-3.5" /> Personal lens into {organizationName}
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
              Your organizational context
            </h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">
              Start with where you sit, then move outward through responsibility,
              work, technology, and the larger organization.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] px-3.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            href="/organization"
          >
            <OrganizationIcon className="size-4" /> See the whole organization
          </Link>
        </div>
      </header>

      <section className="py-6 sm:py-8" aria-labelledby="your-seat">
        <Card className="overflow-hidden">
          <div className="grid gap-px bg-[var(--border)] lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
            <div className="bg-[var(--surface)] p-5 sm:p-7">
              <Badge tone="accent">Authenticated pilot context</Badge>
              <h2
                className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]"
                id="your-seat"
              >
                {context.person.name}
              </h2>
              <Link
                className="mt-2 inline-flex items-center gap-1 text-base font-medium text-[var(--workspace-accent)] hover:underline"
                href={`/organization/positions/${encodeURIComponent(context.position.id)}`}
              >
                {context.position.title} <ArrowIcon className="size-3.5" />
              </Link>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {context.unit?.name ?? "No Organization Unit is recorded"}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  className="rounded-[9px] border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  href={`/organization/people/${encodeURIComponent(context.person.id)}`}
                >
                  Open Person
                </Link>
                {context.unit ? (
                  <Link
                    className="rounded-[9px] border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    href={`/organization/units/${encodeURIComponent(context.unit.id)}`}
                  >
                    Open Unit
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="bg-[var(--surface-subtle)] p-5 sm:p-7">
              <p className="text-xs font-semibold text-[var(--text)]">
                One model, different identities
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                The signed-in application identity is associated with this
                Person for the pilot. The application identity, Person,
                Position, and Operational Roles remain separate records.
              </p>
              <p className="mt-3 text-[11px] font-medium text-[var(--text-tertiary)]">
                Nothing on this page creates or infers an organizational relationship.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 pb-7 lg:grid-cols-2" aria-labelledby="where-you-fit">
        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
            <OrganizationIcon className="size-4" /> Structure
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text)]" id="where-you-fit">
            Where you fit
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
                Manager Position
              </p>
              <div className="mt-2">
                {context.manager ? (
                  <PositionLink
                    people={context.manager.people}
                    position={context.manager}
                  />
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">Not recorded</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
                Direct-report Positions · {context.directReports.length}
              </p>
              <div className="mt-2 space-y-2">
                {context.directReports.length > 0 ? (
                  context.directReports.map((report) => (
                    <PositionLink people={report.people} position={report} key={report.id} />
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    No direct-report Positions are recorded.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
            <OrganizationIcon className="size-4" /> Unit connections
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
            Your area in the hierarchy
          </h2>
          {context.unit ? (
            <div className="mt-4 space-y-3">
              {context.unit.parent ? (
                <Link
                  className="block rounded-[10px] border border-[var(--border)] p-3 hover:bg-[var(--surface-hover)]"
                  href={`/organization/units/${encodeURIComponent(context.unit.parent.id)}`}
                >
                  <p className="text-[11px] text-[var(--text-tertiary)]">Parent Unit</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {context.unit.parent.name}
                  </p>
                </Link>
              ) : null}
              <Link
                className="block rounded-[10px] border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent-subtle)] p-3"
                href={`/organization/units/${encodeURIComponent(context.unit.id)}`}
              >
                <p className="text-[11px] text-[var(--workspace-accent)]">Your Unit</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {context.unit.name}
                </p>
              </Link>
              {context.unit.children.length > 0 ? (
                <div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Child Units</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {context.unit.children.map((unit) => (
                      <Link
                        className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        href={`/organization/units/${encodeURIComponent(unit.id)}`}
                        key={unit.id}
                      >
                        {unit.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Alert tone="warning">
              This Position has no current Organization Unit recorded.
            </Alert>
          )}
        </Card>
      </section>

      <section className="border-t border-[var(--border)] py-7 sm:py-9" aria-labelledby="responsibility">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
              <RoleIcon className="size-4" /> Explicit mandate and coverage
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]" id="responsibility">
              What you are responsible for
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              These Operational Roles appear only where current records connect
              this Person, Position, mandate, and human coverage.
            </p>
          </div>
          <Badge tone="neutral">{context.roles.length} Operational Roles</Badge>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {context.roles.length > 0 ? (
            context.roles.map((role) => {
              const content = (
                <Card className="h-full p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{role.mandateTypeLabel}</Badge>
                    <Badge tone="neutral">{role.coverageTypeLabel} coverage</Badge>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-[var(--text)]">
                    {role.name}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                    {role.scope ? `Scope: ${role.scope}` : "No narrower scope is recorded."}
                  </p>
                  <p className="mt-3 text-[11px] font-medium text-[var(--workspace-accent)]">
                    {authoringEnabled && role.stableKey
                      ? "Open the Operational Role →"
                      : `${role.processes.length} connected ${role.processes.length === 1 ? "Process" : "Processes"}`}
                  </p>
                </Card>
              );
              return authoringEnabled && role.stableKey ? (
                <Link
                  href={`/studio/responsibilities/roles/${encodeURIComponent(role.stableKey)}`}
                  key={role.id}
                >
                  {content}
                </Link>
              ) : (
                <div key={role.id}>{content}</div>
              );
            })
          ) : (
            <Alert tone="info">
              No current Operational Role coverage is recorded for this Person
              through this Position. Lotura does not infer responsibility from the title.
            </Alert>
          )}
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-7 sm:py-9" aria-labelledby="work">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
              <LayersIcon className="size-4" /> Connected work
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]" id="work">
              Processes that touch your responsibilities
            </h2>
          </div>
          <Badge>{processCount} documented Processes</Badge>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Processes you own · {context.ownedProcesses.length}
            </h3>
            <div className="mt-3 space-y-4">
              {context.ownedProcesses.length > 0 ? (
                context.ownedProcesses.map((process) => (
                  <ProcessCard authoringEnabled={authoringEnabled} process={process} key={process.id} />
                ))
              ) : (
                <EmptyState title="No Process ownership recorded">
                  None of the explicitly covered Roles currently owns a documented Process.
                </EmptyState>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Processes you participate in · {context.participatedProcesses.length}
            </h3>
            <div className="mt-3 space-y-4">
              {context.participatedProcesses.length > 0 ? (
                context.participatedProcesses.map((process) => (
                  <ProcessCard authoringEnabled={authoringEnabled} process={process} key={process.id} />
                ))
              ) : (
                <EmptyState title="No additional participation recorded">
                  Lotura shows participation only through an explicitly covered Role
                  responsible for a Step or Exception.
                </EmptyState>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 border-t border-[var(--border)] py-7 sm:py-9 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)]">
        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
            <SystemIcon className="size-4" /> Technology through documented Processes
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
            Connected Systems
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {context.systems.length > 0 ? (
              context.systems.map((system) => {
                const content = (
                  <div className="h-full rounded-[10px] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-hover)]">
                    <p className="text-sm font-semibold text-[var(--text)]">{system.name}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {system.usage}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                      Through {system.processName}
                    </p>
                  </div>
                );
                return authoringEnabled && system.stableKey ? (
                  <Link href={`/studio/technology/systems/${encodeURIComponent(system.stableKey)}`} key={system.id}>
                    {content}
                  </Link>
                ) : (
                  <div key={system.id}>{content}</div>
                );
              })
            ) : (
              <p className="text-xs text-[var(--text-tertiary)]">
                No Systems are connected through these documented Processes.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
            <FlowIcon className="size-4" /> Evidence-backed reach
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
            Connected Units
          </h2>
          <div className="mt-4 space-y-2">
            {context.connectedUnits.map((unit) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] p-3 hover:bg-[var(--surface-hover)]"
                href={`/organization/units/${encodeURIComponent(unit.id)}`}
                key={unit.id}
              >
                <span>
                  <span className="block text-sm font-semibold text-[var(--text)]">{unit.name}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--text-tertiary)]">{unit.relationship}</span>
                </span>
                <ArrowIcon className="size-3.5 text-[var(--workspace-accent)]" />
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="border-t border-[var(--border)] py-7 sm:py-9" aria-labelledby="attention">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
              <LayersIcon className="size-4" /> Discovery and evidence
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]" id="attention">
              What Lotura still needs to understand
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              These are unresolved questions connected to this Position’s
              documented responsibilities—not a performance score or an inferred task list.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {context.unresolved.length > 0 ? (
                context.unresolved.slice(0, 6).map((item) => {
                  const content = (
                    <Card className="h-full p-4 transition-colors hover:bg-[var(--surface-hover)]">
                      <Badge tone="warning">{item.category}</Badge>
                      <h3 className="mt-3 text-sm font-semibold leading-6 text-[var(--text)]">
                        {item.question}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                        {item.fact}
                      </p>
                    </Card>
                  );
                  return item.href ? (
                    <Link href={item.href} key={item.key}>{content}</Link>
                  ) : (
                    <div key={item.key}>{content}</div>
                  );
                })
              ) : (
                <Alert tone="info">
                  No implemented deterministic rule currently surfaces a
                  relevant question. This does not mean the area is complete.
                </Alert>
              )}
            </div>
          </div>

          <Card className="h-fit p-5">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Move from knowing to learning
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">
              Help Lotura discover what is missing
            </h2>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Start from an organizational question or strengthen one of the
              connected Processes. Evidence remains separate until human review.
            </p>
            {discoveryEnabled ? (
              <Link
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--workspace-accent)] px-3 text-sm font-medium text-[var(--workspace-accent-foreground)] hover:bg-[var(--workspace-accent-hover)]"
                href="/studio/discovery"
              >
                Open Discovery <ArrowIcon className="size-4" />
              </Link>
            ) : null}
            {authoringEnabled ? (
              <Link
                className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                href="/studio"
              >
                Open the whole Studio
              </Link>
            ) : null}
          </Card>
        </div>
      </section>
    </div>
  );
}
