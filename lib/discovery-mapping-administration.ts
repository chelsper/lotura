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
const SLICE_2_ACTIONS = new Set<DiscoveryMappingAction>([
  "add_process_dependency",
  "add_process_exception",
  "add_process_step",
  "change_step_responsibility",
  "link_existing_system",
  "revise_process_exception",
  "revise_process_step",
]);

const DEPENDENCY_DIRECTIONS = new Set(["upstream", "downstream"]);
const DEPENDENCY_TYPES = new Set([
  "requires",
  "receives_from",
  "provides_to",
  "triggers",
]);

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
  const code = safeValue(details.code);

  console.error("[discovery-mapping] database operation failed", {
    code,
    constraint: safeValue(details.constraint),
    message: code === "42601" ? safeValue(details.message) : undefined,
    operation,
    position: code === "42601" ? safeValue(details.position) : undefined,
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

type Slice2MappingInput = {
  action: DiscoveryMappingAction;
  currentProcessFingerprint: string;
  dependencyDescription: string;
  dependencyDirection: string;
  dependencyType: string;
  exceptionCondition: string;
  exceptionId: string;
  exceptionName: string;
  exceptionResponse: string;
  expectedMappingRevision: number;
  itemId: string;
  observationIds: string[];
  processStepId: string;
  proposedStepInstructions: string;
  proposedStepPosition: number;
  proposedStepTitle: string;
  rationale: string;
  relatedProcessId: string;
  responsibleRoleId: string;
  sessionId: string;
  systemId: string;
  systemUsage: string;
};

function validateSlice2MappingInput(input: Slice2MappingInput) {
  if (!SLICE_2_ACTIONS.has(input.action)) return null;
  const trimmed = {
    dependencyDescription: input.dependencyDescription.trim(),
    exceptionCondition: input.exceptionCondition.trim(),
    exceptionId: input.exceptionId.trim(),
    exceptionName: input.exceptionName.trim(),
    exceptionResponse: input.exceptionResponse.trim(),
    itemId: input.itemId.trim(),
    processStepId: input.processStepId.trim(),
    proposedStepInstructions: input.proposedStepInstructions.trim(),
    proposedStepTitle: input.proposedStepTitle.trim(),
    rationale: input.rationale.trim(),
    relatedProcessId: input.relatedProcessId.trim(),
    responsibleRoleId: input.responsibleRoleId.trim(),
    systemId: input.systemId.trim(),
    systemUsage: input.systemUsage.trim(),
  };
  const observationIds = [...new Set(input.observationIds.map((id) => id.trim()))];
  const optionalIds = [
    trimmed.exceptionId,
    trimmed.itemId,
    trimmed.processStepId,
    trimmed.relatedProcessId,
    trimmed.responsibleRoleId,
    trimmed.systemId,
  ];
  if (
    !validUuid(input.sessionId) ||
    !Number.isSafeInteger(input.expectedMappingRevision) ||
    input.expectedMappingRevision < 0 ||
    !/^[0-9a-f]{64}$/.test(input.currentProcessFingerprint) ||
    optionalIds.some((id) => id.length > 0 && !validUuid(id)) ||
    observationIds.length < 1 ||
    observationIds.length > 100 ||
    observationIds.some((id) => !validUuid(id)) ||
    trimmed.rationale.length < 1 ||
    trimmed.rationale.length > 2000
  ) return null;

  let proposedState: Record<string, unknown>;
  if (input.action === "add_process_step") {
    if (
      trimmed.processStepId ||
      trimmed.proposedStepTitle.length < 1 ||
      trimmed.proposedStepTitle.length > 255 ||
      trimmed.proposedStepInstructions.length < 1 ||
      trimmed.proposedStepInstructions.length > 10000 ||
      !Number.isSafeInteger(input.proposedStepPosition) ||
      input.proposedStepPosition < 1 ||
      input.proposedStepPosition > 10000
    ) return null;
    proposedState = {
      instructions: trimmed.proposedStepInstructions,
      position: input.proposedStepPosition,
      responsibleRoleStableKey: trimmed.responsibleRoleId || null,
      title: trimmed.proposedStepTitle,
    };
  } else if (input.action === "revise_process_step") {
    if (
      !trimmed.processStepId ||
      trimmed.proposedStepTitle.length < 1 ||
      trimmed.proposedStepTitle.length > 255 ||
      trimmed.proposedStepInstructions.length < 1 ||
      trimmed.proposedStepInstructions.length > 10000
    ) return null;
    proposedState = {
      instructions: trimmed.proposedStepInstructions,
      title: trimmed.proposedStepTitle,
    };
  } else if (input.action === "change_step_responsibility") {
    if (!trimmed.processStepId) return null;
    proposedState = {
      responsibleRoleStableKey: trimmed.responsibleRoleId || null,
    };
  } else if (input.action === "link_existing_system") {
    if (
      !trimmed.systemId ||
      trimmed.systemUsage.length < 1 ||
      trimmed.systemUsage.length > 2000
    ) return null;
    proposedState = {
      systemStableKey: trimmed.systemId,
      usage: trimmed.systemUsage,
    };
  } else if (input.action === "add_process_exception") {
    if (
      trimmed.exceptionId ||
      trimmed.exceptionName.length < 1 ||
      trimmed.exceptionName.length > 255 ||
      trimmed.exceptionCondition.length < 1 ||
      trimmed.exceptionCondition.length > 5000 ||
      trimmed.exceptionResponse.length < 1 ||
      trimmed.exceptionResponse.length > 5000
    ) return null;
    proposedState = {
      condition: trimmed.exceptionCondition,
      name: trimmed.exceptionName,
      processStepStableKey: trimmed.processStepId || null,
      response: trimmed.exceptionResponse,
    };
  } else if (input.action === "revise_process_exception") {
    if (
      !trimmed.exceptionId ||
      trimmed.exceptionName.length < 1 ||
      trimmed.exceptionName.length > 255 ||
      trimmed.exceptionCondition.length < 1 ||
      trimmed.exceptionCondition.length > 5000 ||
      trimmed.exceptionResponse.length < 1 ||
      trimmed.exceptionResponse.length > 5000
    ) return null;
    proposedState = {
      condition: trimmed.exceptionCondition,
      name: trimmed.exceptionName,
      response: trimmed.exceptionResponse,
    };
  } else {
    if (
      !trimmed.relatedProcessId ||
      !DEPENDENCY_DIRECTIONS.has(input.dependencyDirection) ||
      !DEPENDENCY_TYPES.has(input.dependencyType) ||
      trimmed.dependencyDescription.length > 2000
    ) return null;
    proposedState = {
      dependencyType: input.dependencyType,
      description: trimmed.dependencyDescription || null,
      direction: input.dependencyDirection,
      relatedProcessStableKey: trimmed.relatedProcessId,
    };
  }

  return {
    ...trimmed,
    exceptionId: trimmed.exceptionId || null,
    itemId: trimmed.itemId || null,
    observationIds,
    processStepId: trimmed.processStepId || null,
    proposedState,
    relatedProcessId: trimmed.relatedProcessId || null,
    responsibleRoleId: trimmed.responsibleRoleId || null,
    systemId: trimmed.systemId || null,
  };
}

export async function saveDiscoveryMappingItemSlice2(
  input: Slice2MappingInput,
): Promise<DiscoveryMutationResult> {
  const validated = validateSlice2MappingInput(input);
  if (!validated) {
    return {
      ok: false,
      code: "invalid",
      message: "Review the specific proposed change and try again.",
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
    const rows = await context.sql.query(
      `with proposal_context as materialized (
         select proposal.id as proposal_id, proposal.organization_id,
           proposal.stable_key as proposal_stable_key,
           proposal.session_id, proposal.session_stable_key,
           proposal.process_id, proposal.process_stable_key
         from discovery_proposals proposal
         where proposal.organization_id = $1::integer
           and proposal.session_stable_key = $2::uuid
           and proposal.status = 'ready_for_review'
           and proposal.documented_process_fingerprint = $3::varchar(64)
       ), selected_observations as materialized (
         select observation.stable_key
         from discovery_observations observation
         join proposal_context proposal
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
       ), selected_step as materialized (
         select step.id, step.stable_key, step.title, step.instructions,
           step.position, responsible.stable_key as responsible_role_stable_key,
           responsible.name as responsible_role_name
         from process_steps step
         join proposal_context proposal
           on proposal.process_id = step.process_id
          and proposal.organization_id = step.organization_id
         left join roles responsible
           on responsible.id = step.responsible_role_id
          and responsible.organization_id = step.organization_id
         where step.stable_key = $8::uuid
       ), selected_role as materialized (
         select role.id, role.stable_key, role.name
         from roles role
         join proposal_context proposal
           on proposal.organization_id = role.organization_id
         where role.stable_key = $9::uuid and role.status = 'active'
       ), selected_system as materialized (
         select system.id, system.stable_key, system.name
         from systems system
         join proposal_context proposal
           on proposal.organization_id = system.organization_id
         where system.stable_key = $10::uuid and system.status = 'active'
           and not exists (
             select 1 from process_systems linked
             where linked.organization_id = proposal.organization_id
               and linked.process_id = proposal.process_id
               and linked.system_id = system.id
           )
       ), selected_exception as materialized (
         select exception.id, exception.stable_key, exception.name,
           exception.condition, exception.response
         from exceptions exception
         join proposal_context proposal
           on proposal.process_id = exception.process_id
          and proposal.organization_id = exception.organization_id
         where exception.stable_key = $11::uuid
           and exception.status = 'active'
       ), selected_related_process as materialized (
         select related.id, related.stable_key, related.name
         from processes related
         join proposal_context proposal
           on proposal.organization_id = related.organization_id
          and proposal.process_id <> related.id
         where related.stable_key = $12::uuid
           and related.status <> 'archived'
       ), target_gate as materialized (
         select proposal.*
         from proposal_context proposal
         where (select count(*) from selected_observations) = cardinality($4::uuid[])
           and case $5::discovery_mapping_action
             when 'add_process_step' then
               $8::uuid is null
               and ($9::uuid is null or exists (select 1 from selected_role))
             when 'revise_process_step' then
               exists (select 1 from selected_step)
               and (($13::jsonb ->> 'title') is distinct from (select title from selected_step)
                 or ($13::jsonb ->> 'instructions') is distinct from (select instructions from selected_step))
             when 'change_step_responsibility' then
               exists (select 1 from selected_step)
               and ($9::uuid is null or exists (select 1 from selected_role))
               and $9::uuid is distinct from (select responsible_role_stable_key from selected_step)
             when 'link_existing_system' then exists (select 1 from selected_system)
             when 'add_process_exception' then
               $11::uuid is null
               and ($8::uuid is null or exists (select 1 from selected_step))
             when 'revise_process_exception' then
               exists (select 1 from selected_exception)
               and (($13::jsonb ->> 'name') is distinct from (select name from selected_exception)
                 or ($13::jsonb ->> 'condition') is distinct from (select condition from selected_exception)
                 or ($13::jsonb ->> 'response') is distinct from (select response from selected_exception))
             when 'add_process_dependency' then
               exists (select 1 from selected_related_process)
               and not exists (
                 select 1 from process_dependencies dependency
                 where dependency.organization_id = proposal.organization_id
                   and dependency.source_process_id = case
                     when $13::jsonb ->> 'direction' = 'upstream'
                       then (select id from selected_related_process)
                     else proposal.process_id end
                   and dependency.target_process_id = case
                     when $13::jsonb ->> 'direction' = 'upstream'
                       then proposal.process_id
                     else (select id from selected_related_process) end
                   and dependency.dependency_type = ($13::jsonb ->> 'dependencyType')::process_dependency_type
               )
             else false
           end
       ), inserted_mapping as (
         insert into discovery_proposal_mappings (
           organization_id, proposal_id, proposal_stable_key, session_id,
           session_stable_key, process_id, process_stable_key,
           actor_identifier
         )
         select organization_id, proposal_id, proposal_stable_key, session_id,
           session_stable_key, process_id, process_stable_key,
           $15::varchar(128)
         from target_gate
         where $6::integer = 0 and $7::uuid is null
           and not exists (
             select 1 from discovery_proposal_mappings existing
             where existing.proposal_id = target_gate.proposal_id
           )
         returning id, organization_id, stable_key, session_id,
           session_stable_key, process_id, process_stable_key
       ), selected_mapping as materialized (
         select mapping.id, mapping.organization_id, mapping.stable_key,
           mapping.session_id, mapping.session_stable_key,
           mapping.process_id, mapping.process_stable_key
         from discovery_proposal_mappings mapping
         join target_gate proposal
           on proposal.proposal_id = mapping.proposal_id
          and proposal.organization_id = mapping.organization_id
          and proposal.proposal_stable_key = mapping.proposal_stable_key
         where $6::integer > 0
           and mapping.revision = $6::integer
           and mapping.status = 'draft'
         for update of mapping
       ), usable_mapping as materialized (
         select * from inserted_mapping
         union all
         select * from selected_mapping
       ), current_item as materialized (
         select item.item_stable_key, item.item_sequence, item.action,
           item.process_step_stable_key, item.system_stable_key,
           item.exception_stable_key, item.related_process_stable_key,
           item.proposed_state
         from discovery_mapping_items item
         join usable_mapping mapping
           on mapping.id = item.mapping_id
          and mapping.organization_id = item.organization_id
          and mapping.stable_key = item.mapping_stable_key
         where item.item_stable_key = $7::uuid
         order by item.item_sequence desc
         limit 1
       ), validated_mapping as (
         select mapping.*
         from usable_mapping mapping
         where ($7::uuid is null or exists (select 1 from current_item))
           and ($7::uuid is null or (select action from current_item) = $5::discovery_mapping_action)
           and ($7::uuid is null or case $5::discovery_mapping_action
             when 'revise_process_step' then
               (select process_step_stable_key from current_item) = $8::uuid
             when 'change_step_responsibility' then
               (select process_step_stable_key from current_item) = $8::uuid
             when 'link_existing_system' then
               (select system_stable_key from current_item) = $10::uuid
             when 'revise_process_exception' then
               (select exception_stable_key from current_item) = $11::uuid
             when 'add_process_exception' then
               (select process_step_stable_key from current_item) is not distinct from $8::uuid
             when 'add_process_dependency' then
               (select related_process_stable_key from current_item) = $12::uuid
               and (select proposed_state ->> 'direction' from current_item) = ($13::jsonb ->> 'direction')
               and (select proposed_state ->> 'dependencyType' from current_item) = ($13::jsonb ->> 'dependencyType')
             else true
           end)
       ), item_identity as (
         select coalesce(
             (select item_stable_key from current_item), gen_random_uuid()
           ) as item_stable_key,
           coalesce((select item_sequence from current_item), 0) + 1 as item_sequence
         from validated_mapping
       ), inserted_item as (
         insert into discovery_mapping_items (
           organization_id, mapping_id, mapping_stable_key,
           item_stable_key, item_sequence, action,
           process_id, process_stable_key,
           process_step_id, process_step_stable_key,
           responsible_role_id, responsible_role_stable_key,
           system_id, system_stable_key,
           exception_id, exception_stable_key,
           related_process_id, related_process_stable_key,
           before_state, proposed_state, rationale, actor_identifier
         )
         select mapping.organization_id, mapping.id, mapping.stable_key,
           identity.item_stable_key, identity.item_sequence,
           $5::discovery_mapping_action,
           mapping.process_id, mapping.process_stable_key,
           case when $5::discovery_mapping_action in (
               'revise_process_step', 'change_step_responsibility'
             ) or ($5::discovery_mapping_action = 'add_process_exception' and $8::uuid is not null)
             then step.id else null end,
           case when $5::discovery_mapping_action in (
               'revise_process_step', 'change_step_responsibility'
             ) or ($5::discovery_mapping_action = 'add_process_exception' and $8::uuid is not null)
             then step.stable_key else null end,
           case when $5::discovery_mapping_action in (
               'add_process_step', 'change_step_responsibility'
             ) then selected_role.id else null end,
           case when $5::discovery_mapping_action in (
               'add_process_step', 'change_step_responsibility'
             ) then selected_role.stable_key else null end,
           case when $5::discovery_mapping_action = 'link_existing_system'
             then selected_system.id else null end,
           case when $5::discovery_mapping_action = 'link_existing_system'
             then selected_system.stable_key else null end,
           case when $5::discovery_mapping_action = 'revise_process_exception'
             then selected_exception.id else null end,
           case when $5::discovery_mapping_action = 'revise_process_exception'
             then selected_exception.stable_key else null end,
           case when $5::discovery_mapping_action = 'add_process_dependency'
             then related.id else null end,
           case when $5::discovery_mapping_action = 'add_process_dependency'
             then related.stable_key else null end,
           case $5::discovery_mapping_action
             when 'revise_process_step' then jsonb_build_object(
               'title', step.title, 'instructions', step.instructions)
             when 'change_step_responsibility' then jsonb_build_object(
               'responsibleRoleStableKey', step.responsible_role_stable_key,
               'responsibleRoleName', step.responsible_role_name)
             when 'revise_process_exception' then jsonb_build_object(
               'name', selected_exception.name,
               'condition', selected_exception.condition,
               'response', selected_exception.response)
             else '{}'::jsonb
           end,
           $13::jsonb
             || case when $5::discovery_mapping_action in (
                  'add_process_step', 'change_step_responsibility'
                ) then jsonb_build_object('responsibleRoleName', selected_role.name)
                else '{}'::jsonb end
             || case when $5::discovery_mapping_action = 'link_existing_system'
                then jsonb_build_object('systemName', selected_system.name)
                else '{}'::jsonb end
             || case when $5::discovery_mapping_action = 'add_process_exception'
                then jsonb_build_object('processStepTitle', step.title)
                else '{}'::jsonb end
             || case when $5::discovery_mapping_action = 'add_process_dependency'
                then jsonb_build_object('relatedProcessName', related.name)
                else '{}'::jsonb end,
           $14::text, $15::varchar(128)
         from validated_mapping mapping
         cross join item_identity identity
         left join selected_step step on true
         left join selected_role on true
         left join selected_system on true
         left join selected_exception on true
         left join selected_related_process related on true
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
       ), advanced_existing as (
         update discovery_proposal_mappings
         set revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_mapping)
           and exists (select 1 from inserted_item)
           and (select count(*) from inserted_sources) = cardinality($4::uuid[])
         returning 1
       )
       select
         (select count(*)::int from proposal_context) as proposal_count,
         (select count(*)::int from selected_observations) as observation_count,
         (select count(*)::int from usable_mapping) as mapping_count,
         (select count(*)::int from inserted_item) as item_count,
         (select count(*)::int from inserted_sources) as source_count,
         ((select count(*) from inserted_mapping) +
          (select count(*) from advanced_existing))::int as revision_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.currentProcessFingerprint,
        validated.observationIds,
        input.action,
        input.expectedMappingRevision,
        validated.itemId,
        validated.processStepId,
        validated.responsibleRoleId,
        validated.systemId,
        validated.exceptionId,
        validated.relatedProcessId,
        JSON.stringify(validated.proposedState),
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
      Number(row.source_count) !== validated.observationIds.length ||
      Number(row.revision_count) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message: "The proposed target, evidence, or documented Process changed. Reload before continuing.",
      };
    }
    return {
      ok: true,
      message: "Specific proposed change saved. The documented Process has not changed.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logMappingFailure("save_slice_2_item", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not save this specific proposed change safely. No partial change was retained.",
    };
  }
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
           owner_role_stable_key, process_id, process_stable_key,
           process_step_id, process_step_stable_key,
           responsible_role_id, responsible_role_stable_key,
           system_id, system_stable_key, exception_id, exception_stable_key,
           related_process_id, related_process_stable_key,
           before_state, proposed_state, rationale, actor_identifier
         )
         select item.organization_id, item.mapping_id,
           item.mapping_stable_key, item.item_stable_key,
           item.item_sequence + 1, $5::discovery_mapping_item_state,
           item.action, item.owner_role_id, item.owner_role_stable_key,
           item.process_id, item.process_stable_key,
           item.process_step_id, item.process_step_stable_key,
           item.responsible_role_id, item.responsible_role_stable_key,
           item.system_id, item.system_stable_key,
           item.exception_id, item.exception_stable_key,
           item.related_process_id, item.related_process_stable_key,
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
           item.state, item.action, item.owner_role_id,
           item.process_id, item.process_step_id, item.responsible_role_id,
           item.system_id, item.exception_id, item.related_process_id,
           item.proposed_state
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
         select action, process_step_id, system_id, exception_id,
           related_process_id,
           case when action = 'add_process_dependency'
             then proposed_state ->> 'direction' else null end as direction,
           case when action = 'add_process_dependency'
             then proposed_state ->> 'dependencyType' else null end as dependency_type,
           case when action = 'add_process_step'
             then proposed_state ->> 'position' else null end as proposed_position
         from active_items
         where action in (
           'update_process_purpose', 'change_process_owner',
           'revise_process_step', 'change_step_responsibility',
           'link_existing_system', 'revise_process_exception',
           'add_process_dependency', 'add_process_step'
         )
         group by action, process_step_id, system_id, exception_id,
           related_process_id, direction, dependency_type, proposed_position
         having count(*) > 1
       ), invalid_targets as (
         select item.id
         from active_items item
         left join roles role
           on role.id = coalesce(item.owner_role_id, item.responsible_role_id)
          and role.organization_id = item.organization_id
         left join systems system
           on system.id = item.system_id
          and system.organization_id = item.organization_id
         left join exceptions exception
           on exception.id = item.exception_id
          and exception.organization_id = item.organization_id
          and exception.process_id = item.process_id
         left join processes related
           on related.id = item.related_process_id
          and related.organization_id = item.organization_id
         where ((item.owner_role_id is not null or item.responsible_role_id is not null)
             and (role.id is null or role.status <> 'active'))
           or (item.system_id is not null and (system.id is null or system.status <> 'active'))
           or (item.exception_id is not null and (exception.id is null or exception.status <> 'active'))
           or (item.related_process_id is not null and (related.id is null or related.status = 'archived'))
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
           (select count(*)::int from invalid_targets) as invalid_target_count
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
           and (select invalid_target_count from summary) = 0
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
          message: "Resolve the competing proposals for the same documented target before finishing.",
        };
      }
      if (Number(row.invalid_target_count) > 0) {
        return {
          ok: false,
          code: "conflict",
          message: "A selected Role, System, Exception, or related Process is no longer available. Reload and revise the proposal before finishing.",
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
