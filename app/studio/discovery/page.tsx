import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { ArrowIcon, LayersIcon } from "../../ui/icons";
import { Alert, Badge, Card } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";
import { DiscoveryInquiryForm } from "./discovery-inquiry-form";
import { DiscoveryStartForm } from "./discovery-start-form";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ process?: string | string[] }>;
}) {
  await connection();
  const query = await searchParams;
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) notFound();

  const {
    loadDiscoveryInquiries,
    loadDiscoveryInquirySessions,
    loadDiscoverySessions,
  } = await import("@/lib/discovery-data");
  const [inquiries, inquirySessions, sessions] = await Promise.all([
    loadDiscoveryInquiries(experience.discovery.organizationId),
    loadDiscoveryInquirySessions(experience.discovery.organizationId),
    loadDiscoverySessions(experience.discovery.organizationId),
  ]);
  const processes = experience.data.processes.map((process) => ({
    id: process.id,
    name: process.name,
    status: process.status,
  }));
  const requestedProcess = first(query.process) || null;
  const initialProcessId = processes.some((item) => item.id === requestedProcess)
    ? requestedProcess
    : null;
  const activeInterviews = [
    ...inquirySessions
      .filter((session) => session.status === "in_progress" || session.status === "paused")
      .map((session) => ({
        href: `/studio/discovery/inquiries/${session.inquiryId}/interviews/${session.id}`,
        kind: session.analystEnabled ? "AI inquiry interview" : "Inquiry interview",
        observationCount: session.observationCount,
        scopeStatement: session.scopeStatement,
        status: session.status,
        title: session.questionText,
        updatedAt: session.updatedAt,
      })),
    ...sessions
      .filter((session) => session.status === "in_progress" || session.status === "paused")
      .map((session) => ({
        href: `/studio/discovery/interviews/${session.id}`,
        kind: session.analystEnabled ? "AI Process interview" : "Process interview",
        observationCount: session.observationCount,
        scopeStatement: session.scopeStatement,
        status: session.status,
        title: session.processName,
        updatedAt: session.updatedAt,
      })),
  ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const allInterviewCount = inquirySessions.length + sessions.length;
  const readyInterviewCount = inquirySessions.filter((item) => item.status === "ready_for_review").length
    + sessions.filter((item) => item.status === "ready_for_review").length;

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description="Begin with an organizational question or an existing Process. Preserve what you are trying to understand before deciding whether an interview or documented change is needed."
        eyebrow={<><LayersIcon className="size-3.5" /> Guided discovery</>}
        stats={[
          { label: "Open questions", value: inquiries.filter((item) => item.status === "open").length },
          { label: "All interviews", value: allInterviewCount },
          { label: "Ready to review", value: readyInterviewCount },
        ]}
        title="Discovery"
      />

      <Alert className="mt-5" tone="warning">
        Interview answers are notes about how work happens. They do not change the documented Process until a person reviews and approves an update.
      </Alert>

      {activeInterviews.length ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[var(--workspace-accent)]">Active work</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Continue where you left off</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Paused and in-progress interviews stay here until you finish them.
              </p>
            </div>
            <Badge tone="accent">{activeInterviews.length} active</Badge>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {activeInterviews.map((interview) => (
              <Link className="group block" href={interview.href} key={interview.href}>
                <Card className="h-full border-[var(--accent-border)] p-4 transition group-hover:border-[var(--workspace-accent)] group-hover:bg-[var(--surface-hover)] sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={interview.status === "paused" ? "warning" : "success"}>
                          {interview.status === "paused" ? "Paused" : "In progress"}
                        </Badge>
                        <span className="text-xs text-[var(--text-tertiary)]">{interview.kind}</span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold leading-6 text-[var(--text)]">{interview.title}</h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{interview.scopeStatement}</p>
                      <p className="mt-3 text-xs font-medium text-[var(--workspace-accent)]">
                        {interview.observationCount} {interview.observationCount === 1 ? "answer" : "answers"} saved · {interview.status === "paused" ? "View and resume" : "Continue interview"}
                      </p>
                    </div>
                    <ArrowIcon className="mt-1 size-4 shrink-0 text-[var(--workspace-accent)] transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Start with a question</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">What are you trying to understand?</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            You do not need to know the right Process first. Preserve the question, then review transparent possible places to look.
          </p>
          <div className="mt-5">
            <DiscoveryInquiryForm />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Start with an existing Process</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Start another interview about the work</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Begin from a documented Process, then choose the AI analyst or the guided manual path. Neither path changes the documented Process without review.
          </p>
          <div className="mt-5">
            <DiscoveryStartForm initialProcessId={initialProcessId} processes={processes} />
          </div>
        </Card>
      </div>

      <section className="mt-6">
        <div>
          <p className="text-xs font-medium text-[var(--workspace-accent)]">Saved discovery work</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Where each conversation began</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            These groups describe the starting point, not Lotura&apos;s conclusion. Discovery that began without a Process can later be reviewed as a new Process, connected to existing work, or preserved as a policy or unresolved question.
          </p>
        </div>
        <div className="mt-4 grid gap-5 xl:grid-cols-2">
          <Card className="h-fit p-4 sm:p-5">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Started before choosing a Process</p>
            <div className="mt-4 space-y-3">
              {inquiries.length ? inquiries.map((inquiry) => (
                <Link
                  className="group block rounded-[10px] border border-[var(--border)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  href={`/studio/discovery/inquiries/${inquiry.id}`}
                  key={inquiry.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-medium leading-5 text-[var(--text)]">{inquiry.questionText}</p>
                    <ArrowIcon className="mt-1 size-4 shrink-0 text-[var(--workspace-accent)]" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="accent">{inquiry.status.replaceAll("_", " ")}</Badge>
                    <Badge tone="neutral">Recorded by {inquiry.actorIdentifier}</Badge>
                  </div>
                </Link>
              )) : (
                <p className="text-xs leading-5 text-[var(--text-tertiary)]">No discovery has started without a Process yet.</p>
              )}
            </div>
          </Card>

          <Card className="h-fit p-4 sm:p-5">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Started from a documented Process</p>
            <div className="mt-4 space-y-3">
              {sessions.length ? sessions.map((session) => (
                <Link
                  className="group block rounded-[10px] border border-[var(--border)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  href={`/studio/discovery/interviews/${session.id}`}
                  key={session.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{session.processName}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{session.scopeStatement}</p>
                    </div>
                    <ArrowIcon className="mt-1 size-4 shrink-0 text-[var(--workspace-accent)]" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={session.status === "ready_for_review" ? "warning" : "neutral"}>{session.status.replaceAll("_", " ")}</Badge>
                    <Badge tone="neutral">{session.observationCount} observations</Badge>
                  </div>
                </Link>
              )) : (
                <p className="text-xs leading-5 text-[var(--text-tertiary)]">No discovery has started from a documented Process yet.</p>
              )}
            </div>
          </Card>
        </div>
      </section>
    </WorkspaceShell>
  );
}
