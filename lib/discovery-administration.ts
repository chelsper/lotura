import "server-only";

import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

import { requireWorkspaceAccess } from "./authentication";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";
import {
  DISCOVERY_FIRST_QUESTION_KEY,
  DISCOVERY_REVIEW_KEY,
  getDiscoveryQuestion,
  getNextDiscoveryQuestionKey,
} from "./discovery-questions.mjs";
import {
  DISCOVERY_PROPOSAL_DISPOSITIONS,
  type DiscoveryProposalDisposition,
  type DocumentedProcessSnapshot,
} from "./discovery-proposal-model.mjs";

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

export type DiscoveryInquiryMutationResult =
  | { inquiryId: string; message: string; ok: true }
  | {
      code: "invalid" | "unavailable";
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

const PROPOSAL_DISPOSITIONS = new Set<DiscoveryProposalDisposition>(
  DISCOVERY_PROPOSAL_DISPOSITIONS,
);

function logDiscoveryDatabaseFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const safeValue = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

  console.error("[guided-discovery] database operation failed", {
    code: safeValue(details.code),
    constraint: safeValue(details.constraint),
    operation,
    routine: safeValue(details.routine),
    table: safeValue(details.table),
  });
}

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

export async function createDiscoveryInquiry(input: {
  questionText: string;
}): Promise<DiscoveryInquiryMutationResult> {
  const questionText = input.questionText.trim();
  if (questionText.length < 3 || questionText.length > 2000) {
    return {
      code: "invalid",
      message: "Enter a question between 3 and 2,000 characters.",
      ok: false,
    };
  }

  const context = await discoveryWriteContext();
  if (!context) {
    return {
      code: "unavailable",
      message: "Discovery questions are not enabled for this workspace.",
      ok: false,
    };
  }

  try {
    const rows = await context.sql.query(
      `insert into discovery_inquiries (
         organization_id, question_text, actor_identifier
       ) values ($1::integer, $2::text, $3::varchar(128))
       returning stable_key::text as inquiry_id`,
      [
        context.configuration.organizationId,
        questionText,
        context.configuration.actorIdentifier,
      ],
    );
    const inquiryId = String(rows[0]?.inquiry_id ?? "");
    if (!validUuid(inquiryId)) {
      return {
        code: "unavailable",
        message: "Lotura could not preserve this question safely.",
        ok: false,
      };
    }
    return {
      inquiryId,
      message: "Question preserved. No Process or interview was created.",
      ok: true,
    };
  } catch (error) {
    logDiscoveryDatabaseFailure("create_inquiry", error);
    return {
      code: "unavailable",
      message: "Lotura could not preserve this question safely. No partial inquiry was retained.",
      ok: false,
    };
  }
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
      message: "Interview started. No Process information was changed.",
      sessionId: String(row.session_id),
    };
  } catch (error) {
    logDiscoveryDatabaseFailure("create_session", error);
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
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128)
           and revision = $4::integer
           and status = 'in_progress'
           and current_question_key = $5::varchar(64)
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
         select selected_session.organization_id, selected_session.id,
           selected_session.stable_key, next_sequence.value,
           $5::varchar(64), $6::text, $7::discovery_observation_topic,
           $8::text, $9::discovery_observation_state, $3::varchar(128)
         from selected_session cross join next_sequence
         returning 1
       ), advanced as (
         update discovery_sessions
         set current_question_key = $10::varchar(64),
           status = case when $10::varchar(64) = $11::varchar(64)
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
        : "Answer saved. No Process information was changed.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logDiscoveryDatabaseFailure("append_observation", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not preserve this observation safely. No partial change was retained.",
    };
  }
}

export async function confirmPriorDiscoveryObservation(input: {
  expectedRevision: number;
  promptKey: string;
  sessionId: string;
  sourceObservationId: string;
}): Promise<DiscoveryMutationResult> {
  const question = getDiscoveryQuestion(input.promptKey);
  const nextQuestionKey = question
    ? getNextDiscoveryQuestionKey(question.key)
    : null;
  if (
    !validUuid(input.sessionId) ||
    !validUuid(input.sourceObservationId) ||
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 1 ||
    !question ||
    !nextQuestionKey
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "The earlier answer or interview reference is invalid.",
    };
  }

  const context = await discoveryWriteContext();
  if (!context) {
    return {
      ok: false,
      code: "unavailable",
      message: "Guided Discovery is not enabled.",
    };
  }

  try {
    const rows = await context.sql.query(
      `with selected_session as materialized (
         select id, organization_id, stable_key, process_id, process_stable_key
         from discovery_sessions
         where organization_id = $1::integer
           and stable_key = $2::uuid
           and actor_identifier = $3::varchar(128)
           and revision = $4::integer
           and status = 'in_progress'
           and current_question_key = $5::varchar(64)
         for update
       ), source_observation as materialized (
         select observation.stable_key, observation.response_text,
           observation.epistemic_state, source_session.id as session_id,
           source_session.stable_key as session_stable_key
         from discovery_observations observation
         inner join discovery_sessions source_session
           on source_session.id = observation.session_id
          and source_session.organization_id = observation.organization_id
          and source_session.stable_key = observation.session_stable_key
         inner join selected_session current_session
           on current_session.organization_id = source_session.organization_id
          and current_session.process_id = source_session.process_id
          and current_session.process_stable_key = source_session.process_stable_key
          and source_session.id < current_session.id
         where observation.organization_id = $1::integer
           and observation.stable_key = $6::uuid
           and observation.prompt_key = $5::varchar(64)
           and not exists (
             select 1
             from discovery_observations superseding
             where superseding.organization_id = observation.organization_id
               and superseding.session_id = observation.session_id
               and superseding.supersedes_observation_stable_key = observation.stable_key
           )
       ), next_sequence as (
         select coalesce(max(sequence), 0) + 1 as value
         from discovery_observations
         where organization_id = $1::integer
           and session_stable_key = $2::uuid
       ), inserted_observation as (
         insert into discovery_observations (
           organization_id, session_id, session_stable_key, sequence,
           prompt_key, prompt_text, topic, response_text, epistemic_state,
           actor_identifier
         )
         select current_session.organization_id, current_session.id,
           current_session.stable_key, next_sequence.value,
           $5::varchar(64), $7::text, $8::discovery_observation_topic,
           source_observation.response_text,
           source_observation.epistemic_state, $3::varchar(128)
         from selected_session current_session
         cross join source_observation
         cross join next_sequence
         returning stable_key
       ), inserted_confirmation as (
         insert into discovery_observation_confirmations (
           organization_id, process_id, process_stable_key,
           confirmation_session_id, confirmation_session_stable_key,
           confirmation_observation_stable_key, source_session_id,
           source_session_stable_key, source_observation_stable_key, prompt_key,
           actor_identifier
         )
         select current_session.organization_id, current_session.process_id,
           current_session.process_stable_key, current_session.id,
           current_session.stable_key, inserted_observation.stable_key,
           source_observation.session_id,
           source_observation.session_stable_key,
           source_observation.stable_key, $5::varchar(64), $3::varchar(128)
         from selected_session current_session
         cross join source_observation
         cross join inserted_observation
         returning 1
       ), advanced as (
         update discovery_sessions
         set current_question_key = $9::varchar(64),
           status = case when $9::varchar(64) = $10::varchar(64)
             then 'ready_for_review'::discovery_session_status
             else 'in_progress'::discovery_session_status end,
           revision = revision + 1,
           updated_at = transaction_timestamp()
         where id = (select id from selected_session)
           and exists (select 1 from inserted_observation)
           and exists (select 1 from inserted_confirmation)
         returning stable_key
       )
       select
         (select count(*)::int from selected_session) as selected_count,
         (select count(*)::int from source_observation) as source_count,
         (select count(*)::int from inserted_observation) as observation_count,
         (select count(*)::int from inserted_confirmation) as confirmation_count,
         (select count(*)::int from advanced) as advanced_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        question.key,
        input.sourceObservationId,
        question.prompt,
        question.topic,
        nextQuestionKey,
        DISCOVERY_REVIEW_KEY,
      ],
    );
    const row = rows[0];
    if (
      !row ||
      Number(row.selected_count) !== 1 ||
      Number(row.source_count) !== 1 ||
      Number(row.observation_count) !== 1 ||
      Number(row.confirmation_count) !== 1 ||
      Number(row.advanced_count) !== 1
    ) {
      return {
        ok: false,
        code: "conflict",
        message:
          "This interview or earlier answer changed after the page loaded. Reload before continuing.",
      };
    }
    return {
      ok: true,
      message: nextQuestionKey === DISCOVERY_REVIEW_KEY
        ? "Earlier answer confirmed. The interview is ready for review."
        : "Earlier answer confirmed for this interview.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logDiscoveryDatabaseFailure("confirm_prior_observation", error);
    return {
      ok: false,
      code: "unavailable",
      message:
        "Lotura could not confirm this earlier answer safely. No partial change was retained.",
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
  } catch (error) {
    logDiscoveryDatabaseFailure(input.paused ? "pause_session" : "resume_session", error);
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
         select session.id, session.organization_id, session.stable_key
         from discovery_sessions session
         where session.organization_id = $1
           and session.stable_key = $2::uuid
           and session.actor_identifier = $3
           and session.revision = $4
           and session.status = 'ready_for_review'
           and not exists (
             select 1
             from discovery_proposals proposal
             where proposal.organization_id = session.organization_id
               and proposal.session_id = session.id
               and proposal.session_stable_key = session.stable_key
               and proposal.status = 'ready_for_review'
           )
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
      return {
        ok: false,
        code: "conflict",
        message: "Reload before correcting this answer. A finished proposed update cannot be silently changed.",
      };
    }
    return {
      ok: true,
      message: "Correction appended. The prior observation remains in the record.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logDiscoveryDatabaseFailure("append_correction", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not append the correction safely. No partial change was retained.",
    };
  }
}

function proposalSnapshot(input: DocumentedProcessSnapshot) {
  const serialized = JSON.stringify(input);
  if (serialized.length < 2 || serialized.length > 500000) return null;
  return {
    fingerprint: createHash("sha256").update(serialized).digest("hex"),
    serialized,
  };
}

export async function saveDiscoveryProposalDecision(input: {
  disposition: DiscoveryProposalDisposition;
  documentedProcessSnapshot: DocumentedProcessSnapshot;
  expectedProposalRevision: number;
  observationId: string;
  reviewNote: string;
  sessionId: string;
}): Promise<DiscoveryMutationResult> {
  const reviewNote = input.reviewNote.trim();
  const snapshot = proposalSnapshot(input.documentedProcessSnapshot);
  if (
    !validUuid(input.sessionId) ||
    !validUuid(input.observationId) ||
    !Number.isSafeInteger(input.expectedProposalRevision) ||
    input.expectedProposalRevision < 0 ||
    !PROPOSAL_DISPOSITIONS.has(input.disposition) ||
    reviewNote.length > 2000 ||
    !snapshot
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "Review the proposed-update choice and try again.",
    };
  }
  const context = await discoveryWriteContext();
  if (!context) {
    return {
      ok: false,
      code: "unavailable",
      message: "Guided Discovery is not enabled.",
    };
  }

  try {
    if (input.expectedProposalRevision === 0) {
      const rows = await context.sql.query(
        `with selected_observation as materialized (
           select session.id as session_id,
             session.organization_id,
             session.stable_key as session_stable_key,
             session.process_id,
             session.process_stable_key,
             observation.stable_key as observation_stable_key
           from discovery_sessions session
           join discovery_observations observation
             on observation.session_id = session.id
            and observation.organization_id = session.organization_id
            and observation.session_stable_key = session.stable_key
           where session.organization_id = $1::integer
             and session.stable_key = $2::uuid
             and session.status = 'ready_for_review'
             and observation.stable_key = $3::uuid
             and not exists (
               select 1
               from discovery_observations later
               where later.organization_id = observation.organization_id
                 and later.session_id = observation.session_id
                 and later.supersedes_observation_stable_key = observation.stable_key
             )
         ), inserted_proposal as (
           insert into discovery_proposals (
             organization_id, session_id, session_stable_key, process_id,
             process_stable_key, documented_process_snapshot,
             documented_process_fingerprint, actor_identifier
           )
           select organization_id, session_id, session_stable_key, process_id,
             process_stable_key, $4::jsonb, $5::varchar(64), $6::varchar(128)
           from selected_observation
           on conflict (session_id) do nothing
           returning id, organization_id, stable_key, session_id,
             session_stable_key
         ), inserted_decision as (
           insert into discovery_proposal_decisions (
             organization_id, proposal_id, proposal_stable_key, session_id,
             session_stable_key, observation_stable_key, decision_sequence,
             disposition, review_note, actor_identifier
           )
           select proposal.organization_id, proposal.id, proposal.stable_key,
             proposal.session_id, proposal.session_stable_key,
             selected_observation.observation_stable_key, 1,
             $7::discovery_proposal_disposition, $8::text, $6::varchar(128)
           from inserted_proposal proposal
           join selected_observation
             on selected_observation.session_id = proposal.session_id
            and selected_observation.organization_id = proposal.organization_id
            and selected_observation.session_stable_key = proposal.session_stable_key
           returning 1
         )
         select
           (select count(*)::int from selected_observation) as observation_count,
           (select count(*)::int from inserted_proposal) as proposal_count,
           (select count(*)::int from inserted_decision) as decision_count`,
        [
          context.configuration.organizationId,
          input.sessionId,
          input.observationId,
          snapshot.serialized,
          snapshot.fingerprint,
          context.configuration.actorIdentifier,
          input.disposition,
          reviewNote || null,
        ],
      );
      const row = rows[0];
      if (
        !row ||
        Number(row.observation_count) !== 1 ||
        Number(row.proposal_count) !== 1 ||
        Number(row.decision_count) !== 1
      ) {
        return {
          ok: false,
          code: "conflict",
          message: "This proposed update changed after the page loaded. Reload before continuing.",
        };
      }
    } else {
      const rows = await context.sql.query(
        `with selected_proposal as materialized (
           select proposal.id, proposal.organization_id, proposal.stable_key,
             proposal.session_id, proposal.session_stable_key
           from discovery_proposals proposal
           join discovery_sessions session
             on session.id = proposal.session_id
            and session.organization_id = proposal.organization_id
            and session.stable_key = proposal.session_stable_key
            and session.process_id = proposal.process_id
            and session.process_stable_key = proposal.process_stable_key
           where proposal.organization_id = $1::integer
             and proposal.session_stable_key = $2::uuid
             and proposal.revision = $3::integer
             and proposal.status = 'draft'
             and session.status = 'ready_for_review'
           for update of proposal
         ), selected_observation as (
           select observation.stable_key
           from discovery_observations observation
           join selected_proposal proposal
             on proposal.session_id = observation.session_id
            and proposal.organization_id = observation.organization_id
            and proposal.session_stable_key = observation.session_stable_key
           where observation.stable_key = $4::uuid
             and not exists (
               select 1
               from discovery_observations later
               where later.organization_id = observation.organization_id
                 and later.session_id = observation.session_id
                 and later.supersedes_observation_stable_key = observation.stable_key
             )
         ), next_sequence as (
           select coalesce(max(decision.decision_sequence), 0) + 1 as value
           from discovery_proposal_decisions decision
           join selected_proposal proposal
             on proposal.id = decision.proposal_id
            and proposal.organization_id = decision.organization_id
            and proposal.stable_key = decision.proposal_stable_key
           where decision.observation_stable_key = $4::uuid
         ), inserted_decision as (
           insert into discovery_proposal_decisions (
             organization_id, proposal_id, proposal_stable_key, session_id,
             session_stable_key, observation_stable_key, decision_sequence,
             disposition, review_note, actor_identifier
           )
           select proposal.organization_id, proposal.id, proposal.stable_key,
             proposal.session_id, proposal.session_stable_key,
             observation.stable_key, next_sequence.value,
             $5::discovery_proposal_disposition, $6::text, $7::varchar(128)
           from selected_proposal proposal
           cross join selected_observation observation
           cross join next_sequence
           returning 1
         ), advanced as (
           update discovery_proposals
           set revision = revision + 1,
             updated_at = transaction_timestamp()
           where id = (select id from selected_proposal)
             and exists (select 1 from inserted_decision)
           returning 1
         )
         select
           (select count(*)::int from selected_observation) as observation_count,
           (select count(*)::int from inserted_decision) as decision_count,
           (select count(*)::int from advanced) as advanced_count`,
        [
          context.configuration.organizationId,
          input.sessionId,
          input.expectedProposalRevision,
          input.observationId,
          input.disposition,
          reviewNote || null,
          context.configuration.actorIdentifier,
        ],
      );
      const row = rows[0];
      if (
        !row ||
        Number(row.observation_count) !== 1 ||
        Number(row.decision_count) !== 1 ||
        Number(row.advanced_count) !== 1
      ) {
        return {
          ok: false,
          code: "conflict",
          message: "This proposed update changed after the page loaded. Reload before continuing.",
        };
      }
    }
    return {
      ok: true,
      message: "Choice saved. The documented Process has not changed.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logDiscoveryDatabaseFailure("save_proposal_decision", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not save this choice safely. No partial change was retained.",
    };
  }
}

export async function finishDiscoveryProposal(input: {
  expectedProposalRevision: number;
  sessionId: string;
}): Promise<DiscoveryMutationResult> {
  if (
    !validUuid(input.sessionId) ||
    !Number.isSafeInteger(input.expectedProposalRevision) ||
    input.expectedProposalRevision < 1
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "The proposed-update reference is invalid.",
    };
  }
  const context = await discoveryWriteContext();
  if (!context) {
    return {
      ok: false,
      code: "unavailable",
      message: "Guided Discovery is not enabled.",
    };
  }

  try {
    const rows = await context.sql.query(
      `with selected_proposal as materialized (
         select proposal.id, proposal.organization_id, proposal.stable_key,
           proposal.session_id, proposal.session_stable_key
         from discovery_proposals proposal
         join discovery_sessions session
           on session.id = proposal.session_id
          and session.organization_id = proposal.organization_id
          and session.stable_key = proposal.session_stable_key
         where proposal.organization_id = $1::integer
           and proposal.session_stable_key = $2::uuid
           and proposal.revision = $3::integer
           and proposal.status = 'draft'
           and session.status = 'ready_for_review'
         for update of proposal
       ), active_observations as (
         select observation.stable_key
         from discovery_observations observation
         join selected_proposal proposal
           on proposal.session_id = observation.session_id
          and proposal.organization_id = observation.organization_id
          and proposal.session_stable_key = observation.session_stable_key
         where not exists (
           select 1
           from discovery_observations later
           where later.organization_id = observation.organization_id
             and later.session_id = observation.session_id
             and later.supersedes_observation_stable_key = observation.stable_key
         )
       ), current_decisions as (
         select distinct on (decision.observation_stable_key)
           decision.observation_stable_key
         from discovery_proposal_decisions decision
         join selected_proposal proposal
           on proposal.id = decision.proposal_id
          and proposal.organization_id = decision.organization_id
          and proposal.stable_key = decision.proposal_stable_key
         join active_observations observation
           on observation.stable_key = decision.observation_stable_key
         order by decision.observation_stable_key,
           decision.decision_sequence desc
       ), summary as (
         select
           (select count(*)::int from active_observations) as observation_count,
           (select count(*)::int from current_decisions) as decision_count
       ), advanced as (
         update discovery_proposals
         set status = 'ready_for_review',
           revision = revision + 1,
           ready_at = transaction_timestamp(),
           ready_by_actor = $4::varchar(128),
           updated_at = transaction_timestamp()
         where id = (select id from selected_proposal)
           and (select observation_count from summary) > 0
           and (select observation_count from summary) =
             (select decision_count from summary)
         returning 1
       )
       select summary.observation_count, summary.decision_count,
         (select count(*)::int from advanced) as advanced_count
       from summary`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.expectedProposalRevision,
        context.configuration.actorIdentifier,
      ],
    );
    const row = rows[0];
    if (!row || Number(row.advanced_count) !== 1) {
      const missing = row
        ? Number(row.observation_count) - Number(row.decision_count)
        : 0;
      return missing > 0
        ? {
            ok: false,
            code: "invalid",
            message: `Choose how to treat the remaining ${missing} interview ${missing === 1 ? "answer" : "answers"} before finishing.`,
          }
        : {
            ok: false,
            code: "conflict",
            message: "This proposed update changed after the page loaded. Reload before finishing.",
          };
    }
    return {
      ok: true,
      message: "Proposed update is ready for review. The documented Process has not changed.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logDiscoveryDatabaseFailure("finish_proposal", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not finish the proposed update safely. No partial change was retained.",
    };
  }
}
