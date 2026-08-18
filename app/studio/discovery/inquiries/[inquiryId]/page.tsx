import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { findPossibleDiscoveryPlaces } from "@/lib/discovery-inquiry-matching.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { ArrowIcon, SearchIcon } from "../../../../ui/icons";
import { Alert, Badge, Card } from "../../../../ui/primitives";
import {
  WorkspacePageHeader,
  WorkspaceShell,
} from "../../../../workspace-shell";

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function DiscoveryInquiryPage({
  params,
}: {
  params: Promise<{ inquiryId: string }>;
}) {
  await connection();
  const { inquiryId } = await params;
  if (!validUuid(inquiryId)) notFound();

  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();

  const [{ loadDiscoveryInquiry }, { loadProcessFamilyCatalog }] =
    await Promise.all([
      import("@/lib/discovery-data"),
      import("@/lib/process-family-data"),
    ]);
  const [inquiry, familyCatalog] = await Promise.all([
    loadDiscoveryInquiry(experience.discovery.organizationId, inquiryId),
    loadProcessFamilyCatalog(experience.discovery.organizationId),
  ]);
  if (!inquiry) notFound();

  const possiblePlaces = findPossibleDiscoveryPlaces(inquiry.questionText, [
    ...experience.data.processes
      .filter((process) => process.status !== "archived")
      .map((process) => ({
        description: process.purpose,
        href: `/studio/processes/${encodeURIComponent(process.id)}`,
        key: process.id,
        kind: "process" as const,
        name: process.name,
      })),
    ...familyCatalog.families
      .filter((family) => family.status === "active")
      .map((family) => ({
        description: family.description,
        href: `/studio/process-families/${family.stableKey}`,
        key: family.stableKey,
        kind: "process_family" as const,
        name: family.name,
      })),
  ]);

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="Keep the question intact while you decide where to look next. Possible matches are navigation aids—not answers or organizational conclusions."
        eyebrow={<><SearchIcon className="size-3.5" /> Question-driven discovery</>}
        stats={[
          { label: "Revision", value: inquiry.revision },
          { label: "Possible places", value: possiblePlaces.length },
        ]}
        title="Discovery question"
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-xs font-medium text-[var(--workspace-accent)] hover:underline"
          href="/studio/discovery"
        >
          ← Back to Discovery
        </Link>
        <Badge tone="accent">{inquiry.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card className="mt-5 p-5 sm:p-6">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">What you want to understand</p>
        <h1 className="mt-2 max-w-4xl text-2xl font-semibold leading-9 tracking-[-0.025em] text-[var(--text)]">
          {inquiry.questionText}
        </h1>
        <p className="mt-4 text-xs leading-5 text-[var(--text-tertiary)]">
          Recorded by {inquiry.actorIdentifier} on {formatTimestamp(inquiry.createdAt)} UTC
        </p>
      </Card>

      <Alert className="mt-5" tone="info">
        This inquiry preserves a question, not an answer. Opening a possible place below does not route the inquiry, create evidence, start an interview, or change a documented Process.
      </Alert>

      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Deterministic name and description matching</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Possible places to look</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Lotura only shows transparent text overlaps in this version. It does not use AI, semantic confidence, or automatic selection.
            </p>
          </div>
          <div className="flex gap-3 text-xs font-medium">
            <Link className="text-[var(--workspace-accent)] hover:underline" href="/studio/processes">Browse Processes</Link>
            <Link className="text-[var(--workspace-accent)] hover:underline" href="/studio/process-families">Browse Families</Link>
          </div>
        </div>

        {possiblePlaces.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {possiblePlaces.map((place) => (
              <Link className="group block" href={place.href} key={`${place.kind}:${place.key}`}>
                <Card className="h-full p-4 transition group-hover:border-[var(--border-strong)] group-hover:bg-[var(--surface-hover)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone="neutral">
                        {place.kind === "process" ? "Process" : "Process Family"}
                      </Badge>
                      <h3 className="mt-3 text-base font-semibold text-[var(--text)]">{place.name}</h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{place.explanation}</p>
                    </div>
                    <ArrowIcon className="mt-1 size-4 shrink-0 text-[var(--workspace-accent)] transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="mt-4 p-4 sm:p-5">
            <p className="text-sm font-medium text-[var(--text)]">No obvious text match appeared.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              That is a valid result. Keep the inquiry open, or browse the current Processes and Families without forcing a connection.
            </p>
          </Card>
        )}
      </section>

      <Card className="mt-7 p-4 sm:p-5">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">Next bounded slice</p>
        <h2 className="mt-1 text-base font-semibold text-[var(--text)]">Human routing is not enabled yet</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
          A later approved slice will let you deliberately choose a documented Process, Process Family, another source, or finish for now. Until then, this question remains open and unchanged.
        </p>
      </Card>
    </WorkspaceShell>
  );
}
