import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  resolveOperatingModelAuthoringConfiguration,
  type EnabledOperatingModelAuthoringConfiguration,
} from "./operating-model-authoring-policy.mjs";
import type { OperatingModelChangeKind } from "./operating-model-administration";

type ChangeMetadata = {
  changeKind: OperatingModelChangeKind;
  effectiveAt: Date;
  reason: string;
};

type FamilyDefinition = {
  description?: string | null;
  name: string;
};

type CreateFamilyInput = ChangeMetadata & FamilyDefinition;
type ExistingFamilyInput = ChangeMetadata & {
  expectedFamilyRevision: string;
  familyStableKey: string;
};
type UpdateFamilyInput = ExistingFamilyInput & FamilyDefinition;
type AddMembershipInput = ExistingFamilyInput & {
  processStableKey: string;
};
type EndMembershipInput = ExistingFamilyInput & {
  expectedMembershipRevision: string;
  membershipStableKey: string;
};

type DatabaseRow = Record<string, unknown>;

export type ProcessFamilyMutationResult =
  | { ok: true; message: string; revision: string; stableKey?: string }
  | {
      ok: false;
      code: "conflict" | "duplicate" | "invalid" | "not_found" | "unavailable";
      message: string;
    };

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function validRevision(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

function validateMetadata(input: ChangeMetadata): ProcessFamilyMutationResult | null {
  if (!Number.isFinite(input.effectiveAt.getTime()) || input.effectiveAt > new Date()) {
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

function validateDefinition(input: FamilyDefinition): ProcessFamilyMutationResult | null {
  if (!input.name.trim() || input.name.trim().length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Process Family name of 255 characters or fewer.",
    };
  }
  if ((input.description?.trim().length ?? 0) > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Keep the Process Family description to 5,000 characters or fewer.",
    };
  }
  return null;
}

function validateExisting(input: ExistingFamilyInput): ProcessFamilyMutationResult | null {
  const invalid = validateMetadata(input);
  if (invalid) return invalid;
  if (!validUuid(input.familyStableKey) || !validRevision(input.expectedFamilyRevision)) {
    return {
      ok: false,
      code: "invalid",
      message: "The Process Family revision is invalid.",
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
  if (!configuration.enabled) throw new Error("Operating Model Authoring is not enabled.");
  return configuration;
}

async function atomicQuery(
  configuration: EnabledOperatingModelAuthoringConfiguration,
  statement: string,
  values: unknown[],
) {
  const sql = neon(configuration.databaseUrl, {
    isolationLevel: "Serializable",
    readOnly: false,
  });
  const [rows] = await sql.transaction(
    (transaction) => [transaction.query(statement, values)],
    { isolationLevel: "Serializable", readOnly: false },
  );
  return rows as DatabaseRow[];
}

function revisionFrom(row: DatabaseRow) {
  const revision = new Date(String(row.revision ?? ""));
  return Number.isFinite(revision.getTime()) ? revision.toISOString() : null;
}

function unavailable(): ProcessFamilyMutationResult {
  return {
    ok: false,
    code: "unavailable",
    message: "Process Family authoring is unavailable.",
  };
}

export async function createProcessFamily(
  input: CreateFamilyInput,
): Promise<ProcessFamilyMutationResult> {
  const invalid = validateMetadata(input) ?? validateDefinition(input);
  if (invalid) return invalid;

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return unavailable();
  }

  try {
    const rows = await atomicQuery(
      configuration,
      `with duplicate as (
         select id from process_families
         where organization_id = $1
           and lower(btrim(name)) = lower(btrim($2))
         limit 1
       ), created as (
         insert into process_families
           (organization_id, name, description, status)
         select $1, $2, $3, 'active'
         where not exists (select 1 from duplicate)
         returning id, organization_id, stable_key, name, description,
           status, updated_at
       ), history as (
         insert into operating_model_changes
           (organization_id, process_family_id, process_family_stable_key,
            entity_type, target_reference, change_kind, change_action,
            before_state, after_state, reason, effective_at, actor_identifier)
         select organization_id, id, stable_key, 'process_family',
           'process-family:' || stable_key::text,
           $4::operating_model_change_kind, 'create_process_family',
           '{}'::jsonb,
           jsonb_build_object('name', name, 'description', description,
             'status', status),
           $5, $6::timestamptz, $7
         from created
         returning 1
       )
       select
         (select count(*)::int from duplicate) as duplicate_count,
         (select count(*)::int from created) as changed_count,
         (select count(*)::int from history) as history_count,
         (select stable_key from created) as stable_key,
         (select updated_at from created) as revision`,
      [
        configuration.organizationId,
        input.name.trim(),
        input.description?.trim() || null,
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
        code: "duplicate",
        message: "A Process Family with this name already exists in the Organization.",
      };
    }
    const revision = revisionFrom(row);
    const stableKey = String(row.stable_key ?? "");
    if (
      Number(row.changed_count ?? 0) !== 1 ||
      Number(row.history_count ?? 0) !== 1 ||
      !revision ||
      !validUuid(stableKey)
    ) {
      return unavailable();
    }
    return { ok: true, message: "Process Family added.", revision, stableKey };
  } catch {
    return unavailable();
  }
}

export async function updateProcessFamily(
  input: UpdateFamilyInput,
): Promise<ProcessFamilyMutationResult> {
  const invalid = validateExisting(input) ?? validateDefinition(input);
  if (invalid) return invalid;

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return unavailable();
  }

  try {
    const rows = await atomicQuery(
      configuration,
      `with current_family as (
         select * from process_families
         where organization_id = $1 and stable_key = $2::uuid
       ), duplicate as (
         select id from process_families
         where organization_id = $1
           and stable_key <> $2::uuid
           and lower(btrim(name)) = lower(btrim($4))
         limit 1
       ), changed as (
         update process_families family
         set name = $4, description = $5, updated_at = clock_timestamp()
         from current_family current
         where family.id = current.id
           and family.updated_at = $3::timestamptz
           and family.status = 'active'
           and not exists (select 1 from duplicate)
         returning family.id, family.organization_id, family.stable_key,
           family.name, family.description, family.status, family.updated_at,
           current.name as old_name, current.description as old_description,
           current.status as old_status
       ), history as (
         insert into operating_model_changes
           (organization_id, process_family_id, process_family_stable_key,
            entity_type, target_reference, change_kind, change_action,
            before_state, after_state, reason, effective_at, actor_identifier)
         select organization_id, id, stable_key, 'process_family',
           'process-family:' || stable_key::text,
           $6::operating_model_change_kind, 'update_process_family',
           jsonb_build_object('name', old_name, 'description', old_description,
             'status', old_status),
           jsonb_build_object('name', name, 'description', description,
             'status', status),
           $7, $8::timestamptz, $9
         from changed
         returning 1
       )
       select
         (select count(*)::int from current_family) as current_count,
         (select count(*)::int from duplicate) as duplicate_count,
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed) as revision`,
      [
        configuration.organizationId,
        input.familyStableKey,
        input.expectedFamilyRevision,
        input.name.trim(),
        input.description?.trim() || null,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.current_count ?? 0) !== 1) {
      return { ok: false, code: "not_found", message: "The Process Family was not found in this Organization." };
    }
    if (Number(row.duplicate_count ?? 0) > 0) {
      return { ok: false, code: "duplicate", message: "A Process Family with this name already exists in the Organization." };
    }
    const revision = revisionFrom(row);
    if (Number(row.changed_count ?? 0) !== 1 || Number(row.history_count ?? 0) !== 1 || !revision) {
      return { ok: false, code: "conflict", message: "This Process Family changed after the page loaded. Refresh before trying again." };
    }
    return { ok: true, message: "Process Family updated.", revision };
  } catch {
    return unavailable();
  }
}

export async function deactivateProcessFamily(
  input: ExistingFamilyInput,
): Promise<ProcessFamilyMutationResult> {
  const invalid = validateExisting(input);
  if (invalid) return invalid;

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return unavailable();
  }

  try {
    const rows = await atomicQuery(
      configuration,
      `with current_family as (
         select * from process_families
         where organization_id = $1 and stable_key = $2::uuid
       ), active_members as (
         select count(*)::int as count from process_family_memberships membership
         join current_family family on family.id = membership.process_family_id
           and family.organization_id = membership.organization_id
         where membership.status = 'active'
       ), changed as (
         update process_families family
         set status = 'inactive', updated_at = clock_timestamp()
         from current_family current
         where family.id = current.id
           and family.updated_at = $3::timestamptz
           and family.status = 'active'
           and (select count from active_members) = 0
         returning family.id, family.organization_id, family.stable_key,
           family.name, family.description, family.status, family.updated_at,
           current.status as old_status
       ), history as (
         insert into operating_model_changes
           (organization_id, process_family_id, process_family_stable_key,
            entity_type, target_reference, change_kind, change_action,
            before_state, after_state, reason, effective_at, actor_identifier)
         select organization_id, id, stable_key, 'process_family',
           'process-family:' || stable_key::text,
           $4::operating_model_change_kind, 'deactivate_process_family',
           jsonb_build_object('name', name, 'description', description,
             'status', old_status),
           jsonb_build_object('name', name, 'description', description,
             'status', status),
           $5, $6::timestamptz, $7
         from changed
         returning 1
       )
       select
         (select count(*)::int from current_family) as current_count,
         (select count from active_members) as active_member_count,
         (select count(*)::int from changed) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from changed) as revision`,
      [
        configuration.organizationId,
        input.familyStableKey,
        input.expectedFamilyRevision,
        input.changeKind,
        input.reason.trim(),
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.current_count ?? 0) !== 1) {
      return { ok: false, code: "not_found", message: "The Process Family was not found in this Organization." };
    }
    if (Number(row.active_member_count ?? 0) > 0) {
      return { ok: false, code: "conflict", message: "End every current Process membership before deactivating this Family." };
    }
    const revision = revisionFrom(row);
    if (Number(row.changed_count ?? 0) !== 1 || Number(row.history_count ?? 0) !== 1 || !revision) {
      return { ok: false, code: "conflict", message: "This Process Family changed after the page loaded. Refresh before trying again." };
    }
    return { ok: true, message: "Process Family deactivated.", revision };
  } catch {
    return unavailable();
  }
}

export async function addProcessFamilyMembership(
  input: AddMembershipInput,
): Promise<ProcessFamilyMutationResult> {
  const invalid = validateExisting(input);
  if (invalid) return invalid;
  if (!validUuid(input.processStableKey)) {
    return { ok: false, code: "invalid", message: "Select a valid Process." };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return unavailable();
  }

  try {
    const rows = await atomicQuery(
      configuration,
      `with current_family as (
         select * from process_families
         where organization_id = $1 and stable_key = $2::uuid
       ), selected_process as (
         select * from processes
         where organization_id = $1 and stable_key = $4::uuid
       ), duplicate as (
         select membership.id
         from process_family_memberships membership
         join current_family family on family.id = membership.process_family_id
         join selected_process process on process.id = membership.process_id
         where membership.organization_id = $1 and membership.status = 'active'
       ), touched_family as (
         update process_families family
         set updated_at = clock_timestamp()
         from current_family current
         where family.id = current.id
           and family.updated_at = $3::timestamptz
           and family.status = 'active'
           and exists (select 1 from selected_process)
           and not exists (select 1 from duplicate)
         returning family.id, family.organization_id, family.stable_key,
           family.updated_at
       ), created as (
         insert into process_family_memberships
           (organization_id, process_family_id, process_id, status,
            effective_from)
         select family.organization_id, family.id, process.id, 'active',
           $6::timestamptz
         from touched_family family cross join selected_process process
         returning id, organization_id, stable_key, process_family_id,
           process_id, status, effective_from, effective_until
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key,
            process_family_id, process_family_stable_key,
            process_family_membership_id,
            process_family_membership_stable_key, entity_type,
            target_reference, change_kind, change_action, before_state,
            after_state, reason, effective_at, actor_identifier)
         select created.organization_id, process.id, process.stable_key,
           family.id, family.stable_key, created.id, created.stable_key,
           'process_family_membership',
           'process-family-membership:' || created.stable_key::text,
           $5::operating_model_change_kind, 'add_process_family_membership',
           '{}'::jsonb,
           jsonb_build_object(
             'familyStableKey', family.stable_key,
             'processStableKey', process.stable_key,
             'status', created.status,
             'effectiveFrom', created.effective_from),
           $7, $6::timestamptz, $8
         from created
         join touched_family family on family.id = created.process_family_id
         join selected_process process on process.id = created.process_id
         returning 1
       )
       select
         (select count(*)::int from current_family) as family_count,
         (select count(*)::int from selected_process) as process_count,
         (select count(*)::int from duplicate) as duplicate_count,
         (select count(*)::int from created) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from touched_family) as revision`,
      [
        configuration.organizationId,
        input.familyStableKey,
        input.expectedFamilyRevision,
        input.processStableKey,
        input.changeKind,
        input.effectiveAt.toISOString(),
        input.reason.trim(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.family_count ?? 0) !== 1) {
      return { ok: false, code: "not_found", message: "The Process Family was not found in this Organization." };
    }
    if (Number(row.process_count ?? 0) !== 1) {
      return { ok: false, code: "not_found", message: "The Process was not found in this Organization." };
    }
    if (Number(row.duplicate_count ?? 0) > 0) {
      return { ok: false, code: "duplicate", message: "This Process is already a current member of the Family." };
    }
    const revision = revisionFrom(row);
    if (Number(row.changed_count ?? 0) !== 1 || Number(row.history_count ?? 0) !== 1 || !revision) {
      return { ok: false, code: "conflict", message: "This Process Family changed after the page loaded. Refresh before trying again." };
    }
    return { ok: true, message: "Process added to the Family.", revision };
  } catch {
    return unavailable();
  }
}

export async function endProcessFamilyMembership(
  input: EndMembershipInput,
): Promise<ProcessFamilyMutationResult> {
  const invalid = validateExisting(input);
  if (invalid) return invalid;
  if (!validUuid(input.membershipStableKey) || !validRevision(input.expectedMembershipRevision)) {
    return { ok: false, code: "invalid", message: "The Process membership revision is invalid." };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return unavailable();
  }

  try {
    const rows = await atomicQuery(
      configuration,
      `with current_family as (
         select * from process_families
         where organization_id = $1 and stable_key = $2::uuid
       ), current_membership as (
         select membership.*, process.stable_key as process_stable_key
         from process_family_memberships membership
         join current_family family on family.id = membership.process_family_id
           and family.organization_id = membership.organization_id
         join processes process on process.id = membership.process_id
           and process.organization_id = membership.organization_id
         where membership.stable_key = $4::uuid
       ), touched_family as (
         update process_families family
         set updated_at = clock_timestamp()
         from current_family current
         where family.id = current.id
           and family.updated_at = $3::timestamptz
           and exists (
             select 1 from current_membership membership
             where membership.updated_at = $5::timestamptz
               and membership.status = 'active'
               and $7::timestamptz >= membership.effective_from
           )
         returning family.id, family.organization_id, family.stable_key,
           family.updated_at
       ), ended as (
         update process_family_memberships membership
         set status = 'ended', effective_until = $7::timestamptz,
           updated_at = clock_timestamp()
         from current_membership current, touched_family family
         where membership.id = current.id
           and family.id = current.process_family_id
           and membership.updated_at = $5::timestamptz
           and membership.status = 'active'
           and $7::timestamptz >= membership.effective_from
         returning membership.id, membership.organization_id,
           membership.stable_key, membership.process_family_id,
           membership.process_id, membership.status,
           membership.effective_from, membership.effective_until
       ), history as (
         insert into operating_model_changes
           (organization_id, process_id, process_stable_key,
            process_family_id, process_family_stable_key,
            process_family_membership_id,
            process_family_membership_stable_key, entity_type,
            target_reference, change_kind, change_action, before_state,
            after_state, reason, effective_at, actor_identifier)
         select ended.organization_id, ended.process_id,
           current.process_stable_key, family.id, family.stable_key,
           ended.id, ended.stable_key, 'process_family_membership',
           'process-family-membership:' || ended.stable_key::text,
           $6::operating_model_change_kind, 'end_process_family_membership',
           jsonb_build_object(
             'familyStableKey', family.stable_key,
             'processStableKey', current.process_stable_key,
             'status', current.status,
             'effectiveFrom', current.effective_from),
           jsonb_build_object(
             'familyStableKey', family.stable_key,
             'processStableKey', current.process_stable_key,
             'status', ended.status,
             'effectiveFrom', ended.effective_from,
             'effectiveUntil', ended.effective_until),
           $8, $7::timestamptz, $9
         from ended
         join current_membership current on current.id = ended.id
         join touched_family family on family.id = ended.process_family_id
         returning 1
       )
       select
         (select count(*)::int from current_family) as family_count,
         (select count(*)::int from current_membership) as membership_count,
         (select count(*)::int from ended) as changed_count,
         (select count(*)::int from history) as history_count,
         (select updated_at from touched_family) as revision`,
      [
        configuration.organizationId,
        input.familyStableKey,
        input.expectedFamilyRevision,
        input.membershipStableKey,
        input.expectedMembershipRevision,
        input.changeKind,
        input.effectiveAt.toISOString(),
        input.reason.trim(),
        configuration.actorIdentifier,
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.family_count ?? 0) !== 1) {
      return { ok: false, code: "not_found", message: "The Process Family was not found in this Organization." };
    }
    if (Number(row.membership_count ?? 0) !== 1) {
      return { ok: false, code: "not_found", message: "The current Process membership was not found in this Family." };
    }
    const revision = revisionFrom(row);
    if (Number(row.changed_count ?? 0) !== 1 || Number(row.history_count ?? 0) !== 1 || !revision) {
      return { ok: false, code: "conflict", message: "This Family or membership changed after the page loaded. Refresh before trying again." };
    }
    return { ok: true, message: "Process membership ended.", revision };
  } catch {
    return unavailable();
  }
}
