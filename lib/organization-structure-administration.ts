import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  resolveOrganizationStructureAdministrationConfiguration,
  type EnabledOrganizationStructureAdministrationConfiguration,
} from "./organization-structure-administration-policy.mjs";

export type StructureEntityType =
  | "organization_unit"
  | "position"
  | "person"
  | "operational_role";
export type StructureChangeKind = "correction" | "organizational_change";
export type StructureChangeAction =
  | "update"
  | "remove_from_current_structure"
  | "end_assignment"
  | "replace_assignment"
  | "end_reporting_relationship"
  | "correct_reporting_relationship"
  | "establish_reporting_relationship"
  | "replace_reporting_relationship"
  | "establish_role_mandate"
  | "end_role_mandate"
  | "establish_role_coverage"
  | "end_role_coverage"
  | "create"
  | "establish_assignment";

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
  | { ok: true; message: string; stableKey?: string }
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

type CreationMetadata = Omit<ChangeMetadata, "expectedRevision"> & {
  acknowledgePossibleDuplicate: boolean;
};

type CreateOrganizationUnitMutation = CreationMetadata & {
  name: string;
  parentOrganizationUnitStableKey?: string | null;
};

type CreatePositionMutation = CreationMetadata & {
  organizationUnitStableKey?: string | null;
  title: string;
};

type CreatePersonMutation = CreationMetadata & {
  displayName: string;
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

type EstablishAssignmentMutation = ChangeMetadata & {
  assignmentType: "incumbent" | "job_share" | "interim" | "acting" | "backup";
  personStableKey: string;
  positionStableKey: string;
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

type EstablishRoleMandateMutation = ChangeMetadata & {
  mandateType: "primary" | "shared";
  newRoleDescription?: string | null;
  newRoleName?: string | null;
  positionStableKey: string;
  roleKey?: string | null;
  scope?: string | null;
};

type RoleMandateMutation = ChangeMetadata & {
  mandateRecordKey: string;
  positionStableKey: string;
};

type EstablishRoleCoverageMutation = RoleMandateMutation & {
  coverageReason?: string | null;
  coverageType: "permanent" | "interim" | "acting" | "delegated" | "backup";
  personStableKey: string;
};

type EndRoleCoverageMutation = RoleMandateMutation & {
  coverageRecordKey: string;
};

type UpdateOperationalRoleMutation = ChangeMetadata & {
  description?: string | null;
  name: string;
  stableKey: string;
};

type InactivateOperationalRoleMutation = ChangeMetadata & {
  stableKey: string;
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
  if (entityType === "operational_role") {
    return {
      description: row.description,
      name: row.name,
      status: row.status,
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

function mandateState(row: DatabaseRow) {
  return {
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    mandateRecordId: row.id,
    mandateType: row.mandate_type,
    operationalRoleId: `role:${row.role_id}`,
    operationalRoleName: row.role_name,
    reason: row.reason,
    scope: row.scope,
    status: row.status,
  };
}

function coverageState(row: DatabaseRow) {
  return {
    coverageRecordId: row.id,
    coverageType: row.coverage_type,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    operationalRoleId: `role:${row.role_id}`,
    operationalRoleName: row.role_name,
    personStableKey: row.person_stable_key,
    personName: row.person_name,
    reason: row.reason,
    roleMandateRecordId: row.role_mandate_id,
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
  if (entityType === "operational_role") {
    return {
      auditColumn: "role_id",
      label: "Operational Role",
      table: "roles",
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

function validateChangeDetails(
  input: Pick<ChangeMetadata, "changeKind" | "effectiveAt" | "reason">,
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
  return null;
}

function validateMetadata(
  input: ChangeMetadata,
): StructureMutationResult | null {
  const invalid = validateChangeDetails(input);
  if (invalid) return invalid;
  if (!Number.isFinite(new Date(input.expectedRevision).getTime())) {
    return {
      ok: false,
      code: "invalid",
      message: "The record revision is invalid.",
    };
  }
  return null;
}

function validateCreationMetadata(
  input: CreationMetadata,
): StructureMutationResult | null {
  return validateChangeDetails(input);
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
  const updatedAt =
    row.updated_at instanceof Date
      ? row.updated_at
      : new Date(String(row.updated_at));
  const expected = new Date(expectedRevision);
  return (
    Number.isFinite(updatedAt.getTime()) &&
    Number.isFinite(expected.getTime()) &&
    updatedAt.toISOString() === expected.toISOString()
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

function creationAuditCte(
  descriptor: ReturnType<typeof targetDescriptor>,
  entityType: StructureEntityType,
  parameterOffset: number,
) {
  const p = (index: number) => `$${parameterOffset + index + 1}`;
  return `audit as (
    insert into organization_structure_changes
      (organization_id, entity_type, target_stable_key, ${descriptor.auditColumn},
       change_kind, change_action, before_state, after_state, reason,
       effective_at, actor_identifier)
    select ${p(0)}, '${entityType}', changed.stable_key, changed.id,
      ${p(1)}::organization_structure_change_kind,
      'create', '{}'::jsonb, ${p(2)}::jsonb, ${p(3)},
      ${p(4)}::timestamptz, ${p(5)}
    from changed
    returning 1
  )`;
}

function createdStableKey(rows: DatabaseRow[]) {
  const value = rows[0]?.stable_key;
  return typeof value === "string" && validUuid(value) ? value : null;
}

type SafeDatabaseError = {
  code?: unknown;
  constraint?: unknown;
  routine?: unknown;
  table?: unknown;
};

function organizationUnitCreationFailure(
  error: unknown,
): StructureMutationResult {
  const databaseError =
    typeof error === "object" && error !== null
      ? (error as SafeDatabaseError)
      : null;
  const code =
    typeof databaseError?.code === "string" ? databaseError.code : "unknown";

  // Never log submitted names, reasons, credentials, URLs, or raw database
  // messages. These stable PostgreSQL identifiers are enough to distinguish a
  // privilege/configuration problem from a canonical-data conflict.
  console.error("Organization Unit creation failed.", {
    code,
    constraint:
      typeof databaseError?.constraint === "string"
        ? databaseError.constraint
        : undefined,
    routine:
      typeof databaseError?.routine === "string"
        ? databaseError.routine
        : undefined,
    table:
      typeof databaseError?.table === "string"
        ? databaseError.table
        : undefined,
  });

  if (code === "42501") {
    return {
      ok: false,
      code: "unavailable",
      message:
        "The Workspace write role is missing an approved Organization Unit creation privilege. No change was made.",
    };
  }
  if (code === "40001") {
    return {
      ok: false,
      code: "conflict",
      message:
        "The organization changed while this Unit was being added. Review the current structure and try again.",
    };
  }
  if (["23503", "23505", "23514"].includes(code)) {
    return {
      ok: false,
      code: "blocked",
      message:
        "The Organization Unit conflicts with the current canonical hierarchy. Review its name and parent Unit, then try again.",
    };
  }
  return {
    ok: false,
    code: "unavailable",
    message:
      "The Organization Unit could not be added. No partial change was accepted.",
  };
}

export async function createOrganizationUnit(
  input: CreateOrganizationUnitMutation,
): Promise<StructureMutationResult> {
  const invalid = validateCreationMetadata(input);
  if (invalid) return invalid;
  const name = input.name.trim();
  if (!name || name.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter an Organization Unit name of 255 characters or fewer.",
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
    const parentStableKey = input.parentOrganizationUnitStableKey ?? null;
    const parentId = await unitIdForStableKey(
      sql,
      configuration,
      parentStableKey,
    );
    if (parentId === undefined) {
      return {
        ok: false,
        code: "invalid",
        message: "The selected parent Organization Unit is unavailable.",
      };
    }
    const afterState = {
      effectiveUntil: null,
      isProvisional: false,
      name,
      parentOrganizationUnitStableKey: parentStableKey,
      status: "active",
      statusReason: null,
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         insert into organization_units
           (organization_id, name, parent_organization_unit_id,
            is_provisional, status, effective_from)
         select $1, $2, $3, false, 'active', $4::timestamptz
         where ($3::integer is null or exists (
           select 1 from organization_units parent
           where parent.id = $3 and parent.organization_id = $1
             and parent.status = 'active'
         ))
         and ($5::boolean or not exists (
           select 1 from organization_units duplicate
           where duplicate.organization_id = $1
             and duplicate.status = 'active'
             and lower(trim(duplicate.name)) = lower(trim($2))
             and duplicate.parent_organization_unit_id is not distinct from $3
         ))
         returning id, stable_key
       ),
       ${creationAuditCte(
         targetDescriptor("organization_unit"),
         "organization_unit",
         5,
       )}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count,
         (select stable_key::text from changed limit 1) as stable_key`,
      [
        configuration.organizationId,
        name,
        parentId,
        input.effectiveAt.toISOString(),
        input.acknowledgePossibleDuplicate,
        configuration.organizationId,
        input.changeKind,
        JSON.stringify(afterState),
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const stableKey = createdStableKey(rows);
    if (!mutationAccepted(rows) || !stableKey) {
      return {
        ok: false,
        code: "blocked",
        message:
          "A matching active Organization Unit may already exist, or its selected parent changed. Review the current structure before creating another Unit.",
      };
    }
    return {
      ok: true,
      message:
        "Organization Unit added to the current structure with an append-only history event.",
      stableKey,
    };
  } catch (error) {
    return organizationUnitCreationFailure(error);
  }
}

export async function createPosition(
  input: CreatePositionMutation,
): Promise<StructureMutationResult> {
  const invalid = validateCreationMetadata(input);
  if (invalid) return invalid;
  const title = input.title.trim();
  if (!title || title.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Position title of 255 characters or fewer.",
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
    const unitStableKey = input.organizationUnitStableKey ?? null;
    const unitId = await unitIdForStableKey(
      sql,
      configuration,
      unitStableKey,
    );
    if (unitId === undefined) {
      return {
        ok: false,
        code: "invalid",
        message: "The selected Organization Unit is unavailable.",
      };
    }
    const afterState = {
      effectiveUntil: null,
      organizationUnitStableKey: unitStableKey,
      status: "active",
      statusReason: null,
      title,
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         insert into positions
           (organization_id, organization_unit_id, title, status, effective_from)
         select $1, $2, $3, 'active', $4::timestamptz
         where ($2::integer is null or exists (
           select 1 from organization_units unit
           where unit.id = $2 and unit.organization_id = $1
             and unit.status = 'active'
         ))
         and ($5::boolean or not exists (
           select 1 from positions duplicate
           where duplicate.organization_id = $1
             and duplicate.status = 'active'
             and lower(trim(duplicate.title)) = lower(trim($3))
             and duplicate.organization_unit_id is not distinct from $2
         ))
         returning id, stable_key
       ),
       ${creationAuditCte(targetDescriptor("position"), "position", 5)}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count,
         (select stable_key::text from changed limit 1) as stable_key`,
      [
        configuration.organizationId,
        unitId,
        title,
        input.effectiveAt.toISOString(),
        input.acknowledgePossibleDuplicate,
        configuration.organizationId,
        input.changeKind,
        JSON.stringify(afterState),
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const stableKey = createdStableKey(rows);
    if (!mutationAccepted(rows) || !stableKey) {
      return {
        ok: false,
        code: "blocked",
        message:
          "A matching active Position may already exist in that Unit, or the selected Unit changed. Review the current structure before creating another Position.",
      };
    }
    return {
      ok: true,
      message:
        "Position added to the current structure with an append-only history event.",
      stableKey,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Position could not be added. No partial change was accepted.",
    };
  }
}

export async function createPerson(
  input: CreatePersonMutation,
): Promise<StructureMutationResult> {
  const invalid = validateCreationMetadata(input);
  if (invalid) return invalid;
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Person display name of 255 characters or fewer.",
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
    const afterState = { displayName, status: "active" };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         insert into people (organization_id, display_name, status)
         select $1, $2, 'active'
         where $3::boolean or not exists (
           select 1 from people duplicate
           where duplicate.organization_id = $1
             and duplicate.status = 'active'
             and lower(trim(duplicate.display_name)) = lower(trim($2))
         )
         returning id, stable_key
       ),
       ${creationAuditCte(targetDescriptor("person"), "person", 3)}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count,
         (select stable_key::text from changed limit 1) as stable_key`,
      [
        configuration.organizationId,
        displayName,
        input.acknowledgePossibleDuplicate,
        configuration.organizationId,
        input.changeKind,
        JSON.stringify(afterState),
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const stableKey = createdStableKey(rows);
    if (!mutationAccepted(rows) || !stableKey) {
      return {
        ok: false,
        code: "blocked",
        message:
          "A matching active Person may already exist. Review the current structure before creating another Person record.",
      };
    }
    return {
      ok: true,
      message:
        "Person added to the current structure with an append-only history event. No Lotura User was created.",
      stableKey,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Person could not be added. No partial change was accepted.",
    };
  }
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
          updated_at = date_trunc('milliseconds', transaction_timestamp())
        where id = $3 and organization_id = $4
          and stable_key = $5::uuid
          and date_trunc('milliseconds', updated_at) = $6::timestamptz
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
          updated_at = date_trunc('milliseconds', transaction_timestamp())
        where id = $3 and organization_id = $4
          and stable_key = $5::uuid
          and date_trunc('milliseconds', updated_at) = $6::timestamptz
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
        set display_name = $1,
            updated_at = date_trunc('milliseconds', transaction_timestamp())
        where id = $2 and organization_id = $3
          and stable_key = $4::uuid
          and date_trunc('milliseconds', updated_at) = $5::timestamptz
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
           set status = 'inactive',
             updated_at = date_trunc('milliseconds', transaction_timestamp())
           where stable_key = $1::uuid and id = $2 and organization_id = $3
             and date_trunc('milliseconds', updated_at) = $4::timestamptz ${blockerClause}
           returning id`
        : `update ${descriptor.table}
           set status = 'retired', status_reason = $5,
             effective_until = $6::timestamptz,
             updated_at = date_trunc('milliseconds', transaction_timestamp())
           where stable_key = $1::uuid and id = $2 and organization_id = $3
             and date_trunc('milliseconds', updated_at) = $4::timestamptz ${blockerClause}
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

export async function establishPositionAssignment(
  input: EstablishAssignmentMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (
    !validUuid(input.positionStableKey) ||
    !validUuid(input.personStableKey)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "Select an available Position and Person.",
    };
  }
  if (
    !["incumbent", "job_share", "interim", "acting", "backup"].includes(
      input.assignmentType,
    )
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Position Assignment type.",
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
    const position = await positionForStableKey(
      sql,
      configuration,
      input.positionStableKey,
    );
    if (!position) {
      return {
        ok: false,
        code: "not_found",
        message: "The Position was not found in this organization.",
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
    if (input.effectiveAt < new Date(String(position.effective_from))) {
      return {
        ok: false,
        code: "invalid",
        message:
          "The Assignment cannot begin before the Position became effective.",
      };
    }
    const people = (await sql.query(
      `select id, stable_key, display_name from people
       where organization_id = $1 and stable_key = $2::uuid
         and status = 'active' limit 1`,
      [configuration.organizationId, input.personStableKey],
    )) as DatabaseRow[];
    const assignedPerson = people[0];
    if (!assignedPerson) {
      return {
        ok: false,
        code: "invalid",
        message: "The selected Person is unavailable in this organization.",
      };
    }

    const beforeState = { assignment: null };
    const afterState = {
      assignmentType: input.assignmentType,
      effectiveFrom: input.effectiveAt.toISOString(),
      effectiveUntil: null,
      personName: assignedPerson.display_name,
      personStableKey: input.personStableKey,
      reason: input.reason.trim(),
      status: "active",
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update positions
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $1 and organization_id = $2
           and stable_key = $3::uuid
           and date_trunc('milliseconds', updated_at) = $4::timestamptz
           and status = 'active'
           and exists (
             select 1 from people selected_person
             where selected_person.id = $5
               and selected_person.organization_id = $2
               and selected_person.status = 'active'
           )
           and not exists (
             select 1 from position_assignments duplicate
             where duplicate.organization_id = $2
               and duplicate.position_id = $1
               and duplicate.person_id = $5
               and duplicate.assignment_type = $6::position_assignment_type
               and duplicate.status in ('scheduled', 'active')
           )
           and ($6::position_assignment_type <> 'incumbent' or not exists (
             select 1 from position_assignments incumbent
             where incumbent.organization_id = $2
               and incumbent.position_id = $1
               and incumbent.assignment_type = 'incumbent'
               and incumbent.status = 'active'
           ))
         returning id, organization_id
       ),
       assignment as (
         insert into position_assignments
           (organization_id, position_id, person_id, assignment_type,
            status, effective_from, reason)
         select changed.organization_id, changed.id, $5,
           $6::position_assignment_type, 'active', $7::timestamptz, $8
         from changed
         returning id
       ),
       audit as (
         insert into organization_structure_changes
           (organization_id, entity_type, target_stable_key, position_id,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select $2, 'position', $3::uuid, changed.id,
           $9::organization_structure_change_kind, 'establish_assignment',
           $10::jsonb, $11::jsonb, $8, $7::timestamptz, $12
         from changed, assignment
         returning 1
       )
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from assignment) as assignment_count,
         (select count(*)::int from audit) as audit_count`,
      [
        position.id,
        configuration.organizationId,
        input.positionStableKey,
        input.expectedRevision,
        assignedPerson.id,
        input.assignmentType,
        input.effectiveAt.toISOString(),
        input.reason.trim(),
        input.changeKind,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        configuration.actorIdentifier,
      ],
    );
    if (
      !mutationAccepted(rows) ||
      Number(rows[0]?.assignment_count ?? 0) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message:
          "The Position or its current Assignments changed. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message:
        "Position Assignment established explicitly. Reporting and operational responsibility were not inferred.",
    };
  } catch {
    return {
      ok: false,
      code: "blocked",
      message:
        "The Position Assignment was rejected. Review current occupancy, dates, and Assignment type; no partial change was accepted.",
    };
  }
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
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $2 and organization_id = $3 and position_id = $4
           and date_trunc('milliseconds', updated_at) = $5::timestamptz
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
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $2 and organization_id = $3 and position_id = $4
           and date_trunc('milliseconds', updated_at) = $5::timestamptz
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
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $1 and organization_id = $2
           and stable_key = $3::uuid
           and date_trunc('milliseconds', updated_at) = $4::timestamptz
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
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $2 and organization_id = $3
           and subordinate_position_id = $4
           and relationship_type = 'primary'
           and date_trunc('milliseconds', updated_at) = $5::timestamptz
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
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $2 and organization_id = $3
           and subordinate_position_id = $4
           and date_trunc('milliseconds', updated_at) = $5::timestamptz
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
           reason = $3,
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $4 and organization_id = $5
           and subordinate_position_id = $6
           and date_trunc('milliseconds', updated_at) = $7::timestamptz
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

async function roleMandateContext(
  sql: MutationClient,
  configuration: EnabledOrganizationStructureAdministrationConfiguration,
  positionStableKey: string,
  mandateRecordKey: string,
) {
  const mandateId = recordId(mandateRecordKey, "role-mandate");
  if (!mandateId || !validUuid(positionStableKey)) return undefined;
  const rows = (await sql.query(
    `select mandate.*, role.name as role_name,
       position.stable_key as position_stable_key,
       exists (
         select 1 from role_coverages coverage
         where coverage.organization_id = mandate.organization_id
           and coverage.role_mandate_id = mandate.id
           and coverage.status in ('scheduled', 'active')
       ) as has_current_coverage
     from role_mandates mandate
     join positions position
       on position.id = mandate.position_id
       and position.organization_id = mandate.organization_id
     join roles role
       on role.id = mandate.role_id
       and role.organization_id = mandate.organization_id
     where mandate.organization_id = $1 and mandate.id = $2
       and position.stable_key = $3::uuid and position.status = 'active'
       and mandate.status in ('scheduled', 'active')
     limit 1`,
    [configuration.organizationId, mandateId, positionStableKey],
  )) as DatabaseRow[];
  return rows[0];
}

async function roleCoverageContext(
  sql: MutationClient,
  configuration: EnabledOrganizationStructureAdministrationConfiguration,
  positionStableKey: string,
  mandateRecordKey: string,
  coverageRecordKey: string,
) {
  const mandateId = recordId(mandateRecordKey, "role-mandate");
  const coverageId = recordId(coverageRecordKey, "role-coverage");
  if (!mandateId || !coverageId || !validUuid(positionStableKey)) {
    return undefined;
  }
  const rows = (await sql.query(
    `select coverage.*, mandate.position_id, mandate.role_id,
       position.stable_key as position_stable_key,
       role.name as role_name, person.stable_key as person_stable_key,
       person.display_name as person_name
     from role_coverages coverage
     join role_mandates mandate
       on mandate.id = coverage.role_mandate_id
       and mandate.organization_id = coverage.organization_id
     join positions position
       on position.id = mandate.position_id
       and position.organization_id = mandate.organization_id
     join roles role
       on role.id = mandate.role_id
       and role.organization_id = mandate.organization_id
     join people person
       on person.id = coverage.person_id
       and person.organization_id = coverage.organization_id
     where coverage.organization_id = $1 and coverage.id = $2
       and mandate.id = $3 and position.stable_key = $4::uuid
       and position.status = 'active'
       and coverage.status in ('scheduled', 'active')
     limit 1`,
    [configuration.organizationId, coverageId, mandateId, positionStableKey],
  )) as DatabaseRow[];
  return rows[0];
}

function validateRoleMandateChange(
  input: EstablishRoleMandateMutation,
): StructureMutationResult | null {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (input.changeKind !== "organizational_change") {
    return {
      ok: false,
      code: "invalid",
      message:
        "Establishing an Operational Role mandate must be classified as an organizational change.",
    };
  }
  if (!validUuid(input.positionStableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "The Position identifier is invalid.",
    };
  }
  if (!['primary', 'shared'].includes(input.mandateType)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid mandate type.",
    };
  }
  const scope = input.scope?.trim() ?? "";
  if (input.mandateType === "shared" && !scope) {
    return {
      ok: false,
      code: "invalid",
      message: "Shared responsibility requires an explicit scope.",
    };
  }
  if (scope.length > 2000) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a mandate scope of 2,000 characters or fewer.",
    };
  }
  if ((input.newRoleDescription?.trim().length ?? 0) > 2000) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Role description of 2,000 characters or fewer.",
    };
  }
  return null;
}

export async function updateOperationalRole(
  input: UpdateOperationalRoleMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (!validUuid(input.stableKey)) {
    return { ok: false, code: "invalid", message: "The Role identifier is invalid." };
  }
  const name = input.name.trim();
  const description = input.description?.trim() ?? "";
  if (!name || name.length > 255 || description.length > 2000) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Role name of 255 characters or fewer and a description of 2,000 characters or fewer.",
    };
  }

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return { ok: false, code: "unavailable", message: "Responsibility administration is unavailable." };
  }
  const sql = mutationClient(configuration.databaseUrl);
  try {
    const current = await currentTarget(sql, configuration, "operational_role", input.stableKey);
    if (!current) {
      return { ok: false, code: "not_found", message: "The active Operational Role was not found." };
    }
    if (!revisionsMatch(current, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message: "This Operational Role changed after the page loaded. Refresh before trying again.",
      };
    }
    const beforeState = stateFor("operational_role", current);
    const afterState = { description: description || null, name, status: "active" };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update roles
         set name = $1, description = nullif($2, ''),
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $3 and organization_id = $4 and stable_key = $5::uuid
           and status = 'active'
           and date_trunc('milliseconds', updated_at) = $6::timestamptz
           and not exists (
             select 1 from roles duplicate
             where duplicate.organization_id = $4 and duplicate.id <> $3
               and lower(trim(duplicate.name)) = lower(trim($1))
           )
         returning id
       ),
       ${auditCte(targetDescriptor("operational_role"), "operational_role", "update", 6)}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [
        name,
        description,
        current.id,
        configuration.organizationId,
        input.stableKey,
        input.expectedRevision,
        configuration.organizationId,
        input.stableKey,
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
        message: "This Role, its name, or its revision changed. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message: "Operational Role updated. Its immutable identity and prior state remain in history.",
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Operational Role could not be updated. No partial change was accepted.",
    };
  }
}

export async function inactivateOperationalRole(
  input: InactivateOperationalRoleMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (!validUuid(input.stableKey)) {
    return { ok: false, code: "invalid", message: "The Role identifier is invalid." };
  }

  let configuration: EnabledOrganizationStructureAdministrationConfiguration;
  try {
    configuration = await administrationAccess();
  } catch {
    return { ok: false, code: "unavailable", message: "Responsibility administration is unavailable." };
  }
  const sql = mutationClient(configuration.databaseUrl);
  try {
    const current = await currentTarget(sql, configuration, "operational_role", input.stableKey);
    if (!current) {
      return { ok: false, code: "not_found", message: "The active Operational Role was not found." };
    }
    if (!revisionsMatch(current, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message: "This Operational Role changed after the page loaded. Refresh before trying again.",
      };
    }
    const beforeState = stateFor("operational_role", current);
    const afterState = { ...beforeState, status: "inactive" };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update roles
         set status = 'inactive',
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $1 and organization_id = $2 and stable_key = $3::uuid
           and status = 'active'
           and date_trunc('milliseconds', updated_at) = $4::timestamptz
           and not exists (select 1 from processes x where x.organization_id = $2 and x.owner_role_id = $1)
           and not exists (select 1 from process_steps x where x.organization_id = $2 and x.responsible_role_id = $1)
           and not exists (select 1 from exceptions x where x.organization_id = $2 and x.owner_role_id = $1)
           and not exists (select 1 from systems x where x.organization_id = $2 and x.owner_role_id = $1)
           and not exists (
             select 1 from role_assignments x
             where x.organization_id = $2 and x.role_id = $1
               and x.status in ('scheduled', 'active')
           )
           and not exists (
             select 1 from role_mandates x
             where x.organization_id = $2 and x.role_id = $1
               and x.status in ('scheduled', 'active')
           )
         returning id
       ),
       ${auditCte(targetDescriptor("operational_role"), "operational_role", "remove_from_current_structure", 4)}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [
        current.id,
        configuration.organizationId,
        input.stableKey,
        input.expectedRevision,
        configuration.organizationId,
        input.stableKey,
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
        code: "blocked",
        message: "This Role is still referenced by current or scheduled operating-model responsibility. End or reassign those dependencies before removing it from the current responsibility model.",
      };
    }
    return {
      ok: true,
      message: "Operational Role removed from the current responsibility model. Its stable identity and history remain preserved.",
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Operational Role could not be inactivated. No partial change was accepted.",
    };
  }
}

export async function establishRoleMandate(
  input: EstablishRoleMandateMutation,
): Promise<StructureMutationResult> {
  const invalid = validateRoleMandateChange(input);
  if (invalid) return invalid;

  const creatingRole = input.roleKey === "create-new";
  const selectedRoleId = creatingRole
    ? null
    : recordId(input.roleKey ?? "", "role");
  const newRoleName = input.newRoleName?.trim() ?? "";
  if (
    (!creatingRole && !selectedRoleId) ||
    (creatingRole && (!newRoleName || newRoleName.length > 255))
  ) {
    return {
      ok: false,
      code: "invalid",
      message: creatingRole
        ? "Enter an Operational Role name of 255 characters or fewer."
        : "Select an active Operational Role or choose to create one.",
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
    const position = await positionForStableKey(
      sql,
      configuration,
      input.positionStableKey,
    );
    if (!position) {
      return {
        ok: false,
        code: "not_found",
        message: "The Position was not found in this organization.",
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
    if (input.effectiveAt < new Date(String(position.effective_from))) {
      return {
        ok: false,
        code: "invalid",
        message: "The mandate cannot begin before the Position became effective.",
      };
    }

    let roleName = newRoleName;
    if (selectedRoleId) {
      const roles = (await sql.query(
        `select id, name from roles
         where organization_id = $1 and id = $2 and status = 'active'
         limit 1`,
        [configuration.organizationId, selectedRoleId],
      )) as DatabaseRow[];
      if (!roles[0]) {
        return {
          ok: false,
          code: "invalid",
          message: "The selected Operational Role is unavailable in this organization.",
        };
      }
      roleName = String(roles[0].name);
    }

    const beforeState = {
      mandateType: null,
      operationalRoleCreated: null,
      operationalRoleId: null,
      operationalRoleName: null,
      scope: null,
      status: null,
    };
    const baseAfterState = {
      effectiveFrom: input.effectiveAt.toISOString(),
      effectiveUntil: null,
      mandateType: input.mandateType,
      operationalRoleCreated: creatingRole,
      operationalRoleId: selectedRoleId ? `role:${selectedRoleId}` : null,
      operationalRoleName: roleName,
      reason: input.reason.trim(),
      scope: input.scope?.trim() || null,
      status: "active",
    };

    let rows: DatabaseRow[];
    if (creatingRole) {
      rows = await atomicQuery(
        sql,
        `with changed as (
           update positions
           set updated_at = date_trunc('milliseconds', transaction_timestamp())
           where id = $1 and organization_id = $2
             and stable_key = $3::uuid
             and date_trunc('milliseconds', updated_at) = $4::timestamptz
             and status = 'active'
           returning id, organization_id
         ),
         created_role as (
           insert into roles
             (organization_id, name, description, status)
           select changed.organization_id, $5::text,
             nullif($6::text, ''), 'active'
           from changed
           where not exists (
             select 1 from roles existing_role
             where existing_role.organization_id = changed.organization_id
               and lower(trim(existing_role.name)) = lower(trim($5::text))
           )
           returning id, stable_key, name, description, status, updated_at
         ),
         mandate as (
           insert into role_mandates
             (organization_id, position_id, role_id, mandate_type, scope,
              status, effective_from, reason)
           select changed.organization_id, changed.id, created_role.id,
             $7::role_mandate_type, nullif($8, ''), 'active',
             $9::timestamptz, $10
           from changed, created_role
           returning id
         ),
         role_audit as (
           insert into organization_structure_changes
             (organization_id, entity_type, target_stable_key, role_id,
              change_kind, change_action, before_state, after_state, reason,
              effective_at, actor_identifier)
           select $2, 'operational_role', created_role.stable_key,
             created_role.id, 'organizational_change', 'create', '{}'::jsonb,
             jsonb_build_object(
               'name', created_role.name,
               'description', created_role.description,
               'status', created_role.status
             ), $10, $9::timestamptz, $13
           from created_role, mandate
           returning 1
         ),
         position_audit as (
           insert into organization_structure_changes
             (organization_id, entity_type, target_stable_key, position_id,
              change_kind, change_action, before_state, after_state, reason,
              effective_at, actor_identifier)
           select $2, 'position', $3::uuid, changed.id,
             'organizational_change', 'establish_role_mandate', $11::jsonb,
             jsonb_set($12::jsonb, '{operationalRoleId}',
               to_jsonb('role:' || created_role.id::text)),
             $10, $9::timestamptz, $13
           from changed, created_role, mandate, role_audit
           returning 1
         )
         select
           (select count(*)::int from changed) as changed_count,
           (select count(*)::int from created_role) as role_count,
           (select count(*)::int from mandate) as mandate_count,
           (select count(*)::int from role_audit) as role_audit_count,
           (select count(*)::int from position_audit) as audit_count,
           (select stable_key::text from created_role limit 1) as stable_key`,
        [
          position.id,
          configuration.organizationId,
          input.positionStableKey,
          input.expectedRevision,
          newRoleName,
          input.newRoleDescription?.trim() ?? "",
          input.mandateType,
          input.scope?.trim() ?? "",
          input.effectiveAt.toISOString(),
          input.reason.trim(),
          JSON.stringify(beforeState),
          JSON.stringify(baseAfterState),
          configuration.actorIdentifier,
        ],
      );
      if (
        !mutationAccepted(rows) ||
        Number(rows[0]?.role_count ?? 0) !== 1 ||
        Number(rows[0]?.mandate_count ?? 0) !== 1 ||
        Number(rows[0]?.role_audit_count ?? 0) !== 1
      ) {
        return {
          ok: false,
          code: "conflict",
          message:
            "The Role name or Position responsibility changed. Refresh and select an existing Role if it is now available.",
        };
      }
    } else {
      rows = await atomicQuery(
        sql,
        `with changed as (
           update positions
           set updated_at = date_trunc('milliseconds', transaction_timestamp())
           where id = $1 and organization_id = $2
             and stable_key = $3::uuid
             and date_trunc('milliseconds', updated_at) = $4::timestamptz
             and status = 'active'
             and exists (
               select 1 from roles selected_role
               where selected_role.id = $5
                 and selected_role.organization_id = $2
                 and selected_role.status = 'active'
             )
             and not exists (
               select 1 from role_mandates existing_mandate
               where existing_mandate.organization_id = $2
                 and existing_mandate.position_id = $1
                 and existing_mandate.role_id = $5
                 and existing_mandate.status in ('scheduled', 'active')
             )
           returning id, organization_id
         ),
         mandate as (
           insert into role_mandates
             (organization_id, position_id, role_id, mandate_type, scope,
              status, effective_from, reason)
           select changed.organization_id, changed.id, $5,
             $6::role_mandate_type, nullif($7, ''), 'active',
             $8::timestamptz, $9
           from changed
           returning id
         ),
         audit as (
           insert into organization_structure_changes
             (organization_id, entity_type, target_stable_key, position_id,
              change_kind, change_action, before_state, after_state, reason,
              effective_at, actor_identifier)
           select $2, 'position', $3::uuid, changed.id,
             'organizational_change', 'establish_role_mandate', $10::jsonb,
             $11::jsonb, $9, $8::timestamptz, $12
           from changed, mandate
           returning 1
         )
         select
           (select count(*)::int from changed) as changed_count,
           (select count(*)::int from mandate) as mandate_count,
           (select count(*)::int from audit) as audit_count`,
        [
          position.id,
          configuration.organizationId,
          input.positionStableKey,
          input.expectedRevision,
          selectedRoleId,
          input.mandateType,
          input.scope?.trim() ?? "",
          input.effectiveAt.toISOString(),
          input.reason.trim(),
          JSON.stringify(beforeState),
          JSON.stringify(baseAfterState),
          configuration.actorIdentifier,
        ],
      );
      if (
        !mutationAccepted(rows) ||
        Number(rows[0]?.mandate_count ?? 0) !== 1
      ) {
        return {
          ok: false,
          code: "conflict",
          message:
            "This Position or Operational Role mandate changed. Refresh before trying again.",
        };
      }
    }

    return {
      ok: true,
      message: creatingRole
        ? "Operational Role created and explicitly mandated to this Position. No responsibility was inferred from its title or reporting line."
        : "Operational Role mandate established. No responsibility was inferred from the Position title or reporting line.",
      stableKey: creatingRole ? createdStableKey(rows) ?? undefined : undefined,
    };
  } catch (error) {
    const sqlState =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      /^[0-9A-Z]{5}$/.test(error.code)
        ? error.code
        : "unknown";
    console.error("organization_structure_role_mandate_failed", { sqlState });
    return {
      ok: false,
      code: "blocked",
      message:
        "The Role mandate was rejected. Review existing primary or shared mandates and the required scope; no partial change was accepted.",
    };
  }
}

export async function endRoleMandate(
  input: RoleMandateMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (input.changeKind !== "organizational_change") {
    return {
      ok: false,
      code: "invalid",
      message: "Ending a Role mandate must be an organizational change.",
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
    const mandate = await roleMandateContext(
      sql,
      configuration,
      input.positionStableKey,
      input.mandateRecordKey,
    );
    if (!mandate) {
      return {
        ok: false,
        code: "not_found",
        message: "The current Role mandate was not found.",
      };
    }
    if (!revisionsMatch(mandate, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Role mandate changed after the page loaded. Refresh before trying again.",
      };
    }
    if (mandate.has_current_coverage) {
      return {
        ok: false,
        code: "blocked",
        message:
          "End current Role Coverage before ending this mandate. Coverage history will not be erased automatically.",
      };
    }
    if (input.effectiveAt <= new Date(String(mandate.effective_from))) {
      return {
        ok: false,
        code: "invalid",
        message: "The end date must be after the Role mandate began.",
      };
    }
    const beforeState = mandateState(mandate);
    const afterState = {
      ...beforeState,
      effectiveUntil: input.effectiveAt.toISOString(),
      status: "ended",
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update role_mandates
         set status = 'ended', effective_until = $1::timestamptz,
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $2 and organization_id = $3 and position_id = $4
           and date_trunc('milliseconds', updated_at) = $5::timestamptz
           and status in ('scheduled', 'active')
           and not exists (
             select 1 from role_coverages current_coverage
             where current_coverage.organization_id = $3
               and current_coverage.role_mandate_id = $2
               and current_coverage.status in ('scheduled', 'active')
           )
         returning position_id as id
       ),
       ${auditCte(
         targetDescriptor("position"),
         "position",
         "end_role_mandate",
         5,
       )}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [
        input.effectiveAt.toISOString(),
        mandate.id,
        configuration.organizationId,
        mandate.position_id,
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
          "This mandate or its coverage changed. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message: "Role mandate ended. Its prior allocation remains in history.",
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Role mandate could not be ended. No partial change was accepted.",
    };
  }
}

export async function establishRoleCoverage(
  input: EstablishRoleCoverageMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (input.changeKind !== "organizational_change") {
    return {
      ok: false,
      code: "invalid",
      message: "Establishing Role Coverage must be an organizational change.",
    };
  }
  if (
    !["permanent", "interim", "acting", "delegated", "backup"].includes(
      input.coverageType,
    ) ||
    !validUuid(input.personStableKey)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a Person and valid coverage type.",
    };
  }
  const coverageReason = input.coverageReason?.trim() ?? "";
  if (input.coverageType !== "permanent" && !coverageReason) {
    return {
      ok: false,
      code: "invalid",
      message: "Temporary or delegated coverage requires a specific reason.",
    };
  }
  if (coverageReason.length > 2000) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter coverage context of 2,000 characters or fewer.",
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
    const mandate = await roleMandateContext(
      sql,
      configuration,
      input.positionStableKey,
      input.mandateRecordKey,
    );
    if (!mandate) {
      return {
        ok: false,
        code: "not_found",
        message: "The current Role mandate was not found.",
      };
    }
    if (!revisionsMatch(mandate, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Role mandate changed after the page loaded. Refresh before trying again.",
      };
    }
    if (input.effectiveAt < new Date(String(mandate.effective_from))) {
      return {
        ok: false,
        code: "invalid",
        message: "Coverage cannot begin before the Role mandate.",
      };
    }
    const people = (await sql.query(
      `select id, stable_key, display_name from people
       where organization_id = $1 and stable_key = $2::uuid
         and status = 'active' limit 1`,
      [configuration.organizationId, input.personStableKey],
    )) as DatabaseRow[];
    const coveringPerson = people[0];
    if (!coveringPerson) {
      return {
        ok: false,
        code: "invalid",
        message: "The selected Person is unavailable in this organization.",
      };
    }
    const beforeState = {
      coverageType: null,
      operationalRoleId: `role:${mandate.role_id}`,
      operationalRoleName: mandate.role_name,
      personStableKey: null,
      personName: null,
      status: null,
    };
    const afterState = {
      coverageType: input.coverageType,
      effectiveFrom: input.effectiveAt.toISOString(),
      effectiveUntil: null,
      operationalRoleId: `role:${mandate.role_id}`,
      operationalRoleName: mandate.role_name,
      personStableKey: input.personStableKey,
      personName: coveringPerson.display_name,
      reason: coverageReason || null,
      roleMandateRecordId: mandate.id,
      status: "active",
    };
    const rows = await atomicQuery(
      sql,
      `with changed as (
         update role_mandates
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $1 and organization_id = $2 and position_id = $3
           and date_trunc('milliseconds', updated_at) = $4::timestamptz
           and status in ('scheduled', 'active')
           and not exists (
             select 1 from role_coverages existing_coverage
             where existing_coverage.organization_id = $2
               and existing_coverage.role_mandate_id = $1
               and existing_coverage.person_id = $5
               and existing_coverage.coverage_type = $6::role_coverage_type
               and existing_coverage.status in ('scheduled', 'active')
           )
         returning position_id as id
       ),
       coverage as (
         insert into role_coverages
           (organization_id, role_mandate_id, person_id, coverage_type,
            status, effective_from, reason)
         select $2, $1, $5, $6::role_coverage_type, 'active',
           $7::timestamptz, nullif($8, '')
         from changed
         returning id
       ),
       audit as (
         insert into organization_structure_changes
           (organization_id, entity_type, target_stable_key, position_id,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select $2, 'position', $9::uuid, changed.id,
           'organizational_change', 'establish_role_coverage', $10::jsonb,
           $11::jsonb, $12, $7::timestamptz, $13
         from changed, coverage
         returning 1
       )
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from coverage) as coverage_count,
         (select count(*)::int from audit) as audit_count`,
      [
        mandate.id,
        configuration.organizationId,
        mandate.position_id,
        input.expectedRevision,
        coveringPerson.id,
        input.coverageType,
        input.effectiveAt.toISOString(),
        coverageReason,
        input.positionStableKey,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        input.reason.trim(),
        configuration.actorIdentifier,
      ],
    );
    if (
      !mutationAccepted(rows) ||
      Number(rows[0]?.coverage_count ?? 0) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This mandate or matching coverage changed. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message:
        "Role Coverage established explicitly. Position occupancy and reporting hierarchy were not changed.",
    };
  } catch {
    return {
      ok: false,
      code: "blocked",
      message:
        "Role Coverage was rejected. Review the mandate, Person, dates, and coverage context; no partial change was accepted.",
    };
  }
}

export async function endRoleCoverage(
  input: EndRoleCoverageMutation,
): Promise<StructureMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (input.changeKind !== "organizational_change") {
    return {
      ok: false,
      code: "invalid",
      message: "Ending Role Coverage must be an organizational change.",
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
    const coverage = await roleCoverageContext(
      sql,
      configuration,
      input.positionStableKey,
      input.mandateRecordKey,
      input.coverageRecordKey,
    );
    if (!coverage) {
      return {
        ok: false,
        code: "not_found",
        message: "The current Role Coverage was not found.",
      };
    }
    if (!revisionsMatch(coverage, input.expectedRevision)) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This Role Coverage changed after the page loaded. Refresh before trying again.",
      };
    }
    if (input.effectiveAt <= new Date(String(coverage.effective_from))) {
      return {
        ok: false,
        code: "invalid",
        message: "The end date must be after Role Coverage began.",
      };
    }
    const beforeState = coverageState(coverage);
    const afterState = {
      ...beforeState,
      effectiveUntil: input.effectiveAt.toISOString(),
      status: "ended",
    };
    const rows = await atomicQuery(
      sql,
      `with ended as (
         update role_coverages
         set status = 'ended', effective_until = $1::timestamptz,
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where id = $2 and organization_id = $3
           and role_mandate_id = $4
           and date_trunc('milliseconds', updated_at) = $5::timestamptz
           and status in ('scheduled', 'active')
         returning role_mandate_id
       ),
       changed as (
         select mandate.position_id as id
         from ended
         join role_mandates mandate
           on mandate.id = ended.role_mandate_id
           and mandate.organization_id = $3
       ),
       ${auditCte(
         targetDescriptor("position"),
         "position",
         "end_role_coverage",
         5,
       )}
       select
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from audit) as audit_count`,
      [
        input.effectiveAt.toISOString(),
        coverage.id,
        configuration.organizationId,
        coverage.role_mandate_id,
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
          "This Role Coverage changed after the page loaded. Refresh before trying again.",
      };
    }
    return {
      ok: true,
      message: "Role Coverage ended. Its prior state remains in history.",
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Role Coverage could not be ended. No partial change was accepted.",
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
