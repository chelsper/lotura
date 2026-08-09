"use client";

import { useMemo, useState } from "react";

import {
  applyOrganizationStructureResolutionDecision,
  approveOrganizationStructureResolutionSession,
  buildOrganizationStructureResolutionGroups,
  evaluateOrganizationStructureResolutionReadiness,
  organizationStructureResolutionActions,
  removeOrganizationStructureResolutionDecision,
  updateOrganizationStructureResolutionAttestation,
  updateOrganizationStructureResolutionPreparation,
} from "@/lib/organization-structure-resolution.mjs";
import type {
  OrganizationStructureResolutionGroup,
  OrganizationStructureResolutionSession,
} from "@/lib/organization-structure-resolution.mjs";
import type {
  OrganizationStructurePreview,
  OrganizationStructureRecord,
} from "@/lib/organization-structure-preview.mjs";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FieldLabel,
  Input,
  SearchField,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
  cn,
} from "../../ui/primitives";

type ResolutionView = "triage" | "workbench" | "readiness" | "approval";
type QueueFilter = "all" | "blocker" | "warning" | "unresolved" | "resolved";

const maximumRenderedEvidenceRows = 100;

function evidenceIdentity(record: OrganizationStructureRecord) {
  return (
    <div>
      <p className="font-medium text-[var(--text)]">
        {record.personName || "Person not supplied"}
      </p>
      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
        {record.positionTitle || "Position title not supplied"}
      </p>
    </div>
  );
}

function statusLabel(state: string) {
  if (state === "source-evidence") return "Source evidence";
  if (state === "needs-validation") return "Needs validation";
  if (state === "excluded") return "Excluded";
  if (state === "reviewed") return "Reviewed";
  return "Resolved";
}

function statusTone(state: string) {
  if (state === "source-evidence") return "warning" as const;
  if (state === "needs-validation") return "error" as const;
  if (state === "excluded") return "neutral" as const;
  return "success" as const;
}

function WorkflowProgress({
  onBackToEvidence,
  onViewChange,
  view,
}: {
  onBackToEvidence: () => void;
  onViewChange: (view: ResolutionView) => void;
  view: ResolutionView;
}) {
  const steps: Array<{ id: "evidence" | ResolutionView; label: string }> = [
    { id: "evidence", label: "Source evidence" },
    { id: "triage", label: "Issue triage" },
    { id: "workbench", label: "Resolution workbench" },
    { id: "readiness", label: "Readiness review" },
    { id: "approval", label: "Local approval" },
  ];

  return (
    <nav aria-label="Organization structure review workflow" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1">
        {steps.map((step, index) => (
          <li className="flex items-center gap-1" key={step.id}>
            {index ? <span className="px-1 text-[var(--text-tertiary)]">→</span> : null}
            <button
              aria-current={view === step.id ? "step" : undefined}
              className={cn(
                "rounded-lg px-2.5 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]",
                view === step.id
                  ? "bg-[var(--workspace-accent-subtle)] text-[var(--workspace-accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]",
              )}
              onClick={() =>
                step.id === "evidence" ? onBackToEvidence() : onViewChange(step.id)
              }
              type="button"
            >
              {step.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function TriageView({
  groups,
  onOpenWorkbench,
  readiness,
}: {
  groups: OrganizationStructureResolutionGroup[];
  onOpenWorkbench: (groupKey?: string) => void;
  readiness: ReturnType<typeof evaluateOrganizationStructureResolutionReadiness>;
}) {
  const blockerGroups = groups.filter((group) => group.severity === "blocker");
  const warningGroups = groups.filter((group) => group.severity === "warning");
  const reviewedCount = readiness.issueStates.filter((item) =>
    ["resolved", "reviewed", "excluded"].includes(item.state),
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-[var(--text-tertiary)]">Deterministic blockers</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text)]">
            {readiness.blockers.length}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Included evidence cannot be locally approved while these remain.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-tertiary)]">Warnings to review</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text)]">
            {readiness.warnings.length}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Warnings may remain only after their treatment is understood.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-tertiary)]">Issue groups treated</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text)]">
            {reviewedCount} of {groups.length}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Decisions remain reversible in this browser session.
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
              Issue groups
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Review homogeneous clusters instead of checking every row one by one.
            </p>
          </div>
          <Button onClick={() => onOpenWorkbench()} variant="primary">
            Open resolution workbench
          </Button>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {[...blockerGroups, ...warningGroups].map((group) => {
            const state = readiness.issueStates.find(
              (item) => item.group.key === group.key,
            )?.state ?? "source-evidence";
            return (
              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)]"
                key={group.key}
                onClick={() => onOpenWorkbench(group.key)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--text)]">{group.title}</span>
                    <Badge tone={group.severity === "blocker" ? "error" : "warning"}>
                      {group.severity === "blocker" ? "Blocker" : "Warning"}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                    {group.recordKeys.length} affected source {group.recordKeys.length === 1 ? "row" : "rows"}
                  </span>
                </span>
                <Badge tone={statusTone(state)}>{statusLabel(state)}</Badge>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ResolutionWorkbench({
  groups,
  onSessionChange,
  preview,
  readiness,
  selectedGroupKey,
  session,
  setSelectedGroupKey,
}: {
  groups: OrganizationStructureResolutionGroup[];
  onSessionChange: (session: OrganizationStructureResolutionSession) => void;
  preview: OrganizationStructurePreview;
  readiness: ReturnType<typeof evaluateOrganizationStructureResolutionReadiness>;
  selectedGroupKey: string;
  session: OrganizationStructureResolutionSession;
  setSelectedGroupKey: (key: string) => void;
}) {
  const [filter, setFilter] = useState<QueueFilter>("unresolved");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [candidateRecordKey, setCandidateRecordKey] = useState("");
  const [note, setNote] = useState("");
  const [impactPreview, setImpactPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordsByKey = useMemo(
    () => new Map(preview.records.map((record) => [record.key, record])),
    [preview.records],
  );
  const stateByKey = useMemo(
    () => new Map(readiness.issueStates.map((item) => [item.group.key, item.state])),
    [readiness.issueStates],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("en-US");
  const filteredGroups = groups.filter((group) => {
    const state = stateByKey.get(group.key) ?? "source-evidence";
    if (filter === "blocker" && group.severity !== "blocker") return false;
    if (filter === "warning" && group.severity !== "warning") return false;
    if (filter === "unresolved" && !["source-evidence", "needs-validation"].includes(state)) return false;
    if (filter === "resolved" && ["source-evidence", "needs-validation"].includes(state)) return false;
    if (!normalizedSearch) return true;
    const evidence = group.recordKeys
      .map((key) => recordsByKey.get(key))
      .map((record) =>
        [record?.personName, record?.positionTitle, record?.reportsToName, record?.organizationUnit]
          .join(" ")
          .toLocaleLowerCase("en-US"),
      )
      .join(" ");
    return `${group.title} ${group.kind} ${evidence}`
      .toLocaleLowerCase("en-US")
      .includes(normalizedSearch);
  });
  const selectedGroup =
    groups.find((group) => group.key === selectedGroupKey) ??
    filteredGroups[0] ??
    groups[0] ??
    null;
  const selectedState = selectedGroup
    ? stateByKey.get(selectedGroup.key) ?? "source-evidence"
    : "source-evidence";
  const existingDecision = selectedGroup
    ? session.decisions[selectedGroup.key] ?? null
    : null;
  const affectedRecords = selectedGroup
    ? selectedGroup.recordKeys
        .map((key) => recordsByKey.get(key))
        .filter((record): record is OrganizationStructureRecord => Boolean(record))
    : [];
  const candidateRecords = selectedGroup
    ? selectedGroup.candidateRecordKeys
        .map((key) => recordsByKey.get(key))
        .filter((record): record is OrganizationStructureRecord => Boolean(record))
    : [];
  const selectedAction = action ? organizationStructureResolutionActions[action] : null;

  const chooseGroup = (key: string) => {
    setSelectedGroupKey(key);
    setAction("");
    setCandidateRecordKey("");
    setNote("");
    setImpactPreview(false);
    setError(null);
  };

  const nextUnresolved = () => {
    const unresolved = groups.filter((group) =>
      ["source-evidence", "needs-validation"].includes(stateByKey.get(group.key) ?? "source-evidence"),
    );
    if (!unresolved.length) return;
    const currentIndex = unresolved.findIndex((group) => group.key === selectedGroup?.key);
    chooseGroup(unresolved[(currentIndex + 1) % unresolved.length].key);
  };

  const applyDecision = () => {
    if (!selectedGroup || !action) return;
    try {
      const next = applyOrganizationStructureResolutionDecision(session, groups, {
        action,
        candidateRecordKey,
        groupKey: selectedGroup.key,
        note,
      });
      onSessionChange(next);
      setAction("");
      setCandidateRecordKey("");
      setNote("");
      setImpactPreview(false);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This treatment could not be applied.");
      setImpactPreview(false);
    }
  };

  if (!selectedGroup) {
    return <EmptyState title="No review issue groups">No issue groups are available for this evidence.</EmptyState>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
      <div className="space-y-3">
        <SearchField
          label="Search issue groups and source evidence"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search issues or evidence"
          value={search}
        />
        <Select
          aria-label="Filter issue groups"
          onChange={(event) => setFilter(event.target.value as QueueFilter)}
          value={filter}
        >
          <option value="unresolved">Unresolved and needs validation</option>
          <option value="blocker">All blocker groups</option>
          <option value="warning">All warning groups</option>
          <option value="resolved">Treated and excluded</option>
          <option value="all">All issue groups</option>
        </Select>
        <Button className="w-full" onClick={nextUnresolved} variant="secondary">
          Next unresolved
        </Button>
        <Card className="max-h-[620px] overflow-y-auto">
          {filteredGroups.length ? filteredGroups.map((group) => {
            const state = stateByKey.get(group.key) ?? "source-evidence";
            return (
              <button
                className={cn(
                  "w-full border-b border-[var(--border)] px-4 py-3 text-left last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)]",
                  selectedGroup.key === group.key
                    ? "bg-[var(--workspace-accent-subtle)]"
                    : "hover:bg-[var(--surface-subtle)]",
                )}
                key={group.key}
                onClick={() => chooseGroup(group.key)}
                type="button"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--text)]">{group.title}</span>
                  <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
                    {group.recordKeys.length}
                  </span>
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone={group.severity === "blocker" ? "error" : "warning"}>
                    {group.severity === "blocker" ? "Blocker" : "Warning"}
                  </Badge>
                  <Badge tone={statusTone(state)}>{statusLabel(state)}</Badge>
                </span>
              </button>
            );
          }) : (
            <p className="p-4 text-sm leading-6 text-[var(--text-secondary)]">
              No issue groups match this search and filter.
            </p>
          )}
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={selectedGroup.severity === "blocker" ? "error" : "warning"}>
                {selectedGroup.severity === "blocker" ? "Deterministic blocker" : "Review warning"}
              </Badge>
              <Badge tone={statusTone(selectedState)}>{statusLabel(selectedState)}</Badge>
              <span className="text-xs text-[var(--text-tertiary)]">
                {selectedGroup.recordKeys.length} affected source {selectedGroup.recordKeys.length === 1 ? "row" : "rows"}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em] text-[var(--text)]">
              {selectedGroup.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {selectedGroup.description}
            </p>
          </div>
          <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Source evidence — immutable workbook values
            </p>
          </div>
          <Table>
            <TableHeader>
              <tr>
                <TableHeadCell>Person and Position</TableHeadCell>
                <TableHeadCell>Reports to</TableHeadCell>
                <TableHeadCell>Organization unit</TableHeadCell>
                <TableHeadCell className="text-right">Row</TableHeadCell>
              </tr>
            </TableHeader>
            <TableBody>
              {affectedRecords.slice(0, maximumRenderedEvidenceRows).map((record) => (
                <TableRow key={record.key}>
                  <TableCell>{evidenceIdentity(record)}</TableCell>
                  <TableCell>{record.reportsToName || "Blank"}</TableCell>
                  <TableCell>{record.organizationUnit || "Not supplied"}</TableCell>
                  <TableCell className="text-right tabular-nums">{record.sourceRow}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {affectedRecords.length > maximumRenderedEvidenceRows ? (
            <p className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--text-tertiary)]">
              Showing the first {maximumRenderedEvidenceRows} of {affectedRecords.length} affected rows.
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)]">Review decision</p>
              <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
                Choose how this evidence should be treated
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                This reversible decision affects the proposed import basis only. It does not rewrite the workbook or establish truth.
              </p>
            </div>
            {existingDecision ? (
              <Button
                onClick={() =>
                  onSessionChange(
                    removeOrganizationStructureResolutionDecision(session, selectedGroup.key),
                  )
                }
                size="sm"
                variant="ghost"
              >
                Undo decision
              </Button>
            ) : null}
          </div>

          {existingDecision ? (
            <div className="mt-4 rounded-xl border border-[var(--success-border)] bg-[var(--success-subtle)] p-4">
              <Badge tone={statusTone(existingDecision.result)}>{statusLabel(existingDecision.result)}</Badge>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {organizationStructureResolutionActions[existingDecision.action].label}
              </p>
              {existingDecision.note ? (
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {existingDecision.note}
                </p>
              ) : null}
              <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                Exact evidence affected: {existingDecision.recordKeys.length} source {existingDecision.recordKeys.length === 1 ? "row" : "rows"}.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label>
                <FieldLabel>Treatment</FieldLabel>
                <Select
                  onChange={(event) => {
                    setAction(event.target.value);
                    setCandidateRecordKey("");
                    setImpactPreview(false);
                    setError(null);
                  }}
                  value={action}
                >
                  <option value="">Choose a treatment</option>
                  {selectedGroup.actions.map((actionId) => (
                    <option key={actionId} value={actionId}>
                      {organizationStructureResolutionActions[actionId].label}
                    </option>
                  ))}
                </Select>
              </label>
              {selectedAction?.requiresCandidate ? (
                <label>
                  <FieldLabel>Source candidate to keep or use</FieldLabel>
                  <Select
                    onChange={(event) => setCandidateRecordKey(event.target.value)}
                    value={candidateRecordKey}
                  >
                    <option value="">Choose a source candidate</option>
                    {candidateRecords.map((record) => (
                      <option key={record.key} value={record.key}>
                        Row {record.sourceRow} · {record.personName || "Person not supplied"} · {record.positionTitle || "Position not supplied"}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}
              <label>
                <FieldLabel>
                  Review reason or note{selectedAction?.requiresNote ? " — required" : " — optional"}
                </FieldLabel>
                <textarea
                  className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--workspace-accent-subtle)]"
                  maxLength={1_000}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Record the reason, limitation, or information still required."
                  value={note}
                />
              </label>
              {error ? <Alert tone="error">{error}</Alert> : null}
              {impactPreview && selectedAction ? (
                <Alert tone="warning">
                  <p className="font-medium">Impact preview</p>
                  <p className="mt-0.5 text-xs leading-5 opacity-90">
                    “{selectedAction.label}” will be recorded for {selectedGroup.recordKeys.length} source {selectedGroup.recordKeys.length === 1 ? "row" : "rows"}. The original evidence will not change.
                  </p>
                </Alert>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {impactPreview ? (
                  <Button onClick={applyDecision} variant="primary">
                    Confirm how this evidence should be treated
                  </Button>
                ) : (
                  <Button
                    disabled={!action}
                    onClick={() => {
                      setImpactPreview(true);
                      setError(null);
                    }}
                    variant="primary"
                  >
                    Preview treatment impact
                  </Button>
                )}
                {impactPreview ? (
                  <Button onClick={() => setImpactPreview(false)} variant="ghost">
                    Keep reviewing
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReadinessView({
  onSessionChange,
  preview,
  readiness,
  session,
}: {
  onSessionChange: (session: OrganizationStructureResolutionSession) => void;
  preview: OrganizationStructurePreview;
  readiness: ReturnType<typeof evaluateOrganizationStructureResolutionReadiness>;
  session: OrganizationStructureResolutionSession;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Card className="p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">Preparation decisions</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[var(--text)]">
            Establish the proposed import basis
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            These are local review decisions, not additions to the workbook and not institutional approval.
          </p>
          {!preview.source.sourceAsOf ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <FieldLabel>Reviewed source date</FieldLabel>
                <Input
                  onChange={(event) =>
                    onSessionChange(
                      updateOrganizationStructureResolutionPreparation(session, {
                        reviewedSourceAsOf: event.target.value,
                      }),
                    )
                  }
                  type="date"
                  value={session.preparation.reviewedSourceAsOf}
                />
              </label>
              <label>
                <FieldLabel>Authoritative basis for this date</FieldLabel>
                <Input
                  maxLength={500}
                  onChange={(event) =>
                    onSessionChange(
                      updateOrganizationStructureResolutionPreparation(session, {
                        sourceAsOfNote: event.target.value,
                      }),
                    )
                  }
                  placeholder="Where this date came from"
                  value={session.preparation.sourceAsOfNote}
                />
              </label>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Source as of <span className="font-medium text-[var(--text)]">{preview.source.sourceAsOf}</span>
            </p>
          )}
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--border)] p-4">
            <input
              checked={session.preparation.identityStrategyReviewed}
              className="mt-1 size-4 accent-[var(--workspace-accent)]"
              onChange={(event) =>
                onSessionChange(
                  updateOrganizationStructureResolutionPreparation(session, {
                    identityStrategyReviewed: event.target.checked,
                  }),
                )
              }
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--text)]">
                Stable identity reconciliation has been reviewed
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                Names and titles are not stable identifiers. Record how Person and Position candidates will be reconciled before import.
              </span>
            </span>
          </label>
          <label className="mt-3 block">
            <FieldLabel>Identity reconciliation note — required</FieldLabel>
            <textarea
              className="min-h-24 w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--workspace-accent-subtle)]"
              maxLength={1_000}
              onChange={(event) =>
                onSessionChange(
                  updateOrganizationStructureResolutionPreparation(session, {
                    identityStrategyNote: event.target.value,
                  }),
                )
              }
              placeholder="Describe the stable identifier or authoritative reconciliation method that must be used."
              value={session.preparation.identityStrategyNote}
            />
          </label>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
            Approval attestation
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Complete every statement before approving this reviewed subset locally.
          </p>
          <div className="mt-4 space-y-3">
            {[
              [
                "basisOnly",
                "I understand this is a proposed import basis, not imported, activated, or current organizational structure.",
              ],
              [
                "humanReview",
                "A human has reviewed the included evidence, remaining limitations, and any required sanitization outside Lotura.",
              ],
              [
                "localOnly",
                "I understand this approval and every review decision exist only in this browser session and will be lost on refresh or close.",
              ],
            ].map(([key, label]) => (
              <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-4" key={key}>
                <input
                  checked={session.attestations[key as keyof typeof session.attestations]}
                  className="mt-1 size-4 accent-[var(--workspace-accent)]"
                  onChange={(event) =>
                    onSessionChange(
                      updateOrganizationStructureResolutionAttestation(
                        session,
                        key as keyof typeof session.attestations,
                        event.target.checked,
                      ),
                    )
                  }
                  type="checkbox"
                />
                <span className="text-sm leading-6 text-[var(--text-secondary)]">{label}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
              Readiness
            </h2>
            <Badge tone={readiness.readyForLocalApproval ? "success" : "warning"}>
              {readiness.readyForLocalApproval ? "Ready for local approval" : "Review incomplete"}
            </Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
              <dt className="text-xs text-[var(--text-tertiary)]">Included rows</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">{readiness.includedRecordKeys.length}</dd>
            </div>
            <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
              <dt className="text-xs text-[var(--text-tertiary)]">Excluded rows</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">{readiness.excludedRecordKeys.length}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-[var(--text)]">Blocking conditions</h3>
            <Badge tone={readiness.blockers.length ? "error" : "success"}>
              {readiness.blockers.length}
            </Badge>
          </div>
          {readiness.blockers.length ? (
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--text-secondary)]">
              {readiness.blockers.map((blocker) => (
                <li className="rounded-lg bg-[var(--error-subtle)] px-3 py-2" key={blocker.key}>{blocker.message}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">No deterministic blockers remain.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-[var(--text)]">Unreviewed warnings</h3>
            <Badge tone={readiness.warnings.length ? "warning" : "success"}>
              {readiness.warnings.length}
            </Badge>
          </div>
          {readiness.warnings.length ? (
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--text-secondary)]">
              {readiness.warnings.map((warning) => (
                <li className="rounded-lg bg-[var(--warning-subtle)] px-3 py-2" key={warning.key}>{warning.message}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">Every warning has an explicit treatment.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function ApprovalView({
  onSessionChange,
  preview,
  readiness,
  session,
}: {
  onSessionChange: (session: OrganizationStructureResolutionSession) => void;
  preview: OrganizationStructurePreview;
  readiness: ReturnType<typeof evaluateOrganizationStructureResolutionReadiness>;
  session: OrganizationStructureResolutionSession;
}) {
  const [error, setError] = useState<string | null>(null);

  if (session.approval) {
    return (
      <Card className="mx-auto max-w-3xl p-6 sm:p-8">
        <Badge tone="success">Approved for import</Badge>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
          Approved for import — local session only. Nothing has been saved or imported.
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          This explicit local decision says only that the reviewed subset is suitable as the basis for a future import. It does not establish institutional truth, activate a structure, or make the source current.
        </p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
            <dt className="text-xs text-[var(--text-tertiary)]">Included rows</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">{session.approval.includedRecordKeys.length}</dd>
          </div>
          <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
            <dt className="text-xs text-[var(--text-tertiary)]">Excluded rows</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">{session.approval.excludedRecordKeys.length}</dd>
          </div>
          <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
            <dt className="text-xs text-[var(--text-tertiary)]">Local approval time</dt>
            <dd className="mt-1 text-sm font-medium text-[var(--text)]">{new Date(session.approval.approvedAt).toLocaleString()}</dd>
          </div>
        </dl>
        <Alert className="mt-6" tone="warning">
          Refreshing or closing this tab erases the approval and every review decision. No export package exists in v0.1.
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <Badge tone={readiness.readyForLocalApproval ? "success" : "warning"}>
        {readiness.readyForLocalApproval ? "Ready" : "Not ready"}
      </Badge>
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
        Approve the reviewed subset as a future import basis
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        Approval is explicit and local. It does not import, activate, persist, or establish an institutionally approved organizational structure.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-tertiary)]">Deterministic blockers</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">{readiness.blockers.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-tertiary)]">Unreviewed warnings</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">{readiness.warnings.length}</p>
        </div>
      </div>
      {!readiness.attestationsComplete ? (
        <p className="mt-4 text-sm text-[var(--warning)]">Complete the approval attestation in Readiness review.</p>
      ) : null}
      {error ? <Alert className="mt-4" tone="error">{error}</Alert> : null}
      <Button
        className="mt-6"
        disabled={!readiness.readyForLocalApproval}
        onClick={() => {
          try {
            onSessionChange(
              approveOrganizationStructureResolutionSession(
                preview,
                session,
                new Date().toISOString(),
              ),
            );
            setError(null);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Local approval could not be completed.");
          }
        }}
        variant="primary"
      >
        Approve for import — local session only
      </Button>
      <p className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
        Nothing has been saved or imported.
      </p>
    </Card>
  );
}

export function OrganizationStructureResolutionExperience({
  onBackToEvidence,
  onSessionChange,
  preview,
  session,
}: {
  onBackToEvidence: () => void;
  onSessionChange: (session: OrganizationStructureResolutionSession) => void;
  preview: OrganizationStructurePreview;
  session: OrganizationStructureResolutionSession;
}) {
  const groups = useMemo(
    () => buildOrganizationStructureResolutionGroups(preview),
    [preview],
  );
  const readiness = useMemo(
    () => evaluateOrganizationStructureResolutionReadiness(preview, session),
    [preview, session],
  );
  const [view, setView] = useState<ResolutionView>("triage");
  const [selectedGroupKey, setSelectedGroupKey] = useState(groups[0]?.key ?? "");

  const openWorkbench = (groupKey?: string) => {
    if (groupKey) setSelectedGroupKey(groupKey);
    setView("workbench");
  };

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <header className="border-b border-[var(--border)] pb-6">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">Working draft evidence</Badge>
              <Badge tone="info">Local review session</Badge>
              <Badge tone="neutral">Nothing imported</Badge>
            </div>
            <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[var(--text)] sm:text-[38px]">
              Resolution and approval
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Review how source evidence should be treated before it can become the basis for a future organizational-structure import.
            </p>
            <p className="mt-3 text-xs text-[var(--text-tertiary)]">
              {preview.source.organizationName} · {preview.source.fileName} · {preview.source.sheetName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={readiness.blockers.length ? "error" : "success"}>
              {readiness.blockers.length} {readiness.blockers.length === 1 ? "blocker" : "blockers"}
            </Badge>
            <Badge tone={readiness.warnings.length ? "warning" : "success"}>
              {readiness.warnings.length} {readiness.warnings.length === 1 ? "warning" : "warnings"}
            </Badge>
          </div>
        </div>
      </header>

      <Alert className="mt-5" tone="warning">
        <p className="font-medium">Review decisions live only in this tab.</p>
        <p className="mt-0.5 text-xs leading-5 opacity-90">
          Refreshing or closing the tab erases every decision and local approval. Lotura does not use browser storage, a server, or a database for this review.
        </p>
      </Alert>

      <Card className="mt-5 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">1 · Source evidence</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Immutable information parsed from the workbook.</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">2 · Review decisions</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Reversible interpretations made during this browser session.</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">3 · Approved for import</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">An explicit local decision about a reviewed subset—not truth, activation, or import.</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 border-b border-[var(--border)] pb-4">
        <WorkflowProgress
          onBackToEvidence={onBackToEvidence}
          onViewChange={setView}
          view={view}
        />
      </div>

      <div className="mt-6">
        {view === "triage" ? (
          <TriageView groups={groups} onOpenWorkbench={openWorkbench} readiness={readiness} />
        ) : null}
        {view === "workbench" ? (
          <ResolutionWorkbench
            groups={groups}
            onSessionChange={onSessionChange}
            preview={preview}
            readiness={readiness}
            selectedGroupKey={selectedGroupKey}
            session={session}
            setSelectedGroupKey={setSelectedGroupKey}
          />
        ) : null}
        {view === "readiness" ? (
          <ReadinessView
            onSessionChange={onSessionChange}
            preview={preview}
            readiness={readiness}
            session={session}
          />
        ) : null}
        {view === "approval" ? (
          <ApprovalView
            onSessionChange={onSessionChange}
            preview={preview}
            readiness={readiness}
            session={session}
          />
        ) : null}
      </div>
    </main>
  );
}
