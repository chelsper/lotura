import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  fingerprintAssistanceValue,
  normalizeParticipantFocus,
  validateMockSuggestions,
  type DiscoveryAssistancePacket,
  type DiscoveryAssistanceSource,
  type DiscoveryAssistanceSuggestion,
  type DiscoveryAssistanceTopic,
} from "./discovery-assistance-model.mjs";
import { discoveryAssistanceProvider } from "./discovery-assistance-provider";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
import {
  DISCOVERY_REVIEW_KEY,
  getDiscoveryQuestion,
  getNextDiscoveryQuestionKey,
} from "./discovery-questions.mjs";
import {
  DISCOVERY_INQUIRY_REVIEW_KEY,
  getDiscoveryInquiryQuestion,
  getNextDiscoveryInquiryQuestionKey,
} from "./discovery-inquiry-questions.mjs";
import type { DiscoveryEpistemicState } from "./discovery-administration";

type AssistanceResult =
  | { message: string; ok: true; runId: string; sessionId: string }
  | {
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
      ok: false;
    };

type AssistanceDecisionResult =
  | { message: string; ok: true; sessionId: string }
  | {
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
      ok: false;
    };

type ProcessSource = DiscoveryAssistanceSource & {
  discoveryObservationStableKey?: string;
  discoverySessionId?: number;
  discoverySessionStableKey?: string;
  processId: number;
  processStableKey: string;
  sourceFingerprint: string;
};

type InquirySource = DiscoveryAssistanceSource & {
  inquiryId: number;
  inquiryObservationStableKey?: string;
  inquirySessionId: number;
  inquirySessionStableKey: string;
  inquiryStableKey: string;
  sourceFingerprint: string;
};

const STATES = new Set<DiscoveryEpistemicState>([
  "known",
  "assumed",
  "unknown",
  "needs_validation",
  "conflicting_observation",
]);

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function validRevision(value: number) {
  return Number.isSafeInteger(value) && value >= 1;
}

function validateResponse(input: {
  epistemicState: DiscoveryEpistemicState;
  responseText: string;
}) {
  if (!STATES.has(input.epistemicState)) return null;
  const responseText = input.responseText.trim();
  if (responseText.length > 10000) return null;
  if (input.epistemicState !== "unknown" && responseText.length < 1) return null;
  return responseText || null;
}

function safeText(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function logFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  console.error("[discovery-assistance] database operation failed", {
    code: safeText(details.code),
    constraint: safeText(details.constraint),
    operation,
    routine: safeText(details.routine),
    table: safeText(details.table),
  });
}

async function assistanceWriteContext() {
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

function assistancePacket(input: {
  currentQuestion: string;
  focus: string;
  promptKey: string;
  sessionKind: "process" | "inquiry";
  sources: Array<ProcessSource | InquirySource>;
  topic: DiscoveryAssistanceTopic;
}): DiscoveryAssistancePacket {
  return {
    currentQuestion: input.currentQuestion,
    participantFocus: normalizeParticipantFocus(input.focus),
    promptKey: input.promptKey,
    sessionKind: input.sessionKind,
    sources: input.sources.map(({ kind, sequence, snapshot }) => ({
      kind,
      sequence,
      snapshot,
    })),
    topic: input.topic,
  };
}

function suggestionPayload(suggestions: DiscoveryAssistanceSuggestion[]) {
  if (!validateMockSuggestions(suggestions)) {
    throw new Error("The mocked assistance response did not match the reviewed contract.");
  }
  return suggestions.map((suggestion, index) => ({
    original_text: suggestion.originalText ?? null,
    prompt_key: suggestion.promptKey,
    rationale: suggestion.rationale,
    suggested_text: suggestion.suggestedText,
    suggestion_kind: suggestion.kind,
    suggestion_sequence: index + 1,
    topic: suggestion.topic,
  }));
}

async function processContext(input: {
  expectedRevision: number;
  promptKey: string;
  sessionId: string;
}) {
  const question = getDiscoveryQuestion(input.promptKey);
  if (!question) return null;
  const context = await assistanceWriteContext();
  if (!context) return null;
  const rows = await context.sql.query(
    `select session.id as session_id,
       session.stable_key::text as session_stable_key,
       session.process_id, session.process_stable_key::text,
       session.scope_statement, process.name as process_name,
       process.purpose as process_purpose, process.status::text as process_status
     from discovery_sessions session
     inner join processes process
       on process.id = session.process_id
      and process.organization_id = session.organization_id
      and process.stable_key = session.process_stable_key
     where session.organization_id = $1::integer
       and session.stable_key = $2::uuid
       and session.actor_identifier = $3::varchar(128)
       and session.revision = $4::integer
       and session.status = 'in_progress'
       and session.current_question_key = $5::varchar(64)`,
    [
      context.configuration.organizationId,
      input.sessionId,
      context.configuration.actorIdentifier,
      input.expectedRevision,
      question.key,
    ],
  );
  const session = rows[0];
  if (!session) return { context, question, session: null, sources: [] };

  const observationRows = await context.sql.query(
    `select observation.stable_key::text as observation_stable_key,
       observation.prompt_text, observation.response_text,
       observation.epistemic_state::text, observation.created_at,
       source_session.id as source_session_id,
       source_session.stable_key::text as source_session_stable_key,
       source_session.scope_statement
     from discovery_observations observation
     inner join discovery_sessions source_session
       on source_session.id = observation.session_id
      and source_session.organization_id = observation.organization_id
      and source_session.stable_key = observation.session_stable_key
     where source_session.organization_id = $1::integer
       and source_session.process_id = $2::integer
       and source_session.process_stable_key = $3::uuid
       and source_session.id < $4::integer
       and observation.prompt_key = $5::varchar(64)
       and not exists (
         select 1 from discovery_observations superseding
         where superseding.organization_id = observation.organization_id
           and superseding.session_id = observation.session_id
           and superseding.supersedes_observation_stable_key = observation.stable_key
       )
     order by observation.created_at desc, observation.id desc
     limit 3`,
    [
      context.configuration.organizationId,
      Number(session.process_id),
      String(session.process_stable_key),
      Number(session.session_id),
      question.key,
    ],
  );

  const processSnapshot = {
    name: String(session.process_name),
    purpose: String(session.process_purpose),
    scopeStatement: String(session.scope_statement),
    status: String(session.process_status),
  };
  const sources: ProcessSource[] = [
    {
      kind: "process_snapshot",
      processId: Number(session.process_id),
      processStableKey: String(session.process_stable_key),
      sequence: 1,
      snapshot: processSnapshot,
      sourceFingerprint: fingerprintAssistanceValue(processSnapshot),
    },
    ...observationRows.map((row, index) => {
      const snapshot = {
        createdAt: new Date(String(row.created_at)).toISOString(),
        epistemicState: String(row.epistemic_state),
        promptText: String(row.prompt_text),
        responseText: row.response_text === null ? null : String(row.response_text),
        scopeStatement: String(row.scope_statement),
      };
      return {
        discoveryObservationStableKey: String(row.observation_stable_key),
        discoverySessionId: Number(row.source_session_id),
        discoverySessionStableKey: String(row.source_session_stable_key),
        kind: "process_observation" as const,
        processId: Number(session.process_id),
        processStableKey: String(session.process_stable_key),
        sequence: index + 2,
        snapshot,
        sourceFingerprint: fingerprintAssistanceValue(snapshot),
      };
    }),
  ];
  return { context, question, session, sources };
}

async function inquiryContext(input: {
  expectedRevision: number;
  inquiryId: string;
  promptKey: string;
  sessionId: string;
}) {
  const question = getDiscoveryInquiryQuestion(input.promptKey);
  if (!question) return null;
  const context = await assistanceWriteContext();
  if (!context) return null;
  const rows = await context.sql.query(
    `select session.id as session_id,
       session.stable_key::text as session_stable_key,
       session.inquiry_id, session.inquiry_stable_key::text,
       session.scope_statement, inquiry.question_text
     from discovery_inquiry_sessions session
     inner join discovery_inquiries inquiry
       on inquiry.id = session.inquiry_id
      and inquiry.organization_id = session.organization_id
      and inquiry.stable_key = session.inquiry_stable_key
     where session.organization_id = $1::integer
       and session.stable_key = $2::uuid
       and session.inquiry_stable_key = $3::uuid
       and session.actor_identifier = $4::varchar(128)
       and session.revision = $5::integer
       and session.status = 'in_progress'
       and session.current_question_key = $6::varchar(64)`,
    [
      context.configuration.organizationId,
      input.sessionId,
      input.inquiryId,
      context.configuration.actorIdentifier,
      input.expectedRevision,
      question.key,
    ],
  );
  const session = rows[0];
  if (!session) return { context, question, session: null, sources: [] };

  const observationRows = await context.sql.query(
    `select observation.stable_key::text as observation_stable_key,
       observation.prompt_text, observation.response_text,
       observation.epistemic_state::text, observation.created_at
     from discovery_inquiry_observations observation
     where observation.organization_id = $1::integer
       and observation.session_id = $2::integer
       and observation.prompt_key <> $3::varchar(64)
       and not exists (
         select 1 from discovery_inquiry_observations superseding
         where superseding.organization_id = observation.organization_id
           and superseding.session_id = observation.session_id
           and superseding.supersedes_observation_stable_key = observation.stable_key
       )
     order by observation.created_at desc, observation.id desc
     limit 5`,
    [context.configuration.organizationId, Number(session.session_id), question.key],
  );

  const inquirySnapshot = {
    questionText: String(session.question_text),
    scopeStatement: String(session.scope_statement),
  };
  const baseSource = {
    inquiryId: Number(session.inquiry_id),
    inquirySessionId: Number(session.session_id),
    inquirySessionStableKey: String(session.session_stable_key),
    inquiryStableKey: String(session.inquiry_stable_key),
  };
  const sources: InquirySource[] = [
    {
      ...baseSource,
      kind: "inquiry_context",
      sequence: 1,
      snapshot: inquirySnapshot,
      sourceFingerprint: fingerprintAssistanceValue(inquirySnapshot),
    },
    ...observationRows.map((row, index) => {
      const snapshot = {
        createdAt: new Date(String(row.created_at)).toISOString(),
        epistemicState: String(row.epistemic_state),
        promptText: String(row.prompt_text),
        responseText: row.response_text === null ? null : String(row.response_text),
      };
      return {
        ...baseSource,
        inquiryObservationStableKey: String(row.observation_stable_key),
        kind: "inquiry_observation" as const,
        sequence: index + 2,
        snapshot,
        sourceFingerprint: fingerprintAssistanceValue(snapshot),
      };
    }),
  ];
  return { context, question, session, sources };
}

function sourcePayload(sources: Array<ProcessSource | InquirySource>) {
  return sources.map((source) => ({
    discovery_observation_stable_key:
      "discoveryObservationStableKey" in source
        ? source.discoveryObservationStableKey ?? null
        : null,
    discovery_session_id:
      "discoverySessionId" in source ? source.discoverySessionId ?? null : null,
    discovery_session_stable_key:
      "discoverySessionStableKey" in source
        ? source.discoverySessionStableKey ?? null
        : null,
    inquiry_id: "inquiryId" in source ? source.inquiryId : null,
    inquiry_observation_stable_key:
      "inquiryObservationStableKey" in source
        ? source.inquiryObservationStableKey ?? null
        : null,
    inquiry_session_id:
      "inquirySessionId" in source ? source.inquirySessionId : null,
    inquiry_session_stable_key:
      "inquirySessionStableKey" in source
        ? source.inquirySessionStableKey
        : null,
    inquiry_stable_key:
      "inquiryStableKey" in source ? source.inquiryStableKey : null,
    process_id: "processId" in source ? source.processId : null,
    process_stable_key:
      "processStableKey" in source ? source.processStableKey : null,
    source_fingerprint: source.sourceFingerprint,
    source_kind: source.kind,
    source_sequence: source.sequence,
    source_snapshot: source.snapshot,
  }));
}

async function persistProcessRun(input: {
  assistanceKind: "question_suggestions" | "clarity_draft";
  expectedRevision: number;
  focus: string | null;
  packet: DiscoveryAssistancePacket;
  sessionId: string;
  sources: ProcessSource[];
  suggestions: DiscoveryAssistanceSuggestion[];
}) {
  const context = await assistanceWriteContext();
  if (!context) return null;
  return context.sql.query(
    `with selected_session as materialized (
       select id, stable_key
       from discovery_sessions
       where organization_id = $1::integer
         and stable_key = $2::uuid
         and actor_identifier = $3::varchar(128)
         and revision = $4::integer
         and status = 'in_progress'
         and current_question_key = $5::varchar(64)
       for update
     ), inserted_run as (
       insert into discovery_assistance_runs (
         organization_id, session_kind, discovery_session_id,
         discovery_session_stable_key, requested_session_revision,
         prompt_key, assistance_kind, provider_key, model_identifier,
         prompt_policy_version, context_fingerprint, participant_focus,
         actor_identifier
       )
       select $1::integer, 'process', selected_session.id,
         selected_session.stable_key, $4::integer, $5::varchar(64),
         $6::discovery_assistance_kind, $7::varchar(64), $8::varchar(128),
         $9::varchar(64), $10::varchar(64), $11::text, $3::varchar(128)
       from selected_session
       returning id, stable_key
     ), inserted_sources as (
       insert into discovery_assistance_sources (
         organization_id, run_id, run_stable_key, source_sequence, source_kind,
         process_id, process_stable_key, discovery_session_id,
         discovery_session_stable_key, discovery_observation_stable_key,
         inquiry_id, inquiry_stable_key, inquiry_session_id,
         inquiry_session_stable_key, inquiry_observation_stable_key,
         source_snapshot, source_fingerprint
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key,
         source.source_sequence, source.source_kind::discovery_assistance_source_kind,
         source.process_id, source.process_stable_key, source.discovery_session_id,
         source.discovery_session_stable_key,
         source.discovery_observation_stable_key, source.inquiry_id,
         source.inquiry_stable_key, source.inquiry_session_id,
         source.inquiry_session_stable_key, source.inquiry_observation_stable_key,
         source.source_snapshot, source.source_fingerprint
       from inserted_run
       cross join jsonb_to_recordset($12::jsonb) as source(
         source_sequence integer, source_kind text, process_id integer,
         process_stable_key uuid, discovery_session_id integer,
         discovery_session_stable_key uuid,
         discovery_observation_stable_key uuid, inquiry_id integer,
         inquiry_stable_key uuid, inquiry_session_id integer,
         inquiry_session_stable_key uuid, inquiry_observation_stable_key uuid,
         source_snapshot jsonb, source_fingerprint text
       )
       returning 1
     ), inserted_suggestions as (
       insert into discovery_assistance_suggestions (
         organization_id, run_id, run_stable_key, suggestion_sequence,
         suggestion_kind, prompt_key, topic, suggested_text, rationale,
         original_text
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key,
         suggestion.suggestion_sequence,
         suggestion.suggestion_kind::discovery_assistance_suggestion_kind,
         suggestion.prompt_key, suggestion.topic::discovery_observation_topic,
         suggestion.suggested_text, suggestion.rationale,
         suggestion.original_text
       from inserted_run
       cross join jsonb_to_recordset($13::jsonb) as suggestion(
         suggestion_sequence integer, suggestion_kind text, prompt_key text,
         topic text, suggested_text text, rationale text, original_text text
       )
       returning 1
     )
     select (select stable_key::text from inserted_run) as run_id,
       (select count(*)::int from inserted_sources) as source_count,
       (select count(*)::int from inserted_suggestions) as suggestion_count`,
    [
      context.configuration.organizationId,
      input.sessionId,
      context.configuration.actorIdentifier,
      input.expectedRevision,
      input.packet.promptKey,
      input.assistanceKind,
      discoveryAssistanceProvider.key,
      discoveryAssistanceProvider.modelIdentifier,
      discoveryAssistanceProvider.promptPolicyVersion,
      fingerprintAssistanceValue(input.packet),
      input.focus,
      JSON.stringify(sourcePayload(input.sources)),
      JSON.stringify(suggestionPayload(input.suggestions)),
    ],
  );
}

async function persistInquiryRun(input: {
  assistanceKind: "question_suggestions" | "clarity_draft";
  expectedRevision: number;
  focus: string | null;
  inquiryId: string;
  packet: DiscoveryAssistancePacket;
  sessionId: string;
  sources: InquirySource[];
  suggestions: DiscoveryAssistanceSuggestion[];
}) {
  const context = await assistanceWriteContext();
  if (!context) return null;
  return context.sql.query(
    `with selected_session as materialized (
       select id, stable_key
       from discovery_inquiry_sessions
       where organization_id = $1::integer
         and stable_key = $2::uuid
         and inquiry_stable_key = $3::uuid
         and actor_identifier = $4::varchar(128)
         and revision = $5::integer
         and status = 'in_progress'
         and current_question_key = $6::varchar(64)
       for update
     ), inserted_run as (
       insert into discovery_assistance_runs (
         organization_id, session_kind, inquiry_session_id,
         inquiry_session_stable_key, requested_session_revision,
         prompt_key, assistance_kind, provider_key, model_identifier,
         prompt_policy_version, context_fingerprint, participant_focus,
         actor_identifier
       )
       select $1::integer, 'inquiry', selected_session.id,
         selected_session.stable_key, $5::integer, $6::varchar(64),
         $7::discovery_assistance_kind, $8::varchar(64), $9::varchar(128),
         $10::varchar(64), $11::varchar(64), $12::text, $4::varchar(128)
       from selected_session
       returning id, stable_key
     ), inserted_sources as (
       insert into discovery_assistance_sources (
         organization_id, run_id, run_stable_key, source_sequence, source_kind,
         process_id, process_stable_key, discovery_session_id,
         discovery_session_stable_key, discovery_observation_stable_key,
         inquiry_id, inquiry_stable_key, inquiry_session_id,
         inquiry_session_stable_key, inquiry_observation_stable_key,
         source_snapshot, source_fingerprint
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key,
         source.source_sequence, source.source_kind::discovery_assistance_source_kind,
         source.process_id, source.process_stable_key, source.discovery_session_id,
         source.discovery_session_stable_key,
         source.discovery_observation_stable_key, source.inquiry_id,
         source.inquiry_stable_key, source.inquiry_session_id,
         source.inquiry_session_stable_key, source.inquiry_observation_stable_key,
         source.source_snapshot, source.source_fingerprint
       from inserted_run
       cross join jsonb_to_recordset($13::jsonb) as source(
         source_sequence integer, source_kind text, process_id integer,
         process_stable_key uuid, discovery_session_id integer,
         discovery_session_stable_key uuid,
         discovery_observation_stable_key uuid, inquiry_id integer,
         inquiry_stable_key uuid, inquiry_session_id integer,
         inquiry_session_stable_key uuid, inquiry_observation_stable_key uuid,
         source_snapshot jsonb, source_fingerprint text
       )
       returning 1
     ), inserted_suggestions as (
       insert into discovery_assistance_suggestions (
         organization_id, run_id, run_stable_key, suggestion_sequence,
         suggestion_kind, prompt_key, topic, suggested_text, rationale,
         original_text
       )
       select $1::integer, inserted_run.id, inserted_run.stable_key,
         suggestion.suggestion_sequence,
         suggestion.suggestion_kind::discovery_assistance_suggestion_kind,
         suggestion.prompt_key, suggestion.topic::discovery_observation_topic,
         suggestion.suggested_text, suggestion.rationale,
         suggestion.original_text
       from inserted_run
       cross join jsonb_to_recordset($14::jsonb) as suggestion(
         suggestion_sequence integer, suggestion_kind text, prompt_key text,
         topic text, suggested_text text, rationale text, original_text text
       )
       returning 1
     )
     select (select stable_key::text from inserted_run) as run_id,
       (select count(*)::int from inserted_sources) as source_count,
       (select count(*)::int from inserted_suggestions) as suggestion_count`,
    [
      context.configuration.organizationId,
      input.sessionId,
      input.inquiryId,
      context.configuration.actorIdentifier,
      input.expectedRevision,
      input.packet.promptKey,
      input.assistanceKind,
      discoveryAssistanceProvider.key,
      discoveryAssistanceProvider.modelIdentifier,
      discoveryAssistanceProvider.promptPolicyVersion,
      fingerprintAssistanceValue(input.packet),
      input.focus,
      JSON.stringify(sourcePayload(input.sources)),
      JSON.stringify(suggestionPayload(input.suggestions)),
    ],
  );
}

export async function requestProcessDiscoveryAssistance(input: {
  assistanceKind: "question_suggestions" | "clarity_draft";
  expectedRevision: number;
  focus: string;
  originalText: string;
  promptKey: string;
  sessionId: string;
}): Promise<AssistanceResult> {
  if (!validUuid(input.sessionId) || !validRevision(input.expectedRevision)) {
    return { code: "invalid", message: "The interview reference is invalid.", ok: false };
  }
  if (input.assistanceKind !== "question_suggestions" && input.assistanceKind !== "clarity_draft") {
    return { code: "invalid", message: "Choose the kind of help you want.", ok: false };
  }
  try {
    const loaded = await processContext(input);
    if (!loaded) {
      return { code: "unavailable", message: "Discovery assistance is not enabled.", ok: false };
    }
    if (!loaded.session) {
      return { code: "conflict", message: "This interview changed. Reload before asking for help.", ok: false };
    }
    const packet = assistancePacket({
      currentQuestion: loaded.question.prompt,
      focus: input.focus,
      promptKey: loaded.question.key,
      sessionKind: "process",
      sources: loaded.sources,
      topic: loaded.question.topic,
    });
    const suggestions = input.assistanceKind === "clarity_draft"
      ? [await discoveryAssistanceProvider.draftClarity(packet, input.originalText)]
      : await discoveryAssistanceProvider.suggestQuestions(packet);
    const rows = await persistProcessRun({
      assistanceKind: input.assistanceKind,
      expectedRevision: input.expectedRevision,
      focus: packet.participantFocus,
      packet,
      sessionId: input.sessionId,
      sources: loaded.sources,
      suggestions,
    });
    const row = rows?.[0];
    if (!row || !validUuid(String(row.run_id)) || Number(row.source_count) !== loaded.sources.length || Number(row.suggestion_count) !== suggestions.length) {
      return { code: "conflict", message: "This interview changed. Reload before asking for help.", ok: false };
    }
    return {
      message: input.assistanceKind === "clarity_draft"
        ? "A clearer draft is ready for your review. Your original wording remains preserved."
        : "Suggested questions are ready for your review.",
      ok: true,
      runId: String(row.run_id),
      sessionId: input.sessionId,
    };
  } catch (error) {
    logFailure("request_process_assistance", error);
    return { code: "unavailable", message: "Lotura could not prepare suggestions safely. Use the standard question instead.", ok: false };
  }
}

export async function requestInquiryDiscoveryAssistance(input: {
  assistanceKind: "question_suggestions" | "clarity_draft";
  expectedRevision: number;
  focus: string;
  inquiryId: string;
  originalText: string;
  promptKey: string;
  sessionId: string;
}): Promise<AssistanceResult> {
  if (!validUuid(input.inquiryId) || !validUuid(input.sessionId) || !validRevision(input.expectedRevision)) {
    return { code: "invalid", message: "The inquiry or interview reference is invalid.", ok: false };
  }
  if (input.assistanceKind !== "question_suggestions" && input.assistanceKind !== "clarity_draft") {
    return { code: "invalid", message: "Choose the kind of help you want.", ok: false };
  }
  try {
    const loaded = await inquiryContext(input);
    if (!loaded) {
      return { code: "unavailable", message: "Discovery assistance is not enabled.", ok: false };
    }
    if (!loaded.session) {
      return { code: "conflict", message: "This interview changed. Reload before asking for help.", ok: false };
    }
    const packet = assistancePacket({
      currentQuestion: loaded.question.prompt,
      focus: input.focus,
      promptKey: loaded.question.key,
      sessionKind: "inquiry",
      sources: loaded.sources,
      topic: loaded.question.topic,
    });
    const suggestions = input.assistanceKind === "clarity_draft"
      ? [await discoveryAssistanceProvider.draftClarity(packet, input.originalText)]
      : await discoveryAssistanceProvider.suggestQuestions(packet);
    const rows = await persistInquiryRun({
      assistanceKind: input.assistanceKind,
      expectedRevision: input.expectedRevision,
      focus: packet.participantFocus,
      inquiryId: input.inquiryId,
      packet,
      sessionId: input.sessionId,
      sources: loaded.sources,
      suggestions,
    });
    const row = rows?.[0];
    if (!row || !validUuid(String(row.run_id)) || Number(row.source_count) !== loaded.sources.length || Number(row.suggestion_count) !== suggestions.length) {
      return { code: "conflict", message: "This interview changed. Reload before asking for help.", ok: false };
    }
    return {
      message: input.assistanceKind === "clarity_draft"
        ? "A clearer draft is ready for your review. Your original wording remains preserved."
        : "Suggested questions are ready for your review.",
      ok: true,
      runId: String(row.run_id),
      sessionId: input.sessionId,
    };
  } catch (error) {
    logFailure("request_inquiry_assistance", error);
    return { code: "unavailable", message: "Lotura could not prepare suggestions safely. Use the standard question instead.", ok: false };
  }
}

export async function decideProcessDiscoverySuggestion(input: {
  epistemicState: DiscoveryEpistemicState;
  expectedRevision: number;
  finalPromptText: string;
  finalResponseText: string;
  promptKey: string;
  sessionId: string;
  suggestionId: string;
}): Promise<AssistanceDecisionResult> {
  const question = getDiscoveryQuestion(input.promptKey);
  const nextQuestionKey = question ? getNextDiscoveryQuestionKey(question.key) : null;
  const responseText = validateResponse({
    epistemicState: input.epistemicState,
    responseText: input.finalResponseText,
  });
  const finalPromptText = input.finalPromptText.trim();
  if (!question || !nextQuestionKey || !validUuid(input.sessionId) || !validUuid(input.suggestionId) || !validRevision(input.expectedRevision) || finalPromptText.length < 1 || finalPromptText.length > 2000 || responseText === null && input.epistemicState !== "unknown") {
    return { code: "invalid", message: "Review the suggested question and your answer.", ok: false };
  }
  const context = await assistanceWriteContext();
  if (!context) return { code: "unavailable", message: "Discovery assistance is not enabled.", ok: false };
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
           and current_question_key = $5::varchar(64)
         for update
       ), selected_suggestion as materialized (
         select suggestion.id, suggestion.stable_key, suggestion.run_id,
           suggestion.run_stable_key, suggestion.suggestion_kind,
           suggestion.suggested_text, suggestion.topic
         from discovery_assistance_suggestions suggestion
         inner join discovery_assistance_runs run
           on run.id = suggestion.run_id
          and run.organization_id = suggestion.organization_id
          and run.stable_key = suggestion.run_stable_key
         inner join selected_session session
           on run.discovery_session_id = session.id
          and run.discovery_session_stable_key = session.stable_key
         where suggestion.organization_id = $1::integer
           and suggestion.stable_key = $6::uuid
           and suggestion.prompt_key = $5::varchar(64)
           and run.session_kind = 'process'
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
           next_sequence.value, $5::varchar(64),
           case when selected_suggestion.suggestion_kind = 'clarity_draft'
             then $7::text else $8::text end,
           selected_suggestion.topic, $9::text,
           $10::discovery_observation_state, $3::varchar(128)
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
           selected_suggestion.stable_key, 'process',
           case when (case when selected_suggestion.suggestion_kind = 'clarity_draft'
             then $9::text else $8::text end) = selected_suggestion.suggested_text
             then 'used_as_written'::discovery_assistance_disposition
             else 'edited'::discovery_assistance_disposition end,
           case when selected_suggestion.suggestion_kind = 'clarity_draft'
             then $9::text else $8::text end,
           selected_session.id, inserted_observation.stable_key,
           $3::varchar(128)
         from selected_session cross join selected_suggestion cross join inserted_observation
         returning 1
       ), inserted_other_decisions as (
         insert into discovery_assistance_decisions (
           organization_id, run_id, run_stable_key, suggestion_id,
           suggestion_stable_key, session_kind, disposition, actor_identifier
         )
         select $1::integer, other.run_id, other.run_stable_key, other.id,
           other.stable_key, 'process', 'skipped', $3::varchar(128)
         from discovery_assistance_suggestions other
         cross join selected_suggestion selected
         where other.organization_id = $1::integer
           and other.run_id = selected.run_id
           and other.run_stable_key = selected.run_stable_key
           and other.stable_key <> selected.stable_key
           and not exists (
             select 1 from discovery_assistance_decisions existing
             where existing.organization_id = other.organization_id
               and existing.suggestion_stable_key = other.stable_key
           )
         returning 1
       ), advanced as (
         update discovery_sessions
         set current_question_key = $11::varchar(64),
           status = case when $11::varchar(64) = $12::varchar(64)
             then 'ready_for_review'::discovery_session_status
             else 'in_progress'::discovery_session_status end,
           revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted_observation)
           and exists (select 1 from inserted_decision)
         returning 1
       )
       select (select count(*)::int from selected_suggestion) as suggestion_count,
         (select count(*)::int from inserted_observation) as observation_count,
         (select count(*)::int from inserted_decision) as decision_count,
         (select count(*)::int from inserted_other_decisions) as other_decision_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        question.key,
        input.suggestionId,
        question.prompt,
        finalPromptText,
        responseText,
        input.epistemicState,
        nextQuestionKey,
        DISCOVERY_REVIEW_KEY,
      ],
    );
    const row = rows[0];
    if (!row || Number(row.suggestion_count) !== 1 || Number(row.observation_count) !== 1 || Number(row.decision_count) !== 1 || Number(row.advanced_count) !== 1) {
      return { code: "conflict", message: "The interview or suggestion changed. Reload before continuing.", ok: false };
    }
    return { message: "Your answer was preserved. The suggestion remains separate from your evidence.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("decide_process_suggestion", error);
    return { code: "unavailable", message: "Lotura could not preserve the assisted answer safely. No partial change was retained.", ok: false };
  }
}

export async function decideInquiryDiscoverySuggestion(input: {
  epistemicState: DiscoveryEpistemicState;
  expectedRevision: number;
  finalPromptText: string;
  finalResponseText: string;
  inquiryId: string;
  promptKey: string;
  sessionId: string;
  suggestionId: string;
}): Promise<AssistanceDecisionResult> {
  const question = getDiscoveryInquiryQuestion(input.promptKey);
  const nextQuestionKey = question
    ? getNextDiscoveryInquiryQuestionKey(question.key)
    : null;
  const responseText = validateResponse({
    epistemicState: input.epistemicState,
    responseText: input.finalResponseText,
  });
  const finalPromptText = input.finalPromptText.trim();
  if (!question || !nextQuestionKey || !validUuid(input.inquiryId) || !validUuid(input.sessionId) || !validUuid(input.suggestionId) || !validRevision(input.expectedRevision) || finalPromptText.length < 1 || finalPromptText.length > 2000 || responseText === null && input.epistemicState !== "unknown") {
    return { code: "invalid", message: "Review the suggested question and your answer.", ok: false };
  }
  const context = await assistanceWriteContext();
  if (!context) return { code: "unavailable", message: "Discovery assistance is not enabled.", ok: false };
  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, stable_key
         from discovery_inquiry_sessions
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and inquiry_stable_key = $3::uuid
           and actor_identifier = $4::varchar(128)
           and revision = $5::integer
           and status = 'in_progress'
           and current_question_key = $6::varchar(64)
         for update
       ), selected_suggestion as materialized (
         select suggestion.id, suggestion.stable_key, suggestion.run_id,
           suggestion.run_stable_key, suggestion.suggestion_kind,
           suggestion.suggested_text, suggestion.topic
         from discovery_assistance_suggestions suggestion
         inner join discovery_assistance_runs run
           on run.id = suggestion.run_id
          and run.organization_id = suggestion.organization_id
          and run.stable_key = suggestion.run_stable_key
         inner join selected_session session
           on run.inquiry_session_id = session.id
          and run.inquiry_session_stable_key = session.stable_key
         where suggestion.organization_id = $1::integer
           and suggestion.stable_key = $7::uuid
           and suggestion.prompt_key = $6::varchar(64)
           and run.session_kind = 'inquiry'
           and run.requested_session_revision = $5::integer
           and not exists (
             select 1 from discovery_assistance_decisions decision
             where decision.organization_id = suggestion.organization_id
               and decision.suggestion_stable_key = suggestion.stable_key
           )
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
           next_sequence.value, $6::varchar(64),
           case when selected_suggestion.suggestion_kind = 'clarity_draft'
             then $8::text else $9::text end,
           selected_suggestion.topic, $10::text,
           $11::discovery_observation_state, $4::varchar(128)
         from selected_session cross join selected_suggestion cross join next_sequence
         returning stable_key
       ), inserted_decision as (
         insert into discovery_assistance_decisions (
           organization_id, run_id, run_stable_key, suggestion_id,
           suggestion_stable_key, session_kind, disposition, selected_text,
           inquiry_session_id, inquiry_observation_stable_key,
           actor_identifier
         )
         select $1::integer, selected_suggestion.run_id,
           selected_suggestion.run_stable_key, selected_suggestion.id,
           selected_suggestion.stable_key, 'inquiry',
           case when (case when selected_suggestion.suggestion_kind = 'clarity_draft'
             then $10::text else $9::text end) = selected_suggestion.suggested_text
             then 'used_as_written'::discovery_assistance_disposition
             else 'edited'::discovery_assistance_disposition end,
           case when selected_suggestion.suggestion_kind = 'clarity_draft'
             then $10::text else $9::text end,
           selected_session.id, inserted_observation.stable_key,
           $4::varchar(128)
         from selected_session cross join selected_suggestion cross join inserted_observation
         returning 1
       ), inserted_other_decisions as (
         insert into discovery_assistance_decisions (
           organization_id, run_id, run_stable_key, suggestion_id,
           suggestion_stable_key, session_kind, disposition, actor_identifier
         )
         select $1::integer, other.run_id, other.run_stable_key, other.id,
           other.stable_key, 'inquiry', 'skipped', $4::varchar(128)
         from discovery_assistance_suggestions other
         cross join selected_suggestion selected
         where other.organization_id = $1::integer
           and other.run_id = selected.run_id
           and other.run_stable_key = selected.run_stable_key
           and other.stable_key <> selected.stable_key
           and not exists (
             select 1 from discovery_assistance_decisions existing
             where existing.organization_id = other.organization_id
               and existing.suggestion_stable_key = other.stable_key
           )
         returning 1
       ), advanced as (
         update discovery_inquiry_sessions
         set current_question_key = $12::varchar(64),
           status = case when $12::varchar(64) = $13::varchar(64)
             then 'ready_for_review'::discovery_session_status
             else 'in_progress'::discovery_session_status end,
           revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted_observation)
           and exists (select 1 from inserted_decision)
         returning 1
       )
       select (select count(*)::int from selected_suggestion) as suggestion_count,
         (select count(*)::int from inserted_observation) as observation_count,
         (select count(*)::int from inserted_decision) as decision_count,
         (select count(*)::int from inserted_other_decisions) as other_decision_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.inquiryId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        question.key,
        input.suggestionId,
        question.prompt,
        finalPromptText,
        responseText,
        input.epistemicState,
        nextQuestionKey,
        DISCOVERY_INQUIRY_REVIEW_KEY,
      ],
    );
    const row = rows[0];
    if (!row || Number(row.suggestion_count) !== 1 || Number(row.observation_count) !== 1 || Number(row.decision_count) !== 1 || Number(row.advanced_count) !== 1) {
      return { code: "conflict", message: "The interview or suggestion changed. Reload before continuing.", ok: false };
    }
    return { message: "Your answer was preserved. The suggestion remains separate from your evidence.", ok: true, sessionId: input.sessionId };
  } catch (error) {
    logFailure("decide_inquiry_suggestion", error);
    return { code: "unavailable", message: "Lotura could not preserve the assisted answer safely. No partial change was retained.", ok: false };
  }
}

export async function dismissDiscoverySuggestion(input: {
  disposition: "rejected" | "skipped";
  expectedRevision: number;
  inquiryId?: string;
  promptKey: string;
  sessionId: string;
  sessionKind: "process" | "inquiry";
  suggestionId: string;
}): Promise<AssistanceDecisionResult> {
  if (!validUuid(input.sessionId) || !validUuid(input.suggestionId) || !validRevision(input.expectedRevision) || (input.sessionKind === "inquiry" && !validUuid(input.inquiryId ?? ""))) {
    return { code: "invalid", message: "The assistance reference is invalid.", ok: false };
  }
  const question = input.sessionKind === "process"
    ? getDiscoveryQuestion(input.promptKey)
    : getDiscoveryInquiryQuestion(input.promptKey);
  if (!question) return { code: "invalid", message: "The question reference is invalid.", ok: false };
  const context = await assistanceWriteContext();
  if (!context) return { code: "unavailable", message: "Discovery assistance is not enabled.", ok: false };
  const sessionTable = input.sessionKind === "process"
    ? "discovery_sessions"
    : "discovery_inquiry_sessions";
  const runSessionId = input.sessionKind === "process"
    ? "discovery_session_id"
    : "inquiry_session_id";
  const runSessionKey = input.sessionKind === "process"
    ? "discovery_session_stable_key"
    : "inquiry_session_stable_key";
  const inquiryClause = input.sessionKind === "inquiry"
    ? "and session.inquiry_stable_key = $7::uuid"
    : "and $7::text is null";
  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select session.id, session.stable_key
         from ${sessionTable} session
         where session.organization_id = $1::integer
           and session.stable_key = $2::uuid
           and session.actor_identifier = $3::varchar(128)
           and session.revision = $4::integer
           and session.status = 'in_progress'
           and session.current_question_key = $5::varchar(64)
           ${inquiryClause}
       ), selected_suggestion as materialized (
         select suggestion.id, suggestion.stable_key, suggestion.run_id,
           suggestion.run_stable_key
         from discovery_assistance_suggestions suggestion
         inner join discovery_assistance_runs run
           on run.id = suggestion.run_id
          and run.organization_id = suggestion.organization_id
          and run.stable_key = suggestion.run_stable_key
         inner join selected_session session
           on run.${runSessionId} = session.id
          and run.${runSessionKey} = session.stable_key
         where suggestion.organization_id = $1::integer
           and suggestion.stable_key = $6::uuid
           and suggestion.prompt_key = $5::varchar(64)
           and run.session_kind = $8::discovery_assistance_session_kind
           and run.requested_session_revision = $4::integer
           and not exists (
             select 1 from discovery_assistance_decisions decision
             where decision.organization_id = suggestion.organization_id
               and decision.suggestion_stable_key = suggestion.stable_key
           )
       ), inserted as (
         insert into discovery_assistance_decisions (
           organization_id, run_id, run_stable_key, suggestion_id,
           suggestion_stable_key, session_kind, disposition, actor_identifier
         )
         select $1::integer, run_id, run_stable_key, id, stable_key,
           $8::discovery_assistance_session_kind,
           $9::discovery_assistance_disposition, $3::varchar(128)
         from selected_suggestion
         returning 1
       )
       select (select count(*)::int from inserted) as decision_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        question.key,
        input.suggestionId,
        input.inquiryId ?? null,
        input.sessionKind,
        input.disposition,
      ],
    );
    if (Number(rows[0]?.decision_count) !== 1) {
      return { code: "conflict", message: "The interview or suggestion changed. Reload before continuing.", ok: false };
    }
    return {
      message: input.disposition === "rejected"
        ? "The clearer draft was rejected. Your original wording remains available."
        : "Suggestion skipped. The standard question remains available.",
      ok: true,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logFailure("dismiss_suggestion", error);
    return { code: "unavailable", message: "Lotura could not preserve that assistance choice safely.", ok: false };
  }
}
