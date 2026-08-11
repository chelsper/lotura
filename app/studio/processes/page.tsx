import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { LayersIcon } from "../../ui/icons";
import { Alert } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";
import { ProcessBuilderBrowser } from "./process-builder-browser";

const actionClass =
  "inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--workspace-accent-border)] bg-[var(--workspace-accent)] px-3.5 text-sm font-medium text-[var(--workspace-accent-foreground)] transition-colors hover:bg-[var(--workspace-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]";

export default async function ProcessBuilderPage() {
  await connection();
  const experience = await loadWorkspaceExperience();
  if (!experience.authoring.enabled) notFound();
  const { asOf, configuration, data, processAcquisition, source } = experience;
  const processes = data.processes.map((process) => ({
    dependencyCount: process.upstream.length + process.downstream.length,
    exceptionCount: process.exceptions.length,
    id: process.id,
    name: process.name,
    ownerRoleName: process.ownerRole?.name ?? null,
    purpose: process.purpose,
    status: process.status,
    stepCount: process.steps.length,
    systemCount: process.systems.length,
  }));
  const drafts = processes.filter((process) => process.status === "draft").length;
  const withoutOwner = processes.filter((process) => !process.ownerRoleName).length;

  return (
    <WorkspaceShell activeView="studio" asOf={asOf} configuration={configuration} source={source}>
      <WorkspacePageHeader
        description="Build and maintain the documented Processes that connect responsibility, work, technology, exceptions, and dependencies. Canonical existence does not establish institutional approval."
        eyebrow={<><LayersIcon className="size-3.5" />Workspace Studio</>}
        stats={[
          { label: "Processes", value: processes.length },
          { label: "Working drafts", value: drafts },
          { label: "Without Owner Role", value: withoutOwner },
        ]}
        title="Process Builder"
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Select a Process to maintain its current definition and explicitly assigned Owner Role. Steps and other operating-model relationships remain read-only in this slice.
        </p>
        {processAcquisition.enabled ? (
          <Link className={actionClass} href="/process-acquisition">Add Process</Link>
        ) : null}
      </div>
      <Alert className="mt-5" tone="info">
        Processes begin as working drafts. Status does not prove approval, completeness, or institutional truth.
      </Alert>
      <ProcessBuilderBrowser processes={processes} />
    </WorkspaceShell>
  );
}
