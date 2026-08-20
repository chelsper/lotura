import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS,
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS,
  type DiscoveryInquiryReviewOutcomeKind,
} from "./discovery-inquiry-review-model.mjs";
import { resolveDiscoveryConfiguration } from "./discovery-policy.mjs";

export type DiscoveryInquiryReviewOutcomeInput = {
  explanation: string;
  kind: DiscoveryInquiryReviewOutcomeKind;
  processKey: string;
};

export type DiscoveryInquiryReviewMutationResult =
  | {
      inquiryId: string;
      message: string;
      ok: true;
      reviewId: string;
      sessionId: string;
    }
  | {
      code: "conflict" | "invalid" | "unavailable";
      message: string;
      ok: false;
    };

const OUTCOME_KINDS = new Set<DiscoveryInquiryReviewOutcomeKind>(
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS,
);

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

function boundedText(value: string, maximum: number) {
  const normalized = value.trim();
  if (normalized.length > maximum) return undefined;
  return normalized || null;
}

function validateOutcomes(outcomes: DiscoveryInquiryReviewOutcomeInput[]) {
  if (outcomes.length < 1 || outcomes.length > OUTCOME_KINDS.size) return null;
  const uniqueKinds = new Set<DiscoveryInquiryReviewOutcomeKind>();
  const validated: Array<{
    explanation: string | null;
    kind: DiscoveryInquiryReviewOutcomeKind;
    processId: number | null;
  }> = [];

  for (const outcome of outcomes) {
    if (!OUTCOME_KINDS.has(outcome.kind) || uniqueKinds.has(outcome.kind)) {
      return null;
    }
    uniqueKinds.add(outcome.kind);
    const explanation = boundedText(outcome.explanation, 2000);
    if (explanation === undefined) return null;
    const details = DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS[outcome.kind];
    if (details.requiresExplanation && !explanation) return null;
    const processId = outcome.kind === "connect_existing_process"
      ? processIdFromKey(outcome.processKey)
      : null;
    if (outcome.kind === "connect_existing_process" && !processId) return null;
    if (outcome.kind !== "connect_existing_process" && outcome.processKey) {
      return null;
    }
    validated.push({ explanation, kind: outcome.kind, processId });
  }
  return validated;
}

function logInquiryReviewDatabaseFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const safeValue = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

  console.error("[question-driven-discovery] review operation failed", {
    code: safeValue(details.code),
    constraint: safeValue(details.constraint),
    operation,
    routine: safeValue(details.routine),
    table: safeValue(details.table),
  });
}

async function inquiryReviewWriteContext() {
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

export async function finishDiscoveryInquiryReview(input: {
  expectedRevision: number;
  inquiryId: string;
  outcomes: DiscoveryInquiryReviewOutcomeInput[];
  reviewNote: string;
  sessionId: string;
  supersedesReviewId: string;
}): Promise<DiscoveryInquiryReviewMutationResult> {
  const reviewNote = boundedText(input.reviewNote, 2000);
  const outcomes = validateOutcomes(input.outcomes);
  const supersedesReviewId = input.supersedesReviewId.trim();
  if (
    !validUuid(input.inquiryId)
    || !validUuid(input.sessionId)
    || !Number.isSafeInteger(input.expectedRevision)
    || input.expectedRevision < 1
    || reviewNote === undefined
    || !outcomes
    || (supersedesReviewId && !validUuid(supersedesReviewId))
  ) {
    return {
      code: "invalid",
      message: "Choose at least one outcome and complete its required details.",
      ok: false,
    };
  }

  const context = await inquiryReviewWriteContext();
  if (!context) {
    return {
      code: "unavailable",
      message: "Question-driven Discovery review is not enabled.",
      ok: false,
    };
  }

  try {
    const rows = await context.sql.query(
      `with latest_review as materialized (
         select review.id, review.stable_key, review.review_sequence,
           review.reviewed_session_revision
         from discovery_inquiry_reviews review
         join discovery_inquiry_sessions session
           on session.id = review.session_id
          and session.organization_id = review.organization_id
          and session.stable_key = review.session_stable_key
         join discovery_inquiries inquiry
           on inquiry.id = session.inquiry_id
          and inquiry.organization_id = session.organization_id
          and inquiry.stable_key = session.inquiry_stable_key
         where review.organization_id = $1::integer
           and session.stable_key = $2::uuid
           and inquiry.stable_key = $3::uuid
         order by review.review_sequence desc
         limit 1
       ), selected_session as materialized (
         select session.id, session.organization_id, session.stable_key,
           session.inquiry_id, session.inquiry_stable_key, session.status,
           session.revision
         from discovery_inquiry_sessions session
         join discovery_inquiries inquiry
           on inquiry.id = session.inquiry_id
          and inquiry.organization_id = session.organization_id
          and inquiry.stable_key = session.inquiry_stable_key
         where session.organization_id = $1::integer
           and session.stable_key = $2::uuid
           and inquiry.stable_key = $3::uuid
           and session.revision = $5::integer
           and (
             (session.status = 'ready_for_review'
               and $10::uuid is null
               and not exists (select 1 from latest_review))
             or
             (session.status = 'closed'
               and $10::uuid is not null
               and $10::uuid = (select stable_key from latest_review))
           )
         for update of session
       ), inserted_review as (
         insert into discovery_inquiry_reviews (
           organization_id, inquiry_id, inquiry_stable_key, session_id,
           session_stable_key, review_sequence, reviewed_session_revision,
           supersedes_review_stable_key, review_note, actor_identifier
         )
         select session.organization_id, session.inquiry_id,
           session.inquiry_stable_key, session.id, session.stable_key,
           coalesce((select review_sequence from latest_review), 0) + 1,
           case when session.status = 'ready_for_review'
             then session.revision else session.revision - 1 end,
           (select stable_key from latest_review), $6::text,
           $4::varchar(128)
         from selected_session session
         returning id, organization_id, stable_key, session_id,
           session_stable_key
       ), inserted_sources as (
         insert into discovery_inquiry_review_sources (
           organization_id, review_id, review_stable_key, session_id,
           session_stable_key, observation_stable_key
         )
         select review.organization_id, review.id, review.stable_key,
           review.session_id, review.session_stable_key, observation.stable_key
         from inserted_review review
         join discovery_inquiry_observations observation
           on observation.organization_id = review.organization_id
          and observation.session_id = review.session_id
          and observation.session_stable_key = review.session_stable_key
         where not exists (
           select 1
           from discovery_inquiry_observations later
           where later.organization_id = observation.organization_id
             and later.session_id = observation.session_id
             and later.supersedes_observation_stable_key = observation.stable_key
         )
         returning id
       ), input_outcomes as (
         select input.kind, nullif(trim(input.explanation), '') as explanation,
           input.process_id
         from unnest(
           $7::discovery_inquiry_review_outcome_kind[],
           $8::text[],
           $9::integer[]
         ) as input(kind, explanation, process_id)
       ), inserted_outcomes as (
         insert into discovery_inquiry_review_outcomes (
           organization_id, review_id, review_stable_key, session_id,
           session_stable_key, outcome_kind, process_id, process_stable_key,
           explanation
         )
         select review.organization_id, review.id, review.stable_key,
           review.session_id, review.session_stable_key, input.kind,
           input.process_id, process.stable_key, input.explanation
         from inserted_review review
         cross join input_outcomes input
         left join processes process
           on process.organization_id = review.organization_id
          and process.id = input.process_id
          and process.status in ('draft', 'active')
         returning id
       ), closed_session as (
         update discovery_inquiry_sessions session
         set status = 'closed'::discovery_session_status,
           revision = session.revision + 1,
           updated_at = transaction_timestamp()
         where session.id = (select id from selected_session)
           and session.status = 'ready_for_review'
           and exists (select 1 from inserted_review)
           and exists (select 1 from inserted_sources)
           and exists (select 1 from inserted_outcomes)
         returning stable_key
       )
       select
         (select count(*)::int from selected_session) as selected_count,
         (select stable_key::text from inserted_review) as review_id,
         (select count(*)::int from inserted_sources) as source_count,
         (select count(*)::int from inserted_outcomes) as outcome_count,
         (select count(*)::int from closed_session) as closed_count,
         (select status::text from selected_session) as prior_status`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.inquiryId,
        context.configuration.actorIdentifier,
        input.expectedRevision,
        reviewNote,
        outcomes.map((outcome) => outcome.kind),
        outcomes.map((outcome) => outcome.explanation),
        outcomes.map((outcome) => outcome.processId),
        supersedesReviewId || null,
      ],
    );
    const row = rows[0];
    const reviewId = String(row?.review_id ?? "");
    const expectedClosedCount = supersedesReviewId ? 0 : 1;
    if (
      !row
      || Number(row.selected_count) !== 1
      || !validUuid(reviewId)
      || Number(row.source_count) < 1
      || Number(row.outcome_count) !== outcomes.length
      || Number(row.closed_count) !== expectedClosedCount
      || (supersedesReviewId && row.prior_status !== "closed")
      || (!supersedesReviewId && row.prior_status !== "ready_for_review")
    ) {
      return {
        code: "conflict",
        message: "This interview or review changed after the page loaded. Refresh before finishing.",
        ok: false,
      };
    }
    return {
      inquiryId: input.inquiryId,
      message: "Review preserved. No Process was created, proposed, approved, or changed.",
      ok: true,
      reviewId,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logInquiryReviewDatabaseFailure("finish_inquiry_review", error);
    return {
      code: "unavailable",
      message: "Lotura could not preserve this review safely. No partial review was retained.",
      ok: false,
    };
  }
}
