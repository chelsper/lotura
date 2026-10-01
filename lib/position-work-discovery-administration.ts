import "server-only";

import { createHash } from "node:crypto";

import { neon } from "@neondatabase/serverless";

import { loadWorkspaceStudioExperience } from "./organization-structure-experience";
import {
  buildPositionWorkScope,
  POSITION_WORK_DESCRIPTION_PROMPT,
  positionWorkInvolvementLabel,
  validatePositionWorkInput,
} from "./position-work-discovery-model.mjs";

export type PositionWorkDiscoveryInput = {
  epistemicState: string;
  involvement: string;
  positionId: string;
  requestId: string;
  workDescription: string;
};

export type PositionWorkDiscoveryResult =
  | { inquiryId: string; ok: true; sessionId: string }
  | {
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
      ok: false;
    };

type ResultRow = Record<string, unknown>;

function validUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function unavailable(): PositionWorkDiscoveryResult {
  return {
    code: "unavailable",
    message: "Lotura could not confirm that your work description was saved. Try again with this same form to check safely.",
    ok: false,
  };
}

/** Preserve a participant's description, not a Position mandate or assignment. */
export async function startPositionWorkDiscovery(
  input: PositionWorkDiscoveryInput,
): Promise<PositionWorkDiscoveryResult> {
  const validated = validatePositionWorkInput(input);
  if (!validated) {
    return {
      code: "invalid",
      message: "Describe the work, choose how this job is involved, and indicate how certain you are.",
      ok: false,
    };
  }

  // This loader authenticates, authorizes private Studio, and reads the current
  // tenant-scoped Position through the runtime credential, not Discovery grants.
  const experience = await loadWorkspaceStudioExperience();
  if (!experience.enabled || !experience.discovery.enabled
    || experience.administration.organizationId !== experience.discovery.organizationId
    || experience.administration.actorIdentifier !== experience.discovery.actorIdentifier) {
    return {
      code: "unavailable",
      message: "Describing work is not enabled in this workspace.",
      ok: false,
    };
  }
  const positionId = validated.positionId.toLowerCase();
  const position = experience.data.positions.find((item) => item.id === positionId);
  if (!position || position.status !== "active") {
    return {
      code: "not_found",
      message: "This job title is no longer available. Return to the Unit and choose a current job title.",
      ok: false,
    };
  }

  const { actorIdentifier, databaseUrl, organizationId } = experience.discovery;
  const scope = buildPositionWorkScope({ title: position.title, unitName: position.unit?.name ?? null });
  const question = `Understand the work described for ${position.title}`;
  const involvement = positionWorkInvolvementLabel(validated.involvement);
  const payloadHash = createHash("sha256").update(JSON.stringify({
    positionId,
    workDescription: validated.workDescription,
    involvement: validated.involvement,
    epistemicState: validated.epistemicState,
  })).digest("hex");
  const requestPrefix = `position-work:v1:${validated.requestId.toLowerCase()}:`;
  const requestMarker = `${requestPrefix}${positionId}:${payloadHash}`;
  const sql = neon(databaseUrl, { isolationLevel: "Serializable", readOnly: false });

  try {
    const [createdRows] = await sql.transaction((transaction) => [
      transaction.query(
        `with existing_request as materialized (
           select route.inquiry_id, route.inquiry_stable_key,
             route.discovery_inquiry_session_stable_key as session_stable_key,
             route.route_note
           from discovery_inquiry_routes route
           where route.organization_id = $1::integer
             and route.actor_identifier = $2::varchar(128)
             and route.route_kind = 'start_inquiry_exploration'
             and left(route.route_note, char_length($3::text)) = $3::text
           limit 2
         ), inserted_inquiry as (
           insert into discovery_inquiries (
             organization_id, question_text, actor_identifier
           )
           select $1::integer, $5::text, $2::varchar(128)
           where not exists (select 1 from existing_request)
           returning id, stable_key
         ), inserted_session as (
           insert into discovery_inquiry_sessions (
             organization_id, inquiry_id, inquiry_stable_key, scope_statement,
             current_question_key, actor_identifier
           )
           select $1::integer, inquiry.id, inquiry.stable_key, $6::text,
             'boundary_start', $2::varchar(128)
           from inserted_inquiry inquiry
           returning id, stable_key, inquiry_id, inquiry_stable_key
         ), inserted_route as (
           insert into discovery_inquiry_routes (
             organization_id, inquiry_id, inquiry_stable_key, route_sequence,
             route_kind, discovery_inquiry_session_id,
             discovery_inquiry_session_stable_key, route_note, actor_identifier
           )
           select $1::integer, session.inquiry_id, session.inquiry_stable_key, 1,
             'start_inquiry_exploration', session.id, session.stable_key,
             $4::text, $2::varchar(128)
           from inserted_session session
           returning 1
         ), inserted_observations as (
           insert into discovery_inquiry_observations (
             organization_id, session_id, session_stable_key, sequence,
             prompt_key, prompt_text, topic, response_text, epistemic_state,
             actor_identifier
           )
           select $1::integer, session.id, session.stable_key, answer.sequence,
             answer.prompt_key, answer.prompt_text,
             answer.topic::discovery_observation_topic, answer.response_text,
             $10::discovery_observation_state, $2::varchar(128)
           from inserted_session session
           cross join (values
             (1, 'work_to_understand', $7::text, 'purpose', $8::text),
             (2, 'participants_responsibility', 'How is this job involved in this work?',
               'participants_responsibility', $9::text)
           ) as answer(sequence, prompt_key, prompt_text, topic, response_text)
           returning 1
         ), result as (
           select inquiry.id as inquiry_id, inquiry.stable_key as inquiry_stable_key,
             session.stable_key as session_stable_key, true as created,
             true as payload_matches
           from inserted_inquiry inquiry cross join inserted_session session
           union all
           select existing.inquiry_id, existing.inquiry_stable_key,
             existing.session_stable_key, false,
             existing.route_note = $4::text
           from existing_request existing
         )
         select inquiry_stable_key::text as inquiry_id,
           session_stable_key::text as session_id, payload_matches,
           set_config('lotura.position_work_inquiry_id', inquiry_id::text, true) as local_inquiry,
           set_config('lotura.position_work_created', created::text, true) as local_created,
           1 / case when
             (select count(*) from result) = 1
             and (
               (created and (select count(*) from inserted_route) = 1
                 and (select count(*) from inserted_observations) = 2)
               or (not created and (select count(*) from inserted_inquiry) = 0)
             ) then 1 else 0 end as integrity_check
         from result`,
        [organizationId, actorIdentifier, requestPrefix, requestMarker,
          question, scope, POSITION_WORK_DESCRIPTION_PROMPT,
          validated.workDescription, involvement, validated.epistemicState],
      ),
      // A separate statement can see the inserted inquiry. transaction_timestamp()
      // would equal its creation timestamp, which the immutable-context guard rejects.
      transaction.query(
        `with advanced as (
           update discovery_inquiries
           set status = 'routed', revision = revision + 1,
             updated_at = clock_timestamp()
           where organization_id = $1::integer
             and actor_identifier = $2::varchar(128)
             and id = nullif(current_setting('lotura.position_work_inquiry_id', true), '')::integer
             and current_setting('lotura.position_work_created', true) = 'true'
             and status = 'open' and revision = 1
           returning 1
         )
         select 1 / case when
           nullif(current_setting('lotura.position_work_inquiry_id', true), '') is not null
           and (select count(*) from advanced) = case
             when current_setting('lotura.position_work_created', true) = 'true' then 1
             else 0 end
           then 1 else 0 end as integrity_check`,
        [organizationId, actorIdentifier],
      ),
    ], { isolationLevel: "Serializable", readOnly: false });

    const row = (createdRows as ResultRow[])[0];
    if (row?.payload_matches === false) {
      return {
        code: "conflict",
        message: "This form already saved a different description. Reopen it from the job title to describe more work.",
        ok: false,
      };
    }
    if (!row || !validUuid(row.inquiry_id) || !validUuid(row.session_id)
      || row.payload_matches !== true) return unavailable();
    return { inquiryId: row.inquiry_id, ok: true, sessionId: row.session_id };
  } catch (error) {
    const details = typeof error === "object" && error !== null
      ? error as Record<string, unknown>
      : {};
    // Never log the question, response, actor, marker, connection, or raw error.
    console.error("[position-work-discovery] save could not be confirmed", {
      code: typeof details.code === "string" ? details.code : undefined,
      constraint: typeof details.constraint === "string" ? details.constraint : undefined,
    });
    return unavailable();
  }
}
