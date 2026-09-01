import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import { fingerprintAssistanceValue } from "./discovery-assistance-model.mjs";
import { resolveNonConfidentialPilotConfiguration } from "./discovery-assistance-non-confidential-pilot.mjs";
import {
  estimateOpenAIGpt56TerraStandardCostMicrousd,
  OPENAI_GPT_5_6_TERRA_STANDARD_COST_BASIS,
} from "./discovery-assistance-provider-cost.mjs";
import {
  createDiscoveryAnalystFallback,
  type DiscoveryAnalystEpistemicState,
  type DiscoveryAnalystResult,
} from "./discovery-analyst-model.mjs";
import { executeConfiguredDiscoveryAnalyst } from "./discovery-analyst-openai-runtime";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
import {
  fingerprintDiscoveryReferenceMention,
  parseDiscoveryReferenceTargetKey,
} from "./discovery-reference-matching.mjs";

export const DISCOVERY_INQUIRY_ANALYST_AUTHORIZATION_VERSION = "lad-069-alpha-v1";
export const DISCOVERY_INQUIRY_ANALYST_PROMPT_POLICY_VERSION = "lad-069-alpha-v1";

type MutationResult =
  | { message: string; ok: true; sessionId: string }
  | { code: "conflict" | "invalid" | "unavailable"; message: string; ok: false };

type InquiryAnalystContext = {
  latestSynthesis: DiscoveryAnalystResult | null;
  observations: Array<{
    createdAt: string;
    epistemicState: DiscoveryAnalystEpistemicState;
    id: string;
    promptKey: string;
    promptText: string;
    responseText: string | null;
    sequence: number;
    topic: string;
  }>;
  process: {
    dependencies: never[];
    exceptions: never[];
    name: string;
    ownerRole: null;
    purpose: string;
    status: "inquiry";
    steps: never[];
    systems: never[];
  };
  scopeStatement: string;
  session: {
    id: number;
    inquiryId: number;
    inquiryStableKey: string;
    revision: number;
    stableKey: string;
  };
  sessionKind: "inquiry";
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

function logFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  console.error("[discovery-inquiry-analyst] operation failed", {
    code: typeof details.code === "string" ? details.code : undefined,
    constraint: typeof details.constraint === "string" ? details.constraint : undefined,
    operation,
    table: typeof details.table === "string" ? details.table : undefined,
  });
}

async function writeContext() {
  const runtimeAccess = await requireWorkspaceAccess();
  const discovery = resolveDiscoveryConfiguration(process.env, runtimeAccess);
  if (!discovery.enabled) return null;
  const pilot = resolveNonConfidentialPilotConfiguration(process.env, runtimeAccess);
  if (!pilot.enabled || pilot.organizationId !== discovery.organizationId) return null;
  return {
    discovery,
    runtimeAccess,
    sql: neon(discovery.databaseUrl, { isolationLevel: "Serializable", readOnly: false }),
  };
}

async function loadContext(
  context: NonNullable<Awaited<ReturnType<typeof writeContext>>>,
  sessionId: string,
  expectedRevision: number,
): Promise<InquiryAnalystContext | null> {
  const sessions = await context.sql.query(
    `select session.id, session.stable_key::text, session.inquiry_id,
       session.inquiry_stable_key::text, session.revision,
       session.scope_statement, inquiry.question_text
     from discovery_inquiry_sessions session
     inner join discovery_inquiries inquiry
       on inquiry.id = session.inquiry_id
      and inquiry.organization_id = session.organization_id
      and inquiry.stable_key = session.inquiry_stable_key
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
  const session = sessions[0];
  if (!session) return null;
  const internalSessionId = Number(session.id);
  const [observationRows, synthesisRows] = await Promise.all([
    context.sql.query(
      `select observation.stable_key::text, observation.sequence,
         observation.prompt_key, observation.prompt_text,
         observation.topic::text, observation.response_text,
         observation.epistemic_state::text, observation.created_at
       from discovery_inquiry_observations observation
       where observation.organization_id = $1::integer
         and observation.session_id = $2::integer
         and not exists (
           select 1 from discovery_inquiry_observations superseding
           where superseding.organization_id = observation.organization_id
             and superseding.session_id = observation.session_id
             and superseding.supersedes_observation_stable_key = observation.stable_key
         )
       order by observation.sequence desc
       limit 24`,
      [context.discovery.organizationId, internalSessionId],
    ),
    context.sql.query(
      `select analysis_snapshot
       from discovery_assistance_runs
       where organization_id = $1::integer
         and inquiry_session_id = $2::integer
         and session_kind = 'inquiry'
         and analyst_turn = true
       order by created_at desc, id desc
       limit 1`,
      [context.discovery.organizationId, internalSessionId],
    ),
  ]);
  const questionText = String(session.question_text);
  const scopeStatement = String(session.scope_statement);
  return {
    latestSynthesis: (synthesisRows[0]?.analysis_snapshot ?? null) as DiscoveryAnalystResult | null,
    observations: observationRows.reverse().map((row) => ({
      createdAt: new Date(String(row.created_at)).toISOString(),
      epistemicState: String(row.epistemic_state) as DiscoveryAnalystEpistemicState,
      id: String(row.stable_key),
      promptKey: String(row.prompt_key),
      promptText: String(row.prompt_text),
      responseText: row.response_text === null ? null : String(row.response_text),
      sequence: Number(row.sequence),
      topic: String(row.topic),
    })),
    process: {
      dependencies: [],
      exceptions: [],
      name: questionText,
      ownerRole: null,
      purpose: scopeStatement,
      status: "inquiry",
      steps: [],
      systems: [],
    },
    scopeStatement,
    session: {
      id: internalSessionId,
      inquiryId: Number(session.inquiry_id),
      inquiryStableKey: String(session.inquiry_stable_key),
      revision: Number(session.revision),
      stableKey: String(session.stable_key),
    },
    sessionKind: "inquiry",
  };
}

function attribution(
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

async function preserveTurn(
  context: NonNullable<Awaited<ReturnType<typeof writeContext>>>,
  analystContext: InquiryAnalystContext,
  result: DiscoveryAnalystResult,
  providerResult: Awaited<ReturnType<typeof executeConfiguredDiscoveryAnalyst>>,
  focus: string | null,
) {
  const provider = attribution(providerResult);
  const inquirySnapshot = {
    questionText: analystContext.process.name,
    scopeStatement: analystContext.scopeStatement,
  };
  const observationSources = analystContext.observations.map((observation) => {
    const snapshot = {
      createdAt: observation.createdAt,
      epistemicState: observation.epistemicState,
      promptText: observation.promptText,
      responseText: observation.responseText,
    };
    return {
      fingerprint: fingerprintAssistanceValue(snapshot),
      observationId: observation.id,
      snapshot,
    };
  });
  const rows = await context.sql.query(
    `with selected_session as materialized (
       select session.id, session.stable_key, session.inquiry_id,
         session.inquiry_stable_key
       from discovery_inquiry_sessions session
       where session.organization_id = $1::integer
         and session.stable_key = $2::uuid
         and session.actor_identifier = $3::varchar(128)
         and session.revision = $4::integer
         and session.status = 'in_progress'
         and session.analyst_enabled = true
     ), inserted_run as (
       insert into discovery_assistance_runs (
         organization_id, session_kind, inquiry_session_id,
         inquiry_session_stable_key, requested_session_revision,
         prompt_key, assistance_kind, provider_key, model_identifier,
         prompt_policy_version, context_fingerprint, participant_focus,
         analyst_turn, analysis_snapshot, provider_project_identifier,
         provider_request_status, provider_request_count,
         provider_input_tokens, provider_cached_input_tokens,
         provider_output_tokens, provider_total_tokens, provider_duration_ms,
         estimated_cost_microusd, cost_basis_key, actor_identifier
       )
       select $1::integer, 'inquiry', selected_session.id,
         selected_session.stable_key, $4::integer, $5::varchar(64),
         'question_suggestions', $6::varchar(64), $7::varchar(128),
         $8::varchar(64), $9::varchar(64), $10::text, true, $11::jsonb,
         $12::varchar(128), $13::varchar(32), $14::integer, $15::integer,
         $16::integer, $17::integer, $18::integer, $19::integer,
         $20::integer, $21::varchar(64), $3::varchar(128)
       from selected_session
       returning id, stable_key
     ), inserted_context_source as (
       insert into discovery_assistance_sources (
         organization_id, run_id, run_stable_key, source_sequence,
         source_kind, inquiry_id, inquiry_stable_key, inquiry_session_id,
         inquiry_session_stable_key, source_snapshot, source_fingerprint
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key, 1,
         'inquiry_context', selected_session.inquiry_id,
         selected_session.inquiry_stable_key, selected_session.id,
         selected_session.stable_key, $22::jsonb, $23::varchar(64)
       from inserted_run cross join selected_session
       returning 1
     ), observation_input as (
       select value, ordinality
       from jsonb_array_elements($24::jsonb) with ordinality
     ), inserted_observation_sources as (
       insert into discovery_assistance_sources (
         organization_id, run_id, run_stable_key, source_sequence,
         source_kind, inquiry_id, inquiry_stable_key, inquiry_session_id,
         inquiry_session_stable_key, inquiry_observation_stable_key,
         source_snapshot, source_fingerprint
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key,
         observation_input.ordinality::integer + 1, 'inquiry_observation',
         selected_session.inquiry_id, selected_session.inquiry_stable_key,
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
       (select count(*)::int from inserted_context_source) as context_source_count,
       (select count(*)::int from inserted_observation_sources) as observation_source_count,
       (select stable_key::text from inserted_suggestion) as suggestion_id`,
    [
      context.discovery.organizationId,
      analystContext.session.stableKey,
      context.discovery.actorIdentifier,
      analystContext.session.revision,
      result.nextQuestion.promptKey,
      provider.providerKey,
      provider.modelIdentifier,
      DISCOVERY_INQUIRY_ANALYST_PROMPT_POLICY_VERSION,
      fingerprintAssistanceValue({ analystContext, focus }),
      focus,
      JSON.stringify(result),
      provider.providerProjectIdentifier,
      provider.providerRequestStatus,
      provider.providerRequestCount,
      provider.providerInputTokens,
      provider.providerCachedInputTokens,
      provider.providerOutputTokens,
      provider.providerTotalTokens,
      provider.providerDurationMs,
      provider.estimatedCostMicrousd,
      provider.costBasisKey,
      JSON.stringify(inquirySnapshot),
      fingerprintAssistanceValue(inquirySnapshot),
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
    && Number(row.context_source_count) === 1
    && Number(row.observation_source_count) === observationSources.length
    && validUuid(String(row.suggestion_id)),
  );
}

async function createTurn(
  context: NonNullable<Awaited<ReturnType<typeof writeContext>>>,
  sessionId: string,
  expectedRevision: number,
  focus: string | null = null,
  excludedFallbackPromptKeys: string[] = [],
) {
  const analystContext = await loadContext(context, sessionId, expectedRevision);
  if (!analystContext) return false;
  const providerResult = await executeConfiguredDiscoveryAnalyst({
    context: analystContext,
    focus,
    runtimeAccess: context.runtimeAccess,
  });
  const result = providerResult.ok
    ? providerResult.result
    : createDiscoveryAnalystFallback(
        analystContext,
        providerResult.reason,
        excludedFallbackPromptKeys,
      );
  return preserveTurn(context, analystContext, result, providerResult, focus);
}

function validateResponse(input: {
  epistemicState: DiscoveryAnalystEpistemicState;
  responseText: string;
}) {
  if (!STATES.has(input.epistemicState)) return undefined;
  const responseText = input.responseText.trim();
  if (responseText.length > 10_000) return undefined;
  if (input.epistemicState !== "unknown" && responseText.length < 1) return undefined;
  return responseText || null;
}

export async function authorizeInquiryDiscoveryAnalyst(input: {
  expectedRevision: number;
  nonConfidentialAuthorized: boolean;
  providerRetentionAccepted: boolean;
  sessionId: string;
}): Promise<MutationResult> {
  if (!validUuid(input.sessionId) || !validRevision(input.expectedRevision)
    || !input.nonConfidentialAuthorized || !input.providerRetentionAccepted) {
    return { code: "invalid", message: "Confirm both non-confidential pilot statements before starting the AI interview.", ok: false };
  }
  try {
    const context = await writeContext();
    if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is not enabled for this workspace.", ok: false };
    const rows = await context.sql.query(
      `update discovery_inquiry_sessions
       set analyst_enabled = true,
         analyst_authorized_at = transaction_timestamp(),
         analyst_authorization_version = $5::varchar(64),
         revision = revision + 1, updated_at = transaction_timestamp()
       where organization_id = $1::integer and stable_key = $2::uuid
         and actor_identifier = $3::varchar(128) and revision = $4::integer
         and status = 'in_progress' and analyst_enabled = false
       returning revision`,
      [context.discovery.organizationId, input.sessionId,
        context.discovery.actorIdentifier, input.expectedRevision,
        DISCOVERY_INQUIRY_ANALYST_AUTHORIZATION_VERSION],
    );
    const revision = Number(rows[0]?.revision);
    if (!validRevision(revision)) return { code: "conflict", message: "This interview changed after the page loaded. Reload before starting the analyst.", ok: false };
    const preserved = await createTurn(context, input.sessionId, revision);
    return { message: preserved ? "AI Discovery Analyst started without creating or selecting a Process." : "AI Discovery Analyst was authorized. Select Refresh analyst to begin.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("authorize", error);
    return { code: "unavailable", message: "Lotura could not start the inquiry analyst safely.", ok: false };
  }
}

export async function answerInquiryDiscoveryAnalyst(input: {
  epistemicState: DiscoveryAnalystEpistemicState;
  expectedRevision: number;
  responseText: string;
  sessionId: string;
  suggestionId: string;
}): Promise<MutationResult> {
  const responseText = validateResponse(input);
  if (!validUuid(input.sessionId) || !validUuid(input.suggestionId)
    || !validRevision(input.expectedRevision) || responseText === undefined) {
    return { code: "invalid", message: "Review your answer and try again.", ok: false };
  }
  try {
    const context = await writeContext();
    if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, stable_key from discovery_inquiry_sessions
         where organization_id = $1::integer and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128) and revision = $4::integer
           and status = 'in_progress' and analyst_enabled = true for update
       ), selected_suggestion as materialized (
         select suggestion.id, suggestion.stable_key, suggestion.run_id,
           suggestion.run_stable_key, suggestion.prompt_key,
           suggestion.suggested_text, suggestion.topic
         from discovery_assistance_suggestions suggestion
         inner join discovery_assistance_runs run
           on run.id = suggestion.run_id and run.organization_id = suggestion.organization_id
          and run.stable_key = suggestion.run_stable_key
         inner join selected_session session
           on session.id = run.inquiry_session_id
          and session.stable_key = run.inquiry_session_stable_key
         where suggestion.organization_id = $1::integer
           and suggestion.stable_key = $5::uuid
           and suggestion.suggestion_kind = 'follow_up_question'
           and run.session_kind = 'inquiry' and run.analyst_turn = true
           and run.requested_session_revision = $4::integer
           and not exists (select 1 from discovery_assistance_decisions decision
             where decision.organization_id = suggestion.organization_id
               and decision.suggestion_stable_key = suggestion.stable_key)
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 as value
         from discovery_inquiry_observations
         where organization_id = $1::integer and session_stable_key = $2::uuid
       ), inserted_observation as (
         insert into discovery_inquiry_observations (
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
           inquiry_session_id, inquiry_observation_stable_key, actor_identifier
         )
         select $1::integer, selected_suggestion.run_id,
           selected_suggestion.run_stable_key, selected_suggestion.id,
           selected_suggestion.stable_key, 'inquiry', 'used_as_written',
           selected_suggestion.suggested_text, selected_session.id,
           inserted_observation.stable_key, $3::varchar(128)
         from selected_session cross join selected_suggestion cross join inserted_observation
         returning 1
       ), advanced as (
         update discovery_inquiry_sessions set revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted_observation)
           and exists (select 1 from inserted_decision)
         returning revision
       )
       select (select count(*)::int from inserted_observation) observation_count,
         (select count(*)::int from inserted_decision) decision_count,
         (select revision from advanced) revision`,
      [context.discovery.organizationId, input.sessionId,
        context.discovery.actorIdentifier, input.expectedRevision,
        input.suggestionId, responseText, input.epistemicState],
    );
    const revision = Number(rows[0]?.revision);
    if (Number(rows[0]?.observation_count) !== 1 || Number(rows[0]?.decision_count) !== 1 || !validRevision(revision)) {
      return { code: "conflict", message: "The interview changed. Reload before answering.", ok: false };
    }
    const nextTurn = await createTurn(context, input.sessionId, revision);
    return { message: nextTurn ? "Your observation is preserved and Lotura adapted the inquiry." : "Your observation is preserved. Refresh the analyst when ready.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("answer", error);
    return { code: "unavailable", message: "Lotura could not preserve this answer safely.", ok: false };
  }
}

export async function skipInquiryDiscoveryAnalystQuestion(input: {
  expectedRevision: number;
  sessionId: string;
  suggestionId: string;
}): Promise<MutationResult> {
  if (!validUuid(input.sessionId) || !validUuid(input.suggestionId) || !validRevision(input.expectedRevision)) {
    return { code: "invalid", message: "The question reference is invalid.", ok: false };
  }
  try {
    const context = await writeContext();
    if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, stable_key from discovery_inquiry_sessions
         where organization_id = $1::integer and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128) and revision = $4::integer
           and status = 'in_progress' and analyst_enabled = true for update
       ), selected_suggestion as materialized (
         select suggestion.id, suggestion.stable_key, suggestion.run_id,
           suggestion.run_stable_key, suggestion.prompt_key,
           suggestion.suggested_text
         from discovery_assistance_suggestions suggestion
         inner join discovery_assistance_runs run
           on run.id = suggestion.run_id and run.organization_id = suggestion.organization_id
          and run.stable_key = suggestion.run_stable_key
         inner join selected_session session
           on session.id = run.inquiry_session_id
          and session.stable_key = run.inquiry_session_stable_key
         where suggestion.organization_id = $1::integer
           and suggestion.stable_key = $5::uuid
           and run.session_kind = 'inquiry' and run.analyst_turn = true
           and run.requested_session_revision = $4::integer
           and not exists (select 1 from discovery_assistance_decisions decision
             where decision.organization_id = suggestion.organization_id
               and decision.suggestion_stable_key = suggestion.stable_key)
       ), inserted as (
         insert into discovery_assistance_decisions (
           organization_id, run_id, run_stable_key, suggestion_id,
           suggestion_stable_key, session_kind, disposition,
           inquiry_session_id, actor_identifier
         )
         select $1::integer, selected_suggestion.run_id,
           selected_suggestion.run_stable_key, selected_suggestion.id,
           selected_suggestion.stable_key, 'inquiry', 'skipped',
           selected_session.id, $3::varchar(128)
         from selected_suggestion cross join selected_session returning 1
       ), advanced as (
         update discovery_inquiry_sessions set revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted) returning revision
       )
       select (select count(*)::int from inserted) decision_count,
         (select revision from advanced) revision,
         (select prompt_key from selected_suggestion) prompt_key,
         (select suggested_text from selected_suggestion) suggested_text`,
      [context.discovery.organizationId, input.sessionId,
        context.discovery.actorIdentifier, input.expectedRevision,
        input.suggestionId],
    );
    const revision = Number(rows[0]?.revision);
    const skipped = String(rows[0]?.suggested_text ?? "").trim();
    const promptKey = String(rows[0]?.prompt_key ?? "");
    if (Number(rows[0]?.decision_count) !== 1 || !validRevision(revision) || !skipped || !promptKey) {
      return { code: "conflict", message: "The interview changed. Reload before skipping.", ok: false };
    }
    const focus = `The participant skipped the previous follow-up: "${skipped.slice(0, 500)}". Do not infer an answer. Keep it unresolved and ask one materially different question from another topic.`;
    const nextTurn = await createTurn(context, input.sessionId, revision, focus, [promptKey]);
    return { message: nextTurn ? "Question skipped. Lotura moved to a different topic without creating evidence." : "Question skipped without creating evidence. Refresh when ready.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("skip", error);
    return { code: "unavailable", message: "Lotura could not skip this question safely.", ok: false };
  }
}

export async function correctInquiryDiscoveryAnalyst(input: {
  epistemicState: DiscoveryAnalystEpistemicState;
  expectedRevision: number;
  responseText: string;
  sessionId: string;
}): Promise<MutationResult> {
  const responseText = validateResponse(input);
  if (!validUuid(input.sessionId) || !validRevision(input.expectedRevision) || responseText === undefined) {
    return { code: "invalid", message: "Describe the correction and try again.", ok: false };
  }
  try {
    const context = await writeContext();
    if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, stable_key from discovery_inquiry_sessions
         where organization_id = $1::integer and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128) and revision = $4::integer
           and status = 'in_progress' and analyst_enabled = true for update
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 value
         from discovery_inquiry_observations
         where organization_id = $1::integer and session_stable_key = $2::uuid
       ), inserted as (
         insert into discovery_inquiry_observations (
           organization_id, session_id, session_stable_key, sequence,
           prompt_key, prompt_text, topic, response_text, epistemic_state,
           actor_identifier
         )
         select $1::integer, selected_session.id, selected_session.stable_key,
           next_sequence.value, 'unresolved_questions',
           'Correction to Lotura''s working understanding',
           'unresolved_questions', $5::text, $6::discovery_observation_state,
           $3::varchar(128)
         from selected_session cross join next_sequence returning 1
       ), advanced as (
         update discovery_inquiry_sessions set revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted) returning revision
       )
       select (select count(*)::int from inserted) inserted_count,
         (select revision from advanced) revision`,
      [context.discovery.organizationId, input.sessionId,
        context.discovery.actorIdentifier, input.expectedRevision,
        responseText, input.epistemicState],
    );
    const revision = Number(rows[0]?.revision);
    if (Number(rows[0]?.inserted_count) !== 1 || !validRevision(revision)) {
      return { code: "conflict", message: "The interview changed. Reload before correcting the synthesis.", ok: false };
    }
    await createTurn(context, input.sessionId, revision,
      "The participant corrected the working synthesis. Incorporate the correction and ask the most useful next question.");
    return { message: "Your correction is preserved as evidence. No Process or other organizational identity was changed.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("correct", error);
    return { code: "unavailable", message: "Lotura could not preserve this correction safely.", ok: false };
  }
}

export async function refreshInquiryDiscoveryAnalyst(input: {
  expectedRevision: number;
  focus: "continue" | "synthesize";
  sessionId: string;
}): Promise<MutationResult> {
  if (!validUuid(input.sessionId) || !validRevision(input.expectedRevision)) {
    return { code: "invalid", message: "The interview reference is invalid.", ok: false };
  }
  try {
    const context = await writeContext();
    if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
    const focus = input.focus === "synthesize"
      ? "The participant asked: What do you understand so far? Prioritize a concise readable synthesis, then ask one useful unresolved follow-up."
      : "Continue the adaptive inquiry with the most useful unresolved follow-up.";
    const preserved = await createTurn(context, input.sessionId, input.expectedRevision, focus);
    if (!preserved) return { code: "conflict", message: "The interview changed. Reload before refreshing the analyst.", ok: false };
    return { message: "Lotura refreshed its working understanding without creating or selecting a Process.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("refresh", error);
    return { code: "unavailable", message: "Lotura could not refresh the analyst safely.", ok: false };
  }
}

export async function finishInquiryDiscoveryAnalyst(input: {
  expectedRevision: number;
  sessionId: string;
}): Promise<MutationResult> {
  if (!validUuid(input.sessionId) || !validRevision(input.expectedRevision)) {
    return { code: "invalid", message: "The interview reference is invalid.", ok: false };
  }
  try {
    const context = await writeContext();
    if (!context) return { code: "unavailable", message: "The AI Discovery Analyst is unavailable.", ok: false };
    const rows = await context.sql.query(
      `update discovery_inquiry_sessions
       set status = 'ready_for_review', current_question_key = 'review',
         revision = revision + 1, updated_at = transaction_timestamp()
       where organization_id = $1::integer and stable_key = $2::uuid
         and actor_identifier = $3::varchar(128) and revision = $4::integer
         and status = 'in_progress' and analyst_enabled = true
         and exists (select 1 from discovery_inquiry_observations observation
           where observation.organization_id = discovery_inquiry_sessions.organization_id
             and observation.session_id = discovery_inquiry_sessions.id)
       returning stable_key::text`,
      [context.discovery.organizationId, input.sessionId,
        context.discovery.actorIdentifier, input.expectedRevision],
    );
    if (!rows[0]) return { code: "conflict", message: "Preserve at least one observation, or reload if the interview changed.", ok: false };
    return { message: "Inquiry finished. Your evidence is ready for human review; no Process was created or changed.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("finish", error);
    return { code: "unavailable", message: "Lotura could not finish the inquiry safely.", ok: false };
  }
}

type ReferenceDecisionInput = {
  disposition: "confirmed" | "rejected" | "unresolved";
  kind: string;
  mentionSequence: number;
  mentionText: string;
  runId: string;
  sourceFingerprint: string;
  sourceObservationId: string;
  targetKey: string | null;
};

export async function saveInquiryReferenceConfirmations(input: {
  decisions: ReferenceDecisionInput[];
  sessionId: string;
}): Promise<MutationResult> {
  if (!validUuid(input.sessionId) || input.decisions.length < 1 || input.decisions.length > 16) {
    return { code: "invalid", message: "Choose at least one reference decision to save.", ok: false };
  }
  const normalized = [];
  for (const decision of input.decisions) {
    const target = decision.targetKey ? parseDiscoveryReferenceTargetKey(decision.targetKey) : null;
    if (!validUuid(decision.runId) || !validUuid(decision.sourceObservationId)
      || !/^[0-9a-f]{64}$/.test(decision.sourceFingerprint)
      || !Number.isSafeInteger(decision.mentionSequence) || decision.mentionSequence < 1
      || !decision.mentionText.trim() || decision.mentionText.length > 500
      || !["confirmed", "rejected", "unresolved"].includes(decision.disposition)
      || (decision.disposition === "confirmed" && (!target || target.kind !== decision.kind))
      || (decision.disposition !== "confirmed" && target !== null)
      || (["policy", "other"].includes(decision.kind) && decision.disposition === "confirmed")) {
      return { code: "invalid", message: "One reference decision is incomplete. Review the visible rows and try again.", ok: false };
    }
    if (decision.sourceFingerprint !== fingerprintDiscoveryReferenceMention({
      mentionSequence: decision.mentionSequence,
      mentionText: decision.mentionText.trim(),
      referenceKind: decision.kind,
      sourceObservationId: decision.sourceObservationId,
    })) {
      return { code: "invalid", message: "One reference source changed. Reload before saving.", ok: false };
    }
    normalized.push({
      ...decision,
      mentionText: decision.mentionText.trim(),
      organizationUnitStableKey: target?.kind === "organization_unit" ? target.stableKey : null,
      personStableKey: target?.kind === "person_capacity" ? target.personStableKey : null,
      positionStableKey: target?.kind === "person_capacity" ? target.positionStableKey : null,
      processFamilyStableKey: target?.kind === "process_family" ? target.stableKey : null,
      processStableKey: target?.kind === "process" ? target.stableKey : null,
      roleStableKey: target?.kind === "operational_role" ? target.stableKey
        : target?.kind === "person_capacity" ? target.roleStableKey : null,
      systemStableKey: target?.kind === "system" ? target.stableKey : null,
    });
  }
  try {
    const context = await writeContext();
    if (!context) return { code: "unavailable", message: "Reference confirmation is unavailable.", ok: false };
    const rows = await context.sql.query(
      `with input as materialized (
         select * from jsonb_to_recordset($4::jsonb) as item(
           disposition discovery_reference_disposition,
           kind discovery_reference_kind,
           "mentionSequence" integer, "mentionText" text,
           "runId" uuid, "sourceFingerprint" varchar(64),
           "sourceObservationId" uuid,
           "organizationUnitStableKey" uuid, "roleStableKey" uuid,
           "personStableKey" uuid, "positionStableKey" uuid,
           "systemStableKey" uuid, "processStableKey" uuid,
           "processFamilyStableKey" uuid
         )
       ), selected_session as materialized (
         select id, stable_key from discovery_inquiry_sessions
         where organization_id = $1::integer and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128) and analyst_enabled = true
           and status in ('in_progress', 'paused', 'ready_for_review')
       ), resolved as materialized (
         select input.*, session.id as session_id, session.stable_key as session_stable_key,
           run.id as run_id, run.stable_key as run_stable_key,
           unit.id as unit_id, unit.stable_key as unit_stable_key,
           matched_role.id as role_id, matched_role.stable_key as role_stable_key,
           matched_person.id as person_id, matched_person.stable_key as person_stable_key,
           matched_position.id as position_id, matched_position.stable_key as position_stable_key,
           assignment.id as assignment_id, matched_mandate.id as mandate_id,
           matched_system.id as system_id, matched_system.stable_key as system_stable_key,
           matched_process.id as process_id, matched_process.stable_key as process_stable_key,
           family.id as family_id, family.stable_key as family_stable_key,
           previous.id as previous_id, previous.stable_key as previous_stable_key
         from input cross join selected_session session
         inner join discovery_assistance_runs run
           on run.organization_id = $1::integer and run.stable_key = input."runId"
          and run.session_kind = 'inquiry' and run.analyst_turn = true
          and run.inquiry_session_id = session.id
          and run.inquiry_session_stable_key = session.stable_key
         inner join discovery_inquiry_observations observation
           on observation.organization_id = $1::integer
          and observation.session_id = session.id
          and observation.stable_key = input."sourceObservationId"
         left join organization_units unit
           on unit.organization_id = $1::integer and unit.stable_key = input."organizationUnitStableKey"
          and unit.status = 'active'
         left join roles matched_role
           on matched_role.organization_id = $1::integer and matched_role.stable_key = input."roleStableKey"
          and matched_role.status = 'active'
         left join people matched_person
           on matched_person.organization_id = $1::integer and matched_person.stable_key = input."personStableKey"
          and matched_person.status = 'active'
         left join positions matched_position
           on matched_position.organization_id = $1::integer and matched_position.stable_key = input."positionStableKey"
          and matched_position.status = 'active'
         left join position_assignments assignment
           on assignment.organization_id = $1::integer
          and assignment.person_id = matched_person.id
          and assignment.position_id = matched_position.id and assignment.status = 'active'
         left join role_mandates matched_mandate
           on matched_mandate.organization_id = $1::integer
          and matched_mandate.position_id = matched_position.id
          and matched_mandate.role_id = matched_role.id
          and matched_mandate.status = 'active'
         left join systems matched_system
           on matched_system.organization_id = $1::integer and matched_system.stable_key = input."systemStableKey"
          and matched_system.status = 'active'
         left join processes matched_process
           on matched_process.organization_id = $1::integer and matched_process.stable_key = input."processStableKey"
         left join process_families family
           on family.organization_id = $1::integer and family.stable_key = input."processFamilyStableKey"
          and family.status = 'active'
         left join lateral (
           select confirmation.id, confirmation.stable_key
           from discovery_reference_confirmations confirmation
           where confirmation.organization_id = $1::integer
             and confirmation.inquiry_session_id = session.id
             and confirmation.source_fingerprint = input."sourceFingerprint"
             and not exists (
               select 1 from discovery_reference_confirmations superseding
               where superseding.organization_id = confirmation.organization_id
                 and superseding.supersedes_confirmation_id = confirmation.id
             )
           order by confirmation.created_at desc, confirmation.id desc limit 1
         ) previous on true
         where input."sourceFingerprint" ~ '^[0-9a-f]{64}$'
           and position(lower(input."mentionText") in lower(coalesce(observation.response_text, ''))) > 0
       ), guarded as materialized (
         select resolved.*, count(*) over () as resolved_count,
           count(*) over (partition by "sourceFingerprint") as duplicate_count,
           case
             when disposition in ('rejected', 'unresolved') then
               unit_id is null and role_id is null and person_id is null
               and position_id is null and system_id is null and process_id is null
               and family_id is null
             when disposition = 'confirmed' and kind = 'organization_unit' then unit_id is not null
             when disposition = 'confirmed' and kind = 'operational_role' then role_id is not null
             when disposition = 'confirmed' and kind = 'person_capacity' then
               person_id is not null and position_id is not null and assignment_id is not null
               and ("roleStableKey" is null or (role_id is not null and mandate_id is not null))
             when disposition = 'confirmed' and kind = 'system' then system_id is not null
             when disposition = 'confirmed' and kind = 'process' then process_id is not null
             when disposition = 'confirmed' and kind = 'process_family' then family_id is not null
             else false
           end as valid
         from resolved
       ), inserted as (
         insert into discovery_reference_confirmations (
           organization_id, inquiry_session_id, inquiry_session_stable_key,
           run_id, run_stable_key, source_observation_stable_key,
           mention_sequence, mention_text, reference_kind, source_fingerprint,
           disposition, organization_unit_id, organization_unit_stable_key,
           role_id, role_stable_key, person_id, person_stable_key,
           position_id, position_stable_key, system_id, system_stable_key,
           process_id, process_stable_key, process_family_id,
           process_family_stable_key, supersedes_confirmation_id,
           supersedes_confirmation_stable_key, actor_identifier
         )
         select $1::integer, session_id, session_stable_key, run_id, run_stable_key,
           "sourceObservationId", "mentionSequence", "mentionText", kind,
           "sourceFingerprint", disposition, unit_id, unit_stable_key,
           role_id, role_stable_key, person_id, person_stable_key,
           position_id, position_stable_key, system_id, system_stable_key,
           process_id, process_stable_key, family_id, family_stable_key,
           previous_id, previous_stable_key, $3::varchar(128)
         from guarded
         where valid and duplicate_count = 1 and resolved_count = $5::integer
           and not exists (select 1 from guarded invalid where not invalid.valid or invalid.duplicate_count <> 1)
         returning 1
       )
       select (select count(*)::int from input) input_count,
         (select count(*)::int from inserted) inserted_count`,
      [context.discovery.organizationId, input.sessionId,
        context.discovery.actorIdentifier, JSON.stringify(normalized), normalized.length],
    );
    if (Number(rows[0]?.input_count) !== normalized.length
      || Number(rows[0]?.inserted_count) !== normalized.length) {
      return { code: "conflict", message: "A reference or organizational match changed. Reload before saving these decisions.", ok: false };
    }
    return { message: "Reference decisions preserved. No organizational relationship or Process was changed.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("reference_confirmations", error);
    return { code: "unavailable", message: "Lotura could not preserve these reference decisions safely.", ok: false };
  }
}
