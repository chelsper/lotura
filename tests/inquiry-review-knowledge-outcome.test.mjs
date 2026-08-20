import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildInquiryKnowledgeOutcomeCounts,
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS,
  DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS,
} from "../lib/discovery-inquiry-review-model.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("LAD-060 preserves inquiry review between evidence and any Process proposal", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const start = decisions.indexOf("### LAD-060");
  assert.notEqual(start, -1);
  const decision = decisions.slice(start);
  assert.match(decision, /exact active inquiry observations/);
  assert.match(decision, /one or more human\s+conclusions/);
  assert.match(decision, /does\s+not attach evidence to, change, approve, version/);
  assert.match(decision, /No outcome\s+score, AI truth statement, approval, proposal/);
  assert.match(decision, /conflicts with and supersedes no accepted decision/);
});

test("migration 0027 adds only a typed immutable inquiry-review package", async () => {
  const migration = await read("drizzle/0027_inquiry_review_knowledge_outcome.sql");
  assert.match(migration, /CREATE TYPE "public"\."discovery_inquiry_review_outcome_kind"/);
  assert.match(migration, /CREATE TABLE "discovery_inquiry_reviews"/);
  assert.match(migration, /CREATE TABLE "discovery_inquiry_review_sources"/);
  assert.match(migration, /CREATE TABLE "discovery_inquiry_review_outcomes"/);
  assert.match(migration, /discovery_inquiry_reviews_session_context_fk/);
  assert.match(migration, /discovery_inquiry_review_sources_observation_context_fk/);
  assert.match(migration, /discovery_inquiry_review_outcomes_process_context_fk/);
  assert.doesNotMatch(
    migration,
    /(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE) "?(?:processes|process_families|discovery_proposals|operating_model_changes)"?/i,
  );
  assert.doesNotMatch(migration, /ALTER TABLE "(?:processes|process_families|discovery_sessions)"/i);
});

test("review identity, exact sources, package completeness, and history are protected in storage", async () => {
  const migration = await read("drizzle/0027_inquiry_review_knowledge_outcome.sql");
  assert.match(migration, /discovery_inquiry_reviews_stable_key_unique/);
  assert.match(migration, /discovery_inquiry_reviews_session_sequence_unique/);
  assert.match(migration, /discovery_inquiry_reviews_supersedes_fk/);
  assert.match(migration, /first discovery inquiry review requires the current review-ready evidence/);
  assert.match(migration, /superseding discovery inquiry review must follow the latest frozen review/);
  assert.match(migration, /discovery inquiry reviews are append-only/);
  assert.match(migration, /review sources and outcomes are append-only/);
  assert.match(migration, /DEFERRABLE INITIALLY DEFERRED/);
  assert.match(migration, /must preserve the exact active evidence set/);
  assert.match(migration, /requires at least one human outcome/);
  assert.match(migration, /outcomes_target_shape_check/);
  assert.match(migration, /outcomes_required_explanation_check/);
});

test("finishing inquiry review reauthorizes and commits the complete package atomically", async () => {
  const [administration, actions] = await Promise.all([
    read("lib/discovery-inquiry-review-administration.ts"),
    read("app/studio/discovery/actions.ts"),
  ]);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveDiscoveryConfiguration/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.match(administration, /configuration\.organizationId/g);
  assert.match(administration, /configuration\.actorIdentifier/g);
  assert.match(administration, /insert into discovery_inquiry_reviews/);
  assert.match(administration, /insert into discovery_inquiry_review_sources/);
  assert.match(administration, /insert into discovery_inquiry_review_outcomes/);
  assert.match(administration, /status = 'closed'::discovery_session_status/);
  assert.match(administration, /for update of session/);
  assert.match(administration, /not exists \(select 1 from latest_review\)/);
  assert.match(administration, /process\.status in \('draft', 'active'\)/);
  assert.doesNotMatch(
    administration,
    /(?:insert into|update|delete from) (?:processes|process_families|discovery_proposals|operating_model_changes)/i,
  );
  const reviewAction = actions.slice(
    actions.indexOf("export async function finishDiscoveryInquiryReviewAction"),
    actions.indexOf("export async function startDiscoverySessionAction"),
  );
  assert.doesNotMatch(reviewAction, /organizationId|actorIdentifier|databaseUrl/);
});

test("review and outcome reads are tenant-scoped and authorize before database modules load", async () => {
  const [data, reviewPage, outcomePage] = await Promise.all([
    read("lib/discovery-data.ts"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/review/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/outcomes/[reviewId]/page.tsx"),
  ]);
  assert.match(data, /loadDiscoveryInquiryReview/);
  assert.match(data, /eq\(discoveryInquiryReview\.organizationId, organizationId\)/);
  assert.match(data, /eq\(discoveryInquiryReviewSource\.organizationId, organizationId\)/);
  assert.match(data, /eq\(discoveryInquiryReviewOutcome\.organizationId, organizationId\)/);
  for (const page of [reviewPage, outcomePage]) {
    assert.ok(
      page.indexOf("await loadWorkspaceExperience()")
        < page.indexOf('import("@/lib/discovery-data")'),
    );
    assert.match(page, /if \(!experience\.discovery\.enabled\) notFound\(\)/);
  }
});

test("Slice C UX uses conversational language and never forces a change", async () => {
  const [form, model, reviewPage, outcomePage, interviewPage] = await Promise.all([
    read("app/studio/discovery/discovery-inquiry-review-form.tsx"),
    read("lib/discovery-inquiry-review-model.mjs"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/review/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/outcomes/[reviewId]/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
  ]);
  assert.match(reviewPage, /You do\s+not need to classify every answer again/);
  assert.match(reviewPage, /no change is a valid result/);
  assert.match(model, /Connect this understanding to an existing Process/);
  assert.match(form, /Finish review/);
  assert.match(form, /does not create,\s+propose, approve, or change a Process/);
  assert.match(outcomePage, /What you learned/);
  assert.match(outcomePage, /No Process was\s+created, proposed, approved, or changed/);
  assert.match(outcomePage, /not a\s+confidence, quality, or completion score/);
  assert.match(interviewPage, /Review what you learned/);
  for (const content of [form, reviewPage, outcomePage]) {
    assert.doesNotMatch(content, /canonical|\bepistemic\b|unbound evidence/i);
  }
});

test("inquiry outcome categories and evidence counts are deterministic without a score", () => {
  assert.equal(DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS.length, 5);
  assert.equal(
    DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS.possible_new_process
      .requiresExplanation,
    true,
  );
  const counts = buildInquiryKnowledgeOutcomeCounts([
    { epistemicState: "known" },
    { epistemicState: "known" },
    { epistemicState: "needs_validation" },
    { epistemicState: "unknown" },
  ]);
  assert.deepEqual(counts, {
    reviewed: 4,
    states: {
      assumed: 0,
      conflicting_observation: 0,
      known: 2,
      needs_validation: 1,
      unknown: 1,
    },
  });
  assert.equal("score" in counts, false);
});

test("the LAD-060 privilege delta is insert-only and runtime remains read-only", async () => {
  const documentation = await read("docs/GUIDED_INTERVIEW_FOUNDATION.md");
  const delta = documentation.slice(
    documentation.indexOf("LAD-060 Inquiry Review"),
    documentation.indexOf("```", documentation.indexOf("LAD-060 Inquiry Review")),
  );
  assert.match(delta, /GRANT SELECT ON TABLE discovery_inquiry_reviews/);
  assert.match(delta, /GRANT INSERT \([\s\S]+ON discovery_inquiry_reviews/);
  assert.match(delta, /GRANT INSERT \([\s\S]+ON discovery_inquiry_review_sources/);
  assert.match(delta, /GRANT INSERT \([\s\S]+ON discovery_inquiry_review_outcomes/);
  assert.match(delta, /discovery_inquiry_review_outcomes_id_seq/);
  assert.doesNotMatch(delta, /GRANT (?:UPDATE|DELETE|TRUNCATE).*discovery_inquiry_review/);
  assert.match(documentation, /runtime role receives\s+`SELECT` only on the three inquiry-review tables/);
  assert.match(documentation, /no new\s+Process, Process Family, proposal, version, history, or operating-model write/);
});

test("all migration 0027 identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read("drizzle/0027_inquiry_review_knowledge_outcome.sql");
  const identifiers = [
    ...migration.matchAll(
      /(?:CONSTRAINT|INDEX|TRIGGER|FUNCTION|TYPE|TABLE)\s+(?:"public"\.)?"?([a-z0-9_]+)"?/gi,
    ),
  ].map((match) => match[1]);
  for (const identifier of identifiers) {
    assert.ok(
      Buffer.byteLength(identifier, "utf8") <= 63,
      `${identifier} exceeds PostgreSQL's identifier limit`,
    );
  }
});
