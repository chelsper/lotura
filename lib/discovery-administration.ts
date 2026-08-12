import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
import {
  DISCOVERY_FIRST_QUESTION_KEY,
  DISCOVERY_REVIEW_KEY,
  getDiscoveryQuestion,
  getNextDiscoveryQuestionKey,
} from "./discovery-questions.mjs";

export type DiscoveryEpistemicState =
  | "known"
  | "assumed"
  | "unknown"
  | "needs_validation"
  | "conflicting_observation";

export type DiscoveryMutationResult =
  | { ok: true; message: string; sessionId: string }
  | {
      ok: false;
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
    };

const STATES = new Set<DiscoveryEpistemicState>([
  "known",
  "assumed",
  "unknown",
  "needs_validation",
  "conflicting_observation",
]);

function processIdFromKey(value: string) {
  const match = /^process:([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function discoveryWriteContext() {
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

export async function createDiscoverySession(input: {
  processKey: string;
  scopeStatement: string;
}): Promise<DiscoveryMutationResult> {
  const context = await discoveryWriteContext();
  if (!context) {
    return {
      ok: false,
      code: "unavailable",
      message: "Guided Discovery is not enabled for this workspace.",
    };
  }
  const processId = processIdFromKey(input.processKey);
  const scopeStatement = input.scopeStatement.trim();
  if (!processId || scopeStatement.length < 1 || scopeStatement.length > 2000) {
    return {
      ok: false,
      code: "invalid",
      message: "Choose a Process and describe the interview scope in 2,000 characters or fewer.",
    };
  }

  try {
    const rows = await context.sql.query(
      `with selected_process as (
         select id, organization_id, stable_key
         from processes
         where organization_id = $1 and id = $2
       ), inserted as (
         insert into discovery_sessions (
           organization_id, process_id, process_stable_key, scope_statement,
           current_question_key, actor_identifier
         )
         select organization_id, id, stable_key, $3, $4, $5
         from selected_process
         returning stable_key
       )
       select
         (select count(*)::int from selected_process) as process_count,
         (select stable_key::text from inserted) as session_id`,
      [
        context.configuration.organizationId,
        processId,
        scopeStatement,
        DISCOVERY_FIRST_QUESTION_KEY,
        context.configuration.actorIdentifier,
      ],
    );
    const row = rows[0];
    if (!row || Number(row.process_count) !== 1 || !validUuid(String(row.session_id))) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected Process was not found in this Organization.",
      };
    }
    return {
      ok: true,
      message: "Interview started. No canonical Process facts were changed.",
      sessionId: String(row.session_id),
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not start the interview safely. No partial session was retained.",
    };
  }
}

function validateObservationInput(input: {
  epistemicState: DiscoveryEpistemicState;
  responseText: string;
}) {
  if (!STATES.has(input.epistemicState)) return null;
  const responseText = input.responseText.trim();
  if (responseText.length > 10000) return null;
  if (input.epistemicState !== "unknown" && responseText.length < 1) return null;
  return { responseText: responseText || null };
}

export async function answerDiscoveryQuestion(input: {
  epistemicState: DiscoveryEpistemicState;
  expectedRevision: number;
  promptKey: string;
  responseText: string;
  sessionId: string;
}): Promise<DiscoveryMutationResult> {
  const question = getDiscoveryQuestion(input.promptKey);
  const validated = validateObservationInput(input);
  const nextQuestionKey = question
    ? getNextDiscoveryQuestionKey(question.key)
    : null;
  if (
    !validUuid(input.sessionId) ||
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 1 ||
    !question ||
    !nextQuestionKey ||
    !validated
  ) {
    return { ok: false, code: "invalid", message: "Review the response and try again." };
  }
  const context = await discoveryWriteContext();
  if (!context) {
    return { ok: false, code: "unavailable", message: "Guided Discovery is not enabled." };
  }

  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, organization_id, stable_key
         from discovery_sessions
         where organization_id = $1
           and stable_key = $2::uuid
           and actor_identifier = $3
           and revision = $4
           and status = 'in_progress'
           and current_question_key = $5
         for update
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 as value
         from discovery_observations
         where organization_id = $1 and session_stable_key = $2::uuid
       ), inserted as (
         insert into discovery_observations (
           organization_id, session_id, session_stable_key, sequence,
           prompt_key, prompt_text, topic, response_text, epistemic_state,
           actor_identifier
         )
         select selected_session.organization_id, selected_session.id,
           selected_session.stable_key, next_sequence.value,
           $5, $6, $7::discovery_observation_topic, $8,
           $9::discovery_observation_state, $3
         from selected_session cross join next_sequence
         returning 1
       ), advanced as (
         update discovery_sessions
         set current_question_key = $10,
           status = case when $10 = $11 then 'ready_for_review'::discovery_session_status
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
        context.configuration.actorIdentifier,
        input.expectedRevision,
        question.key,
        question.prompt,
        question.topic,
        validated.responseText,
        input.epistemicState,
        nextQuestionKey,
        DISCOVERY_REVIEW_KEY,
      ],
    );
    const row = rows[0];
    if (
      !row ||
      Number(row.selected_count) !== 1 ||
      Number(row.inserted_count) !== 1 ||
      Number(row.advanced_count) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message: "This interview changed after the page loaded. Reload before continuing.",
      };
    }
    return {
      ok: true,
      message: nextQuestionKey === DISCOVERY_REVIEW_KEY
        ? "Observation preserved. The interview is ready for review."
        : "Observation preserved. No canonical Process facts were changed.",
      sessionId: input.sessionId,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not preserve this observation safely. No partial change was retained.",
    };
  }
}

export async function setDiscoverySessionPaused(input: {
  expectedRevision: number;
  paused: boolean;
  sessionId: string;
}): Promise<DiscoveryMutationResult> {
  if (!validUuid(input.sessionId) || !Number.isSafeInteger(input.expectedRevision)) {
    return { ok: false, code: "invalid", message: "The interview reference is invalid." };
  }
  const context = await discoveryWriteContext();
  if (!context) {
    return { ok: false, code: "unavailable", message: "Guided Discovery is not enabled." };
  }
  const fromStatus = input.paused ? "in_progress" : "paused";
  const toStatus = input.paused ? "paused" : "in_progress";
  try {
    const rows = await context.sql.query(
      `update discovery_sessions
       set status = $1::discovery_session_status,
         revision = revision + 1,
         updated_at = transaction_timestamp()
       where organization_id = $2
         and stable_key = $3::uuid
         and actor_identifier = $4
         and revision = $5
         and status = $6::discovery_session_status
       returning stable_key::text as session_id`,
      [
        toStatus,
        context.configuration.organizationId,
        input.sessionId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        fromStatus,
      ],
    );
    if (rows.length !== 1) {
      return { ok: false, code: "conflict", message: "Reload before changing this interview." };
    }
    return {
      ok: true,
      message: input.paused ? "Interview paused." : "Interview resumed.",
      sessionId: input.sessionId,
    };
  } catch {
    return { ok: false, code: "unavailable", message: "The interview state could not be changed safely." };
  }
}

export async function appendDiscoveryCorrection(input: {
  epistemicState: DiscoveryEpistemicState;
  expectedRevision: number;
  observationId: string;
  responseText: string;
  sessionId: string;
}): Promise<DiscoveryMutationResult> {
  const validated = validateObservationInput(input);
  if (
    !validUuid(input.sessionId) ||
    !validUuid(input.observationId) ||
    !Number.isSafeInteger(input.expectedRevision) ||
    !validated
  ) {
    return { ok: false, code: "invalid", message: "Review the correction and try again." };
  }
  const context = await discoveryWriteContext();
  if (!context) {
    return { ok: false, code: "unavailable", message: "Guided Discovery is not enabled." };
  }
  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, organization_id, stable_key
         from discovery_sessions
         where organization_id = $1
           and stable_key = $2::uuid
           and actor_identifier = $3
           and revision = $4
           and status = 'ready_for_review'
         for update
       ), prior as (
         select observation.*
         from discovery_observations observation
         join selected_session session
           on session.id = observation.session_id
          and session.organization_id = observation.organization_id
          and session.stable_key = observation.session_stable_key
         where observation.stable_key = $5::uuid
           and not exists (
             select 1
             from discovery_observations later
             where later.organization_id = observation.organization_id
               and later.session_id = observation.session_id
               and later.supersedes_observation_stable_key = observation.stable_key
           )
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 as value
         from discovery_observations
         where organization_id = $1 and session_stable_key = $2::uuid
       ), inserted as (
         insert into discovery_observations (
           organization_id, session_id, session_stable_key, sequence,
           prompt_key, prompt_text, topic, response_text, epistemic_state,
           supersedes_observation_stable_key, actor_identifier
         )
         select prior.organization_id, prior.session_id, prior.session_stable_key,
           next_sequence.value, prior.prompt_key, prior.prompt_text, prior.topic,
           $6, $7::discovery_observation_state, prior.stable_key, $3
         from prior cross join next_sequence
         returning 1
       ), advanced as (
         update discovery_sessions
         set revision = revision + 1, updated_at = transaction_timestamp()
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
        context.configuration.actorIdentifier,
        input.expectedRevision,
        input.observationId,
        validated.responseText,
        input.epistemicState,
      ],
    );
    const row = rows[0];
    if (
      !row || Number(row.prior_count) !== 1 ||
      Number(row.inserted_count) !== 1 || Number(row.advanced_count) !== 1
    ) {
      return { ok: false, code: "conflict", message: "Reload before correcting this observation." };
    }
    return {
      ok: true,
      message: "Correction appended. The prior observation remains in the record.",
      sessionId: input.sessionId,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not append the correction safely. No partial change was retained.",
    };
  }
}
