"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

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
  endRoleCoverageAction,
  endRoleMandateAction,
  endPositionAssignmentAction,
  endPositionReportingRelationshipAction,
  establishRoleCoverageAction,
  establishRoleMandateAction,
  establishPositionAssignmentAction,
  establishPositionReportingRelationshipAction,
  mergeOrganizationUnitAction,
  removeStructureEntityAction,
  replacePositionAssignmentAction,
  replacePositionReportingRelationshipAction,
  updateStructureEntityAction,
} from "./actions";
import {
  initialStructureActionState,
  type StructureActionState,
} from "./action-state";
import { Alert, Button, Card, Input, Select } from "../ui/primitives";

type EditableEntity = OrganizationUnit | OrganizationPosition | OrganizationPerson;

function effectiveDateDefault() {
  return new Date().toISOString().slice(0, 10);
}

function formatAdministrativeTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatAdministrativeDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function entityLabel(entityType: StructureEntityType) {
  return {
    organization_unit: "Organization Unit",
    operational_role: "Operational Role",
    position: "Position",
    person: "Person",
  }[entityType];
}

function descendantUnitIds(
  units: OrganizationStructureData["units"],
  unitId: string,
) {
  const descendants = new Set([unitId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const unit of units) {
      if (unit.parent && descendants.has(unit.parent.id) && !descendants.has(unit.id)) {
        descendants.add(unit.id);
        changed = true;
      }
    }
  }
  return descendants;
}

function positionOptionLabel(position: OrganizationPosition) {
  const occupants = position.assignments.map((assignment) => assignment.person.name);
  const structuralContext = position.unit?.name ?? "No Organization Unit";
  return `${position.title} — ${structuralContext}${
    occupants.length > 0 ? ` — ${occupants.join(", ")}` : " — no current occupant"
  }`;
}

function reportingPositionLabel(
  data: OrganizationStructureData,
  positionId: string,
  fallbackTitle: string,
) {
  const position = data.positions.find((candidate) => candidate.id === positionId);
  return position ? positionOptionLabel(position) : fallbackTitle;
}

function ChangeMetadataFields({
  fixedKind,
  onReasonChange,
  reason,
}: {
  fixedKind?: "correction" | "organizational_change";
  onReasonChange?: (value: string) => void;
  reason?: string;
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
          onChange={
            onReasonChange
              ? (event) => onReasonChange(event.target.value)
              : undefined
          }
          placeholder="Explain why this evidence should be treated differently."
          required
          value={reason}
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

function PositionRelationshipIdentity({
  position,
}: {
  position: OrganizationPosition;
}) {
  return (
    <>
      <input name="positionStableKey" type="hidden" value={position.id} />
      <input name="expectedRevision" type="hidden" value={position.revision} />
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
  const [unitName, setUnitName] = useState(
    entityType === "organization_unit"
      ? (entity as OrganizationUnit).name
      : "",
  );
  const duplicateUnit =
    entityType === "organization_unit"
      ? data.units.find(
          (unit) =>
            unit.id !== entity.id &&
            unit.status === "active" &&
            unit.name.trim().toLocaleLowerCase() ===
              unitName.trim().toLocaleLowerCase(),
        )
      : null;
  const unavailableParentUnitIds =
    entityType === "organization_unit"
      ? descendantUnitIds(data.units, entity.id)
      : new Set<string>();
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <HiddenIdentity entity={entity} entityType={entityType} />
      {entityType === "organization_unit" ? (
        <>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Rename this Organization Unit
            </span>
            <Input
              maxLength={255}
              name="name"
              onChange={(event) => setUnitName(event.target.value)}
              required
              value={unitName}
            />
            <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
              This renames the Unit itself for every Position connected to it. It does not move a Person or Position.
            </span>
          </label>
          {duplicateUnit ? (
            <Alert className="sm:col-span-2" tone="warning">
              Another active Organization Unit already uses this name. To move someone, open their Position and select the existing Unit instead of renaming this record.
            </Alert>
          ) : null}
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Parent Organization Unit
            </span>
            <Select
              defaultValue={(entity as OrganizationUnit).parent?.id ?? ""}
              name="parentOrganizationUnitStableKey"
            >
              <option value="">No Parent Unit — root Unit</option>
              {data.units
                .filter(
                  (unit) =>
                    unit.status === "active" &&
                    !unavailableParentUnitIds.has(unit.id),
                )
                .map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                    {unit.parent ? ` — within ${unit.parent.name}` : " — root Unit"}
                  </option>
                ))}
            </Select>
            <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
              This records Unit hierarchy only. It does not create a manager relationship or assign Process ownership. Descendant Units are excluded; the database rechecks cycles before commit.
            </span>
          </label>
        </>
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
              Move this Position to an Organization Unit
            </span>
            <Select
              defaultValue={(entity as OrganizationPosition).unit?.id ?? ""}
              name="organizationUnitStableKey"
            >
              <option value="">No Organization Unit recorded</option>
              {data.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}{unit.parent ? ` — within ${unit.parent.name}` : " — root Unit"}
                </option>
              ))}
            </Select>
            <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
              Choose an existing Unit by its stable identity. This moves the Position and its current occupants without renaming either Unit.
            </span>
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

function mergeImpactFingerprint(unit: OrganizationUnit) {
  return [
    ...unit.positions
      .filter((position) => position.status === "active")
      .map((position) => `p:${position.id}`),
    ...unit.children
      .filter((child) => child.status === "active")
      .map((child) => `u:${child.id}`),
  ]
    .sort()
    .join("|");
}

function MergeOrganizationUnitForm({
  data,
  unit,
}: {
  data: OrganizationStructureData;
  unit: OrganizationUnit;
}) {
  const [state, action, pending] = useActionState(
    mergeOrganizationUnitAction,
    initialStructureActionState,
  );
  const [targetStableKey, setTargetStableKey] = useState("");
  const [reason, setReason] = useState("");
  const excludedTargetIds = descendantUnitIds(data.units, unit.id);
  const targets = data.units.filter(
    (candidate) =>
      candidate.status === "active" && !excludedTargetIds.has(candidate.id),
  );
  const target = targets.find((candidate) => candidate.id === targetStableKey);
  const directPositions = unit.positions.filter(
    (position) => position.status === "active",
  );
  const directChildren = unit.children.filter(
    (child) => child.status === "active",
  );
  const currentOccupants = new Set(
    directPositions.flatMap((position) =>
      position.assignments.map((assignment) => assignment.person.id),
    ),
  ).size;

  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <input name="sourceStableKey" type="hidden" value={unit.id} />
      <input name="expectedRevision" type="hidden" value={unit.revision} />
      <input
        name="expectedImpactFingerprint"
        type="hidden"
        value={mergeImpactFingerprint(unit)}
      />
      <input
        name="expectedTargetRevision"
        type="hidden"
        value={target?.revision ?? ""}
      />
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Surviving Organization Unit
        </span>
        <Select
          name="targetStableKey"
          onChange={(event) => setTargetStableKey(event.target.value)}
          required
          value={targetStableKey}
        >
          <option value="">Select an existing active Unit</option>
          {targets.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
              {candidate.parent
                ? ` — within ${candidate.parent.name}`
                : " — root Unit"}
            </option>
          ))}
        </Select>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          The source Unit and its import provenance remain historically visible.
          This list excludes the source and all of its descendants.
        </span>
      </label>

      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 sm:col-span-2">
        <p className="text-xs font-semibold text-[var(--text)]">
          Direct merge impact
        </p>
        <ul className="mt-2 grid gap-1 text-xs leading-5 text-[var(--text-secondary)] sm:grid-cols-3">
          <li>{directPositions.length} direct Position{directPositions.length === 1 ? "" : "s"} move</li>
          <li>{directChildren.length} direct child Unit{directChildren.length === 1 ? "" : "s"} move</li>
          <li>{currentOccupants} current occupant{currentOccupants === 1 ? "" : "s"} remain assigned</li>
        </ul>
        <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
          People, Position Assignments, reporting relationships, Role Mandates,
          Role Coverage, Process ownership, and operational responsibility are
          not changed or inferred.
        </p>
      </div>

      <ChangeMetadataFields onReasonChange={setReason} reason={reason} />
      <label className="flex items-start gap-3 rounded-[10px] border border-[var(--warning-border)] bg-[var(--warning-subtle)] p-3 sm:col-span-2">
        <input
          className="mt-0.5 size-4"
          name="confirmMerge"
          required
          type="checkbox"
          value="confirmed"
        />
        <span className="text-xs leading-5 text-[var(--warning)]">
          I reviewed this impact. Merge the source into the selected survivor,
          move its direct Positions and child Units, and retire—not delete—the
          source identity.
        </span>
      </label>
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending || !target} type="submit" variant="primary">
          {pending
            ? "Merging Unit…"
            : target
              ? `Merge into ${target.name}`
              : "Select a surviving Unit"}
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

function EstablishAssignmentForm({
  data,
  position,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
}) {
  const [state, action, pending] = useActionState(
    establishPositionAssignmentAction,
    initialStructureActionState,
  );
  const availablePeople = data.people.filter((person) => person.status === "active");
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <PositionRelationshipIdentity position={position} />
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Person
        </span>
        <Select name="personStableKey" required>
          <option value="">Select a Person</option>
          {availablePeople.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Assignment type
        </span>
        <Select defaultValue="incumbent" name="assignmentType" required>
          <option value="incumbent">Incumbent</option>
          <option value="job_share">Job share</option>
          <option value="interim">Interim</option>
          <option value="acting">Acting</option>
          <option value="backup">Backup</option>
        </Select>
      </label>
      <Alert className="sm:col-span-2" tone="info">
        This records structural occupancy only. It does not grant an Operational Role, Role Coverage, Process ownership, or application access.
      </Alert>
      <ChangeMetadataFields />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending || availablePeople.length === 0} type="submit" variant="primary">
          {pending ? "Establishing Assignment…" : "Establish Position Assignment"}
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
        Add an explicit current occupant or coverage relationship. Ending
        preserves the Assignment as history. Replacing ends the current record
        and creates its replacement in the same audited transaction.
      </p>
      <details className="mt-4 rounded-[10px] bg-[var(--surface-subtle)] p-3">
        <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
          Establish Position Assignment
        </summary>
        <EstablishAssignmentForm data={data} position={position} />
      </details>
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
                {positionOptionLabel(candidate)}
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

function EstablishReportingForm({
  data,
  position,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
}) {
  const [state, action, pending] = useActionState(
    establishPositionReportingRelationshipAction,
    initialStructureActionState,
  );
  const managerPositions = data.positions.filter(
    (candidate) =>
      candidate.status === "active" && candidate.id !== position.id,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <PositionRelationshipIdentity position={position} />
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Primary manager Position
        </span>
        <Select name="managerPositionStableKey" required>
          <option value="">Select a manager Position</option>
          {managerPositions.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {positionOptionLabel(candidate)}
            </option>
          ))}
        </Select>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          The relationship belongs to the two Positions. Current occupants are shown only to help identify the correct structural seats.
        </span>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Reporting context, if documented
        </span>
        <Input maxLength={2000} name="relationshipReason" />
      </label>
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Checking hierarchy…" : "Establish primary manager"}
        </Button>
      </div>
    </form>
  );
}

function ReplaceReportingForm({
  data,
  position,
  relationship,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
  relationship: NonNullable<OrganizationPosition["primaryManager"]>;
}) {
  const [state, action, pending] = useActionState(
    replacePositionReportingRelationshipAction,
    initialStructureActionState,
  );
  const managerPositions = data.positions.filter(
    (candidate) =>
      candidate.status === "active" &&
      candidate.id !== position.id &&
      candidate.id !== relationship.position.id,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <RelationshipIdentity
        expectedRevision={relationship.revision}
        name="reportingRecordKey"
        positionStableKey={position.id}
        recordKey={relationship.id}
      />
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Replacement manager Position
        </span>
        <Select name="managerPositionStableKey" required>
          <option value="">Select a different manager Position</option>
          {managerPositions.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {positionOptionLabel(candidate)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Reporting context, if documented
        </span>
        <Input maxLength={2000} name="relationshipReason" />
      </label>
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Replacing manager…" : "Replace primary manager"}
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
        Reporting is maintained between Positions, never directly between
        People. Establish, replace, correct, or end a relationship without
        inventing Process responsibility. Cycle safeguards run again before
        commit.
      </p>
      {managerRelationships.length > 0 ? (
        <div className="mt-4 space-y-3">
          {managerRelationships.map((relationship) => (
            <div
              className="rounded-[10px] border border-[var(--border)] p-3"
              key={relationship.id}
            >
              <p className="text-xs font-semibold text-[var(--text)]">
                {relationship.typeLabel}:{" "}
                {reportingPositionLabel(
                  data,
                  relationship.position.id,
                  relationship.position.title,
                )}
              </p>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {relationship.type === "primary" ? (
                  <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
                      Replace manager
                    </summary>
                    <ReplaceReportingForm
                      data={data}
                      position={position}
                      relationship={relationship}
                    />
                  </details>
                ) : null}
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
          No current reporting relationships are recorded from this Position.
        </p>
      )}
      {!position.primaryManager ? (
        <details className="mt-4 rounded-[10px] bg-[var(--surface-subtle)] p-3" open>
          <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
            Establish a primary manager Position
          </summary>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            No current primary manager is recorded for this Position. Establishing one is an explicit organizational decision, not an inference from Unit hierarchy or a Person’s name.
          </p>
          <EstablishReportingForm data={data} position={position} />
        </details>
      ) : null}
    </Card>
  );
}

function EstablishRoleMandateForm({
  data,
  position,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
}) {
  const [state, action, pending] = useActionState(
    establishRoleMandateAction,
    initialStructureActionState,
  );
  const [roleKey, setRoleKey] = useState("");
  const [mandateType, setMandateType] = useState("primary");
  const currentRoleIds = new Set(position.mandates.map((item) => item.role.id));
  const availableRoles = data.operationalRoles.filter(
    (role) => role.status === "active" && !currentRoleIds.has(role.id),
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <PositionRelationshipIdentity position={position} />
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Operational Role
        </span>
        <Select
          name="roleKey"
          onChange={(event) => setRoleKey(event.target.value)}
          required
          value={roleKey}
        >
          <option value="">Select a durable responsibility</option>
          {availableRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
          <option value="create-new">Create a new Operational Role</option>
        </Select>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          The Position title and reporting line are context only. They never
          create or select an Operational Role automatically.
        </span>
      </label>
      {roleKey === "create-new" ? (
        <>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              New Operational Role name
            </span>
            <Input maxLength={255} name="newRoleName" required />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Responsibility description, if established
            </span>
            <textarea
              className="min-h-20 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--focus-soft)]"
              maxLength={2000}
              name="newRoleDescription"
            />
          </label>
        </>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Mandate type
        </span>
        <Select
          name="mandateType"
          onChange={(event) => setMandateType(event.target.value)}
          required
          value={mandateType}
        >
          <option value="primary">Primary accountability</option>
          <option value="shared">Shared responsibility</option>
        </Select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          {mandateType === "shared" ? "Shared scope" : "Narrower scope, if documented"}
        </span>
        <Input
          maxLength={2000}
          name="scope"
          required={mandateType === "shared"}
        />
      </label>
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending || !roleKey} type="submit" variant="primary">
          {pending ? "Establishing responsibility…" : "Establish Role mandate"}
        </Button>
      </div>
    </form>
  );
}

function EndRoleMandateForm({
  mandate,
  position,
}: {
  mandate: OrganizationPosition["mandates"][number];
  position: OrganizationPosition;
}) {
  const [state, action, pending] = useActionState(
    endRoleMandateAction,
    initialStructureActionState,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input name="positionStableKey" type="hidden" value={position.id} />
      <input name="mandateRecordKey" type="hidden" value={mandate.id} />
      <input name="expectedRevision" type="hidden" value={mandate.revision} />
      {mandate.coverage.length > 0 ? (
        <Alert className="sm:col-span-2" tone="warning">
          End all current Role Coverage first. Lotura will not erase or silently
          end Person-level coverage when this mandate ends.
        </Alert>
      ) : null}
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button
          disabled={pending || mandate.coverage.length > 0}
          type="submit"
          variant="destructive"
        >
          {pending ? "Ending mandate…" : "End Role mandate"}
        </Button>
      </div>
    </form>
  );
}

function EstablishRoleCoverageForm({
  data,
  mandate,
  position,
}: {
  data: OrganizationStructureData;
  mandate: OrganizationPosition["mandates"][number];
  position: OrganizationPosition;
}) {
  const [state, action, pending] = useActionState(
    establishRoleCoverageAction,
    initialStructureActionState,
  );
  const [coverageType, setCoverageType] = useState("permanent");
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input name="positionStableKey" type="hidden" value={position.id} />
      <input name="mandateRecordKey" type="hidden" value={mandate.id} />
      <input name="expectedRevision" type="hidden" value={mandate.revision} />
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Person providing coverage
        </span>
        <Select name="personStableKey" required>
          <option value="">Select a Person explicitly</option>
          {data.people
            .filter((person) => person.status === "active")
            .map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
        </Select>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-tertiary)]">
          Position occupancy is context only. Selecting a Person here records a
          separate, explicit operational-coverage decision.
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Coverage type
        </span>
        <Select
          name="coverageType"
          onChange={(event) => setCoverageType(event.target.value)}
          required
          value={coverageType}
        >
          <option value="permanent">Permanent</option>
          <option value="interim">Interim</option>
          <option value="acting">Acting</option>
          <option value="delegated">Delegated</option>
          <option value="backup">Backup</option>
        </Select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Coverage context{coverageType === "permanent" ? ", if documented" : ""}
        </span>
        <Input
          maxLength={2000}
          name="coverageReason"
          required={coverageType !== "permanent"}
        />
      </label>
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? "Establishing coverage…" : "Establish Role Coverage"}
        </Button>
      </div>
    </form>
  );
}

function EndRoleCoverageForm({
  coverage,
  mandate,
  position,
}: {
  coverage: OrganizationPosition["mandates"][number]["coverage"][number];
  mandate: OrganizationPosition["mandates"][number];
  position: OrganizationPosition;
}) {
  const [state, action, pending] = useActionState(
    endRoleCoverageAction,
    initialStructureActionState,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input name="positionStableKey" type="hidden" value={position.id} />
      <input name="mandateRecordKey" type="hidden" value={mandate.id} />
      <input name="coverageRecordKey" type="hidden" value={coverage.id} />
      <input name="expectedRevision" type="hidden" value={coverage.revision} />
      <ChangeMetadataFields fixedKind="organizational_change" />
      <ActionResult state={state} />
      <div className="sm:col-span-2">
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? "Ending coverage…" : "End Role Coverage"}
        </Button>
      </div>
    </form>
  );
}

function OperationalResponsibilityAdministration({
  data,
  position,
}: {
  data: OrganizationStructureData;
  position: OrganizationPosition;
}) {
  return (
    <Card className="mt-4 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        Operational responsibility maintenance
      </h3>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
        Establish a deliberate connection from this Position to a durable
        Operational Role, then record Person-level Role Coverage only when it is
        supported. Reporting relationships and Position titles never imply
        either connection.
      </p>
      {position.mandates.length > 0 ? (
        <div className="mt-4 space-y-3">
          {position.mandates.map((mandate) => (
            <div
              className="rounded-[10px] border border-[var(--border)] p-3"
              key={mandate.id}
            >
              <p className="text-xs font-semibold text-[var(--text)]">
                {mandate.role.stableKey ? (
                  <Link
                    className="hover:text-[var(--workspace-accent)] hover:underline"
                    href={`/studio/responsibilities/roles/${encodeURIComponent(mandate.role.stableKey)}`}
                  >
                    {mandate.role.name}
                  </Link>
                ) : (
                  mandate.role.name
                )} · {mandate.typeLabel}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">
                {mandate.scope ? `Scope: ${mandate.scope}` : "No narrower scope is recorded."}
              </p>
              {mandate.coverage.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {mandate.coverage.map((coverage) => (
                    <details
                      className="rounded-[10px] bg-[var(--surface-subtle)] p-3"
                      key={coverage.id}
                    >
                      <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
                        {coverage.person.name} · {coverage.typeLabel} coverage
                      </summary>
                      <EndRoleCoverageForm
                        coverage={coverage}
                        mandate={mandate}
                        position={position}
                      />
                    </details>
                  ))}
                </div>
              ) : (
                <Alert className="mt-3" tone="warning">
                  No current Person-level Role Coverage is recorded.
                </Alert>
              )}
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
                    Add explicit Role Coverage
                  </summary>
                  <EstablishRoleCoverageForm
                    data={data}
                    mandate={mandate}
                    position={position}
                  />
                </details>
                <details className="rounded-[10px] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--error)]">
                    End Role mandate
                  </summary>
                  <EndRoleMandateForm mandate={mandate} position={position} />
                </details>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Alert className="mt-3" tone="warning">
          No current Operational Role mandate is recorded for this Position.
        </Alert>
      )}
      <details className="mt-4 rounded-[10px] bg-[var(--surface-subtle)] p-3" open={position.mandates.length === 0}>
        <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
          Establish an Operational Role mandate
        </summary>
        <EstablishRoleMandateForm data={data} position={position} />
      </details>
    </Card>
  );
}

const stateLabels: Record<string, string> = {
  assignmentType: "Assignment type",
  coverageRecordId: "Role Coverage record",
  coverageType: "Coverage type",
  directChildUnitsMoved: "Direct child Units moved",
  directPositionsMoved: "Direct Positions moved",
  displayName: "Display name",
  effectiveFrom: "Effective from",
  effectiveUntil: "Effective until",
  managerPositionStableKey: "Manager Position",
  mergedIntoOrganizationUnitName: "Surviving Organization Unit",
  mergedIntoOrganizationUnitStableKey: "Surviving Unit stable key",
  mandateRecordId: "Role mandate record",
  mandateType: "Mandate type",
  name: "Name",
  organizationUnitId: "Organization Unit record",
  operationalRoleCreated: "Operational Role created",
  operationalRoleId: "Operational Role record",
  operationalRoleName: "Operational Role",
  parentOrganizationUnitStableKey: "Parent Organization Unit",
  personStableKey: "Person stable key",
  personName: "Person",
  primaryManager: "Primary manager Position",
  reason: "Recorded context",
  relationshipType: "Relationship type",
  roleMandateRecordId: "Role mandate record",
  scope: "Mandate scope",
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
    if (Number.isFinite(date.getTime())) return formatAdministrativeTimestamp(value);
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
    create: "Record created",
    correct_reporting_relationship: "Reporting relationship corrected",
    end_assignment: "Assignment ended",
    end_reporting_relationship: "Reporting relationship ended",
    end_role_coverage: "Role Coverage ended",
    end_role_mandate: "Operational Role mandate ended",
    establish_reporting_relationship: "Reporting relationship established",
    establish_assignment: "Position Assignment established",
    establish_role_coverage: "Role Coverage established",
    establish_role_mandate: "Operational Role mandate established",
    merge_unit: "Organization Unit merged",
    remove_from_current_structure: "Removed from current structure",
    replace_assignment: "Assignment replaced",
    replace_reporting_relationship: "Reporting relationship replaced",
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
        Edits change the current documented structure. They do not modify the source workbook or its import record. Every accepted change records its reason, effective date, administrator, and the information before and after the change.
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
      {entityType === "organization_unit" ? (
        <Card className="mt-4 p-4 sm:p-5">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
              Merge into an existing Unit
            </summary>
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              Use this when two Unit records describe the same organizational
              grouping. The selected survivor keeps its stable identity. Direct
              Positions and child Units move to it, while this source Unit is
              retired with its identity, provenance, and history preserved.
            </p>
            <MergeOrganizationUnitForm
              data={data}
              unit={entity as OrganizationUnit}
            />
          </details>
        </Card>
      ) : null}
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
          <OperationalResponsibilityAdministration
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
                    {formatAdministrativeTimestamp(change.createdAt)} UTC
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{change.reason}</p>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                  {change.changeKind === "correction" ? "Correction" : "Organizational change"} · effective {formatAdministrativeDate(change.effectiveAt)} UTC · {change.actorIdentifier}
                </p>
                <StateComparison change={change} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">No saved changes have been recorded for this item.</p>
        )}
      </Card>
    </section>
  );
}
