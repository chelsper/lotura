import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import { loadDiscoveryInquiryReview } from "./discovery-data";
import {
  resolveOperatingModelAuthoringConfiguration,
  type EnabledOperatingModelAuthoringConfiguration,
} from "./operating-model-authoring-policy.mjs";

type CreateDiscoveryProcessBaselineInput = {
  familyConfirmed: boolean;
  inquiryId: string;
  name: string;
  ownerConfirmed: boolean;
  ownerRoleKey?: string | null;
  processFamilyStableKey?: string | null;
  purpose: string;
  reviewId: string;
  reviewedBaseline: boolean;
  sessionId: string;
  steps: string[];
};

export type DiscoveryProcessBaselineMutationResult =
  | { ok: true; message: string; processId: string }
  | {
      ok: false;
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
    };

type DatabaseRow = Record<string, unknown>;

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function roleIdFromKey(value: string | null | undefined) {
  if (!value) return null;
  const match = /^role:([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

function unavailable(): DiscoveryProcessBaselineMutationResult {
  return {
    ok: false,
    code: "unavailable",
    message:
      "Lotura could not create the shared working baseline safely. No partial change was retained.",
  };
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

export async function createDiscoveryProcessBaseline(
  input: CreateDiscoveryProcessBaselineInput,
): Promise<DiscoveryProcessBaselineMutationResult> {
  if (
    !validUuid(input.inquiryId)
    || !validUuid(input.sessionId)
    || !validUuid(input.reviewId)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "The reviewed Discovery source is invalid.",
    };
  }

  const name = input.name.trim();
  const purpose = input.purpose.trim();
  const steps = input.steps.map((step) => step.trim()).filter(Boolean);
  if (!name || name.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Process name of 255 characters or fewer.",
    };
  }
  if (!purpose || purpose.length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a readable Process purpose of 5,000 characters or fewer.",
    };
  }
  if (
    steps.length < 1
    || steps.length > 12
    || steps.some((step) => step.length > 5000)
  ) {
    return {
      ok: false,
      code: "invalid",
      message:
        "Enter between 1 and 12 major steps, with each step no longer than 5,000 characters.",
    };
  }
  if (!input.reviewedBaseline) {
    return {
      ok: false,
      code: "invalid",
      message:
        "Confirm that you reviewed this shared working baseline and want to preserve the remaining questions.",
    };
  }

  const ownerRoleId = roleIdFromKey(input.ownerRoleKey);
  if (input.ownerRoleKey && !ownerRoleId) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Owner Role or leave ownership unassigned.",
    };
  }
  if (ownerRoleId && !input.ownerConfirmed) {
    return {
      ok: false,
      code: "invalid",
      message: "Confirm the intended Owner Role before creating the baseline.",
    };
  }

  const familyStableKey = input.processFamilyStableKey?.trim() || null;
  if (familyStableKey && !validUuid(familyStableKey)) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Process Family or leave the Family unassigned.",
    };
  }
  if (familyStableKey && !input.familyConfirmed) {
    return {
      ok: false,
      code: "invalid",
      message: "Confirm the intended Process Family before creating the baseline.",
    };
  }

  let configuration: EnabledOperatingModelAuthoringConfiguration;
  try {
    configuration = await authoringAccess();
  } catch {
    return unavailable();
  }

  let review: Awaited<ReturnType<typeof loadDiscoveryInquiryReview>>;
  let latestReview: Awaited<ReturnType<typeof loadDiscoveryInquiryReview>>;
  try {
    [review, latestReview] = await Promise.all([
      loadDiscoveryInquiryReview(
        configuration.organizationId,
        input.inquiryId,
        input.sessionId,
        input.reviewId,
      ),
      loadDiscoveryInquiryReview(
        configuration.organizationId,
        input.inquiryId,
        input.sessionId,
      ),
    ]);
  } catch {
    return unavailable();
  }
  if (!review || !latestReview || latestReview.id !== review.id) {
    return {
      ok: false,
      code: "conflict",
      message:
        "This is no longer the latest human review. Open the latest review before creating a baseline.",
    };
  }
  if (!review.outcomes.some((outcome) => outcome.kind === "possible_new_process")) {
    return {
      ok: false,
      code: "invalid",
      message:
        "The latest human review does not classify this understanding as a possible new Process.",
    };
  }

  const stepDrafts = steps.map((instructions, index) => ({
    instructions,
    position: index + 1,
    title: instructions.length <= 255
      ? instructions
      : `${instructions.slice(0, 252).trimEnd()}...`,
  }));
  const effectiveAt = new Date().toISOString();
  const reason =
    "Created a human-reviewed minimum viable Process baseline from preserved Discovery evidence.";

  try {
    const rows = await atomicQuery(
      configuration,
      `with selected_role as (
         select id, name
         from roles
         where organization_id = $1
           and id = $2::integer
           and status = 'active'
       ), selected_family as (
         select id, organization_id, stable_key, name
         from process_families
         where organization_id = $1
           and stable_key = $3::uuid
           and status = 'active'
       ), duplicate_process as (
         select id
         from processes
         where organization_id = $1
           and lower(btrim(name)) = lower(btrim($4))
         limit 1
       ), duplicate_source as (
         select id
         from operating_model_changes
         where organization_id = $1
           and change_action = 'create_draft'
           and after_state ->> 'sourceInquiryReviewStableKey' = $5
         limit 1
       ), inserted_process as (
         insert into processes (
           organization_id, name, purpose, owner_role_id, status
         )
         select $1, $4, $6,
           case when $2::integer is null then null
             else (select id from selected_role) end,
           'draft'
         where not exists (select 1 from duplicate_process)
           and not exists (select 1 from duplicate_source)
           and ($2::integer is null or exists (select 1 from selected_role))
           and ($3::uuid is null or exists (select 1 from selected_family))
         returning id, organization_id, stable_key, name, purpose,
           owner_role_id, status
       ), process_history as (
         insert into operating_model_changes (
           organization_id, process_id, process_stable_key, entity_type,
           target_reference, change_kind, change_action, before_state,
           after_state, reason, effective_at, actor_identifier
         )
         select process.organization_id, process.id, process.stable_key,
           'process', 'process:' || process.stable_key::text,
           'organizational_change', 'create_draft', '{}'::jsonb,
           jsonb_build_object(
             'name', process.name,
             'purpose', process.purpose,
             'ownerRoleId', case when process.owner_role_id is null then null
               else 'role:' || process.owner_role_id::text end,
             'ownerRoleName', (select name from selected_role),
             'status', process.status,
             'baselineKind', 'minimum_viable',
             'sourceInquiryStableKey', $7,
             'sourceInquirySessionStableKey', $8,
             'sourceInquiryReviewStableKey', $5,
             'unresolvedEvidencePreserved', true
           ),
           $9, $10::timestamptz, $11
         from inserted_process process
         returning 1
       ), step_input as (
         select *
         from jsonb_to_recordset($12::jsonb)
           as item(position integer, title text, instructions text)
       ), inserted_steps as (
         insert into process_steps (
           organization_id, process_id, position, title, instructions,
           responsible_role_id
         )
         select process.organization_id, process.id, input.position,
           input.title, input.instructions, null
         from inserted_process process cross join step_input input
         order by input.position
         returning id, organization_id, process_id, stable_key, position,
           title, instructions, responsible_role_id
       ), step_history as (
         insert into operating_model_changes (
           organization_id, process_id, process_stable_key, process_step_id,
           process_step_stable_key, entity_type, target_reference,
           change_kind, change_action, before_state, after_state, reason,
           effective_at, actor_identifier
         )
         select step.organization_id, process.id, process.stable_key,
           step.id, step.stable_key, 'process_step',
           'process_step:' || step.stable_key::text,
           'organizational_change', 'create_step', '{}'::jsonb,
           jsonb_build_object(
             'stableKey', step.stable_key,
             'position', step.position,
             'title', step.title,
             'instructions', step.instructions,
             'responsibleRoleId', null,
             'responsibleRoleName', null,
             'responsibilityBasis', case when process.owner_role_id is null
               then 'unclear' else 'inherited' end,
             'baselineKind', 'minimum_viable',
             'sourceInquiryReviewStableKey', $5
           ),
           $9, $10::timestamptz, $11
         from inserted_steps step
         join inserted_process process on process.id = step.process_id
         returning 1
       ), touched_family as (
         update process_families family
         set updated_at = clock_timestamp()
         from selected_family selected cross join inserted_process process
         where family.id = selected.id
           and family.organization_id = selected.organization_id
           and family.stable_key = selected.stable_key
         returning family.id, family.organization_id, family.stable_key,
           family.name
       ), inserted_membership as (
         insert into process_family_memberships (
           organization_id, process_family_id, process_id, status,
           effective_from
         )
         select process.organization_id, family.id, process.id, 'active',
           $10::timestamptz
         from inserted_process process cross join touched_family family
         returning id, organization_id, stable_key, process_family_id,
           process_id, status, effective_from
       ), family_history as (
         insert into operating_model_changes (
           organization_id, process_id, process_stable_key,
           process_family_id, process_family_stable_key,
           process_family_membership_id,
           process_family_membership_stable_key, entity_type,
           target_reference, change_kind, change_action, before_state,
           after_state, reason, effective_at, actor_identifier
         )
         select membership.organization_id, process.id, process.stable_key,
           family.id, family.stable_key, membership.id,
           membership.stable_key, 'process_family_membership',
           'process-family-membership:' || membership.stable_key::text,
           'organizational_change', 'add_process_family_membership',
           '{}'::jsonb,
           jsonb_build_object(
             'familyStableKey', family.stable_key,
             'familyName', family.name,
             'processStableKey', process.stable_key,
             'status', membership.status,
             'effectiveFrom', membership.effective_from,
             'baselineKind', 'minimum_viable',
             'sourceInquiryReviewStableKey', $5
           ),
           $9, $10::timestamptz, $11
         from inserted_membership membership
         join inserted_process process on process.id = membership.process_id
         join touched_family family on family.id = membership.process_family_id
         returning 1
       )
       select
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from selected_family) as family_count,
         (select count(*)::int from duplicate_process) as duplicate_count,
         (select count(*)::int from duplicate_source) as source_count,
         (select count(*)::int from process_history) as process_history_count,
         (select count(*)::int from inserted_steps) as step_count,
         (select count(*)::int from step_history) as step_history_count,
         (select count(*)::int from inserted_membership) as membership_count,
         (select count(*)::int from family_history) as family_history_count,
         (select id from inserted_process) as process_id`,
      [
        configuration.organizationId,
        ownerRoleId,
        familyStableKey,
        name,
        input.reviewId,
        purpose,
        input.inquiryId,
        input.sessionId,
        reason,
        effectiveAt,
        configuration.actorIdentifier,
        JSON.stringify(stepDrafts),
      ],
    );
    const row = rows[0] ?? {};
    if (Number(row.source_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "This human review already created a shared working baseline.",
      };
    }
    if (Number(row.duplicate_count ?? 0) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "A Process with this name already exists in the Organization.",
      };
    }
    if (ownerRoleId && Number(row.role_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Owner Role was not found in this Organization.",
      };
    }
    if (familyStableKey && Number(row.family_count ?? 0) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Process Family was not found in this Organization.",
      };
    }

    const processId = Number(row.process_id ?? 0);
    const expectedMembershipCount = familyStableKey ? 1 : 0;
    if (
      !Number.isSafeInteger(processId)
      || processId < 1
      || Number(row.process_history_count ?? 0) !== 1
      || Number(row.step_count ?? 0) !== stepDrafts.length
      || Number(row.step_history_count ?? 0) !== stepDrafts.length
      || Number(row.membership_count ?? 0) !== expectedMembershipCount
      || Number(row.family_history_count ?? 0) !== expectedMembershipCount
    ) {
      return unavailable();
    }

    return {
      ok: true,
      message:
        "Shared working Process baseline created. It remains a Draft and its unanswered questions are still preserved.",
      processId: `process:${processId}`,
    };
  } catch {
    return unavailable();
  }
}
