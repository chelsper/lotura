import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  currentDiscoveryMappingItems,
  DISCOVERY_MAPPING_ACTION_LABELS,
} from "@/lib/discovery-mapping-model.mjs";
import { fingerprintDocumentedProcessSnapshot } from "@/lib/discovery-mapping-administration";
import { buildDocumentedProcessSnapshot } from "@/lib/discovery-proposal-model.mjs";
import { currentProposalReviewDecisions } from "@/lib/proposal-review-model.mjs";
import { buildDiscoveryReconciliationEvidence } from "@/lib/discovery-reconciliation-preview.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import { DiscoveryProposalItemSummary } from "../../../../discovery-proposal-item-summary";
import { ProcessApplicationForm } from "../../../../process-application-controls";
import { Alert, Badge, Card } from "../../../../../../ui/primitives";
import {
  WorkspacePageHeader,
  WorkspaceShell,
} from "../../../../../../workspace-shell";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function applicationLabel(action: keyof typeof DISCOVERY_MAPPING_ACTION_LABELS) {
  return DISCOVERY_MAPPING_ACTION_LABELS[action].replace(/^Propose /, "");
}

export default async function ApplyProposalReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await connection();
  const { sessionId } = await params;
  const experience = await loadWorkspaceExperience();
  if (!experience.processApplication.enabled) notFound();

  const {
    loadDiscoveryProposalMapping,
    loadDiscoverySession,
    loadOperatingModelProposalApplication,
    loadOperatingModelProposalReview,
  } = await import("@/lib/discovery-data");
  const [session, mapping, review, application] = await Promise.all([
    loadDiscoverySession(experience.processApplication.organizationId, sessionId),
    loadDiscoveryProposalMapping(
      experience.processApplication.organizationId,
      sessionId,
    ),
    loadOperatingModelProposalReview(
      experience.processApplication.organizationId,
      sessionId,
    ),
    loadOperatingModelProposalApplication(
      experience.processApplication.organizationId,
      sessionId,
    ),
  ]);
  if (!session || !mapping || !review || review.status === "in_review") {
    notFound();
  }
  const process = experience.data.processes.find(
    (item) => item.id === session.processId,
  );
  if (!process) notFound();

  const currentItems = [...currentDiscoveryMappingItems(mapping.items).values()];
  const currentDecisions = currentProposalReviewDecisions(review.decisions);
  const approvedItems = currentItems.filter((item) => {
    const decision = currentDecisions.get(item.itemId);
    return (
      item.state === "active" &&
      item.action !== "preserve_unresolved" &&
      decision?.disposition === "approve" &&
      decision.itemRevisionId === item.id
    );
  });
  if (approvedItems.length === 0 && !application) notFound();

  const unchangedItems = currentItems.filter((item) => {
    if (item.state !== "active" || item.action === "preserve_unresolved") {
      return false;
    }
    return !approvedItems.some((approved) => approved.itemId === item.itemId);
  });
  const unresolvedItems = currentItems.filter(
    (item) => item.state === "active" && item.action === "preserve_unresolved",
  );
  const evidence = buildDiscoveryReconciliationEvidence(session.observations)
    .flatMap((section) => section.evidence);
  const observationById = new Map(evidence.map((item) => [item.id, item]));
  const currentFingerprint = fingerprintDocumentedProcessSnapshot(
    buildDocumentedProcessSnapshot(process),
  );
  const documentationChanged =
    !application && currentFingerprint !== review.documentedProcessFingerprint;

  return (
    <WorkspaceShell
      activeView="studio"
      asOf={experience.asOf}
      configuration={experience.configuration}
      source={experience.source}
    >
      <WorkspacePageHeader
        description={application
          ? "This immutable receipt preserves the approved package, application context, and resulting Process version."
          : "Confirm the complete approved package before it changes the documented Process."}
        eyebrow={<>Discovery · {application ? "Application receipt" : "Apply approved changes"}</>}
        stats={application
          ? [
              { label: "Applied changes", value: application.items.length },
              { label: "Before version", value: application.beforeVersionSequence },
              { label: "Resulting version", value: application.afterVersionSequence },
            ]
          : [
              { label: "Approved changes", value: approvedItems.length },
              { label: "Not changing", value: unchangedItems.length },
              { label: "Unresolved", value: unresolvedItems.length },
            ]}
        title={process.name}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--workspace-accent)]"
          href={`/studio/discovery/interviews/${session.id}/proposal-review`}
        >
          ← Back to proposal review
        </Link>
        <Link
          className="text-xs font-medium text-[var(--workspace-accent)]"
          href={`/studio/processes/${encodeURIComponent(process.id)}`}
        >
          View documented Process
        </Link>
      </div>

      {application ? (
        <>
          <Alert className="mt-5" tone="success">
            All approved changes were applied together. The prior documented state remains preserved as Process version {application.beforeVersionSequence}.
          </Alert>
          <Card className="mt-6 p-5 sm:p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Resulting Process version</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text)]">Version {application.afterVersionSequence}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Applied by</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{application.actorIdentifier}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Effective</p>
                <p className="mt-1 text-sm text-[var(--text)]">{formatTimestamp(application.effectiveAt)} UTC</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Recorded</p>
                <p className="mt-1 text-sm text-[var(--text)]">{formatTimestamp(application.createdAt)} UTC</p>
              </div>
            </div>
            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <p className="text-xs font-medium text-[var(--text-tertiary)]">Reason</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{application.reason}</p>
            </div>
          </Card>
          <section className="mt-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">Applied changes</h2>
            <div className="mt-4 space-y-4">
              {application.items.map((item) => (
                <Card className="p-5 sm:p-6" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-[var(--text)]">
                      {applicationLabel(item.action)}
                    </h3>
                    <Badge tone="success">
                      {item.changeKind === "correction" ? "Correction" : "Organizational change"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                      <p className="text-xs font-medium text-[var(--text-tertiary)]">Before</p>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">{JSON.stringify(item.beforeState, null, 2)}</pre>
                    </div>
                    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                      <p className="text-xs font-medium text-[var(--text-tertiary)]">After</p>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">{JSON.stringify(item.afterState, null, 2)}</pre>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <Alert className="mt-5" tone={documentationChanged ? "error" : "warning"}>
            {documentationChanged
              ? "The documented Process changed after this review was prepared. Reload the review before any application can occur."
              : "Nothing changes until you apply the complete package below. Rejected, unresolved, and needs-validation items remain unchanged."}
          </Alert>
          <section className="mt-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">Approved changes</h2>
            <div className="mt-4 space-y-4">
              {approvedItems.map((item) => (
                <Card className="p-5 sm:p-6" key={item.itemId}>
                  <h3 className="text-base font-semibold text-[var(--text)]">
                    {applicationLabel(item.action)}
                  </h3>
                  <div className="mt-4">
                    <DiscoveryProposalItemSummary
                      item={item}
                      observationById={observationById}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {unchangedItems.length || unresolvedItems.length ? (
            <Card className="mt-7 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">Knowledge preserved without a change</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {unchangedItems.length} reviewed {unchangedItems.length === 1 ? "item is" : "items are"} not approved for application. {unresolvedItems.length} unresolved {unresolvedItems.length === 1 ? "question remains" : "questions remain"} available for later validation.
              </p>
            </Card>
          ) : null}

          <Card className="mt-7 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">Apply the reviewed package</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Classify each approved change, record the reason and effective date, and apply the package as one new documented Process version.
            </p>
            <div className="mt-6">
              {documentationChanged ? (
                <Alert tone="error">Application is unavailable until the stale review is reconciled.</Alert>
              ) : (
                <ProcessApplicationForm
                  approvedItems={approvedItems.map((item) => ({
                    action: item.action,
                    id: item.itemId,
                    label: applicationLabel(item.action),
                  }))}
                  documentedProcessFingerprint={review.documentedProcessFingerprint}
                  reviewId={review.id}
                  sessionId={session.id}
                />
              )}
            </div>
          </Card>
        </>
      )}
    </WorkspaceShell>
  );
}
