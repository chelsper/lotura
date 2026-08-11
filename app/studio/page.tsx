import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import { ArrowIcon, LayersIcon, OrganizationIcon, RoleIcon, SystemIcon } from "../ui/icons";
import { Badge, Card } from "../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../workspace-shell";

export default async function WorkspaceStudioPage() {
  await connection();
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled) notFound();
  const { asOf, configuration, data, source } = experience;
  const attention = [
    data.gaps.positionsWithoutUnit > 0
      ? `${data.gaps.positionsWithoutUnit} Positions have no Organization Unit recorded.`
      : null,
    data.gaps.occupancyNotEstablished > 0
      ? `${data.gaps.occupancyNotEstablished} Positions have no established occupancy state.`
      : null,
    data.gaps.rolesWithoutMandates > 0
      ? `${data.gaps.rolesWithoutMandates} Operational Roles have no current Position mandate.`
      : null,
    data.gaps.mandatesWithoutCoverage > 0
      ? `${data.gaps.mandatesWithoutCoverage} Role Mandates have no current human coverage.`
      : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description="Build and govern the connected representation of how this organization is structured and how it operates. Start with Organization Builder; additional Studio areas will arrive in deliberate slices."
        eyebrow={
          <>
            <LayersIcon className="size-3.5" />
            Governed authoring
          </>
        }
        stats={[
          { label: "People", value: data.people.length },
          { label: "Positions", value: data.positions.length },
          { label: "Units", value: data.units.length },
          { label: "Roles", value: data.operationalRoles.length },
        ]}
        title="Workspace Studio"
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Link
            className="group block rounded-[14px] border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent-subtle)] p-5 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] sm:p-6"
            href="/studio/organization"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge tone="accent">Available now</Badge>
                <p className="mt-4 flex items-center gap-2 text-xs font-medium text-[var(--workspace-accent)]">
                  <OrganizationIcon className="size-4" /> Organization Builder
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
                  Build the organization’s structural foundation
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  Add and maintain Organization Units, Positions, People, Position Assignments, reporting relationships, and the existing bridge to Operational Roles.
                </p>
              </div>
              <ArrowIcon className="mt-1 size-5 shrink-0 text-[var(--workspace-accent)] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: RoleIcon, title: "Responsibilities", description: "Create and maintain Operational Roles, Position mandates, and explicit human coverage.", href: "/studio/responsibilities" },
              { icon: LayersIcon, title: "Processes", description: "Draft Process definition and operating-model relationships through the existing authoring boundary." },
              { icon: SystemIcon, title: "Technology", description: "Systems and the work that depends on them. Technology Builder remains intentionally deferred." },
              { icon: LayersIcon, title: "Activity", description: "A future read-only timeline across existing append-only ledgers, without implying causality." },
            ].map((area) => {
              const Icon = area.icon;
              const content = (
                <Card className={`p-4 sm:p-5 ${area.href ? "h-full transition-colors group-hover:border-[var(--border-strong)] group-hover:bg-[var(--surface-hover)]" : "opacity-75"}`}>
                  <p className={`flex items-center gap-2 text-xs font-medium ${area.href ? "text-[var(--workspace-accent)]" : "text-[var(--text-tertiary)]"}`}>
                    <Icon className="size-4" /> {area.href ? "Available now" : "Planned Studio area"}
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-[var(--text)]">{area.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{area.description}</p>
                </Card>
              );
              return area.href ? (
                <Link className="group block" href={area.href} key={area.title}>{content}</Link>
              ) : (
                <div key={area.title}>{content}</div>
              );
            })}
          </div>
        </div>

        <Card className="h-fit p-4 sm:p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Things needing attention</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Documented questions, not a score</h2>
          <div className="mt-4 space-y-3">
            {attention.length > 0 ? (
              attention.map((item) => (
                <p className="rounded-[10px] border border-[var(--border)] p-3 text-xs leading-5 text-[var(--text-secondary)]" key={item}>
                  {item}
                </p>
              ))
            ) : (
              <p className="text-xs leading-5 text-[var(--text-tertiary)]">No deterministic structural gaps are visible in the current snapshot.</p>
            )}
          </div>
          <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-4 text-[var(--text-tertiary)]">
            These findings describe recorded structure. They do not measure performance, workload, institutional approval, or organizational quality.
          </p>
        </Card>
      </div>
    </WorkspaceShell>
  );
}
