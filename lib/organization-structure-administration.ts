import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  resolveOrganizationStructureAdministrationConfiguration,
  type EnabledOrganizationStructureAdministrationConfiguration,
} from "./organization-structure-administration-policy.mjs";

export type StructureEntityType = "organization_unit" | "position" | "person";
export type StructureChangeKind = "correction" | "organizational_change";
export type StructureChangeAction =
  | "update"
  | "remove_from_current_structure"
  | "end_assignment"
  | "replace_assignment"
  | "end_reporting_relationship"
  | "correct_reporting_relationship"
  | "establish_reporting_relationship"
  | "replace_reporting_relationship";

export type StructureChangeSummary = {
  action: StructureChangeAction;
  actorIdentifier: string;
  afterState: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  changeKind: StructureChangeKind;
  createdAt: string;
  effectiveAt: string;
  id: string;
  reason: string;
  targetStableKey: string;
  targetType: StructureEntityType;
};

export type StructureMutationResult =
  | { ok: true; message: string }
  | {
      ok: false;
      code: "blocked" | "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
    };

type ChangeMetadata = {
  changeKind: StructureChangeKind;
  effectiveAt: Date;
  expectedRevision: string;
  reason: string;
};

type CommonMutation = ChangeMetadata & {
  entityType: StructureEntityType;
  stableKey: string;
};

type UpdateMutation = CommonMutation & {
  displayName?: string;
  name?: string;
  organizationUnitStableKey?: string | null;
  parentOrganizationUnitStableKey?: string | null;
  title?: string;
};

type AssignmentMutation = ChangeMetadata & {
  assignmentRecordKey: string;
  positionStableKey: string;
};

type ReplaceAssignmentMutation = AssignmentMutation & {
  replacementPersonStableKey: string;
};

type ReportingMutation = ChangeMetadata & {
  positionStableKey: string;
  reportingRecordKey: string;
};

type CorrectReportingMutation = ReportingMutation & {
  managerPositionStableKey: string;
  relationshipReason?: string | null;
  relationshipType: "primary" | "dotted_line" | "functional";
};

type EstablishReportingMutation = ChangeMetadata & {
  managerPositionStableKey: string;
  positionStableKey: string;
  relationshipReason?: string | null;
};

type ReplaceReportingMutation = ReportingMutation & {
  managerPositionStableKey: string;
  relationshipReason?: string | null;
};

type DatabaseRow = Record<string, unknown>;

function mutationClient(databaseUrl: string) {
  return neon(databaseUrl, {
    isolationLevel: "Serializable",
    readOnly: false,
  });
}

type MutationClient = ReturnType<typeof mutationClient>;

function stateFor(entityType: StructureEntityType, row: DatabaseRow) {
  if (entityType === "organization_unit") {
    return {
      effectiveUntil: row.effective_until,
      isProvisional: row.is_provisional,
      name: row.name,
      parentOrganizationUnitStableKey:
        row.parent_organization_unit_stable_key ?? null,
      status: row.status,
      statusReason: row.status_reason,
    };
  }
  if (entityType === "position") {
    return {
      effectiveUntil: row.effective_until,
      organizationUnitId: row.organization_unit_id,
      status: row.status,
      statusReason: row.status_reason,
      title: row.title,
    };
  }
  return {
    displayName: row.display_name,
    status: row.status,
  };
}

function assignmentState(row: DatabaseRow) {
  return {
    assignmentRecordId: row.id,
    assignmentType: row.assignment_type,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    personStableKey: row.person_stable_key,
    reason: row.reason,
    status: row.status,
  };
}

function reportingState(row: DatabaseRow) {
  return {
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    managerPositionStableKey: row.manager_position_stable_key,
    reason: row.reason,
    relationshipRecordId: row.id,
    relationshipType: row.relationship_type,
    status: row.status,
  };
}

function targetDescriptor(entityType: StructureEntityType) {
  if (entityType === "organization_unit") {
    return {
      auditColumn: "organization_unit_id",
      label: "Organization Unit",
      table: "organization_units",
    } as const;
  }
  if (entityType === "position") {
    return {
      auditColumn: "position_id",
      label: "Position",
      table: "positions",
    } as const;
  }
  return {
    auditColumn: "person_id",
    label: "Person",
    table: "people",
  } as const;
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function recordId(key: string, prefix: string) {
  const match = new RegExp(`^${prefix}:([1-9][0-9]*)$`).exec(key);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

function validateMetadata(
  input: ChangeMetadata,
): StructureMutationResult | null {
  if (
    !Number.isFinite(input.effectiveAt.getTime()) ||
    input.effectiveAt > new Date()
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "The effective date cannot be in the future.",
    };
  }
  if (!input.reason.trim() || input.reason.trim().length > 2000) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a reason of 2,000 characters or fewer.",
    };
  }
  if (!Number.isFinite(new Date(input.expectedRevision).getTime())) {
    return {
      ok: false,
      code: "invalid",
      message: "The record revision is invalid.",
    };
  }
  return null;
}

function validateCommon(input: CommonMutation): StructureMutationResult | null {
  if (!validUuid(input.stableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "The record identifier is invalid.",
    };
  }
  return validateMetadata(input);
}

async function administrationAccess() {
  const runtimeAccess = await requireWorkspaceAccess();
  const configuration =
    resolveOrganizationStructureAdministrationConfiguration(
      process.env,
      runtimeAccess,
    );
  if (!configuration.enabled) {
    throw new Error("Organization Structure administration is not enabled.");
  }
  return configuration;
}

async function currentTarget(
  sql: MutationClient,
  configuration: EnabledOrganizationStructureAdministrationConfiguration,
  entityType: StructureEntityType,
  stableKey: string,
) {
  const descriptor = targetDescriptor(entityType);
  if (entityType === "organization_unit") {
    const rows = (await sql.query(
      `select unit.*,
         parent.stable_key as parent_organization_unit_stable_key
       from organization_units unit
       left join organization_units parent
         on parent.id = unit.parent_organization_unit_id
         and parent.organization_id = unit.organization_id
       where unit.organization_id = $1 and unit.stable_key = $2::uuid
         and unit.status = 'active'
       limit 1`,
      [configuration.organizationId, stableKey],
    )) as DatabaseRow[];
    return rows[0] as DatabaseRow | undefined;
  }
  const rows = (await sql.query(
    `select * from ${descriptor.table}
     where organization_id = $1 and stable_key = $2::uuid and status = 'active'
     limit 1`,
    [configuration.organizationId, stableKey],
  )) as DatabaseRow[];
  return rows[0] as DatabaseRow | undefined;
}

function revisionsMatch(row: DatabaseRow, expectedRevision: string) {
  const updatedAt = new Date(String(row.updated_at));
  return (
    Number.isFinite(updatedAt.getTime()) &&
    updatedAt.toISOString() === new Date(expectedRevision).toISOString()
  );
}

async function unitIdForStableKey(
  sql: MutationClient,
  configuration: EnabledOrganizationStructureAdministrationConfiguration,
  stableKey: string | null,
) {
  if (!stableKey) return null;
  if (!validUuid(stableKey)) return undefined;
  const rows = (await sql.query(
    `select id from organization_units
     where organization_id = $1 and stable_key = $2::uuid and status = 'active'
     limit 1`,
    [configuration.organizationId, stableKey],
  )) as DatabaseRow[];
  return rows[0]?.id;
}

async function positionForStableKey(
  sql: MutationClient,
  configuration: EnabledOrganizationStructureAdministrationConfiguration,
  stableKey: string,
) {
  if (!validUuid(stableKey)) return undefined;
  const rows = (await sql.query(
    `select id, stable_key, effective_from, updated_at
     from positions
     where organization_id = $1 and stable_key = $2::uuid
       and status = 'active'
     limit 1`,
    [configuration.organizationId, stableKey],
  )) as DatabaseRow[];
  return rows[0];
}

async function atomicQuery(
  sql: MutationClient,
  statement: string,
  values: unknown[],
) {
  const [rows] = await sql.transaction(
    (transaction) => [transaction.query(statement, values)],
    { isolationLevel: "Serializable", readOnly: false },
  );
  return rows as DatabaseRow[];
}

function mutationAccepted(rows: DatabaseRow[]) {
  return (
    Number(rows[0]?.changed_count ?? 0) === 1 &&
    Number(rows[0]?.audit_count ?? 0) === 1
  );
}

function auditCte(
  descriptor: ReturnType<typeof targetDescriptor>,
  entityType: StructureEntityType,
  action: StructureChangeAction,
  parameterOffset: number,
) {
  const p = (index: number) => `$${parameterOffset + index + 1}`;
  return `audit as (
    insert into organization_structure_changes
      (organization_id, entity_type, target_stable_key, ${descriptor.auditColumn},
       change_kind, change_action, before_state, after_state, reason,
       effective_at, actor_identifier)
    select ${p(0)}, '${entityType}', ${p(1)}::uuid, changed.id,
      ${p(2)}::organization_structure_change_kind,
      '${action}', ${p(3)}::jsonb, ${p(4)}::jsonb, ${p(5)},
      ${p(6)}::timestamptz, ${p(7)}
    from changed
    returning 1
  )`;
}

export async function updateStructureEntity(
  input: UpdateMutation,
): Promise<StructureMutationResult> {
  const invalid = validateCommon(input);
  if (invalid) return invalid;

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Structure administration is unavailable.",
    };
  }

  const sql = mutationClient(configuration.databaseUrl);
  try {
    const descriptor = targetDescriptor(input.entityType);
    const target = await currentTarget(
      sql,
      configuration,
      input.entityType,
      input.stableKey,
    );
    if (!target) {
      return {
        ok: false,
        code: "not_found",
        message: `${descriptor.label} was not found in this organization.`,
      };
    }
    if (!revisionsMatch(target, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This record changed after the page loaded. Refresh before trying again.",
      };
    }

    const beforeState = stateFor(input.entityType, target);
    let afterState: object;
    let changedSql: string;
    let changedValues: unknown[];
    if (input.entityType === "organization_unit") {
      const name = input.name?.trim() ?? "";
      if (!name || name.length > 255) {
        return {
          ok: false,
          code: "invalid",
          message:
            "Enter an Organization Unit name of 255 characters or fewer.",
        };
      }
      const parentOrganizationUnitStableKey =
        input.parentOrganizationUnitStableKey === undefined
          ? (target.parent_organization_unit_stable_key as string | null)
          : input.parentOrganizationUnitStableKey;
      const parentOrganizationUnitId = await unitIdForStableKey(
        sql,
        configuration,
        parentOrganizationUnitStableKey ?? null,
      );
      if (parentOrganizationUnitId === undefined) {
        return {
          ok: false,
          code: "invalid",
          message: "The selected parent Organization Unit is unavailable.",
        };
      }
      if (parentOrganizationUnitId === target.id) {
        return {
          ok: false,
          code: "invalid",
          message: "An Organization Unit cannot be its own parent.",
        };
      }
      if (
        name === target.name &&
        (parentOrganizationUnitId ?? null) ===
          (target.parent_organization_unit_id ?? null)
      ) {
        return {
          ok: false,
          code: "invalid",
          message:
            "Change the Organization Unit name or parent Unit before saving.",
        };
      }
      afterState = {
        ...beforeState,
        name,
        parentOrganizationUnitStableKey:
          parentOrganizationUnitStableKey ?? null,
      };
      changedSql = `update organization_units
        set name = $1, parent_organization_unit_id = $2,
          updated_at = transaction_timestamp()
        where id = $3 and organization_id = $4
          and stable_key = $5::uuid and updated_at = $6::timestamptz
        returning id`;
      changedValues = [
        name,
        parentOrganizationUnitId,
        target.id,
        configuration.organizationId,
        input.stableKey,
        input.expectedRevision,
      ];
    } else if (input.entityType === "position") {
      const title = input.title?.trim() ?? "";
      if (!title || title.length > 255) {
        return {
          ok: false,
          code: "invalid",
          message: "Enter a Position title of 255 characters or fewer.",
        };
      }
      const organizationUnitId = await unitIdForStableKey(
        sql,
        configuration,
        input.organizationUnitStableKey ?? null,
      );
      if (organizationUnitId === undefined) {
        return {
          ok: false,
          code: "invalid",
          message: "The selected Organization Unit is unavailable.",
        };
      }
      if (
        title === target.title &&
        (organizationUnitId ?? null) === (target.organization_unit_id ?? null)
      ) {
        return {
          ok: false,
          code: "invalid",
          message:
            "Change the Position title or Organization Unit before saving.",
        };
      }
      afterState = { ...beforeState, organizationUnitId, title };
      changedSql = `update positions
        set title = $1, organization_unit_id = $2,
          updated_at = transaction_timestamp()
        where id = $3 and organization_id = $4
          and stable_key = $5::uuid and updated_at = $6::timestamptz
        returning id`;
      changedValues = [
        title,
        organizationUnitId,
        target.id,
        configuration.organizationId,
        input.stableKey,
        input.expectedRevision,
      ];
    } else {
      const displayName = input.displayName?.trim() ?? "";
      if (!displayName || displayName.length > 255) {
        return {
          ok: false,
          code: "invalid",
          message: "Enter a Person display name of 255 characters or fewer.",
        };
      }
      if (displayName === target.display_name) {
        return {
          ok: false,
          code: "invalid",
          message: "Change the Person display name before saving.",
        };
      }
      afterState = { ...beforeState, displayName };
      changedSql = `update people
        set display_name = $1, updated_at = transaction_timestamp()
        where id = $2 and organization_id = $3
          and stable_key = $4::uuid and updated_at = $5::timestamptz
        returning id`;
      changedValues = [
        displayName,
        target.id,
        configuration.organizationId,
        input.stableKey,
        input.expectedRevision,
      ];
    }

    const auditValues = [
      configuration.organizationId,
      input.stableKey,
      input.changeKind,
      JSON.stringify(beforeState),
      JSON.stringify(afterState),
      input.reason.trim(),
      input.effectiveAt.toISOString(),
      configuration.actorIdentifier,
    ];
    const rows = await atomicQuery(
      sql,
      `with changed as (${changedSql}),
       ${auditCte(
         descriptor,
         input.entityType,
         "update",
         changedValues.length,
       )}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [...changedValues, ...auditValues],
    );

    if (!mutationAccepted(rows)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This record changed after the page loaded. Refresh before trying again.",
      };
    }

    return {
      ok: true,
      message: `${descriptor.label} updated. Its prior canonical state and import provenance were retained.`,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The change could not be saved. No partial change was accepted.",
    };
  }
}

async function blockersForRemoval(
  sql: MutationClient,
  configuration: EnabledOrganizationStructureAdministrationConfiguration,
  entityType: StructureEntityType,
  targetId: unknown,
) {
  if (entityType === "organization_unit") {
    const rows = (await sql.query(
      `select
         (select count(*)::int from organization_units where organization_id = $1 and parent_organization_unit_id = $2 and status = 'active') as child_units,
         (select count(*)::int from positions where organization_id = $1 and organization_unit_id = $2 and status = 'active') as positions`,
      [configuration.organizationId, targetId],
    )) as DatabaseRow[];
    return (
      Number(rows[0]?.child_units ?? 0) + Number(rows[0]?.positions ?? 0)
    );
  }
  if (entityType === "position") {
    const rows = (await sql.query(
      `select
         (select count(*)::int from position_assignments where organization_id = $1 and position_id = $2 and status in ('scheduled', 'active')) as assignments,
         (select count(*)::int from position_reporting_relationships where organization_id = $1 and (subordinate_position_id = $2 or manager_position_id = $2) and status in ('scheduled', 'active')) as reporting,
         (select count(*)::int from role_mandates where organization_id = $1 and position_id = $2 and status in ('scheduled', 'active')) as mandates`,
      [configuration.organizationId, targetId],
    )) as DatabaseRow[];
    return (
      Number(rows[0]?.assignments ?? 0) +
      Number(rows[0]?.reporting ?? 0) +
      Number(rows[0]?.mandates ?? 0)
    );
  }
  const rows = (await sql.query(
    `select
       (select count(*)::int from position_assignments where organization_id = $1 and person_id = $2 and status in ('scheduled', 'active')) as assignments,
       (select count(*)::int from role_coverages where organization_id = $1 and person_id = $2 and status in ('scheduled', 'active')) as coverages`,
    [configuration.organizationId, targetId],
  )) as DatabaseRow[];
  return (
    Number(rows[0]?.assignments ?? 0) + Number(rows[0]?.coverages ?? 0)
  );
}

export async function removeStructureEntity(
  input: CommonMutation,
): Promise<StructureMutationResult> {
  const invalid = validateCommon(input);
  if (invalid) return invalid;

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Structure administration is unavailable.",
    };
  }

  const sql = mutationClient(configuration.databaseUrl);
  try {
    const descriptor = targetDescriptor(input.entityType);
    const target = await currentTarget(
      sql,
      configuration,
      input.entityType,
      input.stableKey,
    );
    if (!target) {
      return {
        ok: false,
        code: "not_found",
        message: `${descriptor.label} was not found in this organization.`,
      };
    }
    if (!revisionsMatch(target, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This record changed after the page loaded. Refresh before trying again.",
      };
    }
    if (
      (await blockersForRemoval(
        sql,
        configuration,
        input.entityType,
        target.id,
      )) > 0
    ) {
      return {
        ok: false,
        code: "blocked",
        message: `This ${descriptor.label} still has current structural relationships. End or reassign those relationships before removing it.`,
      };
    }
    if (
      input.entityType !== "person" &&
      input.effectiveAt <= new Date(String(target.effective_from))
    ) {
      return {
        ok: false,
        code: "invalid",
        message: "The removal date must be after the record became effective.",
      };
    }

    const beforeState = stateFor(input.entityType, target);
    const afterState = {
      ...beforeState,
      ...(input.entityType === "person"
        ? { status: "inactive" }
        : {
            effectiveUntil: input.effectiveAt.toISOString(),
            status: "retired",
            statusReason: input.reason.trim(),
          }),
    };
    const blockerClause =
      input.entityType === "organization_unit"
        ? `and not exists (select 1 from organization_units where organization_id = $3 and parent_organization_unit_id = $2 and status = 'active')
           and not exists (select 1 from positions where organization_id = $3 and organization_unit_id = $2 and status = 'active')`
        : input.entityType === "position"
          ? `and not exists (select 1 from position_assignments where organization_id = $3 and position_id = $2 and status in ('scheduled', 'active'))
             and not exists (select 1 from position_reporting_relationships where organization_id = $3 and (subordinate_position_id = $2 or manager_position_id = $2) and status in ('scheduled', 'active'))
             and not exists (select 1 from role_mandates where organization_id = $3 and position_id = $2 and status in ('scheduled', 'active'))`
          : `and not exists (select 1 from position_assignments where organization_id = $3 and person_id = $2 and status in ('scheduled', 'active'))
             and not exists (select 1 from role_coverages where organization_id = $3 and person_id = $2 and status in ('scheduled', 'active'))`;
    const changedSql =
      input.entityType === "person"
        ? `update people
           set status = 'inactive', updated_at = transaction_timestamp()
           where stable_key = $1::uuid and id = $2 and organization_id = $3
             and updated_at = $4::timestamptz ${blockerClause}
           returning id`
        : `update ${descriptor.table}
           set status = 'retired', status_reason = $5,
             effective_until = $6::timestamptz,
             updated_at = transaction_timestamp()
           where stable_key = $1::uuid and id = $2 and organization_id = $3
             and updated_at = $4::timestamptz ${blockerClause}
           returning id`;
    const changedValues =
      input.entityType === "person"
        ? [
            input.stableKey,
            target.id,
            configuration.organizationId,
            input.expectedRevision,
          ]
        : [
            input.stableKey,
            target.id,
            configuration.organizationId,
            input.expectedRevision,
            input.reason.trim(),
            input.effectiveAt.toISOString(),
          ];
    const auditValues = [
      configuration.organizationId,
      input.stableKey,
      input.changeKind,
      JSON.stringify(beforeState),
      JSON.stringify(afterState),
      input.reason.trim(),
      input.effectiveAt.toISOString(),
      configuration.actorIdentifier,
    ];
    const rows = await atomicQuery(
      sql,
      `with changed as (${changedSql}),
       ${auditCte(
         descriptor,
         input.entityType,
         "remove_from_current_structure",
         changedValues.length,
       )}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [...changedValues, ...auditValues],
    );
    if (!mutationAccepted(rows)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "The record or its relationships changed. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message: `${descriptor.label} removed from the current structure. Its identity and history were retained.`,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message:
        "The record could not be removed. No partial change was accepted.",
    };
  }
}

async function assignmentContext(
  sql: MutationClient,
  configuration: EnabledOrganizationStructureAdministrationConfiguration,
  positionStableKey: string,
  assignmentRecordKey: string,
) {
  const assignmentId = recordId(assignmentRecordKey, "position-assignment");
  if (!assignmentId || !validUuid(positionStableKey)) return undefined;
  const rows = (await sql.query(
    `select pa.*, p.stable_key as position_stable_key,
       person.stable_key as person_stable_key
     from position_assignments pa
     join positions p
       on p.id = pa.position_id and p.organization_id = pa.organization_id
     join people person
       on person.id = pa.person_id and person.organization_id = pa.organization_id
     where pa.organization_id = $1 and pa.id = $2
       and p.stable_key = $3::uuid and p.status = 'active'
       and pa.status in ('scheduled', 'active')
     limit 1`,
    [configuration.organizationId, assignmentId, positionStableKey],
  )) as DatabaseRow[];
  return rows[0];
}

export async function endPositionAssignment(
  input: AssignmentMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Structure administration is unavailable.",
    };
  }
  const sql = mutationClient(configuration.databaseUrl);
  try {
    const assignment = await assignmentContext(
      sql,
      configuration,
      input.positionStableKey,
      input.assignmentRecordKey,
    );
    if (!assignment) {
      return {
        ok: false,
        code: "not_found",
        message: "The current Position Assignment was not found.",
      };
    }
    if (!revisionsMatch(assignment, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Assignment changed after the page loaded. Refresh before trying again.",
      };
    }
    if (input.effectiveAt <= new Date(String(assignment.effective_from))) {
      return {
        ok: false,
        code: "invalid",
        message: "The end date must be after the Assignment began.",
      };
    }
    const beforeState = assignmentState(assignment);
    const afterState = {
      ...beforeState,
      effectiveUntil: input.effectiveAt.toISOString(),
      status: "ended",
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update position_assignments
         set status = 'ended', effective_until = $1::timestamptz,
           updated_at = transaction_timestamp()
         where id = $2 and organization_id = $3 and position_id = $4
           and updated_at = $5::timestamptz
           and status in ('scheduled', 'active')
         returning position_id as id
       ),
       ${auditCte(
         targetDescriptor("position"),
         "position",
         "end_assignment",
         5,
       )}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [
        input.effectiveAt.toISOString(),
        assignment.id,
        configuration.organizationId,
        assignment.position_id,
        input.expectedRevision,
        configuration.organizationId,
        input.positionStableKey,
        input.changeKind,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    if (!mutationAccepted(rows)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Assignment changed after the page loaded. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message: "Position Assignment ended. Its prior state remains in history.",
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message:
        "The Assignment could not be ended. No partial change was accepted.",
    };
  }
}

export async function replacePositionAssignment(
  input: ReplaceAssignmentMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (!validUuid(input.replacementPersonStableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select an available replacement Person.",
    };
  }

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Structure administration is unavailable.",
    };
  }
  const sql = mutationClient(configuration.databaseUrl);
  try {
    const assignment = await assignmentContext(
      sql,
      configuration,
      input.positionStableKey,
      input.assignmentRecordKey,
    );
    if (!assignment) {
      return {
        ok: false,
        code: "not_found",
        message: "The current Position Assignment was not found.",
      };
    }
    if (!revisionsMatch(assignment, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Assignment changed after the page loaded. Refresh before trying again.",
      };
    }
    if (input.effectiveAt <= new Date(String(assignment.effective_from))) {
      return {
        ok: false,
        code: "invalid",
        message: "The replacement date must be after the Assignment began.",
      };
    }
    const people = (await sql.query(
      `select id, stable_key from people
       where organization_id = $1 and stable_key = $2::uuid
         and status = 'active' limit 1`,
      [configuration.organizationId, input.replacementPersonStableKey],
    )) as DatabaseRow[];
    const replacementPerson = people[0];
    if (!replacementPerson) {
      return {
        ok: false,
        code: "invalid",
        message: "The replacement Person is unavailable in this organization.",
      };
    }
    if (replacementPerson.id === assignment.person_id) {
      return {
        ok: false,
        code: "invalid",
        message: "Select a different Person for the replacement Assignment.",
      };
    }
    const beforeState = assignmentState(assignment);
    const afterState = {
      assignmentType: assignment.assignment_type,
      effectiveFrom: input.effectiveAt.toISOString(),
      effectiveUntil: null,
      personStableKey: input.replacementPersonStableKey,
      reason: input.reason.trim(),
      status: "active",
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update position_assignments
         set status = 'ended', effective_until = $1::timestamptz,
           updated_at = transaction_timestamp()
         where id = $2 and organization_id = $3 and position_id = $4
           and updated_at = $5::timestamptz
           and status in ('scheduled', 'active')
         returning id, organization_id, position_id, assignment_type
       ),
       replacement as (
         insert into position_assignments
           (organization_id, position_id, person_id, assignment_type, status,
            effective_from, reason)
         select changed.organization_id, changed.position_id, $6,
           changed.assignment_type, 'active', $1::timestamptz, $7
         from changed
         returning id
       ),
       audit as (
         insert into organization_structure_changes
           (organization_id, entity_type, target_stable_key, position_id,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select $3, 'position', $8::uuid, $4,
           $9::organization_structure_change_kind, 'replace_assignment',
           $10::jsonb, $11::jsonb, $7, $1::timestamptz, $12
         from changed, replacement
         returning 1
       )
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from replacement) as replacement_count,
         (select count(*)::int from audit) as audit_count`,
      [
        input.effectiveAt.toISOString(),
        assignment.id,
        configuration.organizationId,
        assignment.position_id,
        input.expectedRevision,
        replacementPerson.id,
        input.reason.trim(),
        input.positionStableKey,
        input.changeKind,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        configuration.actorIdentifier,
      ],
    );
    if (
      !mutationAccepted(rows) ||
      Number(rows[0]?.replacement_count ?? 0) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Assignment changed after the page loaded. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message:
        "Position Assignment replaced. The ended and replacement states were recorded together.",
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message:
        "The Assignment could not be replaced. No partial change was accepted.",
    };
  }
}

async function reportingContext(
  sql: MutationClient,
  configuration: EnabledOrganizationStructureAdministrationConfiguration,
  positionStableKey: string,
  reportingRecordKey: string,
) {
  const reportingId = recordId(reportingRecordKey, "position-reporting");
  if (!reportingId || !validUuid(positionStableKey)) return undefined;
  const rows = (await sql.query(
    `select rel.*, subordinate.stable_key as position_stable_key,
       manager.stable_key as manager_position_stable_key
     from position_reporting_relationships rel
     join positions subordinate
       on subordinate.id = rel.subordinate_position_id
       and subordinate.organization_id = rel.organization_id
     join positions manager
       on manager.id = rel.manager_position_id
       and manager.organization_id = rel.organization_id
     where rel.organization_id = $1 and rel.id = $2
       and subordinate.stable_key = $3::uuid
       and subordinate.status = 'active' and manager.status = 'active'
       and rel.status in ('scheduled', 'active')
     limit 1`,
    [configuration.organizationId, reportingId, positionStableKey],
  )) as DatabaseRow[];
  return rows[0];
}

function validateReportingRelationshipChange(
  input: EstablishReportingMutation | ReplaceReportingMutation,
): StructureMutationResult | null {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (input.changeKind !== "organizational_change") {
    return {
      ok: false,
      code: "invalid",
      message:
        "Establishing or replacing a reporting relationship must be classified as an organizational change.",
    };
  }
  if (!validUuid(input.positionStableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "The subordinate Position identifier is invalid.",
    };
  }
  if (!validUuid(input.managerPositionStableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select an available manager Position.",
    };
  }
  if ((input.relationshipReason?.trim().length ?? 0) > 2000) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter reporting context of 2,000 characters or fewer.",
    };
  }
  return null;
}

export async function establishPositionReportingRelationship(
  input: EstablishReportingMutation,
): Promise<StructureMutationResult> {
  const invalid = validateReportingRelationshipChange(input);
  if (invalid) return invalid;

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Structure administration is unavailable.",
    };
  }

  const sql = mutationClient(configuration.databaseUrl);
  try {
    const [position, manager] = await Promise.all([
      positionForStableKey(sql, configuration, input.positionStableKey),
      positionForStableKey(
        sql,
        configuration,
        input.managerPositionStableKey,
      ),
    ]);
    if (!position) {
      return {
        ok: false,
        code: "not_found",
        message: "The subordinate Position was not found in this organization.",
      };
    }
    if (!revisionsMatch(position, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Position changed after the page loaded. Refresh before trying again.",
      };
    }
    if (!manager || manager.id === position.id) {
      return {
        ok: false,
        code: "invalid",
        message: "The selected manager Position is unavailable.",
      };
    }
    if (
      input.effectiveAt < new Date(String(position.effective_from)) ||
      input.effectiveAt < new Date(String(manager.effective_from))
    ) {
      return {
        ok: false,
        code: "invalid",
        message:
          "The relationship cannot begin before either Position became effective.",
      };
    }

    const relationshipReason = input.relationshipReason?.trim() || null;
    const beforeState = { primaryManager: null };
    const afterState = {
      effectiveFrom: input.effectiveAt.toISOString(),
      effectiveUntil: null,
      managerPositionStableKey: input.managerPositionStableKey,
      reason: relationshipReason,
      relationshipType: "primary",
      status: "active",
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update positions
         set updated_at = transaction_timestamp()
         where id = $1 and organization_id = $2
           and stable_key = $3::uuid and updated_at = $4::timestamptz
           and status = 'active'
           and not exists (
             select 1 from position_reporting_relationships current_relation
             where current_relation.organization_id = $2
               and current_relation.subordinate_position_id = $1
               and current_relation.relationship_type = 'primary'
               and current_relation.status in ('scheduled', 'active')
           )
         returning id, organization_id
       ),
       relationship as (
         insert into position_reporting_relationships
           (organization_id, subordinate_position_id, manager_position_id,
            relationship_type, status, effective_from, reason)
         select changed.organization_id, changed.id, $5,
           'primary', 'active', $6::timestamptz, $7
         from changed
         returning id
       ),
       audit as (
         insert into organization_structure_changes
           (organization_id, entity_type, target_stable_key, position_id,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select $2, 'position', $3::uuid, changed.id,
           'organizational_change', 'establish_reporting_relationship',
           $8::jsonb, $9::jsonb, $10, $6::timestamptz, $11
         from changed, relationship
         returning 1
       )
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from relationship) as relationship_count,
         (select count(*)::int from audit) as audit_count`,
      [
        position.id,
        configuration.organizationId,
        input.positionStableKey,
        input.expectedRevision,
        manager.id,
        input.effectiveAt.toISOString(),
        relationshipReason,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        input.reason.trim(),
        configuration.actorIdentifier,
      ],
    );
    if (
      !mutationAccepted(rows) ||
      Number(rows[0]?.relationship_count ?? 0) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Position or its primary manager relationship changed. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message:
        "Primary manager relationship established. The decision and its effective date were recorded in history.",
    };
  } catch {
    return {
      ok: false,
      code: "blocked",
      message:
        "The manager relationship was rejected. Review cycle, manager, and current-record constraints; no partial change was accepted.",
    };
  }
}

export async function replacePositionReportingRelationship(
  input: ReplaceReportingMutation,
): Promise<StructureMutationResult> {
  const invalid = validateReportingRelationshipChange(input);
  if (invalid) return invalid;

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Structure administration is unavailable.",
    };
  }

  const sql = mutationClient(configuration.databaseUrl);
  try {
    const relationship = await reportingContext(
      sql,
      configuration,
      input.positionStableKey,
      input.reportingRecordKey,
    );
    if (!relationship || relationship.relationship_type !== "primary") {
      return {
        ok: false,
        code: "not_found",
        message: "The current primary manager relationship was not found.",
      };
    }
    if (!revisionsMatch(relationship, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This reporting relationship changed after the page loaded. Refresh before trying again.",
      };
    }
    const manager = await positionForStableKey(
      sql,
      configuration,
      input.managerPositionStableKey,
    );
    if (
      !manager ||
      manager.id === relationship.subordinate_position_id ||
      manager.id === relationship.manager_position_id
    ) {
      return {
        ok: false,
        code: "invalid",
        message: "Select a different available manager Position.",
      };
    }
    if (
      input.effectiveAt <= new Date(String(relationship.effective_from)) ||
      input.effectiveAt < new Date(String(manager.effective_from))
    ) {
      return {
        ok: false,
        code: "invalid",
        message:
          "The replacement date must follow the current relationship and cannot precede the new manager Position.",
      };
    }

    const relationshipReason = input.relationshipReason?.trim() || null;
    const beforeState = reportingState(relationship);
    const afterState = {
      effectiveFrom: input.effectiveAt.toISOString(),
      effectiveUntil: null,
      managerPositionStableKey: input.managerPositionStableKey,
      reason: relationshipReason,
      relationshipType: "primary",
      status: "active",
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update position_reporting_relationships
         set status = 'ended', effective_until = $1::timestamptz,
           updated_at = transaction_timestamp()
         where id = $2 and organization_id = $3
           and subordinate_position_id = $4
           and relationship_type = 'primary'
           and updated_at = $5::timestamptz
           and status in ('scheduled', 'active')
         returning subordinate_position_id as id, organization_id
       ),
       replacement as (
         insert into position_reporting_relationships
           (organization_id, subordinate_position_id, manager_position_id,
            relationship_type, status, effective_from, reason)
         select changed.organization_id, changed.id, $6,
           'primary', 'active', $1::timestamptz, $7
         from changed
         returning id
       ),
       audit as (
         insert into organization_structure_changes
           (organization_id, entity_type, target_stable_key, position_id,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select $3, 'position', $8::uuid, changed.id,
           'organizational_change', 'replace_reporting_relationship',
           $9::jsonb, $10::jsonb, $11, $1::timestamptz, $12
         from changed, replacement
         returning 1
       )
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from replacement) as replacement_count,
         (select count(*)::int from audit) as audit_count`,
      [
        input.effectiveAt.toISOString(),
        relationship.id,
        configuration.organizationId,
        relationship.subordinate_position_id,
        input.expectedRevision,
        manager.id,
        relationshipReason,
        input.positionStableKey,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        input.reason.trim(),
        configuration.actorIdentifier,
      ],
    );
    if (
      !mutationAccepted(rows) ||
      Number(rows[0]?.replacement_count ?? 0) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This reporting relationship changed after the page loaded. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message:
        "Primary manager relationship replaced. The prior relationship was ended and both states remain explainable in history.",
    };
  } catch {
    return {
      ok: false,
      code: "blocked",
      message:
        "The manager replacement was rejected. Review cycle, manager, and current-record constraints; no partial change was accepted.",
    };
  }
}

export async function endPositionReportingRelationship(
  input: ReportingMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Structure administration is unavailable.",
    };
  }
  const sql = mutationClient(configuration.databaseUrl);
  try {
    const relationship = await reportingContext(
      sql,
      configuration,
      input.positionStableKey,
      input.reportingRecordKey,
    );
    if (!relationship) {
      return {
        ok: false,
        code: "not_found",
        message: "The current reporting relationship was not found.",
      };
    }
    if (!revisionsMatch(relationship, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This reporting relationship changed after the page loaded. Refresh before trying again.",
      };
    }
    if (input.effectiveAt <= new Date(String(relationship.effective_from))) {
      return {
        ok: false,
        code: "invalid",
        message: "The end date must be after the reporting relationship began.",
      };
    }
    const beforeState = reportingState(relationship);
    const afterState = {
      ...beforeState,
      effectiveUntil: input.effectiveAt.toISOString(),
      status: "ended",
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update position_reporting_relationships
         set status = 'ended', effective_until = $1::timestamptz,
           updated_at = transaction_timestamp()
         where id = $2 and organization_id = $3
           and subordinate_position_id = $4
           and updated_at = $5::timestamptz
           and status in ('scheduled', 'active')
         returning subordinate_position_id as id
       ),
       ${auditCte(
         targetDescriptor("position"),
         "position",
         "end_reporting_relationship",
         5,
       )}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [
        input.effectiveAt.toISOString(),
        relationship.id,
        configuration.organizationId,
        relationship.subordinate_position_id,
        input.expectedRevision,
        configuration.organizationId,
        input.positionStableKey,
        input.changeKind,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    if (!mutationAccepted(rows)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This reporting relationship changed after the page loaded. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message:
        "Reporting relationship ended. Its prior state remains in history.",
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message:
        "The reporting relationship could not be ended. No partial change was accepted.",
    };
  }
}

export async function correctPositionReportingRelationship(
  input: CorrectReportingMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (input.changeKind !== "correction") {
    return {
      ok: false,
      code: "invalid",
      message:
        "Correcting a reporting record must be classified as a correction. End the relationship to record an organizational change.",
    };
  }
  if (!validUuid(input.managerPositionStableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select an available manager Position.",
    };
  }

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Structure administration is unavailable.",
    };
  }
  const sql = mutationClient(configuration.databaseUrl);
  try {
    const relationship = await reportingContext(
      sql,
      configuration,
      input.positionStableKey,
      input.reportingRecordKey,
    );
    if (!relationship) {
      return {
        ok: false,
        code: "not_found",
        message: "The current reporting relationship was not found.",
      };
    }
    if (!revisionsMatch(relationship, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This reporting relationship changed after the page loaded. Refresh before trying again.",
      };
    }
    const managers = (await sql.query(
      `select id, stable_key from positions
       where organization_id = $1 and stable_key = $2::uuid
         and status = 'active' limit 1`,
      [configuration.organizationId, input.managerPositionStableKey],
    )) as DatabaseRow[];
    const manager = managers[0];
    if (!manager || manager.id === relationship.subordinate_position_id) {
      return {
        ok: false,
        code: "invalid",
        message: "The selected manager Position is unavailable.",
      };
    }
    const relationshipReason = input.relationshipReason?.trim() || null;
    if (
      manager.id === relationship.manager_position_id &&
      input.relationshipType === relationship.relationship_type &&
      relationshipReason === (relationship.reason ?? null)
    ) {
      return {
        ok: false,
        code: "invalid",
        message: "Change the manager, relationship type, or context before saving.",
      };
    }
    const beforeState = reportingState(relationship);
    const afterState = {
      ...beforeState,
      managerPositionStableKey: input.managerPositionStableKey,
      reason: relationshipReason,
      relationshipType: input.relationshipType,
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update position_reporting_relationships
         set manager_position_id = $1, relationship_type = $2,
           reason = $3, updated_at = transaction_timestamp()
         where id = $4 and organization_id = $5
           and subordinate_position_id = $6
           and updated_at = $7::timestamptz
           and status in ('scheduled', 'active')
         returning subordinate_position_id as id
       ),
       ${auditCte(
         targetDescriptor("position"),
         "position",
         "correct_reporting_relationship",
         7,
       )}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [
        manager.id,
        input.relationshipType,
        relationshipReason,
        relationship.id,
        configuration.organizationId,
        relationship.subordinate_position_id,
        input.expectedRevision,
        configuration.organizationId,
        input.positionStableKey,
        input.changeKind,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    if (!mutationAccepted(rows)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This reporting relationship changed after the page loaded. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message:
        "Reporting relationship corrected. Its prior canonical state remains in history.",
    };
  } catch {
    return {
      ok: false,
      code: "blocked",
      message:
        "The reporting correction was rejected. Review cycle, manager, and current-record constraints; no partial change was accepted.",
    };
  }
}

export async function organizationStructureAdministrationStatus() {
  const runtimeAccess = await requireWorkspaceAccess();
  return resolveOrganizationStructureAdministrationConfiguration(
    process.env,
    runtimeAccess,
  );
}
