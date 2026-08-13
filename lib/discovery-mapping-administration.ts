import "server-only";

import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

import { requireWorkspaceAccess } from "./authentication";
import type { DiscoveryMutationResult } from "./discovery-administration";
import type { DiscoveryMappingAction } from "./discovery-mapping-model.mjs";
import { DISCOVERY_MAPPING_ACTIONS } from "./discovery-mapping-model.mjs";
import type { DocumentedProcessSnapshot } from "./discovery-proposal-model.mjs";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";

const ACTIONS = new Set<DiscoveryMappingAction>(DISCOVERY_MAPPING_ACTIONS);

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function logMappingFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const safeValue = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

  console.error("[discovery-mapping] database operation failed", {
    code: safeValue(details.code),
    constraint: safeValue(details.constraint),
    operation,
    routine: safeValue(details.routine),
    table: safeValue(details.table),
  });
}

async function mappingWriteContext() {
  const runtimeAccess = await requireWorkspaceAccess();
  const configuration = resolveDiscoveryConfiguration(process.env, runtimeAccess);
  if (!configuration.enabled) return null;
  return {
    configuration,
    sql: neon(configuration.databaseUrl, {
      isolationLevel: "Serializable",
      readOnly: false,
    }),
  };
}

export function fingerprintDocumentedProcessSnapshot(
  snapshot: DocumentedProcessSnapshot,
) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function validateMappingInput(input: {
  action: DiscoveryMappingAction;
  expectedMappingRevision: number;
  itemId: string;
  observationIds: string[];
  ownerRoleId: string;
  proposedPurpose: string;
  rationale: string;
  sessionId: string;
  unresolvedQuestion: string;
}) {
  const rationale = input.rationale.trim();
  const proposedPurpose = input.proposedPurpose.trim();
  const unresolvedQuestion = input.unresolvedQuestion.trim();
  const itemId = input.itemId.trim();
  const ownerRoleId = input.ownerRoleId.trim();
  const observationIds = [...new Set(input.observationIds.map((item) => item.trim()))];
  if (
    !ACTIONS.has(input.action) ||
    !validUuid(input.sessionId) ||
    !Number.isSafeInteger(input.expectedMappingRevision) ||
    input.expectedMappingRevision < 0 ||
    (itemId.length > 0 && !validUuid(itemId)) ||
    observationIds.length < 1 ||
    observationIds.length > 100 ||
    observationIds.some((item) => !validUuid(item)) ||
    rationale.length < 1 ||
    rationale.length > 2000
  ) return null;

  if (
    input.action === "update_process_purpose" &&
    (proposedPurpose.length < 1 || proposedPurpose.length > 10000)
  ) return null;
  if (
    input.action === "change_process_owner" &&
    ownerRoleId.length > 0 &&
    !validUuid(ownerRoleId)
  ) return null;
  if (
    input.action === "preserve_unresolved" &&
    (unresolvedQuestion.length < 1 || unresolvedQuestion.length > 2000)
  ) return null;

  return {
    itemId: itemId || null,
    observationIds,
    ownerRoleId: ownerRoleId || null,
    proposedPurpose: proposedPurpose || null,
    rationale,
    unresolvedQuestion: unresolvedQuestion || null,
  };
}

export async function saveDiscoveryMappingItem(input: {
  action: DiscoveryMappingAction;
  currentProcessFingerprint: string;
  expectedMappingRevision: number;
  itemId: string;
  observationIds: string[];
  ownerRoleId: string;
  proposedPurpose: string;
  rationale: string;
  sessionId: string;
  unresolvedQuestion: string;
}): Promise<DiscoveryMutationResult> {
  const validated = validateMappingInput(input);
  if (
    !validated ||
    !/^[0-9a-f]{64}$/.test(input.currentProcessFingerprint)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "Review the proposed change and try again.",
    };
  }
  const context = await mappingWriteContext();
  if (!context) {
    return {
      ok: false,
      code: "unavailable",
      message: "Guided Discovery is not enabled.",
    };
  }

  try {
    if (input.expectedMappingRevision === 0) {
      if (validated.itemId) {
        return {
          ok: false,
          code: "invalid",
          message: "This proposal item reference is invalid.",
        };
      }
      const rows = await context.sql.query(
        `with selected_proposal as materialized (
           select proposal.id as proposal_id, proposal.organization_id,
             proposal.stable_key as proposal_stable_key,
             proposal.session_id, proposal.session_stable_key,
             proposal.process_id, proposal.process_stable_key,
             process.purpose, process.status,
             current_role.stable_key as current_owner_role_stable_key,
             current_role.name as current_owner_role_name
           from discovery_proposals proposal
           join processes process
             on process.id = proposal.process_id
            and process.organization_id = proposal.organization_id
            and process.stable_key = proposal.process_stable_key
           left join roles current_role
             on current_role.id = process.owner_role_id
            and current_role.organization_id = process.organization_id
           where proposal.organization_id = $1::integer
             and proposal.session_stable_key = $2::uuid
             and proposal.status = 'ready_for_review'
             and proposal.documented_process_fingerprint = $3::varchar(64)
         ), selected_observations as materialized (
           select observation.stable_key
           from discovery_observations observation
           join selected_proposal proposal
             on proposal.session_id = observation.session_id
            and proposal.organization_id = observation.organization_id
            and proposal.session_stable_key = observation.session_stable_key
           join lateral (
             select decision.disposition
             from discovery_proposal_decisions decision
             where decision.proposal_id = proposal.proposal_id
               and decision.organization_id = proposal.organization_id
               and decision.proposal_stable_key = proposal.proposal_stable_key
               and decision.observation_stable_key = observation.stable_key
             order by decision.decision_sequence desc
             limit 1
           ) current_decision on current_decision.disposition = 'use_in_proposal'
           where observation.stable_key = any($4::uuid[])
             and not exists (
               select 1 from discovery_observations later
               where later.organization_id = observation.organization_id
                 and later.session_id = observation.session_id
                 and later.supersedes_observation_stable_key = observation.stable_key
             )
         ), selected_role as (
           select role.id, role.stable_key, role.name
           from roles role
           join selected_proposal proposal
             on proposal.organization_id = role.organization_id
           where role.stable_key = $6::uuid and role.status = 'active'
         ), validated_proposal as (
           select proposal.*
           from selected_proposal proposal
           where (select count(*) from selected_observations) = cardinality($4::uuid[])
             and (
               $5::discovery_mapping_action <> 'change_process_owner'
               or ($6::uuid is null and proposal.status = 'draft')
               or ($6::uuid is not null and exists (select 1 from selected_role))
             )
             and (
               ($5::discovery_mapping_action = 'update_process_purpose'
                 and $7::text is distinct from proposal.purpose)
               or ($5::discovery_mapping_action = 'change_process_owner'
                 and $6::uuid is distinct from proposal.current_owner_role_stable_key)
               or $5::discovery_mapping_action = 'preserve_unresolved'
             )
         ), inserted_mapping as (
           insert into discovery_proposal_mappings (
             organization_id, proposal_id, proposal_stable_key, session_id,
             session_stable_key, process_id, process_stable_key,
             actor_identifier
           )
           select organization_id, proposal_id, proposal_stable_key,
             session_id, session_stable_key, process_id, process_stable_key,
             $10::varchar(128)
           from validated_proposal
           on conflict (proposal_id) do nothing
           returning id, organization_id, stable_key, session_id,
             session_stable_key
         ), inserted_item as (
           insert into discovery_mapping_items (
             organization_id, mapping_id, mapping_stable_key, item_sequence,
             action, owner_role_id, owner_role_stable_key, before_state,
             proposed_state, rationale, actor_identifier
           )
           select mapping.organization_id, mapping.id, mapping.stable_key, 1,
             $5::discovery_mapping_action,
             case when $5::discovery_mapping_action = 'change_process_owner'
               then selected_role.id else null end,
             case when $5::discovery_mapping_action = 'change_process_owner'
               then selected_role.stable_key else null end,
             case
               when $5::discovery_mapping_action = 'update_process_purpose'
                 then jsonb_build_object('purpose', proposal.purpose)
               when $5::discovery_mapping_action = 'change_process_owner'
                 then jsonb_build_object(
                   'ownerRoleStableKey', proposal.current_owner_role_stable_key,
                   'ownerRoleName', proposal.current_owner_role_name)
               else '{}'::jsonb
             end,
             case
               when $5::discovery_mapping_action = 'update_process_purpose'
                 then jsonb_build_object('purpose', $7::text)
               when $5::discovery_mapping_action = 'change_process_owner'
                 then jsonb_build_object(
                   'ownerRoleStableKey', selected_role.stable_key,
                   'ownerRoleName', selected_role.name)
               else jsonb_build_object('question', $8::text)
             end,
             $9::text, $10::varchar(128)
           from inserted_mapping mapping
           join validated_proposal proposal on true
           left join selected_role on true
           returning id, organization_id, stable_key, mapping_id,
             mapping_stable_key
         ), inserted_sources as (
           insert into discovery_mapping_sources (
             organization_id, mapping_id, mapping_stable_key,
             item_revision_id, item_revision_stable_key, session_id,
             session_stable_key, observation_stable_key
           )
           select item.organization_id, item.mapping_id,
             item.mapping_stable_key, item.id, item.stable_key,
             mapping.session_id, mapping.session_stable_key,
             observation.stable_key
           from inserted_item item
           join inserted_mapping mapping on mapping.id = item.mapping_id
           cross join selected_observations observation
           returning 1
         )
         select
           (select count(*)::int from selected_proposal) as proposal_count,
           (select count(*)::int from selected_observations) as observation_count,
           (select count(*)::int from inserted_mapping) as mapping_count,
           (select count(*)::int from inserted_item) as item_count,
           (select count(*)::int from inserted_sources) as source_count`,
        [
          context.configuration.organizationId,
          input.sessionId,
          input.currentProcessFingerprint,
          validated.observationIds,
          input.action,
          validated.ownerRoleId,
          validated.proposedPurpose,
          validated.unresolvedQuestion,
          validated.rationale,
          context.configuration.actorIdentifier,
        ],
      );
      const row = rows[0];
      if (
        !row ||
        Number(row.proposal_count) !== 1 ||
        Number(row.observation_count) !== validated.observationIds.length ||
        Number(row.mapping_count) !== 1 ||
        Number(row.item_count) !== 1 ||
        Number(row.source_count) !== validated.observationIds.length
      ) {
        return {
          ok: false,
          code: "conflict",
          message: "The evidence or documented Process changed. Reload before continuing.",
        };
      }
    } else {
      const rows = await context.sql.query(
        `with selected_mapping as materialized (
           select mapping.id, mapping.organization_id, mapping.stable_key,
             mapping.session_id, mapping.session_stable_key,
             proposal.id as proposal_id, proposal.stable_key as proposal_stable_key,
             process.purpose, process.status,
             current_role.stable_key as current_owner_role_stable_key,
             current_role.name as current_owner_role_name
           from discovery_proposal_mappings mapping
           join discovery_proposals proposal
             on proposal.id = mapping.proposal_id
            and proposal.organization_id = mapping.organization_id
            and proposal.stable_key = mapping.proposal_stable_key
           join processes process
             on process.id = mapping.process_id
            and process.organization_id = mapping.organization_id
            and process.stable_key = mapping.process_stable_key
           left join roles current_role
             on current_role.id = process.owner_role_id
            and current_role.organization_id = process.organization_id
           where mapping.organization_id = $1::integer
             and mapping.session_stable_key = $2::uuid
             and mapping.revision = $3::integer
             and mapping.status = 'draft'
             and proposal.status = 'ready_for_review'
             and proposal.documented_process_fingerprint = $4::varchar(64)
           for update of mapping
         ), selected_observations as materialized (
           select observation.stable_key
           from discovery_observations observation
           join selected_mapping mapping
             on mapping.session_id = observation.session_id
            and mapping.organization_id = observation.organization_id
            and mapping.session_stable_key = observation.session_stable_key
           join lateral (
             select decision.disposition
             from discovery_proposal_decisions decision
             where decision.proposal_id = mapping.proposal_id
               and decision.organization_id = mapping.organization_id
               and decision.proposal_stable_key = mapping.proposal_stable_key
               and decision.observation_stable_key = observation.stable_key
             order by decision.decision_sequence desc
             limit 1
           ) current_decision on current_decision.disposition = 'use_in_proposal'
           where observation.stable_key = any($5::uuid[])
             and not exists (
               select 1 from discovery_observations later
               where later.organization_id = observation.organization_id
                 and later.session_id = observation.session_id
                 and later.supersedes_observation_stable_key = observation.stable_key
             )
         ), selected_role as (
           select role.id, role.stable_key, role.name
           from roles role
           join selected_mapping mapping
             on mapping.organization_id = role.organization_id
           where role.stable_key = $7::uuid and role.status = 'active'
         ), current_item as (
           select item.item_stable_key, item.item_sequence, item.action
           from discovery_mapping_items item
           join selected_mapping mapping
             on mapping.id = item.mapping_id
            and mapping.organization_id = item.organization_id
            and mapping.stable_key = item.mapping_stable_key
           where item.item_stable_key = $6::uuid
           order by item.item_sequence desc
           limit 1
         ), validated_mapping as (
           select mapping.*
           from selected_mapping mapping
           where (select count(*) from selected_observations) = cardinality($5::uuid[])
             and ($6::uuid is null or exists (select 1 from current_item))
             and ($6::uuid is null or (select action from current_item) = $8::discovery_mapping_action)
             and (
               $8::discovery_mapping_action <> 'change_process_owner'
               or ($7::uuid is null and mapping.status = 'draft')
               or ($7::uuid is not null and exists (select 1 from selected_role))
             )
             and (
               ($8::discovery_mapping_action = 'update_process_purpose'
                 and $9::text is distinct from mapping.purpose)
               or ($8::discovery_mapping_action = 'change_process_owner'
                 and $7::uuid is distinct from mapping.current_owner_role_stable_key)
               or $8::discovery_mapping_action = 'preserve_unresolved'
             )
         ), item_identity as (
           select coalesce(
               (select item_stable_key from current_item), gen_random_uuid()
             ) as item_stable_key,
             coalesce((select item_sequence from current_item), 0) + 1 as item_sequence
           from validated_mapping
         ), inserted_item as (
           insert into discovery_mapping_items (
             organization_id, mapping_id, mapping_stable_key,
             item_stable_key, item_sequence, action, owner_role_id,
             owner_role_stable_key, before_state, proposed_state, rationale,
             actor_identifier
           )
           select mapping.organization_id, mapping.id, mapping.stable_key,
             identity.item_stable_key, identity.item_sequence,
             $8::discovery_mapping_action,
             case when $8::discovery_mapping_action = 'change_process_owner'
               then selected_role.id else null end,
             case when $8::discovery_mapping_action = 'change_process_owner'
               then selected_role.stable_key else null end,
             case
               when $8::discovery_mapping_action = 'update_process_purpose'
                 then jsonb_build_object('purpose', mapping.purpose)
               when $8::discovery_mapping_action = 'change_process_owner'
                 then jsonb_build_object(
                   'ownerRoleStableKey', mapping.current_owner_role_stable_key,
                   'ownerRoleName', mapping.current_owner_role_name)
               else '{}'::jsonb
             end,
             case
               when $8::discovery_mapping_action = 'update_process_purpose'
                 then jsonb_build_object('purpose', $9::text)
               when $8::discovery_mapping_action = 'change_process_owner'
                 then jsonb_build_object(
                   'ownerRoleStableKey', selected_role.stable_key,
                   'ownerRoleName', selected_role.name)
               else jsonb_build_object('question', $10::text)
             end,
             $11::text, $12::varchar(128)
           from validated_mapping mapping
           cross join item_identity identity
           left join selected_role on true
           returning id, organization_id, stable_key, mapping_id,
             mapping_stable_key
         ), inserted_sources as (
           insert into discovery_mapping_sources (
             organization_id, mapping_id, mapping_stable_key,
             item_revision_id, item_revision_stable_key, session_id,
             session_stable_key, observation_stable_key
           )
           select item.organization_id, item.mapping_id,
             item.mapping_stable_key, item.id, item.stable_key,
             mapping.session_id, mapping.session_stable_key,
             observation.stable_key
           from inserted_item item
           join validated_mapping mapping on mapping.id = item.mapping_id
           cross join selected_observations observation
           returning 1
         ), advanced as (
           update discovery_proposal_mappings
           set revision = revision + 1,
             updated_at = transaction_timestamp()
           where id = (select id from validated_mapping)
             and exists (select 1 from inserted_item)
             and (select count(*) from inserted_sources) = cardinality($5::uuid[])
           returning 1
         )
         select
           (select count(*)::int from selected_mapping) as mapping_count,
           (select count(*)::int from selected_observations) as observation_count,
           (select count(*)::int from inserted_item) as item_count,
           (select count(*)::int from inserted_sources) as source_count,
           (select count(*)::int from advanced) as advanced_count`,
        [
          context.configuration.organizationId,
          input.sessionId,
          input.expectedMappingRevision,
          input.currentProcessFingerprint,
          validated.observationIds,
          validated.itemId,
          validated.ownerRoleId,
          input.action,
          validated.proposedPurpose,
          validated.unresolvedQuestion,
          validated.rationale,
          context.configuration.actorIdentifier,
        ],
      );
      const row = rows[0];
      if (
        !row ||
        Number(row.mapping_count) !== 1 ||
        Number(row.observation_count) !== validated.observationIds.length ||
        Number(row.item_count) !== 1 ||
        Number(row.source_count) !== validated.observationIds.length ||
        Number(row.advanced_count) !== 1
      ) {
        return {
          ok: false,
          code: "conflict",
          message: "The proposal, evidence, or documented Process changed. Reload before continuing.",
        };
      }
    }
    return {
      ok: true,
      message: "Proposed change saved. The documented Process has not changed.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logMappingFailure("save_item", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not save this proposed change safely. No partial change was retained.",
    };
  }
}

export async function changeDiscoveryMappingItemState(input: {
  expectedMappingRevision: number;
  itemId: string;
  rationale: string;
  sessionId: string;
  state: "active" | "withdrawn";
}): Promise<DiscoveryMutationResult> {
  const rationale = input.rationale.trim();
  if (
    !validUuid(input.sessionId) ||
    !validUuid(input.itemId) ||
    !Number.isSafeInteger(input.expectedMappingRevision) ||
    input.expectedMappingRevision < 1 ||
    !["active", "withdrawn"].includes(input.state) ||
    rationale.length < 1 ||
    rationale.length > 2000
  ) {
    return { ok: false, code: "invalid", message: "Explain this change and try again." };
  }
  const context = await mappingWriteContext();
  if (!context) {
    return { ok: false, code: "unavailable", message: "Guided Discovery is not enabled." };
  }
  try {
    const rows = await context.sql.query(
      `with selected_mapping as materialized (
         select id, organization_id, stable_key, session_id, session_stable_key
         from discovery_proposal_mappings
         where organization_id = $1::integer
           and session_stable_key = $2::uuid
           and revision = $3::integer
           and status = 'draft'
         for update
       ), current_item as materialized (
         select item.*
         from discovery_mapping_items item
         join selected_mapping mapping
           on mapping.id = item.mapping_id
          and mapping.organization_id = item.organization_id
          and mapping.stable_key = item.mapping_stable_key
         where item.item_stable_key = $4::uuid
         order by item.item_sequence desc
         limit 1
       ), inserted_item as (
         insert into discovery_mapping_items (
           organization_id, mapping_id, mapping_stable_key, item_stable_key,
           item_sequence, state, action, owner_role_id,
           owner_role_stable_key, before_state, proposed_state, rationale,
           actor_identifier
         )
         select item.organization_id, item.mapping_id,
           item.mapping_stable_key, item.item_stable_key,
           item.item_sequence + 1, $5::discovery_mapping_item_state,
           item.action, item.owner_role_id, item.owner_role_stable_key,
           item.before_state, item.proposed_state, $6::text,
           $7::varchar(128)
         from current_item item
         where item.state is distinct from $5::discovery_mapping_item_state
         returning id, organization_id, stable_key, mapping_id,
           mapping_stable_key
       ), inserted_sources as (
         insert into discovery_mapping_sources (
           organization_id, mapping_id, mapping_stable_key,
           item_revision_id, item_revision_stable_key, session_id,
           session_stable_key, observation_stable_key
         )
         select inserted.organization_id, inserted.mapping_id,
           inserted.mapping_stable_key, inserted.id, inserted.stable_key,
           mapping.session_id, mapping.session_stable_key,
           source.observation_stable_key
         from inserted_item inserted
         join selected_mapping mapping on mapping.id = inserted.mapping_id
         join current_item item on item.mapping_id = inserted.mapping_id
         join discovery_mapping_sources source
           on source.item_revision_id = item.id
          and source.organization_id = item.organization_id
          and source.item_revision_stable_key = item.stable_key
         returning 1
       ), advanced as (
         update discovery_proposal_mappings
         set revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_mapping)
           and exists (select 1 from inserted_item)
           and exists (select 1 from inserted_sources)
         returning 1
       )
       select
         (select count(*)::int from current_item) as item_count,
         (select count(*)::int from inserted_item) as inserted_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.expectedMappingRevision,
        input.itemId,
        input.state,
        rationale,
        context.configuration.actorIdentifier,
      ],
    );
    const row = rows[0];
    if (
      !row ||
      Number(row.item_count) !== 1 ||
      Number(row.inserted_count) !== 1 ||
      Number(row.advanced_count) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message: "This proposed change changed after the page loaded. Reload before continuing.",
      };
    }
    return {
      ok: true,
      message: input.state === "withdrawn"
        ? "Proposed change withdrawn. Its history remains available."
        : "Proposed change restored. Its earlier history remains available.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logMappingFailure("change_item_state", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not update this proposal item safely. No partial change was retained.",
    };
  }
}

export async function finishDiscoveryProposalMapping(input: {
  currentProcessFingerprint: string;
  expectedMappingRevision: number;
  sessionId: string;
}): Promise<DiscoveryMutationResult> {
  if (
    !validUuid(input.sessionId) ||
    !Number.isSafeInteger(input.expectedMappingRevision) ||
    input.expectedMappingRevision < 1 ||
    !/^[0-9a-f]{64}$/.test(input.currentProcessFingerprint)
  ) {
    return { ok: false, code: "invalid", message: "The proposal reference is invalid." };
  }
  const context = await mappingWriteContext();
  if (!context) {
    return { ok: false, code: "unavailable", message: "Guided Discovery is not enabled." };
  }
  try {
    const rows = await context.sql.query(
      `with selected_mapping as materialized (
         select mapping.id, mapping.organization_id, mapping.stable_key,
           mapping.proposal_id, mapping.proposal_stable_key
         from discovery_proposal_mappings mapping
         join discovery_proposals proposal
           on proposal.id = mapping.proposal_id
          and proposal.organization_id = mapping.organization_id
          and proposal.stable_key = mapping.proposal_stable_key
         where mapping.organization_id = $1::integer
           and mapping.session_stable_key = $2::uuid
           and mapping.revision = $3::integer
           and mapping.status = 'draft'
           and proposal.status = 'ready_for_review'
           and proposal.documented_process_fingerprint = $4::varchar(64)
         for update of mapping
       ), current_items as (
         select distinct on (item.item_stable_key)
           item.id, item.organization_id, item.stable_key,
           item.mapping_id, item.mapping_stable_key, item.item_stable_key,
           item.state, item.action, item.owner_role_id
         from discovery_mapping_items item
         join selected_mapping mapping
           on mapping.id = item.mapping_id
          and mapping.organization_id = item.organization_id
          and mapping.stable_key = item.mapping_stable_key
         order by item.item_stable_key, item.item_sequence desc
       ), active_items as (
         select * from current_items where state = 'active'
       ), included_observations as (
         select decision.observation_stable_key
         from (
           select distinct on (decision.observation_stable_key)
             decision.observation_stable_key, decision.disposition
           from discovery_proposal_decisions decision
           join selected_mapping mapping
             on mapping.proposal_id = decision.proposal_id
            and mapping.organization_id = decision.organization_id
            and mapping.proposal_stable_key = decision.proposal_stable_key
           order by decision.observation_stable_key,
             decision.decision_sequence desc
         ) decision
         where decision.disposition = 'use_in_proposal'
       ), covered_observations as (
         select distinct source.observation_stable_key
         from discovery_mapping_sources source
         join active_items item
           on item.id = source.item_revision_id
          and item.organization_id = source.organization_id
          and item.stable_key = source.item_revision_stable_key
       ), conflicts as (
         select action
         from active_items
         where action <> 'preserve_unresolved'
         group by action
         having count(*) > 1
       ), invalid_roles as (
         select item.id
         from active_items item
         left join roles role
           on role.id = item.owner_role_id
          and role.organization_id = item.organization_id
         where item.action = 'change_process_owner'
           and item.owner_role_id is not null
           and (role.id is null or role.status <> 'active')
       ), summary as (
         select
           (select count(*)::int from active_items) as active_count,
           (select count(*)::int from included_observations) as included_count,
           (select count(*)::int from included_observations included
             where not exists (
               select 1 from covered_observations covered
               where covered.observation_stable_key = included.observation_stable_key
             )) as uncovered_count,
           (select count(*)::int from conflicts) as conflict_count,
           (select count(*)::int from invalid_roles) as invalid_role_count
       ), advanced as (
         update discovery_proposal_mappings
         set status = 'ready_for_proposal_review',
           revision = revision + 1,
           ready_at = transaction_timestamp(),
           ready_by_actor = $5::varchar(128),
           updated_at = transaction_timestamp()
         where id = (select id from selected_mapping)
           and (select active_count from summary) > 0
           and (select included_count from summary) > 0
           and (select uncovered_count from summary) = 0
           and (select conflict_count from summary) = 0
           and (select invalid_role_count from summary) = 0
         returning 1
       )
       select summary.*,
         (select count(*)::int from selected_mapping) as mapping_count,
         (select count(*)::int from advanced) as advanced_count
       from summary`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.expectedMappingRevision,
        input.currentProcessFingerprint,
        context.configuration.actorIdentifier,
      ],
    );
    const row = rows[0];
    if (!row || Number(row.advanced_count) !== 1) {
      if (!row || Number(row.mapping_count) !== 1) {
        return {
          ok: false,
          code: "conflict",
          message: "The documented Process or proposal changed. Reload before finishing.",
        };
      }
      const uncovered = Number(row.uncovered_count);
      if (uncovered > 0) {
        return {
          ok: false,
          code: "invalid",
          message: `${uncovered} included ${uncovered === 1 ? "answer still needs" : "answers still need"} a proposed change or an unresolved question.`,
        };
      }
      if (Number(row.conflict_count) > 0) {
        return {
          ok: false,
          code: "invalid",
          message: "Resolve the competing purpose or Owner Role proposals before finishing.",
        };
      }
      return {
        ok: false,
        code: "invalid",
        message: "Add at least one valid proposal item before finishing.",
      };
    }
    return {
      ok: true,
      message: "Specific changes are ready for proposal review. Nothing has been approved or applied.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logMappingFailure("finish_mapping", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not finish these proposed changes safely. No partial change was retained.",
    };
  }
}
