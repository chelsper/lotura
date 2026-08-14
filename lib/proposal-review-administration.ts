import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import {
  PROPOSAL_REVIEW_DISPOSITIONS,
  type ProposalReviewDisposition,
  type ProposalReviewStatus,
} from "./proposal-review-model.mjs";
import { resolveProposalReviewConfiguration } from "./proposal-review-policy.mjs";

export type ProposalReviewMutationResult =
  | { ok: true; message: string; sessionId: string }
  | {
      ok: false;
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
    };

const DISPOSITIONS = new Set<ProposalReviewDisposition>(
  PROPOSAL_REVIEW_DISPOSITIONS,
);

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function logProposalReviewFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const safeValue = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

  console.error("[proposal-review] database operation failed", {
    code: safeValue(details.code),
    constraint: safeValue(details.constraint),
    operation,
    routine: safeValue(details.routine),
    table: safeValue(details.table),
  });
}

async function proposalReviewWriteContext() {
  const runtimeAccess = await requireWorkspaceAccess();
  const configuration = resolveProposalReviewConfiguration(
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

export async function beginOperatingModelProposalReview(input: {
  currentProcessFingerprint: string;
  expectedMappingRevision: number;
  sessionId: string;
}): Promise<ProposalReviewMutationResult> {
  if (
    !validUuid(input.sessionId) ||
    !Number.isSafeInteger(input.expectedMappingRevision) ||
    input.expectedMappingRevision < 1 ||
    !/^[0-9a-f]{64}$/.test(input.currentProcessFingerprint)
  ) {
    return { ok: false, code: "invalid", message: "The review reference is invalid." };
  }
  const context = await proposalReviewWriteContext();
  if (!context) {
    return { ok: false, code: "unavailable", message: "Proposal Review is not enabled." };
  }

  try {
    const rows = await context.sql.query(
      `with selected_mapping as materialized (
         select mapping.id, mapping.organization_id, mapping.stable_key,
           mapping.revision, mapping.proposal_id, mapping.proposal_stable_key,
           mapping.session_id, mapping.session_stable_key, mapping.process_id,
           mapping.process_stable_key, proposal.documented_process_fingerprint
         from discovery_proposal_mappings mapping
         join discovery_proposals proposal
           on proposal.id = mapping.proposal_id
          and proposal.organization_id = mapping.organization_id
          and proposal.stable_key = mapping.proposal_stable_key
         where mapping.organization_id = $1::integer
           and mapping.session_stable_key = $2::uuid
           and mapping.status = 'ready_for_proposal_review'
           and mapping.revision = $3::integer
           and proposal.status = 'ready_for_review'
           and proposal.documented_process_fingerprint = $4::varchar(64)
       ), current_items as (
         select distinct on (item.item_stable_key)
           item.item_stable_key, item.state, item.action
         from discovery_mapping_items item
         join selected_mapping mapping
           on mapping.id = item.mapping_id
          and mapping.organization_id = item.organization_id
          and mapping.stable_key = item.mapping_stable_key
         order by item.item_stable_key, item.item_sequence desc
       ), summary as (
         select count(*) filter (
           where state = 'active' and action <> 'preserve_unresolved'
         )::int as structured_count
         from current_items
       ), inserted as (
         insert into operating_model_proposal_reviews (
           organization_id, mapping_id, mapping_stable_key, mapping_revision,
           proposal_id, proposal_stable_key, session_id, session_stable_key,
           process_id, process_stable_key, documented_process_fingerprint,
           started_by_actor
         )
         select mapping.organization_id, mapping.id, mapping.stable_key,
           mapping.revision, mapping.proposal_id, mapping.proposal_stable_key,
           mapping.session_id, mapping.session_stable_key, mapping.process_id,
           mapping.process_stable_key, mapping.documented_process_fingerprint,
           $5::varchar(128)
         from selected_mapping mapping, summary
         where summary.structured_count > 0
           and not exists (
             select 1 from operating_model_proposal_reviews review
             where review.mapping_id = mapping.id
           )
         returning stable_key
       ), existing as (
         select review.stable_key
         from operating_model_proposal_reviews review
         join selected_mapping mapping on mapping.id = review.mapping_id
       )
       select
         (select count(*)::int from selected_mapping) as mapping_count,
         (select structured_count from summary) as structured_count,
         (select count(*)::int from inserted) as inserted_count,
         (select count(*)::int from existing) as existing_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.expectedMappingRevision,
        input.currentProcessFingerprint,
        context.configuration.actorIdentifier,
      ],
    );
    const row = rows[0];
    if (!row || Number(row.mapping_count) !== 1) {
      return {
        ok: false,
        code: "conflict",
        message: "The proposal or documented Process changed. Reload before beginning review.",
      };
    }
    if (Number(row.structured_count) < 1) {
      return {
        ok: false,
        code: "invalid",
        message: "There are no specific changes to review. The Knowledge Outcome is complete without a proposal review.",
      };
    }
    if (Number(row.inserted_count) !== 1 && Number(row.existing_count) !== 1) {
      return {
        ok: false,
        code: "conflict",
        message: "The review could not be started from this proposal. Reload and try again.",
      };
    }
    return {
      ok: true,
      message: Number(row.inserted_count) === 1
        ? "Proposal review started. The documented Process has not changed."
        : "Proposal review is already available.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logProposalReviewFailure("begin_review", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not begin this review safely. No partial review was retained.",
    };
  }
}

export async function saveOperatingModelProposalReviewDecision(input: {
  disposition: ProposalReviewDisposition;
  expectedReviewRevision: number;
  itemId: string;
  reviewNote: string;
  sessionId: string;
}): Promise<ProposalReviewMutationResult> {
  const reviewNote = input.reviewNote.trim();
  if (
    !validUuid(input.sessionId) ||
    !validUuid(input.itemId) ||
    !DISPOSITIONS.has(input.disposition) ||
    !Number.isSafeInteger(input.expectedReviewRevision) ||
    input.expectedReviewRevision < 1 ||
    reviewNote.length > 4000 ||
    (input.disposition !== "approve" && reviewNote.length < 1)
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "Choose a review decision and explain anything not approved or still needing validation.",
    };
  }
  const context = await proposalReviewWriteContext();
  if (!context) {
    return { ok: false, code: "unavailable", message: "Proposal Review is not enabled." };
  }

  try {
    const rows = await context.sql.query(
      `with selected_review as materialized (
         select review.id, review.organization_id, review.stable_key,
           review.mapping_id, review.mapping_stable_key
         from operating_model_proposal_reviews review
         where review.organization_id = $1::integer
           and review.session_stable_key = $2::uuid
           and review.status = 'in_review'
           and review.revision = $3::integer
         for update
       ), current_item as (
         select distinct on (item.item_stable_key)
           item.id, item.organization_id, item.stable_key, item.mapping_id,
           item.mapping_stable_key, item.item_stable_key, item.item_sequence,
           item.state, item.action
         from discovery_mapping_items item
         join selected_review review
           on review.mapping_id = item.mapping_id
          and review.organization_id = item.organization_id
          and review.mapping_stable_key = item.mapping_stable_key
         where item.item_stable_key = $4::uuid
         order by item.item_stable_key, item.item_sequence desc
       ), next_sequence as (
         select coalesce(max(decision.decision_sequence), 0) + 1 as value
         from operating_model_proposal_review_decisions decision
         join selected_review review on review.id = decision.review_id
         where decision.item_stable_key = $4::uuid
       ), inserted as (
         insert into operating_model_proposal_review_decisions (
           organization_id, review_id, review_stable_key, mapping_id,
           mapping_stable_key, item_revision_id, item_revision_stable_key,
           item_stable_key, item_sequence, decision_sequence, disposition,
           review_note, actor_identifier
         )
         select review.organization_id, review.id, review.stable_key,
           review.mapping_id, review.mapping_stable_key, item.id,
           item.stable_key, item.item_stable_key, item.item_sequence,
           next_sequence.value, $5::proposal_review_disposition,
           nullif($6::text, ''), $7::varchar(128)
         from selected_review review
         join current_item item on item.state = 'active'
           and item.action <> 'preserve_unresolved'
         cross join next_sequence
         returning 1
       )
       select
         (select count(*)::int from selected_review) as review_count,
         (select count(*)::int from current_item) as item_count,
         (select count(*)::int from inserted) as inserted_count`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.expectedReviewRevision,
        input.itemId,
        input.disposition,
        reviewNote,
        context.configuration.actorIdentifier,
      ],
    );
    const row = rows[0];
    if (!row || Number(row.review_count) !== 1) {
      return {
        ok: false,
        code: "conflict",
        message: "This review changed after the page loaded. Reload before continuing.",
      };
    }
    if (Number(row.item_count) !== 1 || Number(row.inserted_count) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The proposed change is no longer available in this review.",
      };
    }
    return {
      ok: true,
      message: "Review decision saved. Earlier decisions remain in history.",
      sessionId: input.sessionId,
    };
  } catch (error) {
    logProposalReviewFailure("save_decision", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not save this review decision safely. No partial change was retained.",
    };
  }
}

export async function finishOperatingModelProposalReview(input: {
  completionNote: string;
  currentProcessFingerprint: string;
  expectedReviewRevision: number;
  sessionId: string;
}): Promise<ProposalReviewMutationResult> {
  const completionNote = input.completionNote.trim();
  if (
    !validUuid(input.sessionId) ||
    !Number.isSafeInteger(input.expectedReviewRevision) ||
    input.expectedReviewRevision < 1 ||
    !/^[0-9a-f]{64}$/.test(input.currentProcessFingerprint) ||
    completionNote.length < 1 ||
    completionNote.length > 4000
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "Explain why this review is being completed in 4,000 characters or fewer.",
    };
  }
  const context = await proposalReviewWriteContext();
  if (!context) {
    return { ok: false, code: "unavailable", message: "Proposal Review is not enabled." };
  }

  try {
    const rows = await context.sql.query(
      `with selected_review as materialized (
         select review.id, review.organization_id, review.mapping_id,
           review.documented_process_fingerprint
         from operating_model_proposal_reviews review
         join discovery_proposal_mappings mapping
           on mapping.id = review.mapping_id
          and mapping.organization_id = review.organization_id
          and mapping.stable_key = review.mapping_stable_key
         join discovery_proposals proposal
           on proposal.id = review.proposal_id
          and proposal.organization_id = review.organization_id
          and proposal.stable_key = review.proposal_stable_key
         where review.organization_id = $1::integer
           and review.session_stable_key = $2::uuid
           and review.status = 'in_review'
           and review.revision = $3::integer
           and mapping.status = 'ready_for_proposal_review'
           and proposal.status = 'ready_for_review'
           and review.documented_process_fingerprint = $4::varchar(64)
           and proposal.documented_process_fingerprint = $4::varchar(64)
         for update of review
       ), current_items as (
         select distinct on (item.item_stable_key)
           item.item_stable_key, item.state, item.action
         from discovery_mapping_items item
         join selected_review review on review.mapping_id = item.mapping_id
         order by item.item_stable_key, item.item_sequence desc
       ), review_items as (
         select item_stable_key from current_items
         where state = 'active' and action <> 'preserve_unresolved'
       ), current_decisions as (
         select distinct on (decision.item_stable_key)
           decision.item_stable_key, decision.disposition
         from operating_model_proposal_review_decisions decision
         join selected_review review on review.id = decision.review_id
         order by decision.item_stable_key, decision.decision_sequence desc
       ), summary as (
         select count(*)::int as item_count,
           count(decision.item_stable_key)::int as decision_count,
           count(*) filter (where decision.disposition = 'approve')::int as approved_count,
           count(*) filter (where decision.disposition = 'reject')::int as rejected_count,
           count(*) filter (where decision.disposition = 'needs_validation')::int as validation_count
         from review_items item
         left join current_decisions decision using (item_stable_key)
       ), derived as (
         select case
           when validation_count > 0 then 'needs_validation'::proposal_review_status
           when approved_count = item_count then 'approved_for_application'::proposal_review_status
           when approved_count > 0 and rejected_count > 0 then 'approved_in_part'::proposal_review_status
           else 'not_approved'::proposal_review_status
         end as result
         from summary
         where item_count > 0 and decision_count = item_count
       ), completed as (
         update operating_model_proposal_reviews review
         set status = derived.result,
           revision = review.revision + 1,
           completed_at = transaction_timestamp(),
           completed_by_actor = $5::varchar(128),
           completion_note = $6::text,
           updated_at = transaction_timestamp()
         from selected_review, derived
         where review.id = selected_review.id
         returning review.status
       )
       select
         (select count(*)::int from selected_review) as review_count,
         (select item_count from summary) as item_count,
         (select decision_count from summary) as decision_count,
         (select status::text from completed) as status`,
      [
        context.configuration.organizationId,
        input.sessionId,
        input.expectedReviewRevision,
        input.currentProcessFingerprint,
        context.configuration.actorIdentifier,
        completionNote,
      ],
    );
    const row = rows[0];
    if (!row || Number(row.review_count) !== 1) {
      return {
        ok: false,
        code: "conflict",
        message: "The review or documented Process changed. Reload before finishing.",
      };
    }
    if (Number(row.item_count) < 1 || Number(row.decision_count) !== Number(row.item_count)) {
      return {
        ok: false,
        code: "invalid",
        message: "Review every specific change before finishing.",
      };
    }
    const status = String(row.status) as ProposalReviewStatus;
    const label = status === "approved_for_application"
      ? "All proposed changes were approved to move forward."
      : status === "approved_in_part"
        ? "Some proposed changes were approved to move forward."
        : status === "needs_validation"
          ? "The review finished with additional validation still needed."
          : "The review finished with no changes approved.";
    return {
      ok: true,
      message: `${label} The documented Process has not changed.`,
      sessionId: input.sessionId,
    };
  } catch (error) {
    logProposalReviewFailure("finish_review", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not finish this review safely. No partial result was retained.",
    };
  }
}
