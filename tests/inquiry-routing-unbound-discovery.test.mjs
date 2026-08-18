import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DISCOVERY_INQUIRY_FIRST_QUESTION_KEY,
  DISCOVERY_INQUIRY_QUESTIONS,
  DISCOVERY_INQUIRY_REVIEW_KEY,
  getDiscoveryInquiryQuestion,
  getNextDiscoveryInquiryQuestionKey,
} from "../lib/discovery-inquiry-questions.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("LAD-057 accepts a separate inquiry-scoped evidence path without placeholder Processes", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const decision = decisions.slice(decisions.indexOf("### LAD-057"));
  assert.match(
    decision,
    /Accepted — generic implementation complete and isolated fictional\s+verification passed for Inquiry Routing & Unbound Discovery v0\.1/,
  );
  assert.match(decision, /Explore before choosing a Process/);
  assert.match(decision, /DiscoveryInquirySession/);
  assert.match(decision, /DiscoveryInquiryObservation/);
  assert.match(decision, /does not create, select, or imply a Process or Process\s+Family/);
  assert.match(decision, /existing `DiscoverySession\.process_id`[\s\S]+remain unchanged and non-null/);
  assert.match(decision, /does not authorize creating or mutating a Process/);
});

test("migration 0025 adds typed inquiry evidence and forward-only routing without rewriting existing sessions", async () => {
  const migration = await read("drizzle/0025_inquiry_routing_unbound_discovery.sql");
  assert.match(migration, /ALTER TYPE "public"\."discovery_inquiry_route_kind" ADD VALUE 'start_inquiry_exploration'/);
  assert.match(migration, /CREATE TABLE "discovery_inquiry_sessions"/);
  assert.match(migration, /CREATE TABLE "discovery_inquiry_observations"/);
  assert.match(migration, /discovery_inquiry_sessions_inquiry_context_fk/);
  assert.match(migration, /discovery_inquiry_routes_inquiry_session_fk/);
  assert.match(migration, /discovery_inquiry_observations_session_context_fk/);
  assert.match(migration, /discovery_inquiry_observations_supersedes_fk/);
  assert.match(migration, /start_inquiry_exploration/);
  assert.match(migration, /discovery inquiry session identity and source context are immutable/);
  assert.match(migration, /discovery inquiry observations are append-only/);
  assert.doesNotMatch(migration, /ALTER TABLE "discovery_sessions"/);
  assert.doesNotMatch(migration, /ALTER TABLE "discovery_observations"/);
  assert.doesNotMatch(migration, /INSERT INTO "?processes|UPDATE "?processes|DELETE FROM "?processes/i);

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

test("question-first prompts avoid assuming one Process and preserve honest uncertainty", () => {
  assert.equal(DISCOVERY_INQUIRY_FIRST_QUESTION_KEY, "work_to_understand");
  assert.equal(DISCOVERY_INQUIRY_QUESTIONS.length, 9);
  assert.equal(getDiscoveryInquiryQuestion("systems")?.topic, "systems");
  assert.equal(
    getNextDiscoveryInquiryQuestionKey(
      DISCOVERY_INQUIRY_QUESTIONS.at(-1).key,
    ),
    DISCOVERY_INQUIRY_REVIEW_KEY,
  );
  assert.equal(getDiscoveryInquiryQuestion("untrusted-question"), null);
  assert.match(
    DISCOVERY_INQUIRY_QUESTIONS[0].helper,
    /do not need to decide whether it is a separate Process/,
  );
  assert.match(
    DISCOVERY_INQUIRY_QUESTIONS.at(-1).helper,
    /Unknown is an acceptable answer/,
  );
});

test("inquiry routing and evidence writes derive tenant and actor inside serializable server boundaries", async () => {
  const administration = await read("lib/discovery-inquiry-administration.ts");
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveDiscoveryConfiguration/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
  assert.match(administration, /insert into discovery_inquiry_routes/);
  assert.match(administration, /insert into discovery_inquiry_sessions/);
  assert.match(administration, /insert into discovery_inquiry_observations/);
  assert.match(administration, /for update/);
  assert.match(administration, /revision = \$3::integer/);
  assert.match(administration, /supersedes_observation_stable_key/);
  assert.doesNotMatch(administration, /insert into operating_model_changes/i);
  assert.doesNotMatch(administration, /(?:insert into|update|delete from) (?:process_steps|roles|systems|exceptions|process_dependencies)/i);
  assert.doesNotMatch(administration, /DATABASE_URL(?:_UNPOOLED)?/);
});

test("routing creates the selected session and route atomically without leaking question or answer text", async () => {
  const administration = await read("lib/discovery-inquiry-administration.ts");
  const start = administration.slice(
    administration.indexOf("export async function startInquiryDiscoverySession"),
    administration.indexOf("export async function startProcessDiscoverySessionFromInquiry"),
  );
  assert.match(start, /with selected_inquiry as materialized/);
  assert.match(start, /inserted_session as/);
  assert.match(start, /inserted_route as/);
  assert.match(start, /advanced as/);
  assert.match(start, /exists \(select 1 from inserted_route\)/);
  assert.match(start, /'start_inquiry_exploration'::discovery_inquiry_route_kind/);
  assert.doesNotMatch(start, /insert into processes/);
  assert.match(administration, /logInquiryDatabaseFailure/);
  const logger = administration.slice(
    administration.indexOf("function logInquiryDatabaseFailure"),
    administration.indexOf("async function inquiryWriteContext"),
  );
  assert.doesNotMatch(logger, /message: safeValue\(details\.message\)/);
  assert.doesNotMatch(logger, /questionText/);
  assert.doesNotMatch(logger, /responseText/);
});

test("private reads require exact inquiry and session tenant context", async () => {
  const [data, detailPage, interviewPage] = await Promise.all([
    read("lib/discovery-data.ts"),
    read("app/studio/discovery/inquiries/[inquiryId]/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
  ]);
  assert.match(data, /loadDiscoveryInquiryRoutes/);
  assert.match(data, /loadDiscoveryInquirySession/);
  assert.match(data, /eq\(discoveryInquiryRoute\.organizationId, organizationId\)/);
  assert.match(data, /eq\(discoveryInquiryRoute\.inquiryStableKey, inquiryStableKey\)/);
  assert.match(data, /eq\(discoveryInquirySession\.organizationId, organizationId\)/);
  assert.match(data, /eq\(discoveryInquiry\.stableKey, inquiryStableKey\)/);
  assert.match(data, /eq\(discoveryInquirySession\.stableKey, sessionStableKey\)/);
  assert.ok(
    detailPage.indexOf("await loadWorkspaceExperience")
      < detailPage.indexOf('import("@/lib/discovery-data")'),
  );
  assert.ok(
    interviewPage.indexOf("await loadWorkspaceExperience")
      < interviewPage.indexOf('import("@/lib/discovery-data")'),
  );
  assert.match(detailPage, /if \(!experience\.discovery\.enabled\) notFound\(\)/);
  assert.match(interviewPage, /if \(!experience\.discovery\.enabled\) notFound\(\)/);
});

test("Slice B UX uses conversational language and makes Process creation explicitly impossible", async () => {
  const [routing, interview] = await Promise.all([
    read("app/studio/discovery/discovery-inquiry-routing-controls.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
  ]);
  assert.match(routing, /Explore before choosing a Process/);
  assert.match(routing, /Look at an existing Process/);
  assert.match(routing, /Look at a Process Family/);
  assert.match(routing, /Wait for someone or something else/);
  assert.match(routing, /Finish for now/);
  assert.match(routing, /does\s+not create or change a documented Process/);
  assert.match(interview, /No Process was selected,\s+created, proposed, approved, or changed/);
  assert.doesNotMatch(routing, /canonical|epistemic|unbound evidence/i);
  assert.doesNotMatch(interview, /canonical|unbound evidence/i);
});

test("Slice B privilege contract grants only inquiry routing and evidence columns", async () => {
  const documentation = await read("docs/GUIDED_INTERVIEW_FOUNDATION.md");
  const delta = documentation.slice(
    documentation.indexOf("LAD-057 Inquiry Routing"),
    documentation.indexOf("```", documentation.indexOf("LAD-057 Inquiry Routing")),
  );
  assert.match(delta, /GRANT SELECT ON TABLE process_families, discovery_inquiry_routes/);
  assert.match(delta, /GRANT UPDATE \(status, revision, updated_at\)\s+ON discovery_inquiries/);
  assert.match(delta, /GRANT INSERT \([\s\S]+discovery_inquiry_session_id/);
  assert.match(delta, /ON discovery_inquiry_sessions TO/);
  assert.match(delta, /ON discovery_inquiry_observations TO/);
  assert.match(delta, /discovery_inquiry_observations_id_seq/);
  assert.doesNotMatch(delta, /GRANT (?:INSERT|UPDATE|DELETE).*\bprocesses\b/);
  assert.doesNotMatch(delta, /GRANT (?:UPDATE|DELETE).*discovery_inquiry_routes/);
  assert.doesNotMatch(delta, /GRANT (?:UPDATE|DELETE).*discovery_inquiry_observations/);
});
