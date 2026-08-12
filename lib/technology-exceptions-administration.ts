import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  resolveOperatingModelAuthoringConfiguration,
  type EnabledOperatingModelAuthoringConfiguration,
} from "./operating-model-authoring-policy.mjs";
import type {
  OperatingModelChangeKind,
  OperatingModelMutationResult,
} from "./operating-model-administration";

type ChangeMetadata = {
  changeKind: OperatingModelChangeKind;
  effectiveAt: Date;
  reason: string;
};

type ProcessChangeMetadata = ChangeMetadata & {
  expectedRevision: string;
  processKey: string;
  processStableKey: string;
};

export type SystemType =
  | "software"
  | "external_service"
  | "manual_record"
  | "other";

type SystemDefinition = {
  description?: string | null;
  name: string;
  ownerRoleKey?: string | null;
  systemType: SystemType;
  url?: string | null;
};

type CreateSystemInput = ChangeMetadata & SystemDefinition;

type UpdateSystemInput = ChangeMetadata &
  SystemDefinition & {
    expectedSystemRevision: string;
    systemStableKey: string;
  };

type DeactivateSystemInput = ChangeMetadata & {
  expectedSystemRevision: string;
  systemStableKey: string;
};

type ProcessSystemInput = ProcessChangeMetadata & {
  systemStableKey: string;
  usage: string;
};

type UnlinkProcessSystemInput = ProcessChangeMetadata & {
  systemStableKey: string;
};

type ExceptionDefinition = {
  condition: string;
  name: string;
  ownerRoleKey?: string | null;
  response: string;
  stepStableKey?: string | null;
};

type CreateExceptionInput = ProcessChangeMetadata & ExceptionDefinition;

type UpdateExceptionInput = ProcessChangeMetadata &
  ExceptionDefinition & {
    exceptionStableKey: string;
    expectedExceptionRevision: string;
  };

type DeactivateExceptionInput = ProcessChangeMetadata & {
  exceptionStableKey: string;
  expectedExceptionRevision: string;
};

type DatabaseRow = Record<string, unknown>;

type OperatingModelMutationFailure = Extract<
  OperatingModelMutationResult,
  { ok: false }
>;

export type SystemMutationResult =
  | { ok: true; message: string; revision: string; stableKey: string }
  | OperatingModelMutationFailure;

function processIdFromKey(value: string) {
  const match = /^process:([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

function roleIdFromKey(value: string | null | undefined) {
  if (!value) return null;
  const match = /^role:([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function validRevision(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

function validateChangeMetadata(
  input: ChangeMetadata,
): OperatingModelMutationFailure | null {
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

function validateProcessMetadata(
  input: ProcessChangeMetadata,
): OperatingModelMutationFailure | null {
  const invalid = validateChangeMetadata(input);
  if (invalid) return invalid;
  if (
    !processIdFromKey(input.processKey) ||
    !validUuid(input.processStableKey) ||
    !validRevision(input.expectedRevision)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "The Process revision is invalid.",
    };
  }
  return null;
}

function validateSystemDefinition(
  input: SystemDefinition,
): OperatingModelMutationFailure | null {
  const name = input.name.trim();
  const description = input.description?.trim() || null;
  const url = input.url?.trim() || null;
  if (!name || name.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a System name of 255 characters or fewer.",
    };
  }
  if (description && description.length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Keep the System description to 5,000 characters or fewer.",
    };
  }
  if (!(["software", "external_service", "manual_record", "other"] as string[]).includes(input.systemType)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid System type.",
    };
  }
  if (url) {
    try {
      const parsed = new URL(url);
      if (!(["https:", "http:"] as string[]).includes(parsed.protocol)) {
        throw new Error("unsupported protocol");
      }
    } catch {
      return {
        ok: false,
        code: "invalid",
        message: "Enter a valid HTTP or HTTPS System URL.",
      };
    }
  }
  if (input.ownerRoleKey && !roleIdFromKey(input.ownerRoleKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Owner Operational Role or leave it unassigned.",
    };
  }
  return null;
}

function validateExceptionDefinition(
  input: ExceptionDefinition,
): OperatingModelMutationFailure | null {
  if (!input.name.trim() || input.name.trim().length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter an Exception name of 255 characters or fewer.",
    };
  }
  if (!input.condition.trim() || input.condition.trim().length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Describe the Exception condition in 5,000 characters or fewer.",
    };
  }
  if (!input.response.trim() || input.response.trim().length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Describe the alternate response in 5,000 characters or fewer.",
    };
  }
  if (input.ownerRoleKey && !roleIdFromKey(input.ownerRoleKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Exception Owner Role or leave it unassigned.",
    };
  }
  if (input.stepStableKey && !validUuid(input.stepStableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Process Step or leave the Exception Process-wide.",
    };
  }
  return null;
}

async function authoringAccess() {
  const runtimeAccess = await requireWorkspaceAccess();
  const configuration = resolveOperatingModelAuthoringConfiguration(
    process.env,
    runtimeAccess,
  );
  if (!configuration.enabled) {
    throw new Error("Operating Model Authoring is not enabled.");
  }
  return configuration;
}

function mutationClient(databaseUrl: string) {
  return neon(databaseUrl, {
    isolationLevel: "Serializable",
    readOnly: false,
  });
}

async function atomicQuery(
  configuration: EnabledOperatingModelAuthoringConfiguration,
  statement: string,
  values: unknown[],
) {
  const sql = mutationClient(configuration.databaseUrl);
  const [rows] = await sql.transaction(
    (transaction) => [transaction.query(statement, values)],
    { isolationLevel: "Serializable", readOnly: false },
  );
  return rows as DatabaseRow[];
}

function revisionFrom(row: DatabaseRow) {
  const value = row.revision;
  const revision = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(revision.getTime()) ? revision.toISOString() : null;
}

function systemFailure(row: DatabaseRow): OperatingModelMutationFailure {
  if (Number(row.current_count ?? 0) !== 1) {
    return {
      ok: false,
      code: "not_found",
      message: "The System was not found in this Organization.",
    };
  }
  return {
    ok: false,
    code: "conflict",
    message: "This System changed after the page loaded. Refresh before trying again.",
  };
}

function processFailure(row: DatabaseRow): OperatingModelMutationFailure {
  if (Number(row.current_count ?? 0) !== 1) {
    return {
      ok: false,
      code: "not_found",
      message: "The Process was not found in this Organization.",
    };
  }
  return {
    ok: false,
    code: "conflict",
    message: "This Process changed after the page loaded. Refresh before trying again.",
  };
}

export async function createSystem(
  input: CreateSystemInput,
): Promise<SystemMutationResult> {
  const invalid =
    validateChangeMetadata(input) ?? validateSystemDefinition(input);
  if (invalid) return invalid;

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Technology authoring is unavailable.",
    };
  }

  const ownerRoleId = roleIdFromKey(input.ownerRoleKey);
  try {
    const rows = await atomicQuery(
      configuration,
      `with selected_role as (
         select id
         from roles
         where organization_id = $1
           and id = $6::integer
           and status = 'active'
       ), duplicate_system as (
         select id
         from systems
         where organization_id = $1
           and lower(btrim(name)) = lower(btrim($2))
         limit 1
       ), created as (
         insert into systems
           (organization_id, name, description, system_type, url,
            owner_role_id, status)
         select $1, $2, $3, $4::system_type, $5, $6::integer, 'active'
         where ($6::integer is null or exists (select 1 from selected_role))
           and not exists (select 1 from duplicate_system)
         returning id, organization_id, stable_key, name, description,
           system_type, url, owner_role_id, status, updated_at
       ), history as (
         insert into operating_model_changes
           (organization_id, system_id, system_stable_key, entity_type,
            target_reference, change_kind, change_action, before_state,
            after_state, reason, effective_at, actor_identifier)
         select created.organization_id, created.id, created.stable_key,
           'system', 'system:' || created.stable_key::text,
           $7::operating_model_change_kind, 'create_system', '{}'::jsonb,
           jsonb_build_object(
             'name', created.name,
             'description', created.description,
             'systemType', created.system_type,
             'url', created.url,
             'ownerRoleId', case when created.owner_role_id is null then null
               else 'role:' || created.owner_role_id::text end,
             'status', created.status
           ),
           $8, $9::timestamptz, $10
         from created
         returning 1
       )
       select
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from duplicate_system) as duplicate_count,
         (select count(*)::int from created) as changed_count,
         (select count(*)::int from history) as history_count,
         (select stable_key from created) as stable_key,
         (select updated_at from created) as revision`,
      [
        configuration.organizationId,
        input.name.trim(),
        input.description?.trim() || null,
        input.systemType,
        input.url?.trim() || null,
        ownerRoleId,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (ownerRoleId && Number(row.role_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Operational Role was not found in this Organization.",
      };
    }
    if (Number(row.duplicate_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "A System with this name already exists in the Organization.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1 ||
      !validUuid(String(row.stable_key ?? ""))
    ) {
      throw new Error("Incomplete System creation");
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "System added and its creation recorded.",
      revision,
      stableKey: String(row.stable_key),
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The System could not be added. No partial change was accepted.",
    };
  }
}

export async function updateSystem(
  input: UpdateSystemInput,
): Promise<OperatingModelMutationResult> {
  const invalid =
    validateChangeMetadata(input) ?? validateSystemDefinition(input);
  if (invalid) return invalid;
  if (!validUuid(input.systemStableKey) || !validRevision(input.expectedSystemRevision)) {
    return {
      ok: false,
      code: "invalid",
      message: "The System revision is invalid.",
    };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Technology authoring is unavailable.",
    };
  }

  const ownerRoleId = roleIdFromKey(input.ownerRoleKey);
  try {
    const rows = await atomicQuery(
      configuration,
      `with current_system as (
         select id, organization_id, stable_key, name, description,
           system_type, url, owner_role_id, status, updated_at
         from systems
         where organization_id = $1
           and stable_key = $2::uuid
       ), selected_role as (
         select id
         from roles
         where organization_id = $1
           and id = $7::integer
           and status = 'active'
       ), duplicate_system as (
         select id
         from systems
         where organization_id = $1
           and stable_key <> $2::uuid
           and lower(btrim(name)) = lower(btrim($3))
         limit 1
       ), changed as (
         update systems target
         set name = $3,
             description = $4,
             system_type = $5::system_type,
             url = $6,
             owner_role_id = $7::integer,
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_system current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and date_trunc('milliseconds', target.updated_at) = $8::timestamptz
           and ($7::integer is null or exists (select 1 from selected_role))
           and not exists (select 1 from duplicate_system)
           and (
             target.name is distinct from $3 or
             target.description is distinct from $4 or
             target.system_type is distinct from $5::system_type or
             target.url is distinct from $6 or
             target.owner_role_id is distinct from $7::integer
           )
         returning target.id, target.organization_id, target.stable_key,
           target.name, target.description, target.system_type, target.url,
           target.owner_role_id, target.status, target.updated_at,
           current.name as previous_name,
           current.description as previous_description,
           current.system_type as previous_system_type,
           current.url as previous_url,
           current.owner_role_id as previous_owner_role_id
       ), history as (
         insert into operating_model_changes
           (organization_id, system_id, system_stable_key, entity_type,
            target_reference, change_kind, change_action, before_state,
            after_state, reason, effective_at, actor_identifier)
         select changed.organization_id, changed.id, changed.stable_key,
           'system', 'system:' || changed.stable_key::text,
           $9::operating_model_change_kind, 'update_system',
           jsonb_build_object(
             'name', changed.previous_name,
             'description', changed.previous_description,
             'systemType', changed.previous_system_type,
             'url', changed.previous_url,
             'ownerRoleId', case when changed.previous_owner_role_id is null
               then null else 'role:' || changed.previous_owner_role_id::text end
           ),
           jsonb_build_object(
             'name', changed.name,
             'description', changed.description,
             'systemType', changed.system_type,
             'url', changed.url,
             'ownerRoleId', case when changed.owner_role_id is null then null
               else 'role:' || changed.owner_role_id::text end
           ),
           $10, $11::timestamptz, $12
         from changed
         returning 1
       )
       select
         (select count(*)::int from current_system) as current_count,
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from duplicate_system) as duplicate_count,
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed) as revision`,
      [
        configuration.organizationId,
        input.systemStableKey,
        input.name.trim(),
        input.description?.trim() || null,
        input.systemType,
        input.url?.trim() || null,
        ownerRoleId,
        input.expectedSystemRevision,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (ownerRoleId && Number(row.role_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Operational Role was not found in this Organization.",
      };
    }
    if (Number(row.duplicate_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "A System with this name already exists in the Organization.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return systemFailure(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "System updated and its prior state preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The System could not be updated. No partial change was accepted.",
    };
  }
}

export async function deactivateSystem(
  input: DeactivateSystemInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateChangeMetadata(input);
  if (invalid) return invalid;
  if (!validUuid(input.systemStableKey) || !validRevision(input.expectedSystemRevision)) {
    return {
      ok: false,
      code: "invalid",
      message: "The System revision is invalid.",
    };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Technology authoring is unavailable.",
    };
  }

  try {
    const rows = await atomicQuery(
      configuration,
      `with current_system as (
         select id, organization_id, stable_key, name, status, updated_at
         from systems
         where organization_id = $1
           and stable_key = $2::uuid
       ), dependencies as (
         select count(*)::int as count
         from process_systems relationship
         join current_system current
           on current.id = relationship.system_id
          and current.organization_id = relationship.organization_id
       ), changed as (
         update systems target
         set status = 'inactive',
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_system current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and date_trunc('milliseconds', target.updated_at) = $3::timestamptz
           and current.status = 'active'
           and (select count from dependencies) = 0
         returning target.id, target.organization_id, target.stable_key,
           target.name, target.status, target.updated_at,
           current.status as previous_status
       ), history as (
         insert into operating_model_changes
           (organization_id, system_id, system_stable_key, entity_type,
            target_reference, change_kind, change_action, before_state,
            after_state, reason, effective_at, actor_identifier)
         select changed.organization_id, changed.id, changed.stable_key,
           'system', 'system:' || changed.stable_key::text,
           $4::operating_model_change_kind, 'deactivate_system',
           jsonb_build_object('name', changed.name, 'status', changed.previous_status),
           jsonb_build_object('name', changed.name, 'status', changed.status),
           $5, $6::timestamptz, $7
         from changed
         returning 1
       )
       select
         (select count(*)::int from current_system) as current_count,
         (select status from current_system) as current_status,
         (select count from dependencies) as dependency_count,
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed) as revision`,
      [
        configuration.organizationId,
        input.systemStableKey,
        input.expectedSystemRevision,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.dependency_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "Unlink this System from every current Process before deactivating it.",
      };
    }
    if (row.current_status === "inactive") {
      return {
        ok: false,
        code: "invalid",
        message: "This System is already inactive.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return systemFailure(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "System removed from the current Technology catalog and its history preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The System could not be deactivated. No partial change was accepted.",
    };
  }
}

export async function linkSystemToProcess(
  input: ProcessSystemInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateProcessMetadata(input);
  if (invalid) return invalid;
  if (!validUuid(input.systemStableKey)) {
    return { ok: false, code: "invalid", message: "Select a valid System." };
  }
  const usage = input.usage.trim();
  if (!usage || usage.length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Describe how the Process uses this System in 5,000 characters or fewer.",
    };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Operating Model Authoring is unavailable.",
    };
  }

  const processId = processIdFromKey(input.processKey)!;
  try {
    const rows = await atomicQuery(
      configuration,
      `with current_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1
           and id = $2
           and stable_key = $3::uuid
       ), selected_system as (
         select id, organization_id, stable_key, name
         from systems
         where organization_id = $1
           and stable_key = $5::uuid
           and status = 'active'
       ), current_link as (
         select relationship.process_id, relationship.system_id
         from process_systems relationship
         join current_process current
           on current.id = relationship.process_id
          and current.organization_id = relationship.organization_id
         join selected_system selected
           on selected.id = relationship.system_id
          and selected.organization_id = relationship.organization_id
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and date_trunc('milliseconds', target.updated_at) = $4::timestamptz
           and exists (select 1 from selected_system)
           and not exists (select 1 from current_link)
         returning target.id, target.organization_id, target.stable_key,
           target.updated_at
       ), linked as (
         insert into process_systems
           (organization_id, process_id, system_id, usage)
         select changed_process.organization_id, changed_process.id,
           selected_system.id, $6
         from changed_process cross join selected_system
         returning organization_id, process_id, system_id, usage
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, system_id,
            system_stable_key, entity_type, target_reference, change_kind,
            change_action, before_state, after_state, reason, effective_at,
            actor_identifier)
         select linked.organization_id, linked.process_id,
           changed_process.stable_key, linked.system_id,
           selected_system.stable_key, 'process_system',
           'process:' || changed_process.stable_key::text ||
             ':system:' || selected_system.stable_key::text,
           $7::operating_model_change_kind, 'link_system', '{}'::jsonb,
           jsonb_build_object(
             'systemName', selected_system.name,
             'systemStableKey', selected_system.stable_key,
             'usage', linked.usage
           ),
           $8, $9::timestamptz, $10
         from linked
         join changed_process on changed_process.id = linked.process_id
         join selected_system on selected_system.id = linked.system_id
         returning 1
       )
       select
         (select count(*)::int from current_process) as current_count,
         (select count(*)::int from selected_system) as system_count,
         (select count(*)::int from current_link) as link_count,
         (select count(*)::int from linked) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.systemStableKey,
        usage,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.system_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active System was not found in this Organization.",
      };
    }
    if (Number(row.link_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "This System is already linked to the Process.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return processFailure(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "System linked to the Process and the relationship recorded.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The System could not be linked. No partial change was accepted.",
    };
  }
}

export async function updateProcessSystemUsage(
  input: ProcessSystemInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateProcessMetadata(input);
  if (invalid) return invalid;
  if (!validUuid(input.systemStableKey)) {
    return { ok: false, code: "invalid", message: "Select a valid System." };
  }
  const usage = input.usage.trim();
  if (!usage || usage.length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Describe how the Process uses this System in 5,000 characters or fewer.",
    };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Operating Model Authoring is unavailable.",
    };
  }

  const processId = processIdFromKey(input.processKey)!;
  try {
    const rows = await atomicQuery(
      configuration,
      `with current_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1 and id = $2 and stable_key = $3::uuid
       ), selected_system as (
         select id, organization_id, stable_key, name
         from systems
         where organization_id = $1 and stable_key = $5::uuid
       ), current_link as (
         select relationship.organization_id, relationship.process_id,
           relationship.system_id, relationship.usage
         from process_systems relationship
         join current_process current
           on current.id = relationship.process_id
          and current.organization_id = relationship.organization_id
         join selected_system selected
           on selected.id = relationship.system_id
          and selected.organization_id = relationship.organization_id
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and date_trunc('milliseconds', target.updated_at) = $4::timestamptz
           and exists (
             select 1 from current_link where usage is distinct from $6
           )
         returning target.id, target.organization_id, target.stable_key,
           target.updated_at
       ), changed_link as (
         update process_systems target
         set usage = $6
         from current_link current, changed_process
         where target.organization_id = current.organization_id
           and target.process_id = current.process_id
           and target.system_id = current.system_id
         returning target.organization_id, target.process_id,
           target.system_id, target.usage, current.usage as previous_usage
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, system_id,
            system_stable_key, entity_type, target_reference, change_kind,
            change_action, before_state, after_state, reason, effective_at,
            actor_identifier)
         select changed_link.organization_id, changed_link.process_id,
           changed_process.stable_key, changed_link.system_id,
           selected_system.stable_key, 'process_system',
           'process:' || changed_process.stable_key::text ||
             ':system:' || selected_system.stable_key::text,
           $7::operating_model_change_kind, 'update_system_usage',
           jsonb_build_object(
             'systemName', selected_system.name,
             'usage', changed_link.previous_usage
           ),
           jsonb_build_object(
             'systemName', selected_system.name,
             'usage', changed_link.usage
           ),
           $8, $9::timestamptz, $10
         from changed_link
         join changed_process on changed_process.id = changed_link.process_id
         join selected_system on selected_system.id = changed_link.system_id
         returning 1
       )
       select
         (select count(*)::int from current_process) as current_count,
         (select count(*)::int from selected_system) as system_count,
         (select count(*)::int from current_link) as link_count,
         (select usage from current_link) as current_usage,
         (select count(*)::int from changed_link) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.systemStableKey,
        usage,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.system_count ?? 0) !== 1 || Number(row.link_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The Process-System relationship was not found in this Organization.",
      };
    }
    if (row.current_usage === usage) {
      return {
        ok: false,
        code: "invalid",
        message: "Change the usage description before saving.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return processFailure(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "System usage updated and its prior description preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "System usage could not be updated. No partial change was accepted.",
    };
  }
}

export async function unlinkSystemFromProcess(
  input: UnlinkProcessSystemInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateProcessMetadata(input);
  if (invalid) return invalid;
  if (!validUuid(input.systemStableKey)) {
    return { ok: false, code: "invalid", message: "Select a valid System." };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Operating Model Authoring is unavailable.",
    };
  }

  const processId = processIdFromKey(input.processKey)!;
  try {
    const rows = await atomicQuery(
      configuration,
      `with current_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1 and id = $2 and stable_key = $3::uuid
       ), selected_system as (
         select id, organization_id, stable_key, name
         from systems
         where organization_id = $1 and stable_key = $5::uuid
       ), current_link as (
         select relationship.organization_id, relationship.process_id,
           relationship.system_id, relationship.usage
         from process_systems relationship
         join current_process current
           on current.id = relationship.process_id
          and current.organization_id = relationship.organization_id
         join selected_system selected
           on selected.id = relationship.system_id
          and selected.organization_id = relationship.organization_id
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and date_trunc('milliseconds', target.updated_at) = $4::timestamptz
           and exists (select 1 from current_link)
         returning target.id, target.organization_id, target.stable_key,
           target.updated_at
       ), removed as (
         delete from process_systems target
         using current_link current, changed_process
         where target.organization_id = current.organization_id
           and target.process_id = current.process_id
           and target.system_id = current.system_id
         returning target.organization_id, target.process_id,
           target.system_id, target.usage
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, system_id,
            system_stable_key, entity_type, target_reference, change_kind,
            change_action, before_state, after_state, reason, effective_at,
            actor_identifier)
         select removed.organization_id, removed.process_id,
           changed_process.stable_key, removed.system_id,
           selected_system.stable_key, 'process_system',
           'process:' || changed_process.stable_key::text ||
             ':system:' || selected_system.stable_key::text,
           $6::operating_model_change_kind, 'unlink_system',
           jsonb_build_object(
             'systemName', selected_system.name,
             'systemStableKey', selected_system.stable_key,
             'usage', removed.usage
           ), '{}'::jsonb,
           $7, $8::timestamptz, $9
         from removed
         join changed_process on changed_process.id = removed.process_id
         join selected_system on selected_system.id = removed.system_id
         returning 1
       )
       select
         (select count(*)::int from current_process) as current_count,
         (select count(*)::int from selected_system) as system_count,
         (select count(*)::int from current_link) as link_count,
         (select count(*)::int from removed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.systemStableKey,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.system_count ?? 0) !== 1 || Number(row.link_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The Process-System relationship was not found in this Organization.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return processFailure(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "System unlinked from the current Process. Prior relationship history was preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The System could not be unlinked. No partial change was accepted.",
    };
  }
}

export async function createException(
  input: CreateExceptionInput,
): Promise<OperatingModelMutationResult> {
  const invalid =
    validateProcessMetadata(input) ?? validateExceptionDefinition(input);
  if (invalid) return invalid;

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Operating Model Authoring is unavailable.",
    };
  }

  const processId = processIdFromKey(input.processKey)!;
  const ownerRoleId = roleIdFromKey(input.ownerRoleKey);
  try {
    const rows = await atomicQuery(
      configuration,
      `with current_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1 and id = $2 and stable_key = $3::uuid
       ), selected_step as (
         select step.id, step.stable_key, step.title
         from process_steps step
         join current_process current
           on current.id = step.process_id
          and current.organization_id = step.organization_id
         where step.stable_key = $8::uuid
       ), selected_role as (
         select id, name
         from roles
         where organization_id = $1
           and id = $9::integer
           and status = 'active'
       ), duplicate_exception as (
         select id
         from exceptions
         where organization_id = $1
           and process_id = $2
           and status = 'active'
           and lower(btrim(name)) = lower(btrim($5))
         limit 1
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and date_trunc('milliseconds', target.updated_at) = $4::timestamptz
           and ($8::uuid is null or exists (select 1 from selected_step))
           and ($9::integer is null or exists (select 1 from selected_role))
           and not exists (select 1 from duplicate_exception)
         returning target.id, target.organization_id, target.stable_key,
           target.updated_at
       ), created as (
         insert into exceptions
           (organization_id, process_id, process_step_id, name, condition,
            response, status, owner_role_id)
         select changed_process.organization_id, changed_process.id,
           (select id from selected_step), $5, $6, $7, 'active', $9::integer
         from changed_process
         returning id, organization_id, process_id, stable_key,
           process_step_id, name, condition, response, owner_role_id, status,
           updated_at
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, exception_id,
            exception_stable_key, entity_type, target_reference, change_kind,
            change_action, before_state, after_state, reason, effective_at,
            actor_identifier)
         select created.organization_id, created.process_id,
           changed_process.stable_key, created.id, created.stable_key,
           'exception', 'exception:' || created.stable_key::text,
           $10::operating_model_change_kind, 'create_exception', '{}'::jsonb,
           jsonb_build_object(
             'name', created.name,
             'condition', created.condition,
             'response', created.response,
             'stepStableKey', (select stable_key from selected_step),
             'stepTitle', (select title from selected_step),
             'ownerRoleId', case when created.owner_role_id is null then null
               else 'role:' || created.owner_role_id::text end,
             'ownerRoleName', (select name from selected_role),
             'status', created.status
           ),
           $11, $12::timestamptz, $13
         from created
         join changed_process on changed_process.id = created.process_id
         returning 1
       )
       select
         (select count(*)::int from current_process) as current_count,
         (select count(*)::int from selected_step) as step_count,
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from duplicate_exception) as duplicate_count,
         (select count(*)::int from created) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.name.trim(),
        input.condition.trim(),
        input.response.trim(),
        input.stepStableKey || null,
        ownerRoleId,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (input.stepStableKey && Number(row.step_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected Step was not found in this Process.",
      };
    }
    if (ownerRoleId && Number(row.role_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Operational Role was not found in this Organization.",
      };
    }
    if (Number(row.duplicate_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "An active Exception with this name already exists for the Process.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return processFailure(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "Exception added and its alternate path recorded.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Exception could not be added. No partial change was accepted.",
    };
  }
}

export async function updateException(
  input: UpdateExceptionInput,
): Promise<OperatingModelMutationResult> {
  const invalid =
    validateProcessMetadata(input) ?? validateExceptionDefinition(input);
  if (invalid) return invalid;
  if (
    !validUuid(input.exceptionStableKey) ||
    !validRevision(input.expectedExceptionRevision)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "The Exception revision is invalid.",
    };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Operating Model Authoring is unavailable.",
    };
  }

  const processId = processIdFromKey(input.processKey)!;
  const ownerRoleId = roleIdFromKey(input.ownerRoleKey);
  try {
    const rows = await atomicQuery(
      configuration,
      `with current_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1 and id = $2 and stable_key = $3::uuid
       ), current_exception as (
         select item.id, item.organization_id, item.process_id,
           item.stable_key, item.process_step_id, item.name, item.condition,
           item.response, item.owner_role_id, item.status, item.updated_at
         from exceptions item
         join current_process current
           on current.id = item.process_id
          and current.organization_id = item.organization_id
         where item.stable_key = $5::uuid
       ), previous_step as (
         select step.stable_key, step.title
         from process_steps step
         join current_exception current
           on current.process_step_id = step.id
          and current.process_id = step.process_id
          and current.organization_id = step.organization_id
       ), previous_role as (
         select selected.name
         from roles selected
         join current_exception current
           on current.owner_role_id = selected.id
          and current.organization_id = selected.organization_id
       ), selected_step as (
         select step.id, step.stable_key, step.title
         from process_steps step
         join current_process current
           on current.id = step.process_id
          and current.organization_id = step.organization_id
         where step.stable_key = $10::uuid
       ), selected_role as (
         select id, name
         from roles
         where organization_id = $1
           and id = $11::integer
           and status = 'active'
       ), duplicate_exception as (
         select item.id
         from exceptions item
         where item.organization_id = $1
           and item.process_id = $2
           and item.stable_key <> $5::uuid
           and item.status = 'active'
           and lower(btrim(item.name)) = lower(btrim($7))
         limit 1
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and date_trunc('milliseconds', target.updated_at) = $4::timestamptz
           and exists (
             select 1 from current_exception item
             where date_trunc('milliseconds', item.updated_at) = $6::timestamptz
               and item.status = 'active'
               and (
                 item.name is distinct from $7 or
                 item.condition is distinct from $8 or
                 item.response is distinct from $9 or
                 item.process_step_id is distinct from
                   (select id from selected_step) or
                 item.owner_role_id is distinct from $11::integer
               )
           )
           and ($10::uuid is null or exists (select 1 from selected_step))
           and ($11::integer is null or exists (select 1 from selected_role))
           and not exists (select 1 from duplicate_exception)
         returning target.id, target.organization_id, target.stable_key,
           target.updated_at
       ), changed as (
         update exceptions target
         set name = $7,
             condition = $8,
             response = $9,
             process_step_id = (select id from selected_step),
             owner_role_id = $11::integer,
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_exception current, changed_process
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.process_id = current.process_id
           and target.stable_key = current.stable_key
         returning target.id, target.organization_id, target.process_id,
           target.stable_key, target.process_step_id, target.name,
           target.condition, target.response, target.owner_role_id,
           target.status, target.updated_at,
           current.process_step_id as previous_process_step_id,
           current.name as previous_name,
           current.condition as previous_condition,
           current.response as previous_response,
           current.owner_role_id as previous_owner_role_id
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, exception_id,
            exception_stable_key, entity_type, target_reference, change_kind,
            change_action, before_state, after_state, reason, effective_at,
            actor_identifier)
         select changed.organization_id, changed.process_id,
           changed_process.stable_key, changed.id, changed.stable_key,
           'exception', 'exception:' || changed.stable_key::text,
           $12::operating_model_change_kind, 'update_exception',
           jsonb_build_object(
             'name', changed.previous_name,
             'condition', changed.previous_condition,
             'response', changed.previous_response,
             'stepStableKey', (select stable_key from previous_step),
             'stepTitle', (select title from previous_step),
             'ownerRoleId', case when changed.previous_owner_role_id is null
               then null else 'role:' || changed.previous_owner_role_id::text end,
             'ownerRoleName', (select name from previous_role)
           ),
           jsonb_build_object(
             'name', changed.name,
             'condition', changed.condition,
             'response', changed.response,
             'stepStableKey', (select stable_key from selected_step),
             'stepTitle', (select title from selected_step),
             'ownerRoleId', case when changed.owner_role_id is null then null
               else 'role:' || changed.owner_role_id::text end,
             'ownerRoleName', (select name from selected_role)
           ),
           $13, $14::timestamptz, $15
         from changed
         join changed_process on changed_process.id = changed.process_id
         returning 1
       )
       select
         (select count(*)::int from current_process) as current_count,
         (select count(*)::int from current_exception) as exception_count,
         (select count(*)::int from selected_step) as step_count,
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from duplicate_exception) as duplicate_count,
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.exceptionStableKey,
        input.expectedExceptionRevision,
        input.name.trim(),
        input.condition.trim(),
        input.response.trim(),
        input.stepStableKey || null,
        ownerRoleId,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.exception_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The Exception was not found in this Process.",
      };
    }
    if (input.stepStableKey && Number(row.step_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected Step was not found in this Process.",
      };
    }
    if (ownerRoleId && Number(row.role_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Operational Role was not found in this Organization.",
      };
    }
    if (Number(row.duplicate_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "An active Exception with this name already exists for the Process.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return processFailure(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "Exception updated and its prior state preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Exception could not be updated. No partial change was accepted.",
    };
  }
}

export async function deactivateException(
  input: DeactivateExceptionInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateProcessMetadata(input);
  if (invalid) return invalid;
  if (
    !validUuid(input.exceptionStableKey) ||
    !validRevision(input.expectedExceptionRevision)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "The Exception revision is invalid.",
    };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Operating Model Authoring is unavailable.",
    };
  }

  const processId = processIdFromKey(input.processKey)!;
  try {
    const rows = await atomicQuery(
      configuration,
      `with current_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1 and id = $2 and stable_key = $3::uuid
       ), current_exception as (
         select item.id, item.organization_id, item.process_id,
           item.stable_key, item.name, item.status, item.updated_at
         from exceptions item
         join current_process current
           on current.id = item.process_id
          and current.organization_id = item.organization_id
         where item.stable_key = $5::uuid
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and date_trunc('milliseconds', target.updated_at) = $4::timestamptz
           and exists (
             select 1 from current_exception item
             where date_trunc('milliseconds', item.updated_at) = $6::timestamptz
               and item.status = 'active'
           )
         returning target.id, target.organization_id, target.stable_key,
           target.updated_at
       ), changed as (
         update exceptions target
         set status = 'inactive',
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_exception current, changed_process
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.process_id = current.process_id
           and target.stable_key = current.stable_key
         returning target.id, target.organization_id, target.process_id,
           target.stable_key, target.name, target.status, target.updated_at,
           current.status as previous_status
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, exception_id,
            exception_stable_key, entity_type, target_reference, change_kind,
            change_action, before_state, after_state, reason, effective_at,
            actor_identifier)
         select changed.organization_id, changed.process_id,
           changed_process.stable_key, changed.id, changed.stable_key,
           'exception', 'exception:' || changed.stable_key::text,
           $7::operating_model_change_kind, 'deactivate_exception',
           jsonb_build_object('name', changed.name, 'status', changed.previous_status),
           jsonb_build_object('name', changed.name, 'status', changed.status),
           $8, $9::timestamptz, $10
         from changed
         join changed_process on changed_process.id = changed.process_id
         returning 1
       )
       select
         (select count(*)::int from current_process) as current_count,
         (select count(*)::int from current_exception) as exception_count,
         (select status from current_exception) as current_status,
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.exceptionStableKey,
        input.expectedExceptionRevision,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.exception_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The Exception was not found in this Process.",
      };
    }
    if (row.current_status === "inactive") {
      return {
        ok: false,
        code: "invalid",
        message: "This Exception is already inactive.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return processFailure(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "Exception removed from the current Process and its history preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Exception could not be deactivated. No partial change was accepted.",
    };
  }
}
