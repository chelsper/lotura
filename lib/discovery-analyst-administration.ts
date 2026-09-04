import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  fingerprintAssistanceValue,
} from "./discovery-assistance-model.mjs";
import {
  resolveNonConfidentialPilotConfiguration,
} from "./discovery-assistance-non-confidential-pilot.mjs";
import {
  estimateOpenAIGpt56TerraStandardCostMicrousd,
  OPENAI_GPT_5_6_TERRA_STANDARD_COST_BASIS,
} from "./discovery-assistance-provider-cost.mjs";
import {
  DISCOVERY_ANALYST_AUTHORIZATION_VERSION,
  DISCOVERY_ANALYST_PROMPT_POLICY_VERSION,
  createDiscoveryAnalystFallback,
  readStoredDiscoveryAnalystResult,
  validateDiscoveryAnalystResult,
  type DiscoveryAnalystEpistemicState,
  type DiscoveryAnalystResult,
} from "./discovery-analyst-model.mjs";
import {
  executeConfiguredDiscoveryAnalyst,
} from "./discovery-analyst-openai-runtime";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";

type AnalystMutationResult =
  | { message: string; ok: true; sessionId: string }
  | {
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
      ok: false;
    };

type AnalystContext = {
  latestSynthesis: DiscoveryAnalystResult | null;
  observations: Array<{
    epistemicState: DiscoveryAnalystEpistemicState;
    id: string;
    promptKey: string;
    promptText: string;
    responseText: string | null;
    sequence: number;
    topic: string;
  }>;
  process: {
    dependencies: Array<{ description: string | null; direction: string; name: string; type: string }>;
    exceptions: Array<{ condition: string; name: string; ownerRole: string | null; response: string }>;
    name: string;
    ownerRole: string | null;
    purpose: string | null;
    status: string;
    steps: Array<{ instructions: string; position: number; responsibleRole: string | null; title: string }>;
    systems: Array<{ name: string; usage: string }>;
  };
  scopeStatement: string;
  session: {
    id: number;
    processId: number;
    processStableKey: string;
    revision: number;
    stableKey: string;
  };
};

const STATES = new Set<DiscoveryAnalystEpistemicState>([
  "known",
  "assumed",
  "unknown",
  "needs_validation",
  "conflicting_observation",
]);

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validRevision(value: number) {
  return Number.isSafeInteger(value) && value >= 1;
}

function safeText(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function logFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  console.error("[discovery-analyst] operation failed", {
    code: safeText(details.code),
    constraint: safeText(details.constraint),
    operation,
    routine: safeText(details.routine),
    table: safeText(details.table),
  });
}

async function analystWriteContext() {
  const runtimeAccess = await requireWorkspaceAccess();
  const discovery = resolveDiscoveryConfiguration(process.env, runtimeAccess);
  if (!discovery.enabled) return null;
  const pilot = resolveNonConfidentialPilotConfiguration(process.env, runtimeAccess);
  if (!pilot.enabled || pilot.organizationId !== discovery.organizationId) return null;
  return {
    discovery,
    pilot,
    runtimeAccess,
    sql: neon(discovery.databaseUrl, {
      isolationLevel: "Serializable",
      readOnly: false,
    }),
  };
}

async function loadAnalystContext(
  context: NonNullable<Awaited<ReturnType<typeof analystWriteContext>>>,
  sessionId: string,
  expectedRevision: number,
): Promise<AnalystContext | null> {
  const sessionRows = await context.sql.query(
    `select session.id, session.stable_key::text, session.process_id,
       session.process_stable_key::text, session.revision,
       session.scope_statement, process.name, process.purpose,
       process.status::text, owner_role.name as owner_role
     from discovery_sessions session
     inner join processes process
       on process.id = session.process_id
      and process.organization_id = session.organization_id
      and process.stable_key = session.process_stable_key
     left join roles owner_role
       on owner_role.id = process.owner_role_id
      and owner_role.organization_id = process.organization_id
     where session.organization_id = $1::integer
       and session.stable_key = $2::uuid
       and session.actor_identifier = $3::varchar(128)
       and session.revision = $4::integer
       and session.status = 'in_progress'
       and session.analyst_enabled = true`,
    [
      context.discovery.organizationId,
      sessionId,
      context.discovery.actorIdentifier,
      expectedRevision,
    ],
  );
  const session = sessionRows[0];
  if (!session) return null;
  const processId = Number(session.process_id);
  const organizationId = context.discovery.organizationId;
  const internalSessionId = Number(session.id);

  const [stepRows, systemRows, exceptionRows, dependencyRows, observationRows, synthesisRows] =
    await Promise.all([
      context.sql.query(
        `select step.position, step.title, step.instructions,
           responsible.name as responsible_role
         from process_steps step
         left join roles responsible
           on responsible.id = step.responsible_role_id
          and responsible.organization_id = step.organization_id
         where step.organization_id = $1::integer
           and step.process_id = $2::integer
         order by step.position
         limit 30`,
        [organizationId, processId],
      ),
      context.sql.query(
        `select system.name, link.usage
         from process_systems link
         inner join systems system
           on system.id = link.system_id
          and system.organization_id = link.organization_id
         where link.organization_id = $1::integer
           and link.process_id = $2::integer
           and system.status = 'active'
         order by system.name
         limit 20`,
        [organizationId, processId],
      ),
      context.sql.query(
        `select exception.name, exception.condition, exception.response,
           owner.name as owner_role
         from exceptions exception
         left join roles owner
           on owner.id = exception.owner_role_id
          and owner.organization_id = exception.organization_id
         where exception.organization_id = $1::integer
           and exception.process_id = $2::integer
           and exception.status = 'active'
         order by exception.name
         limit 20`,
        [organizationId, processId],
      ),
      context.sql.query(
        `select dependency.dependency_type::text,
           dependency.description,
           case when dependency.source_process_id = $2::integer
             then 'outgoing' else 'incoming' end as direction,
           case when dependency.source_process_id = $2::integer
             then target.name else source.name end as connected_process_name
         from process_dependencies dependency
         inner join processes source
           on source.id = dependency.source_process_id
          and source.organization_id = dependency.organization_id
         inner join processes target
           on target.id = dependency.target_process_id
          and target.organization_id = dependency.organization_id
         where dependency.organization_id = $1::integer
           and (dependency.source_process_id = $2::integer
             or dependency.target_process_id = $2::integer)
         order by dependency.id
         limit 20`,
        [organizationId, processId],
      ),
      context.sql.query(
        `select observation.stable_key::text, observation.sequence,
           observation.prompt_key, observation.prompt_text,
           observation.topic::text, observation.response_text,
           observation.epistemic_state::text
         from discovery_observations observation
         where observation.organization_id = $1::integer
           and observation.session_id = $2::integer
           and not exists (
             select 1 from discovery_observations superseding
             where superseding.organization_id = observation.organization_id
               and superseding.session_id = observation.session_id
               and superseding.supersedes_observation_stable_key = observation.stable_key
           )
         order by observation.sequence desc
         limit 24`,
        [organizationId, internalSessionId],
      ),
      context.sql.query(
        `select analysis_snapshot, provider_key
         from discovery_assistance_runs
         where organization_id = $1::integer
           and discovery_session_id = $2::integer
           and analyst_turn = true
         order by created_at desc, id desc
         limit 1`,
        [organizationId, internalSessionId],
      ),
    ]);

  const observations = observationRows.reverse().map((row) => ({
    epistemicState: String(row.epistemic_state) as DiscoveryAnalystEpistemicState,
    id: String(row.stable_key),
    promptKey: String(row.prompt_key),
    promptText: String(row.prompt_text),
    responseText: row.response_text === null ? null : String(row.response_text),
    sequence: Number(row.sequence),
    topic: String(row.topic),
  }));
  return {
    latestSynthesis: readStoredDiscoveryAnalystResult(
      synthesisRows[0]?.analysis_snapshot,
      synthesisRows[0]?.provider_key,
    ),
    observations,
    process: {
      dependencies: dependencyRows.map((row) => ({
        description: row.description === null ? null : String(row.description),
        direction: String(row.direction),
        name: String(row.connected_process_name),
        type: String(row.dependency_type),
      })),
      exceptions: exceptionRows.map((row) => ({
        condition: String(row.condition),
        name: String(row.name),
        ownerRole: row.owner_role === null ? null : String(row.owner_role),
        response: String(row.response),
      })),
      name: String(session.name),
      ownerRole: session.owner_role === null ? null : String(session.owner_role),
      purpose: session.purpose === null ? null : String(session.purpose),
      status: String(session.status),
      steps: stepRows.map((row) => ({
        instructions: String(row.instructions),
        position: Number(row.position),
        responsibleRole: row.responsible_role === null
          ? null
          : String(row.responsible_role),
        title: String(row.title),
      })),
      systems: systemRows.map((row) => ({
        name: String(row.name),
        usage: String(row.usage),
      })),
    },
    scopeStatement: String(session.scope_statement),
    session: {
      id: internalSessionId,
      processId,
      processStableKey: String(session.process_stable_key),
      revision: Number(session.revision),
      stableKey: String(session.stable_key),
    },
  };
}

function providerAttribution(
  providerResult: Awaited<ReturnType<typeof executeConfiguredDiscoveryAnalyst>>,
) {
  if (!providerResult.ok) {
    return {
      costBasisKey: null,
      estimatedCostMicrousd: null,
      modelIdentifier: "coverage-guided-v1",
      providerCachedInputTokens: null,
      providerDurationMs: null,
      providerInputTokens: null,
      providerKey: "deterministic-analyst-fallback",
      providerOutputTokens: null,
      providerProjectIdentifier: null,
      providerRequestCount: null,
      providerRequestStatus: null,
      providerTotalTokens: null,
    };
  }
  const metadata = providerResult.providerMetadata;
  return {
    costBasisKey: OPENAI_GPT_5_6_TERRA_STANDARD_COST_BASIS,
    estimatedCostMicrousd: estimateOpenAIGpt56TerraStandardCostMicrousd({
      cachedInputTokens: metadata.cachedInputTokens,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
    }),
    modelIdentifier: metadata.model,
    providerCachedInputTokens: metadata.cachedInputTokens,
    providerDurationMs: metadata.durationMs,
    providerInputTokens: metadata.inputTokens,
    providerKey: "openai",
    providerOutputTokens: metadata.outputTokens,
    providerProjectIdentifier: metadata.providerProjectId,
    providerRequestCount: metadata.requestCount,
    providerRequestStatus: metadata.status,
    providerTotalTokens: metadata.totalTokens,
  };
}

async function preserveAnalystTurn(
  context: NonNullable<Awaited<ReturnType<typeof analystWriteContext>>>,
  analystContext: AnalystContext,
  result: DiscoveryAnalystResult,
  providerResult: Awaited<ReturnType<typeof executeConfiguredDiscoveryAnalyst>>,
  focus: string | null,
) {
  const attribution = providerAttribution(providerResult);
  const processSnapshot = {
    process: analystContext.process,
    scopeStatement: analystContext.scopeStatement,
  };
  const observationSources = analystContext.observations.map((observation) => {
    const snapshot = {
      epistemicState: observation.epistemicState,
      promptKey: observation.promptKey,
      promptText: observation.promptText,
      responseText: observation.responseText,
      sequence: observation.sequence,
      topic: observation.topic,
    };
    return {
      fingerprint: fingerprintAssistanceValue(snapshot),
      observationId: observation.id,
      snapshot,
    };
  });
  const rows = await context.sql.query(
    `with selected_session as materialized (
       select id, stable_key, process_id, process_stable_key
       from discovery_sessions
       where organization_id = $1::integer
         and stable_key = $2::uuid
         and actor_identifier = $3::varchar(128)
         and revision = $4::integer
         and status = 'in_progress'
         and analyst_enabled = true
     ), inserted_run as (
       insert into discovery_assistance_runs (
         organization_id, session_kind, discovery_session_id,
         discovery_session_stable_key, requested_session_revision,
         prompt_key, assistance_kind, provider_key, model_identifier,
         prompt_policy_version, context_fingerprint, participant_focus,
         analyst_turn, analysis_snapshot, provider_project_identifier,
         provider_request_status, provider_request_count,
         provider_input_tokens, provider_cached_input_tokens,
         provider_output_tokens, provider_total_tokens, provider_duration_ms,
         estimated_cost_microusd, cost_basis_key, actor_identifier
       )
       select $1::integer, 'process', selected_session.id,
         selected_session.stable_key, $4::integer, $5::varchar(64),
         'question_suggestions', $6::varchar(64), $7::varchar(128),
         $8::varchar(64), $9::varchar(64), $10::text, true, $11::jsonb,
         $12::varchar(128), $13::varchar(32), $14::integer, $15::integer,
         $16::integer, $17::integer, $18::integer, $19::integer,
         $20::integer, $21::varchar(64), $3::varchar(128)
       from selected_session
       returning id, stable_key
     ), inserted_process_source as (
       insert into discovery_assistance_sources (
         organization_id, run_id, run_stable_key, source_sequence,
         source_kind, process_id, process_stable_key, source_snapshot,
         source_fingerprint
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key, 1,
         'process_snapshot', selected_session.process_id,
         selected_session.process_stable_key, $22::jsonb, $23::varchar(64)
       from inserted_run cross join selected_session
       returning 1
     ), observation_input as (
       select value, ordinality
       from jsonb_array_elements($24::jsonb) with ordinality
     ), inserted_observation_sources as (
       insert into discovery_assistance_sources (
         organization_id, run_id, run_stable_key, source_sequence,
         source_kind, process_id, process_stable_key, discovery_session_id,
         discovery_session_stable_key, discovery_observation_stable_key,
         source_snapshot, source_fingerprint
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key,
         observation_input.ordinality::integer + 1, 'process_observation',
         selected_session.process_id, selected_session.process_stable_key,
         selected_session.id, selected_session.stable_key,
         (observation_input.value->>'observationId')::uuid,
         observation_input.value->'snapshot',
         observation_input.value->>'fingerprint'
       from inserted_run cross join selected_session cross join observation_input
       returning 1
     ), inserted_suggestion as (
       insert into discovery_assistance_suggestions (
         organization_id, run_id, run_stable_key, suggestion_sequence,
         suggestion_kind, prompt_key, topic, suggested_text, rationale
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key, 1,
         'follow_up_question', $5::varchar(64),
         $25::discovery_observation_topic, $26::text, $27::text
       from inserted_run
       returning stable_key
     )
     select (select count(*)::int from selected_session) as session_count,
       (select count(*)::int from inserted_run) as run_count,
       (select count(*)::int from inserted_process_source) as process_source_count,
       (select count(*)::int from inserted_observation_sources) as observation_source_count,
       (select stable_key::text from inserted_suggestion) as suggestion_id`,
    [
      context.discovery.organizationId,
      analystContext.session.stableKey,
      context.discovery.actorIdentifier,
      analystContext.session.revision,
      result.nextQuestion.promptKey,
      attribution.providerKey,
      attribution.modelIdentifier,
      DISCOVERY_ANALYST_PROMPT_POLICY_VERSION,
      fingerprintAssistanceValue({ analystContext, focus }),
      focus,
      JSON.stringify(result),
      attribution.providerProjectIdentifier,
      attribution.providerRequestStatus,
      attribution.providerRequestCount,
      attribution.providerInputTokens,
      attribution.providerCachedInputTokens,
      attribution.providerOutputTokens,
      attribution.providerTotalTokens,
      attribution.providerDurationMs,
      attribution.estimatedCostMicrousd,
      attribution.costBasisKey,
      JSON.stringify(processSnapshot),
      fingerprintAssistanceValue(processSnapshot),
      JSON.stringify(observationSources),
      result.nextQuestion.topic,
      result.nextQuestion.text,
      result.nextQuestion.rationale,
    ],
  );
  const row = rows[0];
  return Boolean(
    row
    && Number(row.session_count) === 1
    && Number(row.run_count) === 1
    && Number(row.process_source_count) === 1
    && Number(row.observation_source_count) === observationSources.length
    && validUuid(String(row.suggestion_id)),
  );
}

async function createAnalystTurn(
  context: NonNullable<Awaited<ReturnType<typeof analystWriteContext>>>,
  sessionId: string,
  expectedRevision: number,
  focus: string | null = null,
  excludedFallbackPromptKeys: string[] = [],
) {
  const analystContext = await loadAnalystContext(context, sessionId, expectedRevision);
  if (!analystContext) return false;
  const providerResult = await executeConfiguredDiscoveryAnalyst({
    context: analystContext,
    focus,
    runtimeAccess: context.runtimeAccess,
  });
  if (!providerResult.ok) {
    console.warn("[discovery-analyst] using standard fallback", { reason: providerResult.reason });
  }
  const result = providerResult.ok
    ? providerResult.result
    : createDiscoveryAnalystFallback(
        analystContext,
        providerResult.reason,
        excludedFallbackPromptKeys,
      );
  if (!validateDiscoveryAnalystResult(result)) {
    throw new Error("Analyst turn failed display validation before persistence.");
  }
  const preserved = await preserveAnalystTurn(context, analystContext, result, providerResult, focus);
  return preserved ? { fallback: !providerResult.ok } : false;
}

export async function authorizeDiscoveryAnalyst(input: {
  expectedRevision: number;
  nonConfidentialAuthorized: boolean;
  providerRetentionAccepted: boolean;
  sessionId: string;
}): Promise<AnalystMutationResult> {
  if (
    !validUuid(input.sessionId)
    || !validRevision(input.expectedRevision)
    || !input.nonConfidentialAuthorized
    || !input.providerRetentionAccepted
  ) {
    return {
      code: "invalid",
      message: "Confirm both non-confidential pilot statements before starting the AI interview.",
      ok: false,
    };
  }
  let context;
  try {
    context = await analystWriteContext();
  } catch (error) {
    logFailure("authorize_configuration", error);
    return { code: "unavailable", message: "The AI Discovery Analyst is not available in this workspace configuration.", ok: false };
  }
  if (!context) {
    return { code: "unavailable", message: "The AI Discovery Analyst is not enabled for this workspace.", ok: false };
  }
  try {
    const rows = await context.sql.query(
      `update discovery_sessions
       set analyst_enabled = true,
         analyst_authorized_at = transaction_timestamp(),
         analyst_authorization_version = $5::varchar(64),
         revision = revision + 1,
         updated_at = transaction_timestamp()
       where organization_id = $1::integer
         and stable_key = $2::uuid
         and actor_identifier = $3::varchar(128)
         and revision = $4::integer
         and status = 'in_progress'
         and analyst_enabled = false
       returning revision`,
      [
        context.discovery.organizationId,
        input.sessionId,
        context.discovery.actorIdentifier,
        input.expectedRevision,
        DISCOVERY_ANALYST_AUTHORIZATION_VERSION,
      ],
    );
    const revision = Number(rows[0]?.revision);
    if (!validRevision(revision)) {
      return { code: "conflict", message: "This interview changed after the page loaded. Reload before starting the analyst.", ok: false };
    }
    const preserved = await createAnalystTurn(context, input.sessionId, revision);
    return {
      message: preserved
        ? "AI Discovery Analyst started. No Process information was changed."
        : "AI Discovery Analyst was authorized. Select Refresh analyst to begin the conversation.",
      ok: true,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logFailure("authorize", error);
    return { code: "unavailable", message: "Lotura could not start the analyst safely.", ok: false };
  }
}

function validateResponse(input: {
  epistemicState: DiscoveryAnalystEpistemicState;
  responseText: string;
}) {
  if (!STATES.has(input.epistemicState)) return null;
  const responseText = input.responseText.trim();
  if (responseText.length > 10_000) return null;
  if (input.epistemicState !== "unknown" && responseText.length < 1) return null;
  return responseText || null;
}

export async function answerDiscoveryAnalyst(input: {
  epistemicState: DiscoveryAnalystEpistemicState;
  expectedRevision: number;
  responseText: string;
  sessionId: string;
  suggestionId: string;
}): Promise<AnalystMutationResult> {
  const responseText = validateResponse(input);
  if (
    !validUuid(input.sessionId)
    || !validUuid(input.suggestionId)
    || !validRevision(input.expectedRevision)
    || (responseText === null && input.epistemicState !== "unknown")
  ) return { code: "invalid", message: "Review your answer and try again.", ok: false };
  let context;
  try {
    context = await analystWriteContext();
  } catch (error) {
    logFailure("answer_configuration", error);
    return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  }
  if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, stable_key, current_question_key
         from discovery_sessions
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128)
           and revision = $4::integer
           and status = 'in_progress'
           and analyst_enabled = true
         for update
       ), selected_suggestion as materialized (
         select suggestion.id, suggestion.stable_key, suggestion.run_id,
           suggestion.run_stable_key, suggestion.prompt_key,
           suggestion.suggested_text, suggestion.topic
         from discovery_assistance_suggestions suggestion
         inner join discovery_assistance_runs run
           on run.id = suggestion.run_id
          and run.organization_id = suggestion.organization_id
          and run.stable_key = suggestion.run_stable_key
         inner join selected_session session
           on session.id = run.discovery_session_id
          and session.stable_key = run.discovery_session_stable_key
         where suggestion.organization_id = $1::integer
           and suggestion.stable_key = $5::uuid
           and suggestion.suggestion_kind = 'follow_up_question'
           and run.analyst_turn = true
           and run.requested_session_revision = $4::integer
           and not exists (
             select 1 from discovery_assistance_decisions decision
             where decision.organization_id = suggestion.organization_id
               and decision.suggestion_stable_key = suggestion.stable_key
           )
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 as value
         from discovery_observations
         where organization_id = $1::integer and session_stable_key = $2::uuid
       ), inserted_observation as (
         insert into discovery_observations (
           organization_id, session_id, session_stable_key, sequence,
           prompt_key, prompt_text, topic, response_text, epistemic_state,
           actor_identifier
         )
         select $1::integer, selected_session.id, selected_session.stable_key,
           next_sequence.value, selected_suggestion.prompt_key,
           selected_suggestion.suggested_text, selected_suggestion.topic,
           $6::text, $7::discovery_observation_state, $3::varchar(128)
         from selected_session cross join selected_suggestion cross join next_sequence
         returning stable_key
       ), inserted_decision as (
         insert into discovery_assistance_decisions (
           organization_id, run_id, run_stable_key, suggestion_id,
           suggestion_stable_key, session_kind, disposition, selected_text,
           discovery_session_id, discovery_observation_stable_key,
           actor_identifier
         )
         select $1::integer, selected_suggestion.run_id,
           selected_suggestion.run_stable_key, selected_suggestion.id,
           selected_suggestion.stable_key, 'process', 'used_as_written',
           selected_suggestion.suggested_text, selected_session.id,
           inserted_observation.stable_key, $3::varchar(128)
         from selected_session cross join selected_suggestion cross join inserted_observation
         returning 1
       ), advanced as (
         update discovery_sessions
         set revision = revision + 1, updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted_observation)
           and exists (select 1 from inserted_decision)
         returning revision
       )
       select (select count(*)::int from selected_suggestion) as suggestion_count,
         (select count(*)::int from inserted_observation) as observation_count,
         (select count(*)::int from inserted_decision) as decision_count,
         (select revision from advanced) as revision`,
      [
        context.discovery.organizationId,
        input.sessionId,
        context.discovery.actorIdentifier,
        input.expectedRevision,
        input.suggestionId,
        responseText,
        input.epistemicState,
      ],
    );
    const row = rows[0];
    const revision = Number(row?.revision);
    if (
      !row
      || Number(row.suggestion_count) !== 1
      || Number(row.observation_count) !== 1
      || Number(row.decision_count) !== 1
      || !validRevision(revision)
    ) return { code: "conflict", message: "The interview changed. Reload before answering.", ok: false };
    const nextTurn = await createAnalystTurn(context, input.sessionId, revision);
    return {
      message: nextTurn
        ? "Your observation is preserved and Lotura has adapted the conversation."
        : "Your observation is preserved. Refresh the analyst when you are ready for the next question.",
      ok: true,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logFailure("answer", error);
    return { code: "unavailable", message: "Lotura could not preserve this answer safely.", ok: false };
  }
}

export async function skipDiscoveryAnalystQuestion(input: {
  expectedRevision: number;
  sessionId: string;
  suggestionId: string;
}): Promise<AnalystMutationResult> {
  if (
    !validUuid(input.sessionId)
    || !validUuid(input.suggestionId)
    || !validRevision(input.expectedRevision)
  ) {
    return { code: "invalid", message: "The question reference is invalid.", ok: false };
  }
  let context;
  try {
    context = await analystWriteContext();
  } catch (error) {
    logFailure("skip_configuration", error);
    return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  }
  if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, stable_key
         from discovery_sessions
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128)
           and revision = $4::integer
           and status = 'in_progress'
           and analyst_enabled = true
         for update
       ), selected_suggestion as materialized (
         select suggestion.id, suggestion.stable_key, suggestion.run_id,
           suggestion.run_stable_key, suggestion.prompt_key,
           suggestion.suggested_text
         from discovery_assistance_suggestions suggestion
         inner join discovery_assistance_runs run
           on run.id = suggestion.run_id
          and run.organization_id = suggestion.organization_id
          and run.stable_key = suggestion.run_stable_key
         inner join selected_session session
           on session.id = run.discovery_session_id
          and session.stable_key = run.discovery_session_stable_key
         where suggestion.organization_id = $1::integer
           and suggestion.stable_key = $5::uuid
           and suggestion.suggestion_kind = 'follow_up_question'
           and run.analyst_turn = true
           and run.requested_session_revision = $4::integer
           and not exists (
             select 1 from discovery_assistance_decisions decision
             where decision.organization_id = suggestion.organization_id
               and decision.suggestion_stable_key = suggestion.stable_key
           )
       ), inserted_decision as (
         insert into discovery_assistance_decisions (
           organization_id, run_id, run_stable_key, suggestion_id,
           suggestion_stable_key, session_kind, disposition,
           actor_identifier
         )
         select $1::integer, selected_suggestion.run_id,
           selected_suggestion.run_stable_key, selected_suggestion.id,
           selected_suggestion.stable_key, 'process', 'skipped',
           $3::varchar(128)
         from selected_suggestion
         returning 1
       ), advanced as (
         update discovery_sessions
         set revision = revision + 1, updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted_decision)
         returning revision
       )
       select (select count(*)::int from selected_suggestion) as suggestion_count,
         (select count(*)::int from inserted_decision) as decision_count,
         (select revision from advanced) as revision,
         (select prompt_key from selected_suggestion) as prompt_key,
         (select suggested_text from selected_suggestion) as suggested_text`,
      [
        context.discovery.organizationId,
        input.sessionId,
        context.discovery.actorIdentifier,
        input.expectedRevision,
        input.suggestionId,
      ],
    );
    const row = rows[0];
    const revision = Number(row?.revision);
    const promptKey = String(row?.prompt_key ?? "");
    const skippedQuestion = String(row?.suggested_text ?? "").trim();
    if (
      !row
      || Number(row.suggestion_count) !== 1
      || Number(row.decision_count) !== 1
      || !validRevision(revision)
      || !promptKey
      || !skippedQuestion
    ) {
      return { code: "conflict", message: "The interview changed. Reload before skipping this question.", ok: false };
    }
    const focus = `The participant skipped the previous follow-up: "${skippedQuestion.slice(0, 500)}" Do not treat the skip as evidence or infer an answer. Keep the skipped issue unresolved and ask one materially different question from another unresolved Discovery topic. Do not repeat or rephrase the skipped question.`;
    const nextTurn = await createAnalystTurn(
      context,
      input.sessionId,
      revision,
      focus,
      [promptKey],
    );
    return {
      message: nextTurn
        ? "Question skipped. Lotura moved to a different unresolved topic; no observation was created."
        : "Question skipped without creating evidence. Refresh the analyst when you are ready for another question.",
      ok: true,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logFailure("skip", error);
    return { code: "unavailable", message: "Lotura could not skip this question safely.", ok: false };
  }
}

export async function correctDiscoveryAnalyst(input: {
  epistemicState: DiscoveryAnalystEpistemicState;
  expectedRevision: number;
  responseText: string;
  sessionId: string;
}): Promise<AnalystMutationResult> {
  const responseText = validateResponse(input);
  if (
    !validUuid(input.sessionId)
    || !validRevision(input.expectedRevision)
    || (responseText === null && input.epistemicState !== "unknown")
  ) return { code: "invalid", message: "Describe the correction and try again.", ok: false };
  let context;
  try {
    context = await analystWriteContext();
  } catch (error) {
    logFailure("correct_configuration", error);
    return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  }
  if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, stable_key
         from discovery_sessions
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128)
           and revision = $4::integer
           and status = 'in_progress'
           and analyst_enabled = true
         for update
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 as value
         from discovery_observations
         where organization_id = $1::integer and session_stable_key = $2::uuid
       ), inserted as (
         insert into discovery_observations (
           organization_id, session_id, session_stable_key, sequence,
           prompt_key, prompt_text, topic, response_text, epistemic_state,
           actor_identifier
         )
         select $1::integer, selected_session.id, selected_session.stable_key,
           next_sequence.value, 'unresolved_questions',
           'Correction to Lotura''s working understanding',
           'unresolved_questions', $5::text, $6::discovery_observation_state,
           $3::varchar(128)
         from selected_session cross join next_sequence
         returning 1
       ), advanced as (
         update discovery_sessions
         set revision = revision + 1, updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted)
         returning revision
       )
       select (select count(*)::int from inserted) as inserted_count,
         (select revision from advanced) as revision`,
      [
        context.discovery.organizationId,
        input.sessionId,
        context.discovery.actorIdentifier,
        input.expectedRevision,
        responseText,
        input.epistemicState,
      ],
    );
    const revision = Number(rows[0]?.revision);
    if (Number(rows[0]?.inserted_count) !== 1 || !validRevision(revision)) {
      return { code: "conflict", message: "The interview changed. Reload before correcting the synthesis.", ok: false };
    }
    await createAnalystTurn(
      context,
      input.sessionId,
      revision,
      "The participant corrected the working synthesis. Incorporate the correction and ask the most useful next question.",
    );
    return { message: "Your correction is preserved as human evidence. The documented Process was not changed.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("correct", error);
    return { code: "unavailable", message: "Lotura could not preserve this correction safely.", ok: false };
  }
}

export async function refreshDiscoveryAnalyst(input: {
  expectedRevision: number;
  focus: "continue" | "synthesize";
  sessionId: string;
}): Promise<AnalystMutationResult> {
  if (!validUuid(input.sessionId) || !validRevision(input.expectedRevision)) {
    return { code: "invalid", message: "The interview reference is invalid.", ok: false };
  }
  let context;
  try {
    context = await analystWriteContext();
  } catch (error) {
    logFailure("refresh_configuration", error);
    return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  }
  if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  try {
    const focus = input.focus === "synthesize"
      ? "The participant asked: What do you understand so far? Prioritize a concise readable synthesis, then ask one useful unresolved follow-up."
      : "Continue the adaptive interview with the most useful unresolved follow-up.";
    const preserved = await createAnalystTurn(context, input.sessionId, input.expectedRevision, focus);
    if (!preserved) return { code: "conflict", message: "The interview changed. Reload before refreshing the analyst.", ok: false };
    return {
      message: preserved.fallback
        ? "A standard follow-up is available. The AI analyst did not return a usable response; your saved answers are intact."
        : "Lotura refreshed its working understanding. No Process information was changed.",
      ok: true,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logFailure("refresh", error);
    return { code: "unavailable", message: "Lotura could not refresh the analyst safely.", ok: false };
  }
}

export async function finishDiscoveryAnalyst(input: {
  expectedRevision: number;
  sessionId: string;
}): Promise<AnalystMutationResult> {
  if (!validUuid(input.sessionId) || !validRevision(input.expectedRevision)) {
    return { code: "invalid", message: "The interview reference is invalid.", ok: false };
  }
  let context;
  try {
    context = await analystWriteContext();
  } catch (error) {
    logFailure("finish_configuration", error);
    return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  }
  if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
  try {
    const rows = await context.sql.query(
      `update discovery_sessions
       set status = 'ready_for_review', current_question_key = 'review',
         revision = revision + 1, updated_at = transaction_timestamp()
       where organization_id = $1::integer
         and stable_key = $2::uuid
         and actor_identifier = $3::varchar(128)
         and revision = $4::integer
         and status = 'in_progress'
         and analyst_enabled = true
         and exists (
           select 1 from discovery_observations observation
           where observation.organization_id = discovery_sessions.organization_id
             and observation.session_id = discovery_sessions.id
         )
       returning stable_key::text`,
      [
        context.discovery.organizationId,
        input.sessionId,
        context.discovery.actorIdentifier,
        input.expectedRevision,
      ],
    );
    if (!rows[0]) {
      return { code: "conflict", message: "Preserve at least one observation, or reload if the interview changed.", ok: false };
    }
    return { message: "Interview finished. Your observations are ready for human review; no Process change was applied.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("finish", error);
    return { code: "unavailable", message: "Lotura could not finish the interview safely.", ok: false };
  }
}
