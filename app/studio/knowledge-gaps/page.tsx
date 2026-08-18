import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { loadKnowledgeGapsExperience } from "@/lib/organization-structure-experience";

import { ArrowIcon, LayersIcon } from "../../ui/icons";
import { Alert, Badge, Card } from "../../ui/primitives";
import { WorkspacePageHeader, WorkspaceShell } from "../../workspace-shell";

const evidenceLabels = {
  assumed: "Assumed",
  conflicting_observation: "Conflicting observations",
  known: "Known",
  needs_validation: "Needs validation",
  unknown: "Unknown",
} as const;

export default async function KnowledgeGapsPage() {
  await connection();
  const experience = await loadKnowledgeGapsExperience();
  if (!experience.enabled) notFound();

  const { asOf, configuration, knowledgeGaps, source } = experience;

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={asOf}
      configuration={configuration}
      source={source}
    >
      <WorkspacePageHeader
        description="Review clear questions raised by the organization’s recorded responsibilities and discovery evidence. These are prompts for understanding, not a score or task queue."
        eyebrow={
          <>
            <LayersIcon className="size-3.5" />
            Explainable questions
          </>
        }
        stats={[
          { label: "Questions", value: knowledgeGaps.counts.total },
          {
            label: "Responsibility",
            value: knowledgeGaps.counts.responsibility,
          },
          { label: "Discovery", value: knowledgeGaps.counts.discovery },
        ]}
        title="Knowledge Gaps"
      />

      <Alert className="mt-5" tone="warning">
        These questions describe what the current records do not yet establish.
        They do not measure performance, create assignments, or change the
        documented operating model.
      </Alert>

      <div className="mt-6 space-y-6">
        {knowledgeGaps.counts.total === 0 ? (
          <Card className="p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              No deterministic questions are visible right now
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              This means the currently implemented rules found no unanswered
              responsibility or discovery questions. It does not mean the
              organization is complete, approved, or free of unknowns.
            </p>
          </Card>
        ) : null}

        {knowledgeGaps.groups.map((group) =>
          group.items.length > 0 ? (
            <section key={group.id}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[var(--workspace-accent)]">
                    {group.label}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
                    Questions worth understanding
                  </h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
                    {group.description}
                  </p>
                </div>
                <Badge tone="neutral">{group.items.length}</Badge>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {group.items.map((item) => {
                  const content = (
                    <Card
                      className={`h-full p-4 sm:p-5 ${item.href ? "transition-colors group-hover:border-[var(--border-strong)] group-hover:bg-[var(--surface-hover)]" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="neutral">
                            {item.sourceType.replaceAll("_", " ")}
                          </Badge>
                          {item.evidenceState ? (
                            <Badge tone="warning">
                              {evidenceLabels[item.evidenceState]}
                            </Badge>
                          ) : null}
                        </div>
                        {item.href ? (
                          <ArrowIcon className="mt-1 size-4 shrink-0 text-[var(--workspace-accent)] transition-transform group-hover:translate-x-1" />
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-base font-semibold leading-6 text-[var(--text)]">
                        {item.question}
                      </h3>
                      <p className="mt-3 text-xs font-medium text-[var(--text-tertiary)]">
                        What the record says
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {item.fact}
                      </p>
                      <p className="mt-3 text-xs font-medium text-[var(--text-tertiary)]">
                        Why it is visible
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                        {item.whyReview}
                      </p>
                    </Card>
                  );
                  return item.href ? (
                    <Link className="group block" href={item.href} key={item.key}>
                      {content}
                    </Link>
                  ) : (
                    <div key={item.key}>{content}</div>
                  );
                })}
              </div>
            </section>
          ) : null,
        )}
      </div>
    </WorkspaceShell>
  );
}
