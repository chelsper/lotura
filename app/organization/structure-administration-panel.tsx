"use client";

import { useActionState } from "react";

import type {
  OrganizationPerson,
  OrganizationPosition,
  OrganizationStructureData,
  OrganizationUnit,
} from "@/lib/organization-structure-data.mjs";
import type {
  StructureChangeSummary,
  StructureEntityType,
} from "@/lib/organization-structure-administration";

import {
  correctPositionReportingRelationshipAction,
  endPositionAssignmentAction,
  endPositionReportingRelationshipAction,
  initialStructureActionState,
  removeStructureEntityAction,
  replacePositionAssignmentAction,
  type StructureActionState,
  updateStructureEntityAction,
} from "./actions";
import { Alert, Button, Card, Input, Select } from "../ui/primitives";

type EditableEntity = OrganizationUnit | OrganizationPosition | OrganizationPerson;

function effectiveDateDefault() {
  return new Date().toISOString().slice(0, 10);
}

function entityLabel(entityType: StructureEntityType) {
  return {
    organization_unit: "Organization Unit",
    position: "Position",
    person: "Person",
  }[entityType];
}

function ChangeMetadataFields({
  fixedKind,
}: {
  fixedKind?: "correction" | "organizational_change";
}) {
  return (
    <>
      {fixedKind ? (
        <div className="block">
          <input name="changeKind" type="hidden" value={fixedKind} />
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            How this change is understood
          </span>
          <p className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            {fixedKind === "correction"
              ? "Correction to the current record"
              : "Organizational change"}
          </p>
        </div>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            How should this change be understood?
          </span>
          <Select defaultValue="correction" name="changeKind" required>
            <option value="correction">Correction to the current record</option>
            <option value="organizational_change">Organizational change</option>
          </Select>
        </label>
      )}
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Effective date
        </span>
        <Input defaultValue={effectiveDateDefault()} name="effectiveDate" required type="date" />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Reason
        </span>
        <textarea
          className="min-h-24 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
          maxLength={2000}
          name="reason"
          placeholder="Explain why this evidence should be treated differently."
          required
        />
      </label>
    </>
  );
}

function RelationshipIdentity({
  expectedRevision,
  name,
  positionStableKey,
  recordKey,
}: {
  expectedRevision: string;
  name: "assignmentRecordKey" | "reportingRecordKey";
  positionStableKey: string;
  recordKey: string;
}) {
  return (
    <>
      <input name={name} type="hidden" value={recordKey} />
      <input name="positionStableKey" type="hidden" value={positionStableKey} />
      <input name="expectedRevision" type="hidden" value={expectedRevision} />
    </>
  );
}

function ActionResult({ state }: { state: StructureActionState }) {
  return state.status !== "idle" ? (
    <Alert
      className="sm:col-span-2"
      tone={state.status === "success" ? "success" : "error"}
    >
      {state.message}
    </Alert>
  ) : null;
}

function HiddenIdentity({
  entity,
  entityType,
}: {
  entity: EditableEntity;
  entityType: StructureEntityType;
}) {
  return (
    <>
      <input name="entityType" type="hidden" value={entityType} />
      <input name="stableKey" type="hidden" value={entity.id} />
      <input name="expectedRevision" type="hidden" value={entity.revision} />
    </>
  );
}

function EditForm({
  data,
  entity,
  entityType,
}: {
  data: OrganizationStructureData;
  entity: EditableEntity;
  entityType: StructureEntityType;
}) {
  const [state, action, pending] = useActionState(
    updateStructureEntityAction,
    initialStructureActionState,
  );
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <HiddenIdentity entity={entity} entityType={entityType} />
      {entityType === "organization_unit" ? (
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Organization Unit name
          </span>
          <Input defaultValue={(entity as OrganizationUnit).name} maxLength={255} name="name" required />
        </label>
      ) : null}
      {entityType === "position" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Position title
            </span>
            <Input defaultValue={(entity as OrganizationPosition).title} maxLength={255} name="title" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Organization Unit
            </span>
            <Select
              defaultValue={(entity as OrganizationPosition).unit?.id ?? ""}
              name="organizationUnitStableKey"
            >
              <option value="">No Organization Unit recorded</option>
              {data.units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </Select>
          </label>
        </>
      ) : null}
      {entityType === "person" ? (
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Person display name
          </span>
          <Input defaultValue={(entity as OrganizationPerson).name} maxLength={255} name="displayName" required />
        </label>
      ) : null}
      <ChangeMetadataFields />
      {state.status !== "idle" ? (
        <Alert className="sm:col-span-2" tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </Alert>
      ) : null}
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Saving…" : `Save ${entityLabel(entityType)}`}
        </Button>
      </div>
    </form>
  );
}

function RemovalForm({
  entity,
  entityType,
}: {
  entity: EditableEntity;
  entityType: StructureEntityType;
}) {
  const [state, action, pending] = useActionState(
    removeStructureEntityAction,
    initialStructureActionState,
  );
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <HiddenIdentity entity={entity} entityType={entityType} />
      <ChangeMetadataFields />
      <label className="flex items-start gap-3 rounded-[10px] border border-[var(--error-border)] bg-[var(--error-subtle)] p-3 sm:col-span-2">
        <input className="mt-0.5 size-4" name="confirmRemoval" required type="checkbox" value="confirmed" />
        <span className="text-xs leading-5 text-[var(--error)]">
          I understand this removes the record from the current structure. It does not erase its stable identity, import provenance, or change history.
        </span>
      </label>
      {state.status === "error" ? (
        <Alert className="sm:col-span-2" tone="error">{state.message}</Alert>
      ) : null}
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? "Checking relationships…" : "Remove from current structure"}
        </Button>
      </div>
    </form>
  );
}

function EndAssignmentForm({
  assignment,
  position,
}: {
  assignment: OrganizationPosition["assignments"][number];
  position: OrganizationPosition;
}) {
  const [state, action, pending] = useActionState(
    endPositionAssignmentAction,
    initialStructureActionState,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <RelationshipIdentity
        expectedRevision={assignment.revision}
        name="assignmentRecordKey"
        positionStableKey={position.id}
        recordKey={assignment.id}
      />
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? "Ending Assignment…" : "End Assignment"}
        </Button>
      </div>
    </form>
  );
}

function ReplaceAssignmentForm({
  assignment,
  data,
  position,
}: {
  assignment: OrganizationPosition["assignments"][number];
  data: OrganizationStructureData;
  position: OrganizationPosition;
}) {
  const [state, action, pending] = useActionState(
    replacePositionAssignmentAction,
    initialStructureActionState,
  );
  const replacementPeople = data.people.filter(
    (person) =>
      person.status === "active" && person.id !== assignment.person.id,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <RelationshipIdentity
        expectedRevision={assignment.revision}
        name="assignmentRecordKey"
        positionStableKey={position.id}
        recordKey={assignment.id}
      />
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Replacement Person
        </span>
        <Select name="replacementPersonStableKey" required>
          <option value="">Select a Person</option>
          {replacementPeople.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
      </label>
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Replacing Assignment…" : "Replace Assignment"}
        </Button>
      </div>
    </form>
  );
}

function AssignmentAdministration({
  data,
  position,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
}) {
  return (
    <Card className="mt-4 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        Assignment maintenance
      </h3>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
        Ending preserves the Assignment as history. Replacing ends the current
        record and creates its replacement in the same audited transaction.
      </p>
      {position.assignments.length > 0 ? (
        <div className="mt-4 space-y-3">
          {position.assignments.map((assignment) => (
            <div
              className="rounded-[10px] border border-[var(--border)] p-3"
              key={assignment.id}
            >
              <p className="text-xs font-semibold text-[var(--text)]">
                {assignment.person.name} · {assignment.typeLabel}
              </p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
                    Replace Assignment
                  </summary>
                  <ReplaceAssignmentForm
                    assignment={assignment}
                    data={data}
                    position={position}
                  />
                </details>
                <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--error)]">
                    End Assignment
                  </summary>
                  <EndAssignmentForm
                    assignment={assignment}
                    position={position}
                  />
                </details>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          No current Position Assignments are available to maintain.
        </p>
      )}
    </Card>
  );
}

function CorrectReportingForm({
  data,
  position,
  relationship,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
  relationship: NonNullable<OrganizationPosition["primaryManager"]>;
}) {
  const [state, action, pending] = useActionState(
    correctPositionReportingRelationshipAction,
    initialStructureActionState,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <RelationshipIdentity
        expectedRevision={relationship.revision}
        name="reportingRecordKey"
        positionStableKey={position.id}
        recordKey={relationship.id}
      />
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Manager Position
        </span>
        <Select
          defaultValue={relationship.position.id}
          name="managerPositionStableKey"
          required
        >
          {data.positions
            .filter(
              (candidate) =>
                candidate.status === "active" && candidate.id !== position.id,
            )
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
        </Select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Relationship type
        </span>
        <Select
          defaultValue={relationship.type}
          name="relationshipType"
          required
        >
          <option value="primary">Primary</option>
          <option value="dotted_line">Dotted line</option>
          <option value="functional">Functional</option>
        </Select>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Reporting context, if documented
        </span>
        <Input
          defaultValue={relationship.reason ?? ""}
          maxLength={2000}
          name="relationshipReason"
        />
      </label>
      <ChangeMetadataFields fixedKind="correction" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Checking hierarchy…" : "Save reporting correction"}
        </Button>
      </div>
    </form>
  );
}

function EndReportingForm({
  position,
  relationship,
}: {
  position: OrganizationPosition;
  relationship: NonNullable<OrganizationPosition["primaryManager"]>;
}) {
  const [state, action, pending] = useActionState(
    endPositionReportingRelationshipAction,
    initialStructureActionState,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <RelationshipIdentity
        expectedRevision={relationship.revision}
        name="reportingRecordKey"
        positionStableKey={position.id}
        recordKey={relationship.id}
      />
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? "Ending relationship…" : "End reporting relationship"}
        </Button>
      </div>
    </form>
  );
}

function ReportingAdministration({
  data,
  position,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
}) {
  const managerRelationships = [
    ...(position.primaryManager ? [position.primaryManager] : []),
    ...position.additionalManagers,
  ];
  return (
    <Card className="mt-4 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        Reporting-relationship maintenance
      </h3>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
        Correct a source record without inventing Process responsibility, or
        end a relationship when the organization changes. Cycle safeguards run
        again before commit.
      </p>
      {managerRelationships.length > 0 ? (
        <div className="mt-4 space-y-3">
          {managerRelationships.map((relationship) => (
            <div
              className="rounded-[10px] border border-[var(--border)] p-3"
              key={relationship.id}
            >
              <p className="text-xs font-semibold text-[var(--text)]">
                {relationship.typeLabel}: {relationship.position.title}
              </p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
                    Correct relationship
                  </summary>
                  <CorrectReportingForm
                    data={data}
                    position={position}
                    relationship={relationship}
                  />
                </details>
                <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--error)]">
                    End relationship
                  </summary>
                  <EndReportingForm
                    position={position}
                    relationship={relationship}
                  />
                </details>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          No current manager relationship is available to maintain from this
          Position.
        </p>
      )}
    </Card>
  );
}

const stateLabels: Record<string, string> = {
  assignmentType: "Assignment type",
  displayName: "Display name",
  effectiveFrom: "Effective from",
  effectiveUntil: "Effective until",
  managerPositionStableKey: "Manager Position",
  name: "Name",
  organizationUnitId: "Organization Unit record",
  personStableKey: "Person stable key",
  reason: "Recorded context",
  relationshipType: "Relationship type",
  status: "Status",
  statusReason: "Status reason",
  title: "Title",
};

function displayStateValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toLocaleString();
  }
  return String(value);
}

function StateComparison({ change }: { change: StructureChangeSummary }) {
  const keys = Array.from(
    new Set([
      ...Object.keys(change.beforeState),
      ...Object.keys(change.afterState),
    ]),
  ).filter(
    (key) =>
      JSON.stringify(change.beforeState[key]) !==
      JSON.stringify(change.afterState[key]),
  );
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[11px] font-medium text-[var(--workspace-accent)]">
        Review before and after
      </summary>
      <dl className="mt-2 grid gap-2">
        {keys.map((key) => (
          <div
            className="grid gap-1 rounded-[8px] bg-[var(--surface-subtle)] p-2 sm:grid-cols-[140px_1fr_1fr]"
            key={key}
          >
            <dt className="text-[11px] font-medium text-[var(--text)]">
              {stateLabels[key] ?? key}
            </dt>
            <dd className="text-[11px] text-[var(--text-secondary)]">
              Before: {displayStateValue(change.beforeState[key])}
            </dd>
            <dd className="text-[11px] text-[var(--text-secondary)]">
              After: {displayStateValue(change.afterState[key])}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function changeActionLabel(action: StructureChangeSummary["action"]) {
  return {
    correct_reporting_relationship: "Reporting relationship corrected",
    end_assignment: "Assignment ended",
    end_reporting_relationship: "Reporting relationship ended",
    remove_from_current_structure: "Removed from current structure",
    replace_assignment: "Assignment replaced",
    update: "Record updated",
  }[action];
}

export function StructureAdministrationPanel({
  changes,
  data,
  entity,
  entityType,
}: {
  changes: StructureChangeSummary[];
  data: OrganizationStructureData;
  entity: EditableEntity;
  entityType: StructureEntityType;
}) {
  const entityChanges = changes.filter(
    (change) =>
      change.targetType === entityType && change.targetStableKey === entity.id,
  );
  return (
    <section aria-labelledby="structure-administration" className="py-7 sm:py-9">
      <p className="text-xs font-medium text-[var(--text-tertiary)]">Authorized administration</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]" id="structure-administration">
        Maintain the current structural record
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
        Edits change the canonical current structure. They do not modify the source workbook or its import ledger. Every accepted change records its reason, effective date, actor, and before/after canonical state.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <details open>
            <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">Edit {entityLabel(entityType)}</summary>
            <EditForm data={data} entity={entity} entityType={entityType} />
          </details>
        </Card>
        <Card className="p-4 sm:p-5">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-[var(--error)]">Remove from current structure</summary>
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              Removal is blocked while current Assignments, reporting relationships, child Units, Positions, Role Mandates, or Role Coverage still depend on this record.
            </p>
            <RemovalForm entity={entity} entityType={entityType} />
          </details>
        </Card>
      </div>
      {entityType === "position" ? (
        <>
          <AssignmentAdministration
            data={data}
            position={entity as OrganizationPosition}
          />
          <ReportingAdministration
            data={data}
            position={entity as OrganizationPosition}
          />
        </>
      ) : null}
      <Card className="mt-4 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-[var(--text)]">Change history</h3>
        {entityChanges.length > 0 ? (
          <ol className="mt-4 divide-y divide-[var(--border)]">
            {entityChanges.map((change) => (
              <li className="py-3 first:pt-0 last:pb-0" key={change.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--text)]">
                    {changeActionLabel(change.action)}
                  </p>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {new Date(change.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{change.reason}</p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                  {change.changeKind === "correction" ? "Correction" : "Organizational change"} · effective {new Date(change.effectiveAt).toLocaleDateString()} · {change.actorIdentifier}
                </p>
                <StateComparison change={change} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">No canonical changes have been recorded for this stable identity.</p>
        )}
      </Card>
    </section>
  );
}
