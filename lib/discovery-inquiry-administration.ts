import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  DISCOVERY_FIRST_QUESTION_KEY,
} from "./discovery-questions.mjs";
import {
  DISCOVERY_INQUIRY_FIRST_QUESTION_KEY,
  DISCOVERY_INQUIRY_REVIEW_KEY,
  getDiscoveryInquiryQuestion,
  getNextDiscoveryInquiryQuestionKey,
} from "./discovery-inquiry-questions.mjs";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
import type { DiscoveryEpistemicState } from "./discovery-administration";

export type DiscoveryInquiryRouteKind =
  | "review_process"
  | "review_process_family"
  | "start_guided_interview"
  | "start_inquiry_exploration"
  | "wait_for_source"
  | "finish_for_now";

export type DiscoveryInquiryRouteResult =
  | {
      destinationId: string | null;
      destinationKind:
        | "process"
        | "process_family"
        | "process_interview"
        | "inquiry_interview"
        | "inquiry";
      inquiryId: string;
      message: string;
      ok: true;
    }
  | {
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
      ok: false;
    };

export type DiscoveryInquirySessionMutationResult =
  | { inquiryId: string; message: string; ok: true; sessionId: string }
  | {
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
      ok: false;
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

function processIdFromKey(value: string) {
  const match = /^process:([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

function boundedText(value: string, maximum: number, required = false) {
  const normalized = value.trim();
  if (normalized.length > maximum || (required && normalized.length === 0)) {
    return null;
  }
  return normalized || null;
}

function validateObservationInput(input: {
  epistemicState: DiscoveryEpistemicState;
  responseText: string;
}) {
  if (!STATES.has(input.epistemicState)) return null;
  const responseText = boundedText(input.responseText, 10000);
  if (input.epistemicState !== "unknown" && !responseText) return null;
  return { responseText };
}

function logInquiryDatabaseFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const safeValue = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

  console.error("[question-driven-discovery] database operation failed", {
    code: safeValue(details.code),
    constraint: safeValue(details.constraint),
    operation,
    routine: safeValue(details.routine),
    table: safeValue(details.table),
  });
}

async function inquiryWriteContext() {
  const runtimeAccess = await requireWorkspaceAccess();
  const configuration = resolveDiscoveryConfiguration(
    process.env,
    runtimeAccess,
  );
  if (!configuration.enabled) return null;
  return {
    configuration,
    sql: neon(configuration.databaseUrl, {
      isolationLevel: "Serializable",
      readOnly: false,
    }),
  };
}

function conflictResult(): DiscoveryInquiryRouteResult {
  return {
    code: "conflict",
    message: "This question changed after the page loaded. Refresh before choosing what happens next.",
    ok: false,
  };
}

export async function startInquiryDiscoverySession(input: {
  expectedRevision: number;
  inquiryId: string;
  scopeStatement: string;
}): Promise<DiscoveryInquiryRouteResult> {
  const scopeStatement = boundedText(input.scopeStatement, 2000, true);
  if (
    !validUuid(input.inquiryId)
    || !Number.isSafeInteger(input.expectedRevision)
    || input.expectedRevision < 1
    || !scopeStatement
  ) {
    return {
      code: "invalid",
      message: "Briefly describe what this interview should explore.",
      ok: false,
    };
  }

  const context = await inquiryWriteContext();
  if (!context) {
    return {
      code: "unavailable",
      message: "Question-driven Discovery is not enabled for this workspace.",
      ok: false,
    };
  }

  try {
    const rows = await context.sql.query(
      `with selected_inquiry as materialized (
         select id, organization_id, stable_key
         from discovery_inquiries
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and revision = $3::integer
           and status in ('open', 'waiting_for_information')
         for update
       ), inserted_session as (
         insert into discovery_inquiry_sessions (
           organization_id, inquiry_id, inquiry_stable_key, scope_statement,
           current_question_key, actor_identifier
         )
         select organization_id, id, stable_key, $4::text,
           $5::varchar(64), $6::varchar(128)
         from selected_inquiry
         returning id, organization_id, stable_key, inquiry_id,
           inquiry_stable_key
       ), inserted_route as (
         insert into discovery_inquiry_routes (
           organization_id, inquiry_id, inquiry_stable_key, route_sequence,
           route_kind, discovery_inquiry_session_id,
           discovery_inquiry_session_stable_key, actor_identifier
         )
         select session.organization_id, session.inquiry_id,
           session.inquiry_stable_key,
           (select coalesce(max(route_sequence), 0) + 1
              from discovery_inquiry_routes
              where inquiry_id = session.inquiry_id),
           'start_inquiry_exploration'::discovery_inquiry_route_kind,
           session.id, session.stable_key, $6::varchar(128)
         from inserted_session session
         returning stable_key
       ), advanced as (
         update discovery_inquiries
         set status = 'routed'::discovery_inquiry_status,
           revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_inquiry)
           and exists (select 1 from inserted_route)
         returning stable_key
       )
       select
         (select count(*)::int from selected_inquiry) as selected_count,
         (select stable_key::text from inserted_session) as session_id,
         (select count(*)::int from inserted_route) as route_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.inquiryId,
        input.expectedRevision,
        scopeStatement,
        DISCOVERY_INQUIRY_FIRST_QUESTION_KEY,
        context.configuration.actorIdentifier,
      ],
    );
    const row = rows[0];
    const sessionId = String(row?.session_id ?? "");
    if (
      !row
      || Number(row.selected_count) !== 1
      || Number(row.route_count) !== 1
      || Number(row.advanced_count) !== 1
      || !validUuid(sessionId)
    ) {
      return conflictResult();
    }
    return {
      destinationId: sessionId,
      destinationKind: "inquiry_interview",
      inquiryId: input.inquiryId,
      message: "Interview started without selecting or creating a Process.",
      ok: true,
    };
  } catch (error) {
    logInquiryDatabaseFailure("start_inquiry_interview", error);
    return {
      code: "unavailable",
      message: "Lotura could not start this interview safely. No partial route or session was retained.",
      ok: false,
    };
  }
}

export async function startProcessDiscoverySessionFromInquiry(input: {
  expectedRevision: number;
  inquiryId: string;
  processKey: string;
  scopeStatement: string;
}): Promise<DiscoveryInquiryRouteResult> {
  const processId = processIdFromKey(input.processKey);
  const scopeStatement = boundedText(input.scopeStatement, 2000, true);
  if (
    !validUuid(input.inquiryId)
    || !Number.isSafeInteger(input.expectedRevision)
    || input.expectedRevision < 1
    || !processId
    || !scopeStatement
  ) {
    return {
      code: "invalid",
      message: "Choose an existing Process and describe what the interview should cover.",
      ok: false,
    };
  }

  const context = await inquiryWriteContext();
  if (!context) {
    return {
      code: "unavailable",
      message: "Question-driven Discovery is not enabled for this workspace.",
      ok: false,
    };
  }

  try {
    const rows = await context.sql.query(
      `with selected_inquiry as materialized (
         select id, organization_id, stable_key
         from discovery_inquiries
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and revision = $3::integer
           and status in ('open', 'waiting_for_information')
         for update
       ), selected_process as (
         select process.id, process.organization_id, process.stable_key
         from processes process
         join selected_inquiry inquiry
           on inquiry.organization_id = process.organization_id
         where process.id = $4::integer
           and process.status <> 'archived'
       ), inserted_session as (
         insert into discovery_sessions (
           organization_id, process_id, process_stable_key, scope_statement,
           current_question_key, actor_identifier
         )
         select process.organization_id, process.id, process.stable_key,
           $5::text, $6::varchar(64), $7::varchar(128)
         from selected_process process
         returning id, organization_id, stable_key, process_id,
           process_stable_key
       ), inserted_route as (
         insert into discovery_inquiry_routes (
           organization_id, inquiry_id, inquiry_stable_key, route_sequence,
           route_kind, process_id, process_stable_key,
           discovery_session_id, discovery_session_stable_key,
           actor_identifier
         )
         select inquiry.organization_id, inquiry.id, inquiry.stable_key,
           (select coalesce(max(route_sequence), 0) + 1
              from discovery_inquiry_routes
              where inquiry_id = inquiry.id),
           'start_guided_interview'::discovery_inquiry_route_kind,
           session.process_id, session.process_stable_key, session.id,
           session.stable_key, $7::varchar(128)
         from selected_inquiry inquiry
         cross join inserted_session session
         returning stable_key
       ), advanced as (
         update discovery_inquiries
         set status = 'routed'::discovery_inquiry_status,
           revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_inquiry)
           and exists (select 1 from inserted_route)
         returning stable_key
       )
       select
         (select count(*)::int from selected_inquiry) as selected_count,
         (select count(*)::int from selected_process) as process_count,
         (select stable_key::text from inserted_session) as session_id,
         (select count(*)::int from inserted_route) as route_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.inquiryId,
        input.expectedRevision,
        processId,
        scopeStatement,
        DISCOVERY_FIRST_QUESTION_KEY,
        context.configuration.actorIdentifier,
      ],
    );
    const row = rows[0];
    const sessionId = String(row?.session_id ?? "");
    if (Number(row?.process_count) !== 1) {
      return {
        code: "not_found",
        message: "The selected Process is no longer available in this Organization.",
        ok: false,
      };
    }
    if (
      !row
      || Number(row.selected_count) !== 1
      || Number(row.route_count) !== 1
      || Number(row.advanced_count) !== 1
      || !validUuid(sessionId)
    ) {
      return conflictResult();
    }
    return {
      destinationId: sessionId,
      destinationKind: "process_interview",
      inquiryId: input.inquiryId,
      message: "Process interview started and linked to the original question.",
      ok: true,
    };
  } catch (error) {
    logInquiryDatabaseFailure("start_process_interview_from_inquiry", error);
    return {
      code: "unavailable",
      message: "Lotura could not start this Process interview safely. No partial route or session was retained.",
      ok: false,
    };
  }
}

export async function routeDiscoveryInquiry(input: {
  expectedRevision: number;
  inquiryId: string;
  routeKind:
    | "review_process"
    | "review_process_family"
    | "wait_for_source"
    | "finish_for_now";
  routeNote: string;
  targetKey: string;
}): Promise<DiscoveryInquiryRouteResult> {
  const routeNote = boundedText(input.routeNote, 2000);
  const requiresNote = input.routeKind === "wait_for_source";
  if (
    !validUuid(input.inquiryId)
    || !Number.isSafeInteger(input.expectedRevision)
    || input.expectedRevision < 1
    || (requiresNote && !routeNote)
  ) {
    return {
      code: "invalid",
      message: requiresNote
        ? "Briefly record who or what can help answer this question."
        : "Review the routing choice and try again.",
      ok: false,
    };
  }

  const context = await inquiryWriteContext();
  if (!context) {
    return {
      code: "unavailable",
      message: "Question-driven Discovery is not enabled for this workspace.",
      ok: false,
    };
  }

  const processId = input.routeKind === "review_process"
    ? processIdFromKey(input.targetKey)
    : null;
  const familyKey = input.routeKind === "review_process_family"
    && validUuid(input.targetKey)
    ? input.targetKey
    : null;
  if (
    (input.routeKind === "review_process" && !processId)
    || (input.routeKind === "review_process_family" && !familyKey)
  ) {
    return {
      code: "invalid",
      message: "Choose an available Process or Process Family.",
      ok: false,
    };
  }

  const nextStatus = input.routeKind === "wait_for_source"
    ? "waiting_for_information"
    : input.routeKind === "finish_for_now"
      ? "closed_for_now"
      : "routed";

  try {
    const rows = await context.sql.query(
      `with selected_inquiry as materialized (
         select id, organization_id, stable_key
         from discovery_inquiries
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and revision = $3::integer
           and status in ('open', 'waiting_for_information')
         for update
       ), selected_process as (
         select process.id, process.stable_key
         from processes process
         join selected_inquiry inquiry
           on inquiry.organization_id = process.organization_id
         where $4::discovery_inquiry_route_kind = 'review_process'
           and process.id = $5::integer
           and process.status <> 'archived'
       ), selected_family as (
         select family.id, family.stable_key
         from process_families family
         join selected_inquiry inquiry
           on inquiry.organization_id = family.organization_id
         where $4::discovery_inquiry_route_kind = 'review_process_family'
           and family.stable_key = $6::uuid
           and family.status = 'active'
       ), inserted_route as (
         insert into discovery_inquiry_routes (
           organization_id, inquiry_id, inquiry_stable_key, route_sequence,
           route_kind, process_id, process_stable_key, process_family_id,
           process_family_stable_key, route_note, actor_identifier
         )
         select inquiry.organization_id, inquiry.id, inquiry.stable_key,
           (select coalesce(max(route_sequence), 0) + 1
              from discovery_inquiry_routes
              where inquiry_id = inquiry.id),
           $4::discovery_inquiry_route_kind,
           process.id, process.stable_key, family.id, family.stable_key,
           $7::text, $8::varchar(128)
         from selected_inquiry inquiry
         left join selected_process process on true
         left join selected_family family on true
         where ($4::discovery_inquiry_route_kind = 'review_process'
             and process.id is not null)
           or ($4::discovery_inquiry_route_kind = 'review_process_family'
             and family.id is not null)
           or $4::discovery_inquiry_route_kind in (
             'wait_for_source', 'finish_for_now'
           )
         returning stable_key
       ), advanced as (
         update discovery_inquiries
         set status = $9::discovery_inquiry_status,
           revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_inquiry)
           and exists (select 1 from inserted_route)
         returning stable_key
       )
       select
         (select count(*)::int from selected_inquiry) as selected_count,
         (select count(*)::int from selected_process) as process_count,
         (select count(*)::int from selected_family) as family_count,
         (select count(*)::int from inserted_route) as route_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.inquiryId,
        input.expectedRevision,
        input.routeKind,
        processId,
        familyKey,
        routeNote,
        context.configuration.actorIdentifier,
        nextStatus,
      ],
    );
    const row = rows[0];
    if (
      input.routeKind === "review_process"
      && Number(row?.process_count) !== 1
    ) {
      return {
        code: "not_found",
        message: "The selected Process is no longer available in this Organization.",
        ok: false,
      };
    }
    if (
      input.routeKind === "review_process_family"
      && Number(row?.family_count) !== 1
    ) {
      return {
        code: "not_found",
        message: "The selected Process Family is no longer available in this Organization.",
        ok: false,
      };
    }
    if (
      !row
      || Number(row.selected_count) !== 1
      || Number(row.route_count) !== 1
      || Number(row.advanced_count) !== 1
    ) {
      return conflictResult();
    }

    return {
      destinationId: input.targetKey || null,
      destinationKind: input.routeKind === "review_process"
        ? "process"
        : input.routeKind === "review_process_family"
          ? "process_family"
          : "inquiry",
      inquiryId: input.inquiryId,
      message: input.routeKind === "wait_for_source"
        ? "The question is waiting for another person or source."
        : input.routeKind === "finish_for_now"
          ? "The question is preserved and finished for now."
          : "Your next place to look was recorded.",
      ok: true,
    };
  } catch (error) {
    logInquiryDatabaseFailure("route_inquiry", error);
    return {
      code: "unavailable",
      message: "Lotura could not preserve this choice safely. No partial route was retained.",
      ok: false,
    };
  }
}

export async function answerInquiryDiscoveryQuestion(input: {
  epistemicState: DiscoveryEpistemicState;
  expectedRevision: number;
  inquiryId: string;
  promptKey: string;
  responseText: string;
  sessionId: string;
}): Promise<DiscoveryInquirySessionMutationResult> {
  const question = getDiscoveryInquiryQuestion(input.promptKey);
  const nextQuestionKey = question
    ? getNextDiscoveryInquiryQuestionKey(question.key)
    : null;
  const validated = validateObservationInput(input);
  if (
    !validUuid(input.inquiryId)
    || !validUuid(input.sessionId)
    || !Number.isSafeInteger(input.expectedRevision)
    || input.expectedRevision < 1
    || !question
    || !nextQuestionKey
    || !validated
  ) {
    return {
      code: "invalid",
      message: "Review the response and try again.",
      ok: false,
    };
  }

  const context = await inquiryWriteContext();
  if (!context) {
    return {
      code: "unavailable",
      message: "Question-driven Discovery is not enabled.",
      ok: false,
    };
  }

  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select session.id, session.organization_id, session.stable_key
         from discovery_inquiry_sessions session
         join discovery_inquiries inquiry
           on inquiry.id = session.inquiry_id
          and inquiry.organization_id = session.organization_id
          and inquiry.stable_key = session.inquiry_stable_key
         where session.organization_id = $1::integer
           and session.stable_key = $2::uuid
           and inquiry.stable_key = $3::uuid
           and session.actor_identifier = $4::varchar(128)
           and session.revision = $5::integer
           and session.status = 'in_progress'
           and session.current_question_key = $6::varchar(64)
         for update of session
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 as value
         from discovery_inquiry_observations
         where organization_id = $1::integer
           and session_stable_key = $2::uuid
       ), inserted as (
         insert into discovery_inquiry_observations (
           organization_id, session_id, session_stable_key, sequence,
           prompt_key, prompt_text, topic, response_text, epistemic_state,
           actor_identifier
         )
         select session.organization_id, session.id, session.stable_key,
           next_sequence.value, $6::varchar(64), $7::text,
           $8::discovery_observation_topic, $9::text,
           $10::discovery_observation_state, $4::varchar(128)
         from selected_session session cross join next_sequence
         returning 1
       ), advanced as (
         update discovery_inquiry_sessions
         set current_question_key = $11::varchar(64),
           status = case when $11::varchar(64) = $12::varchar(64)
             then 'ready_for_review'::discovery_session_status
             else 'in_progress'::discovery_session_status end,
           revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted)
         returning stable_key
       )
       select
         (select count(*)::int from selected_session) as selected_count,
         (select count(*)::int from inserted) as inserted_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.inquiryId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        question.key,
        question.prompt,
        question.topic,
        validated.responseText,
        input.epistemicState,
        nextQuestionKey,
        DISCOVERY_INQUIRY_REVIEW_KEY,
      ],
    );
    const row = rows[0];
    if (
      !row
      || Number(row.selected_count) !== 1
      || Number(row.inserted_count) !== 1
      || Number(row.advanced_count) !== 1
    ) {
      return {
        code: "conflict",
        message: "This interview changed after the page loaded. Refresh before continuing.",
        ok: false,
      };
    }
    return {
      inquiryId: input.inquiryId,
      message: nextQuestionKey === DISCOVERY_INQUIRY_REVIEW_KEY
        ? "Answer preserved. This interview is ready for human review."
        : "Answer preserved. No Process was selected or created.",
      ok: true,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logInquiryDatabaseFailure("append_inquiry_observation", error);
    return {
      code: "unavailable",
      message: "Lotura could not preserve this answer safely. No partial change was retained.",
      ok: false,
    };
  }
}

export async function setInquiryDiscoverySessionPaused(input: {
  expectedRevision: number;
  inquiryId: string;
  paused: boolean;
  sessionId: string;
}): Promise<DiscoveryInquirySessionMutationResult> {
  if (
    !validUuid(input.inquiryId)
    || !validUuid(input.sessionId)
    || !Number.isSafeInteger(input.expectedRevision)
    || input.expectedRevision < 1
  ) {
    return {
      code: "invalid",
      message: "The interview reference is invalid.",
      ok: false,
    };
  }
  const context = await inquiryWriteContext();
  if (!context) {
    return {
      code: "unavailable",
      message: "Question-driven Discovery is not enabled.",
      ok: false,
    };
  }
  const fromStatus = input.paused ? "in_progress" : "paused";
  const toStatus = input.paused ? "paused" : "in_progress";
  try {
    const rows = await context.sql.query(
      `update discovery_inquiry_sessions session
       set status = $1::discovery_session_status,
         revision = session.revision + 1,
         updated_at = transaction_timestamp()
       from discovery_inquiries inquiry
       where session.organization_id = $2::integer
         and session.stable_key = $3::uuid
         and session.inquiry_id = inquiry.id
         and session.inquiry_stable_key = inquiry.stable_key
         and inquiry.organization_id = session.organization_id
         and inquiry.stable_key = $4::uuid
         and session.actor_identifier = $5::varchar(128)
         and session.revision = $6::integer
         and session.status = $7::discovery_session_status
       returning session.stable_key::text as session_id`,
      [
        toStatus,
        context.configuration.organizationId,
        input.sessionId,
        input.inquiryId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        fromStatus,
      ],
    );
    if (rows.length !== 1) {
      return {
        code: "conflict",
        message: "Reload before changing this interview.",
        ok: false,
      };
    }
    return {
      inquiryId: input.inquiryId,
      message: input.paused ? "Interview paused." : "Interview resumed.",
      ok: true,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logInquiryDatabaseFailure(
      input.paused ? "pause_inquiry_session" : "resume_inquiry_session",
      error,
    );
    return {
      code: "unavailable",
      message: "The interview state could not be changed safely.",
      ok: false,
    };
  }
}

export async function appendInquiryDiscoveryCorrection(input: {
  epistemicState: DiscoveryEpistemicState;
  expectedRevision: number;
  inquiryId: string;
  observationId: string;
  responseText: string;
  sessionId: string;
}): Promise<DiscoveryInquirySessionMutationResult> {
  const validated = validateObservationInput(input);
  if (
    !validUuid(input.inquiryId)
    || !validUuid(input.sessionId)
    || !validUuid(input.observationId)
    || !Number.isSafeInteger(input.expectedRevision)
    || input.expectedRevision < 1
    || !validated
  ) {
    return {
      code: "invalid",
      message: "Review the correction and try again.",
      ok: false,
    };
  }
  const context = await inquiryWriteContext();
  if (!context) {
    return {
      code: "unavailable",
      message: "Question-driven Discovery is not enabled.",
      ok: false,
    };
  }

  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select session.id, session.organization_id, session.stable_key
         from discovery_inquiry_sessions session
         join discovery_inquiries inquiry
           on inquiry.id = session.inquiry_id
          and inquiry.organization_id = session.organization_id
          and inquiry.stable_key = session.inquiry_stable_key
         where session.organization_id = $1::integer
           and session.stable_key = $2::uuid
           and inquiry.stable_key = $3::uuid
           and session.actor_identifier = $4::varchar(128)
           and session.revision = $5::integer
           and session.status = 'ready_for_review'
         for update of session
       ), prior as (
         select observation.*
         from discovery_inquiry_observations observation
         join selected_session session
           on session.id = observation.session_id
          and session.organization_id = observation.organization_id
          and session.stable_key = observation.session_stable_key
         where observation.stable_key = $6::uuid
           and not exists (
             select 1
             from discovery_inquiry_observations later
             where later.organization_id = observation.organization_id
               and later.session_id = observation.session_id
               and later.supersedes_observation_stable_key = observation.stable_key
           )
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 as value
         from discovery_inquiry_observations
         where organization_id = $1::integer
           and session_stable_key = $2::uuid
       ), inserted as (
         insert into discovery_inquiry_observations (
           organization_id, session_id, session_stable_key, sequence,
           prompt_key, prompt_text, topic, response_text, epistemic_state,
           supersedes_observation_stable_key, actor_identifier
         )
         select prior.organization_id, prior.session_id,
           prior.session_stable_key, next_sequence.value, prior.prompt_key,
           prior.prompt_text, prior.topic, $7::text,
           $8::discovery_observation_state, prior.stable_key,
           $4::varchar(128)
         from prior cross join next_sequence
         returning 1
       ), advanced as (
         update discovery_inquiry_sessions
         set revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted)
         returning 1
       )
       select
         (select count(*)::int from prior) as prior_count,
         (select count(*)::int from inserted) as inserted_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.inquiryId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        input.observationId,
        validated.responseText,
        input.epistemicState,
      ],
    );
    const row = rows[0];
    if (
      !row
      || Number(row.prior_count) !== 1
      || Number(row.inserted_count) !== 1
      || Number(row.advanced_count) !== 1
    ) {
      return {
        code: "conflict",
        message: "Reload before changing this answer or label.",
        ok: false,
      };
    }
    return {
      inquiryId: input.inquiryId,
      message: "Correction preserved. The earlier answer remains in the record.",
      ok: true,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logInquiryDatabaseFailure("append_inquiry_correction", error);
    return {
      code: "unavailable",
      message: "Lotura could not preserve this correction safely. No partial change was retained.",
      ok: false,
    };
  }
}
