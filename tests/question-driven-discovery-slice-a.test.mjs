import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { findPossibleDiscoveryPlaces } from "../lib/discovery-inquiry-matching.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("LAD-056 is accepted only for bounded Question-Driven Discovery Slice A", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const decision = decisions.slice(decisions.indexOf("### LAD-056"));
  assert.match(decision, /Accepted — implementation authorized for Question-Driven Discovery/);
  assert.match(decision, /An inquiry is a statement\s+of what someone wants to understand/);
  assert.match(decision, /Merely viewing candidates or opening documentation writes\s+nothing/);
  assert.match(decision, /Route mutations remain disabled until Slice B/);
  assert.match(decision, /first\s+real inquiry remain separately controlled release actions/);
});

test("migration 0024 adds inquiry and future route identity without weakening Process-bound sessions", async () => {
  const migration = await read("drizzle/0024_question_driven_discovery_slice_a.sql");
  assert.match(migration, /CREATE TYPE "public"\."discovery_inquiry_status"/);
  assert.match(migration, /CREATE TYPE "public"\."discovery_inquiry_route_kind"/);
  assert.match(migration, /CREATE TABLE "discovery_inquiries"/);
  assert.match(migration, /CREATE TABLE "discovery_inquiry_routes"/);
  assert.match(migration, /discovery_inquiries_identity_context_unique/);
  assert.match(migration, /discovery_inquiry_routes_inquiry_context_fk/);
  assert.match(migration, /discovery_inquiry_routes_process_context_fk/);
  assert.match(migration, /discovery_inquiry_routes_family_context_fk/);
  assert.match(migration, /discovery_inquiry_routes_session_context_fk/);
  assert.match(migration, /discovery_inquiry_routes_target_shape_check/);
  assert.match(migration, /discovery inquiries preserve organizational questions/);
  assert.match(migration, /discovery inquiry routes are append-only/);
  assert.doesNotMatch(migration, /ALTER TABLE "discovery_sessions"/);
  assert.doesNotMatch(migration, /INSERT INTO|UPDATE "|DELETE FROM|TRUNCATE/i);

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

test("inquiry creation derives private tenant and actor scope without exposing the question", async () => {
  const [administration, actions] = await Promise.all([
    read("lib/discovery-administration.ts"),
    read("app/studio/discovery/actions.ts"),
  ]);
  const inquiryAdministration = administration.slice(
    administration.indexOf("export async function createDiscoveryInquiry"),
    administration.indexOf("export async function createDiscoverySession"),
  );
  const inquiryAction = actions.slice(
    actions.indexOf("export async function createDiscoveryInquiryAction"),
    actions.indexOf("export async function startDiscoverySessionAction"),
  );
  assert.match(inquiryAdministration, /export async function createDiscoveryInquiry/);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveDiscoveryConfiguration/);
  assert.match(inquiryAdministration, /configuration\.organizationId/);
  assert.match(inquiryAdministration, /configuration\.actorIdentifier/);
  assert.match(inquiryAdministration, /insert into discovery_inquiries/);
  assert.match(inquiryAdministration, /returning stable_key::text as inquiry_id/);
  assert.doesNotMatch(inquiryAdministration, /insert into discovery_inquiry_routes/);
  assert.doesNotMatch(inquiryAdministration, /insert into discovery_sessions/);
  assert.doesNotMatch(inquiryAdministration, /questionText.*console\.error/s);
  assert.match(inquiryAction, /redirect\(`\/studio\/discovery\/inquiries\/\$\{result\.inquiryId\}`\)/);
  assert.doesNotMatch(inquiryAction, /inquiries\/.*questionText|URLSearchParams/);
  assert.doesNotMatch(inquiryAction, /organizationId|actorIdentifier|databaseUrl/);
});

test("possible places use transparent deterministic text overlap and never select a route", () => {
  const candidates = [
    {
      description: "Broad grouping for receiving and recording gifts.",
      href: "/studio/process-families/family-1",
      key: "family-1",
      kind: "process_family",
      name: "Gift Processing",
    },
    {
      description: "The physical-check path for annual giving.",
      href: "/studio/processes/process%3A1",
      key: "process:1",
      kind: "process",
      name: "Annual Fund Physical-Check Gift Processing",
    },
    {
      description: "A separate employee onboarding workflow.",
      href: "/studio/processes/process%3A2",
      key: "process:2",
      kind: "process",
      name: "Employee Onboarding",
    },
  ];
  const matches = findPossibleDiscoveryPlaces("How do we process gifts?", candidates);
  assert.deepEqual(
    matches.map((item) => item.name),
    ["Annual Fund Physical-Check Gift Processing", "Gift Processing"],
  );
  assert.ok(matches.every((item) => item.explanation.includes("gift")));
  assert.deepEqual(
    findPossibleDiscoveryPlaces("How are parking decals issued?", candidates),
    [],
  );
  assert.ok(matches.every((item) => !("selected" in item) && !("confidence" in item)));
});

test("private inquiry reads remain organization-scoped and authorize before database modules load", async () => {
  const [data, catalogPage, detailPage] = await Promise.all([
    read("lib/discovery-data.ts"),
    read("app/studio/discovery/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/page.tsx"),
  ]);
  assert.match(data, /loadDiscoveryInquiries/);
  assert.match(data, /loadDiscoveryInquiry/);
  assert.match(data, /eq\(discoveryInquiry\.organizationId, organizationId\)/g);
  assert.match(data, /eq\(discoveryInquiry\.stableKey, stableKey\)/);
  assert.ok(
    catalogPage.indexOf("await loadWorkspaceExperience") <
      catalogPage.indexOf('await import("@/lib/discovery-data")'),
  );
  assert.ok(
    detailPage.indexOf("await loadWorkspaceExperience") <
      detailPage.indexOf('import("@/lib/discovery-data")'),
  );
  assert.match(catalogPage, /if \(!experience\.discovery\.enabled\) notFound\(\)/);
  assert.match(detailPage, /if \(!experience\.discovery\.enabled\) notFound\(\)/);
  assert.match(detailPage, /if \(!inquiry\) notFound\(\)/);
});

test("Slice A UX starts with ordinary language and explicitly defers routing", async () => {
  const [catalogPage, detailPage, form] = await Promise.all([
    read("app/studio/discovery/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/page.tsx"),
    read("app/studio/discovery/discovery-inquiry-form.tsx"),
  ]);
  assert.match(catalogPage, /Start with a question/);
  assert.match(catalogPage, /You do not need to know the right Process first/);
  assert.match(form, /What are you trying to understand\?/);
  assert.match(form, /Explore this question/);
  assert.match(form, /does not create an interview, change documentation, or decide the answer/);
  assert.match(detailPage, /Possible places to look/);
  assert.match(detailPage, /does not use AI, semantic confidence, or automatic selection/);
  assert.match(detailPage, /Human routing is not enabled yet/);
  assert.match(detailPage, /does not route the inquiry, create evidence, start an interview, or change a documented Process/);
});

test("Slice A grants only inquiry creation and read privileges", async () => {
  const documentation = await read("docs/GUIDED_INTERVIEW_FOUNDATION.md");
  const delta = documentation.slice(
    documentation.indexOf("Question-Driven Discovery v0.1, Slice A"),
  );
  assert.match(delta, /GRANT SELECT ON TABLE discovery_inquiries/);
  assert.match(delta, /GRANT INSERT \([\s\S]+organization_id, question_text, actor_identifier/);
  assert.match(delta, /GRANT USAGE ON SEQUENCE discovery_inquiries_id_seq/);
  assert.match(delta, /runtime role receives\n`SELECT` on `discovery_inquiries` only/);
  assert.match(delta, /route table is present as durable\nforward schema but receives no application write privilege/);
  assert.doesNotMatch(delta, /GRANT (?:INSERT|UPDATE|DELETE).*discovery_inquiry_routes/);
});
