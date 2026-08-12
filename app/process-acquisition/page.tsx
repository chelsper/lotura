import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadOrganizationStructureExperience } from "@/lib/organization-structure-experience";

import { ArrowIcon, RoleIcon } from "../ui/icons";
import { Alert, Badge, Card } from "../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../workspace-shell";
import { ProcessAcquisitionForm } from "./process-acquisition-form";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProcessAcquisitionPage({
  searchParams,
}: {
  searchParams: Promise<{
    position?: string | string[];
    role?: string | string[];
  }>;
}) {
  await connection();
  const query = await searchParams;
  const positionId = first(query.position);
  const roleId = first(query.role);
  const { asOf, configuration, data, discovery, processAcquisition, source } =
    await loadOrganizationStructureExperience();

  if (!processAcquisition.enabled) notFound();

  const position = positionId
    ? data.positions.find((item) => item.id === positionId)
    : null;
  const role = roleId
    ? data.operationalRoles.find((item) => item.id === roleId)
    : null;
  const supportedContext =
    position && role
      ? position.mandates.some((mandate) => mandate.role.id === role.id)
      : false;

  if ((positionId || roleId) && !supportedContext) notFound();

  const roles = data.operationalRoles
    .filter((item) => item.status === "active")
    .map((item) => ({ id: item.id, name: item.name }));

  return (
    <WorkspaceShell
      activeView="explorer"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description="Choose how to begin. Every path should preserve what is known, what remains uncertain, and what needs human review before organizational truth is established."
        eyebrow={
          <>
            <RoleIcon className="size-3.5" /> Process acquisition
          </>
        }
        title="How would you like to document this Process?"
      />

      {supportedContext && position && role ? (
        <Alert className="mt-5" tone="info">
          Starting from <strong>{position.title}</strong> and its documented
          Operational Role <strong>{role.name}</strong>. This context will not
          become Process ownership unless you select and confirm it below.
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className={discovery.enabled ? "border-[var(--workspace-accent-border)] p-4 sm:p-5" : "p-4 sm:p-5"}>
          <Badge tone={discovery.enabled ? "success" : "accent"}>{discovery.enabled ? "Available now" : "Not configured"}</Badge>
          <h2 className="mt-4 text-lg font-semibold text-[var(--text)]">Interview me</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Describe what actually happens and let Lotura ask follow-up
            questions while preserving uncertainty and disagreement.
          </p>
          {discovery.enabled ? (
            <Link className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--workspace-accent)] hover:underline" href="/studio/discovery">
              Begin discovery <ArrowIcon className="size-3.5" />
            </Link>
          ) : (
            <p className="mt-4 text-xs font-medium text-[var(--text-tertiary)]">Guided Discovery is not configured for this workspace.</p>
          )}
        </Card>

        <Card className="border-[var(--workspace-accent-border)] p-4 sm:p-5">
          <Badge tone="success">Available now</Badge>
          <h2 className="mt-4 text-lg font-semibold text-[var(--text)]">Start from scratch</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Create a deliberately incomplete Draft shell. Additions beyond the
            name, purpose, and explicitly confirmed owner remain separate work.
          </p>
          <a
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--workspace-accent)] hover:underline"
            href="#start-from-scratch"
          >
            Start a Draft <ArrowIcon className="size-3.5" />
          </a>
        </Card>

        <Card className="p-4 sm:p-5">
          <Badge tone="neutral">Future</Badge>
          <h2 className="mt-4 text-lg font-semibold text-[var(--text)]">Upload existing documentation</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Preserve an SOP, PDF, diagram, or other source before interpreting
            it. Upload and evidence staging are not enabled yet.
          </p>
        </Card>
      </div>

      <section className="scroll-mt-6 py-8 sm:py-10" id="start-from-scratch">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Manual acquisition</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
              Start a Draft Process
            </h2>
          </div>
          <Link className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]" href="/explorer">
            Return to Explorer
          </Link>
        </div>
        <Card className="p-4 sm:p-6">
          <Alert className="mb-5" tone="warning">
            Draft does not mean approved organizational truth. Record what is
            known honestly and leave ownership or purpose incomplete when it
            still needs validation.
          </Alert>
          <ProcessAcquisitionForm
            contextRoleId={supportedContext && role ? role.id : null}
            roles={roles}
          />
        </Card>
      </section>
    </WorkspaceShell>
  );
}
