import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  resolveOperatingModelAuthoringConfiguration,
  type EnabledOperatingModelAuthoringConfiguration,
} from "./operating-model-authoring-policy.mjs";

export type OperatingModelChangeKind =
  | "correction"
  | "organizational_change";

export type OperatingModelMutationResult =
  | { ok: true; message: string; revision: string }
  | {
      ok: false;
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
    };

type ChangeMetadata = {
  changeKind: OperatingModelChangeKind;
  effectiveAt: Date;
  expectedRevision: string;
  processKey: string;
  processStableKey: string;
  reason: string;
};

type UpdateDefinitionInput = ChangeMetadata & {
  name: string;
  purpose?: string | null;
};

type ChangeOwnerInput = ChangeMetadata & {
  ownerConfirmed: boolean;
  ownerRoleKey?: string | null;
};

type CreateStepInput = ChangeMetadata & {
  instructions: string;
  responsibleRoleKey?: string | null;
  title: string;
};

type StepChangeMetadata = ChangeMetadata & {
  expectedStepRevision: string;
  stepStableKey: string;
};

type UpdateStepInput = StepChangeMetadata & {
  instructions: string;
  title: string;
};

type ChangeStepResponsibilityInput = StepChangeMetadata & {
  responsibleRoleKey?: string | null;
};

type ReorderStepInput = StepChangeMetadata & {
  direction: "earlier" | "later";
};

type DatabaseRow = Record<string, unknown>;

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

function validateMetadata(
  input: ChangeMetadata,
): OperatingModelMutationResult | null {
  if (!processIdFromKey(input.processKey) || !validUuid(input.processStableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "The Process identifier is invalid.",
    };
  }
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
      message: "The Process revision is invalid.",
    };
  }
  return null;
}

function validateStepMetadata(
  input: StepChangeMetadata,
): OperatingModelMutationResult | null {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (
    !validUuid(input.stepStableKey) ||
    !Number.isFinite(new Date(input.expectedStepRevision).getTime())
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "The Process Step revision is invalid.",
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

async function atomicDeferredStepPositionQuery(
  configuration: EnabledOperatingModelAuthoringConfiguration,
  statement: string,
  values: unknown[],
) {
  const sql = mutationClient(configuration.databaseUrl);
  const [, rows] = await sql.transaction(
    (transaction) => [
      transaction.query(
        'set constraints "process_steps_process_id_position_unique" deferred',
        [],
      ),
      transaction.query(statement, values),
    ],
    { isolationLevel: "Serializable", readOnly: false },
  );
  return rows as DatabaseRow[];
}

function revisionFrom(row: DatabaseRow) {
  const value = row.revision;
  const revision = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(revision.getTime()) ? revision.toISOString() : null;
}

function revisionsMatch(left: unknown, right: string) {
  const leftDate = left instanceof Date ? left : new Date(String(left));
  const rightDate = new Date(right);
  return (
    Number.isFinite(leftDate.getTime()) &&
    Number.isFinite(rightDate.getTime()) &&
    leftDate.getTime() === rightDate.getTime()
  );
}

function missingOrStale(row: DatabaseRow): OperatingModelMutationResult {
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
    message:
      "This Process changed after the page loaded. Refresh before trying again.",
  };
}

function stepMissingOrStale(row: DatabaseRow): OperatingModelMutationResult {
  if (
    Number(row.current_count ?? 0) !== 1 ||
    Number(row.step_count ?? 0) !== 1
  ) {
    return {
      ok: false,
      code: "not_found",
      message: "The Process Step was not found in this Organization.",
    };
  }
  return {
    ok: false,
    code: "conflict",
    message:
      "This Process or Step changed after the page loaded. Refresh before trying again.",
  };
}

export async function updateProcessDefinition(
  input: UpdateDefinitionInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;

  const name = input.name.trim();
  const purpose = input.purpose?.trim() || null;
  if (!name || name.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Process name of 255 characters or fewer.",
    };
  }
  if (purpose && purpose.length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Keep the Process purpose to 5,000 characters or fewer.",
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
         select id, organization_id, stable_key, name, purpose,
           owner_role_id, status, updated_at
         from processes
         where organization_id = $1
           and id = $2
           and stable_key = $3::uuid
       ), duplicate_process as (
         select id
         from processes
         where organization_id = $1
           and id <> $2
           and lower(btrim(name)) = lower(btrim($4))
         limit 1
       ), changed as (
         update processes target
         set name = $4,
             purpose = $5,
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and date_trunc('milliseconds', target.updated_at) = $6::timestamptz
           and not exists (select 1 from duplicate_process)
           and (target.name is distinct from $4 or target.purpose is distinct from $5)
         returning target.id, target.organization_id, target.stable_key,
           target.name, target.purpose, target.owner_role_id, target.status,
           target.updated_at, current.name as previous_name,
           current.purpose as previous_purpose
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, entity_type,
            target_reference, change_kind, change_action, before_state,
            after_state, reason, effective_at, actor_identifier)
         select changed.organization_id, changed.id, changed.stable_key,
           'process', 'process:' || changed.stable_key::text,
           $7::operating_model_change_kind, 'update_definition',
           jsonb_build_object(
             'name', changed.previous_name,
             'purpose', changed.previous_purpose
           ),
           jsonb_build_object('name', changed.name, 'purpose', changed.purpose),
           $8, $9::timestamptz, $10
         from changed
         returning 1
       )
       select
         (select count(*)::int from current_process) as current_count,
         (select count(*)::int from duplicate_process) as duplicate_count,
         (select name from current_process) as current_name,
         (select purpose from current_process) as current_purpose,
         (select date_trunc('milliseconds', updated_at) from current_process) as current_revision,
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        name,
        purpose,
        input.expectedRevision,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.duplicate_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "A Process with this name already exists in the Organization.",
      };
    }
    if (
      Number(row.current_count ?? 0) === 1 &&
      revisionsMatch(row.current_revision, input.expectedRevision) &&
      row.current_name === name &&
      (row.current_purpose ?? null) === purpose
    ) {
      return {
        ok: false,
        code: "invalid",
        message: "Change the Process name or purpose before saving.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return missingOrStale(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "Process definition updated and its prior state preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Process change could not be saved. No partial change was accepted.",
    };
  }
}

export async function changeProcessOwner(
  input: ChangeOwnerInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;

  const ownerRoleId = roleIdFromKey(input.ownerRoleKey);
  if (input.ownerRoleKey && !ownerRoleId) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Operational Role or leave ownership unassigned.",
    };
  }
  if (ownerRoleId && !input.ownerConfirmed) {
    return {
      ok: false,
      code: "invalid",
      message: "Confirm the intended Owner Role explicitly before saving.",
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
         select process.id, process.organization_id, process.stable_key,
           process.owner_role_id, process.status, process.updated_at,
           previous_role.name as previous_owner_role_name
         from processes process
         left join roles previous_role
           on previous_role.id = process.owner_role_id
          and previous_role.organization_id = process.organization_id
         where process.organization_id = $1
           and process.id = $2
           and process.stable_key = $3::uuid
       ), selected_role as (
         select id, name
         from roles
         where organization_id = $1
           and id = $4::integer
           and status = 'active'
       ), changed as (
         update processes target
         set owner_role_id = $4::integer,
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and date_trunc('milliseconds', target.updated_at) = $5::timestamptz
           and ($4::integer is null or exists (select 1 from selected_role))
           and ($4::integer is not null or current.status = 'draft')
           and target.owner_role_id is distinct from $4::integer
         returning target.id, target.organization_id, target.stable_key,
           target.owner_role_id, target.updated_at,
           current.owner_role_id as previous_owner_role_id,
           current.previous_owner_role_name
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, entity_type,
            target_reference, change_kind, change_action, before_state,
            after_state, reason, effective_at, actor_identifier)
         select changed.organization_id, changed.id, changed.stable_key,
           'process', 'process:' || changed.stable_key::text,
           $6::operating_model_change_kind, 'change_owner',
           jsonb_build_object(
             'ownerRoleId', case when changed.previous_owner_role_id is null
               then null else 'role:' || changed.previous_owner_role_id::text end,
             'ownerRoleName', changed.previous_owner_role_name
           ),
           jsonb_build_object(
             'ownerRoleId', case when changed.owner_role_id is null
               then null else 'role:' || changed.owner_role_id::text end,
             'ownerRoleName', (select name from selected_role)
           ),
           $7, $8::timestamptz, $9
         from changed
         returning 1
       )
       select
         (select count(*)::int from current_process) as current_count,
         (select status from current_process) as current_status,
         (select owner_role_id from current_process) as current_owner_role_id,
         (select date_trunc('milliseconds', updated_at) from current_process) as current_revision,
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        ownerRoleId,
        input.expectedRevision,
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
    if (!ownerRoleId && row.current_status && row.current_status !== "draft") {
      return {
        ok: false,
        code: "invalid",
        message: "Ownership can be cleared only while a Process is a Draft.",
      };
    }
    if (
      Number(row.current_count ?? 0) === 1 &&
      revisionsMatch(row.current_revision, input.expectedRevision) &&
      (row.current_owner_role_id === null
        ? ownerRoleId === null
        : Number(row.current_owner_role_id) === ownerRoleId)
    ) {
      return {
        ok: false,
        code: "invalid",
        message: "Select a different Owner Role before saving.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return missingOrStale(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: ownerRoleId
        ? "Process ownership updated. Position and person context were not inferred."
        : "Draft Process ownership cleared and the prior state preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Process change could not be saved. No partial change was accepted.",
    };
  }
}

export async function createProcessStep(
  input: CreateStepInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;

  const title = input.title.trim();
  const instructions = input.instructions.trim();
  const responsibleRoleId = roleIdFromKey(input.responsibleRoleKey);
  if (!title || title.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Step title of 255 characters or fewer.",
    };
  }
  if (instructions.length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Keep the Step instructions to 5,000 characters or fewer.",
    };
  }
  if (input.responsibleRoleKey && !responsibleRoleId) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Operational Role or use inherited responsibility.",
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
      `with canonical_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1
           and id = $2
           and stable_key = $3::uuid
       ), current_process as (
         select *
         from canonical_process
         where date_trunc('milliseconds', updated_at) = $4::timestamptz
       ), selected_role as (
         select id, name
         from roles
         where organization_id = $1
           and id = $7::integer
           and status = 'active'
       ), next_position as (
         select coalesce(max(position), 0)::integer + 1 as position
         from process_steps
         where organization_id = $1 and process_id = $2
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and ($7::integer is null or exists (select 1 from selected_role))
         returning target.id, target.organization_id, target.stable_key,
           target.owner_role_id, target.updated_at
       ), inserted_step as (
         insert into process_steps
           (organization_id, process_id, position, title, instructions,
            responsible_role_id)
         select changed.organization_id, changed.id, next_position.position,
           $5, $6, $7::integer
         from changed_process changed cross join next_position
         returning id, organization_id, process_id, stable_key, position,
           title, instructions, responsible_role_id, updated_at
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, process_step_id,
            process_step_stable_key, entity_type, target_reference,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select changed.organization_id, changed.id, changed.stable_key,
           step.id, step.stable_key, 'process_step',
           'process_step:' || step.stable_key::text,
           $8::operating_model_change_kind, 'create_step', '{}'::jsonb,
           jsonb_build_object(
             'stableKey', step.stable_key,
             'position', step.position,
             'title', step.title,
             'instructions', step.instructions,
             'responsibleRoleId', case when step.responsible_role_id is null
               then null else 'role:' || step.responsible_role_id::text end,
             'responsibleRoleName', (select name from selected_role),
             'responsibilityBasis', case
               when step.responsible_role_id is not null then 'explicit'
               when changed.owner_role_id is not null then 'inherited'
               else 'unclear' end
           ),
           $9, $10::timestamptz, $11
         from inserted_step step join changed_process changed on true
         returning 1
       )
       select
         (select count(*)::int from canonical_process) as current_count,
         (select date_trunc('milliseconds', updated_at) from canonical_process) as current_revision,
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from changed_process) as changed_count,
         (select count(*)::int from inserted_step) as step_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        title,
        instructions,
        responsibleRoleId,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (responsibleRoleId && Number(row.role_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Operational Role was not found in this Organization.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.step_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return missingOrStale(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "Process Step added and its responsibility basis recorded.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Process Step could not be added. No partial change was accepted.",
    };
  }
}

export async function updateProcessStep(
  input: UpdateStepInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateStepMetadata(input);
  if (invalid) return invalid;

  const title = input.title.trim();
  const instructions = input.instructions.trim();
  if (!title || title.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Step title of 255 characters or fewer.",
    };
  }
  if (instructions.length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Keep the Step instructions to 5,000 characters or fewer.",
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
      `with canonical_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1 and id = $2 and stable_key = $3::uuid
       ), current_process as (
         select * from canonical_process
         where date_trunc('milliseconds', updated_at) = $4::timestamptz
       ), canonical_step as (
         select id, organization_id, process_id, stable_key, position, title,
           instructions, responsible_role_id, updated_at
         from process_steps
         where organization_id = $1 and process_id = $2
           and stable_key = $5::uuid
       ), current_step as (
         select step.* from canonical_step step join current_process on true
         where date_trunc('milliseconds', step.updated_at) = $6::timestamptz
       ), changed_step as (
         update process_steps target
         set title = $7,
             instructions = $8,
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_step current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.process_id = current.process_id
           and target.stable_key = current.stable_key
           and (target.title is distinct from $7 or target.instructions is distinct from $8)
         returning target.id, target.organization_id, target.process_id,
           target.stable_key, target.position, target.title,
           target.instructions, target.responsible_role_id, target.updated_at,
           current.title as previous_title,
           current.instructions as previous_instructions
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and exists (select 1 from changed_step)
         returning target.id, target.organization_id, target.stable_key,
           target.updated_at
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, process_step_id,
            process_step_stable_key, entity_type, target_reference,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select process.organization_id, process.id, process.stable_key,
           step.id, step.stable_key, 'process_step',
           'process_step:' || step.stable_key::text,
           $9::operating_model_change_kind, 'update_step',
           jsonb_build_object('title', step.previous_title,
             'instructions', step.previous_instructions),
           jsonb_build_object('title', step.title,
             'instructions', step.instructions),
           $10, $11::timestamptz, $12
         from changed_step step join changed_process process on true
         returning 1
       )
       select
         (select count(*)::int from canonical_process) as current_count,
         (select count(*)::int from canonical_step) as step_count,
         (select date_trunc('milliseconds', updated_at) from canonical_process) as process_revision,
         (select title from canonical_step) as current_title,
         (select instructions from canonical_step) as current_instructions,
         (select date_trunc('milliseconds', updated_at) from canonical_step) as step_revision,
         (select count(*)::int from changed_step) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.stepStableKey,
        input.expectedStepRevision,
        title,
        instructions,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (
      Number(row.current_count ?? 0) === 1 &&
      revisionsMatch(row.process_revision, input.expectedRevision) &&
      Number(row.step_count ?? 0) === 1 &&
      revisionsMatch(row.step_revision, input.expectedStepRevision) &&
      row.current_title === title &&
      row.current_instructions === instructions
    ) {
      return {
        ok: false,
        code: "invalid",
        message: "Change the Step title or instructions before saving.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return stepMissingOrStale(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "Process Step wording updated and its prior state preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Process Step could not be saved. No partial change was accepted.",
    };
  }
}

export async function changeProcessStepResponsibility(
  input: ChangeStepResponsibilityInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateStepMetadata(input);
  if (invalid) return invalid;
  const responsibleRoleId = roleIdFromKey(input.responsibleRoleKey);
  if (input.responsibleRoleKey && !responsibleRoleId) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Operational Role or use inherited responsibility.",
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
      `with canonical_process as (
         select id, organization_id, stable_key, owner_role_id, updated_at
         from processes
         where organization_id = $1 and id = $2 and stable_key = $3::uuid
       ), current_process as (
         select * from canonical_process
         where date_trunc('milliseconds', updated_at) = $4::timestamptz
       ), selected_role as (
         select id, name from roles
         where organization_id = $1 and id = $7::integer and status = 'active'
       ), canonical_step as (
         select step.id, step.organization_id, step.process_id,
           step.stable_key, step.responsible_role_id, step.updated_at,
           previous_role.name as previous_role_name
         from process_steps step
         left join roles previous_role
           on previous_role.organization_id = step.organization_id
          and previous_role.id = step.responsible_role_id
         where step.organization_id = $1 and step.process_id = $2
           and step.stable_key = $5::uuid
       ), current_step as (
         select step.* from canonical_step step join current_process on true
         where date_trunc('milliseconds', step.updated_at) = $6::timestamptz
       ), changed_step as (
         update process_steps target
         set responsible_role_id = $7::integer,
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_step current
         where target.id = current.id
           and target.organization_id = current.organization_id
           and target.process_id = current.process_id
           and target.stable_key = current.stable_key
           and ($7::integer is null or exists (select 1 from selected_role))
           and target.responsible_role_id is distinct from $7::integer
         returning target.id, target.organization_id, target.process_id,
           target.stable_key, target.responsible_role_id, target.updated_at,
           current.responsible_role_id as previous_role_id,
           current.previous_role_name
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and exists (select 1 from changed_step)
         returning target.id, target.organization_id, target.stable_key,
           target.owner_role_id, target.updated_at
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, process_step_id,
            process_step_stable_key, entity_type, target_reference,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select process.organization_id, process.id, process.stable_key,
           step.id, step.stable_key, 'process_step',
           'process_step:' || step.stable_key::text,
           $8::operating_model_change_kind, 'change_step_responsibility',
           jsonb_build_object(
             'responsibleRoleId', case when step.previous_role_id is null
               then null else 'role:' || step.previous_role_id::text end,
             'responsibleRoleName', step.previous_role_name,
             'responsibilityBasis', case
               when step.previous_role_id is not null then 'explicit'
               when process.owner_role_id is not null then 'inherited'
               else 'unclear' end
           ),
           jsonb_build_object(
             'responsibleRoleId', case when step.responsible_role_id is null
               then null else 'role:' || step.responsible_role_id::text end,
             'responsibleRoleName', (select name from selected_role),
             'responsibilityBasis', case
               when step.responsible_role_id is not null then 'explicit'
               when process.owner_role_id is not null then 'inherited'
               else 'unclear' end
           ),
           $9, $10::timestamptz, $11
         from changed_step step join changed_process process on true
         returning 1
       )
       select
         (select count(*)::int from canonical_process) as current_count,
         (select count(*)::int from canonical_step) as step_count,
         (select date_trunc('milliseconds', updated_at) from canonical_process) as process_revision,
         (select responsible_role_id from canonical_step) as current_role_id,
         (select date_trunc('milliseconds', updated_at) from canonical_step) as step_revision,
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from changed_step) as changed_count,
         (select count(*)::int from history) as history_count,
         (select owner_role_id from changed_process) as owner_role_id,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.stepStableKey,
        input.expectedStepRevision,
        responsibleRoleId,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (responsibleRoleId && Number(row.role_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Operational Role was not found in this Organization.",
      };
    }
    if (
      Number(row.current_count ?? 0) === 1 &&
      revisionsMatch(row.process_revision, input.expectedRevision) &&
      Number(row.step_count ?? 0) === 1 &&
      revisionsMatch(row.step_revision, input.expectedStepRevision) &&
      (row.current_role_id === null
        ? responsibleRoleId === null
        : Number(row.current_role_id) === responsibleRoleId)
    ) {
      return {
        ok: false,
        code: "invalid",
        message: "Select a different responsibility treatment before saving.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1
    ) {
      return stepMissingOrStale(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: responsibleRoleId
        ? "Explicit Step responsibility recorded without inferring a Person or Position."
        : row.owner_role_id
          ? "Step responsibility now inherits from the Process Owner."
          : "Step responsibility is now unclear because no Process Owner is assigned.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Step responsibility could not be saved. No partial change was accepted.",
    };
  }
}

export async function reorderProcessStep(
  input: ReorderStepInput,
): Promise<OperatingModelMutationResult> {
  const invalid = validateStepMetadata(input);
  if (invalid) return invalid;
  const delta = input.direction === "earlier" ? -1 : 1;

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
    const rows = await atomicDeferredStepPositionQuery(
      configuration,
      `with canonical_process as (
         select id, organization_id, stable_key, updated_at
         from processes
         where organization_id = $1 and id = $2 and stable_key = $3::uuid
       ), current_process as (
         select * from canonical_process
         where date_trunc('milliseconds', updated_at) = $4::timestamptz
       ), canonical_step as (
         select id, organization_id, process_id, stable_key, position,
           title, updated_at
         from process_steps
         where organization_id = $1 and process_id = $2
           and stable_key = $5::uuid
       ), current_step as (
         select step.* from canonical_step step join current_process on true
         where date_trunc('milliseconds', step.updated_at) = $6::timestamptz
       ), adjacent_step as (
         select candidate.id, candidate.organization_id, candidate.process_id,
           candidate.stable_key, candidate.position, candidate.title,
           candidate.updated_at
         from process_steps candidate join current_step current
           on candidate.organization_id = current.organization_id
          and candidate.process_id = current.process_id
          and candidate.position = current.position + $7::integer
       ), changed_steps as (
         update process_steps target
         set position = case when target.id = current.id
               then adjacent.position else current.position end,
             updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_step current cross join adjacent_step adjacent
         where target.organization_id = current.organization_id
           and target.process_id = current.process_id
           and target.id in (current.id, adjacent.id)
         returning target.id, target.organization_id, target.process_id,
           target.stable_key, target.position, target.title, target.updated_at
       ), changed_process as (
         update processes target
         set updated_at = date_trunc('milliseconds', transaction_timestamp())
         from current_process current
         where target.id = current.id and target.organization_id = current.organization_id
           and target.stable_key = current.stable_key
           and (select count(*) from changed_steps) = 2
         returning target.id, target.organization_id, target.stable_key,
           target.updated_at
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key, process_step_id,
            process_step_stable_key, entity_type, target_reference,
            change_kind, change_action, before_state, after_state, reason,
            effective_at, actor_identifier)
         select process.organization_id, process.id, process.stable_key,
           step.id, step.stable_key, 'process_step',
           'process_step:' || step.stable_key::text,
           $8::operating_model_change_kind, 'reorder_steps',
           jsonb_build_object(
             'position', case when step.id = current.id
               then current.position else adjacent.position end,
             'title', step.title
           ),
           jsonb_build_object('position', step.position, 'title', step.title),
           $9, $10::timestamptz, $11
         from changed_steps step
         cross join current_step current
         cross join adjacent_step adjacent
         cross join changed_process process
         returning 1
       )
       select
         (select count(*)::int from canonical_process) as current_count,
         (select count(*)::int from canonical_step) as step_count,
         (select date_trunc('milliseconds', updated_at) from canonical_process) as process_revision,
         (select date_trunc('milliseconds', updated_at) from canonical_step) as step_revision,
         (select count(*)::int from adjacent_step) as adjacent_count,
         (select count(*)::int from changed_steps) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed_process) as revision`,
      [
        configuration.organizationId,
        processId,
        input.processStableKey,
        input.expectedRevision,
        input.stepStableKey,
        input.expectedStepRevision,
        delta,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (
      Number(row.current_count ?? 0) !== 1 ||
      Number(row.step_count ?? 0) !== 1 ||
      !revisionsMatch(row.process_revision, input.expectedRevision) ||
      !revisionsMatch(row.step_revision, input.expectedStepRevision)
    ) {
      return stepMissingOrStale(row);
    }
    if (Number(row.adjacent_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "invalid",
        message:
          input.direction === "earlier"
            ? "This is already the first Step."
            : "This is already the final Step.",
      };
    }
    if (
      Number(row.changed_count ?? 0) !== 2 ||
      Number(row.history_count ?? 0) !== 2
    ) {
      return stepMissingOrStale(row);
    }
    const revision = revisionFrom(row);
    if (!revision) throw new Error("Missing revision");
    return {
      ok: true,
      message: "Step order updated and both prior positions preserved.",
      revision,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "The Step could not be reordered. No partial change was accepted.",
    };
  }
}
