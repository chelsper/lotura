import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildDocumentedQuestionContext,
  buildInquiryKnownContext,
} from "../lib/discovery-known-context.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("LAD-061 authorizes deterministic Slice A without authorizing a provider", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const start = decisions.indexOf("### LAD-061");
  assert.notEqual(start, -1);
  const decision = decisions.slice(start);
  assert.match(
    decision,
    /Accepted — generic Slice A implementation complete and isolated/,
  );
  assert.match(decision, /explicitly\s+confirm that an exact prior observation remains accurate/);
  assert.match(decision, /never carries evidence forward silently/);
  assert.match(decision, /does not authorize a provider, model, package, credential/);
  assert.match(decision, /fixed catalogs remain the\s+deterministic fallback/);
});

test("migration 0028 adds one append-only confirmation link and no operating-model mutation", async () => {
  const migration = await read(
    "drizzle/0028_ai_assisted_discovery_slice_a.sql",
  );
  assert.match(migration, /CREATE TABLE "discovery_observation_confirmations"/);
  assert.match(migration, /discovery_confirmation_current_session_fk/);
  assert.match(migration, /discovery_confirmation_source_session_fk/);
  assert.match(migration, /discovery_confirmation_current_observation_fk/);
  assert.match(migration, /discovery_confirmation_source_observation_fk/);
  assert.match(migration, /discovery_observations_prompt_context_unique/);
  assert.match(
    migration,
    /source_observation_stable_key","source_session_id","organization_id","prompt_key/,
  );
  assert.ok(
    migration.indexOf("discovery_observations_prompt_context_unique")
      < migration.indexOf("discovery_confirmation_current_observation_fk"),
    "the referenced prompt-context key must exist before the confirmation foreign keys",
  );
  assert.match(migration, /confirmation_sessions_distinct_check/);
  assert.match(migration, /observation confirmations are append-only/);
  assert.doesNotMatch(
    migration,
    /(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE) "?(?:processes|process_steps|systems|exceptions|operating_model_changes)"?/i,
  );
});

test("confirming a prior answer reauthorizes and writes observation, provenance, and session advance atomically", async () => {
  const [administration, actions] = await Promise.all([
    read("lib/discovery-administration.ts"),
    read("app/studio/discovery/actions.ts"),
  ]);
  const start = administration.indexOf(
    "export async function confirmPriorDiscoveryObservation",
  );
  const end = administration.indexOf(
    "export async function setDiscoverySessionPaused",
    start,
  );
  const operation = administration.slice(start, end);
  assert.match(operation, /await discoveryWriteContext\(\)/);
  assert.match(operation, /actor_identifier = \$3/);
  assert.match(operation, /revision = \$4/);
  assert.match(operation, /source_session\.id < current_session\.id/);
  assert.match(operation, /current_session\.process_id = source_session\.process_id/);
  assert.match(operation, /current_session\.process_stable_key = source_session\.process_stable_key/);
  assert.match(operation, /not exists \([\s\S]+supersedes_observation_stable_key/);
  assert.match(operation, /insert into discovery_observations/);
  assert.match(operation, /insert into discovery_observation_confirmations/);
  assert.match(operation, /exists \(select 1 from inserted_confirmation\)/);
  assert.match(operation, /revision = revision \+ 1/);
  assert.doesNotMatch(
    operation,
    /(?:insert into|update|delete from) (?:processes|process_steps|systems|exceptions|operating_model_changes)/i,
  );
  assert.match(actions, /confirmPriorDiscoveryObservationAction/);
  assert.doesNotMatch(
    actions.slice(
      actions.indexOf("confirmPriorDiscoveryObservationAction"),
      actions.indexOf("correctDiscoveryObservationAction"),
    ),
    /organizationId|actorIdentifier|databaseUrl/,
  );
});

test("known-context reads stay Organization and Process scoped and exclude superseded evidence", async () => {
  const data = await read("lib/discovery-data.ts");
  const start = data.indexOf("export async function loadDiscoverySession");
  const end = data.indexOf("export async function loadDiscoveryProposal", start);
  const loader = data.slice(start, end);
  assert.match(loader, /eq\(discoveryObservation\.organizationId, organizationId\)/);
  assert.match(loader, /eq\(sourceSession\.processId, session\.internalProcessId\)/);
  assert.match(loader, /eq\(sourceSession\.processStableKey, session\.processStableKey\)/);
  assert.match(loader, /lt\(sourceSession\.id, session\.internalSessionId\)/);
  assert.match(loader, /notExists/);
  assert.match(loader, /supersedingObservation\.supersedesObservationStableKey/);
  assert.match(loader, /\.limit\(3\)/);
});

test("documented context describes only recorded structure and labels boundary inference limits", () => {
  const process = {
    downstream: [{ processName: "Reconciliation" }],
    exceptions: [{ condition: "The amount is unclear", name: "Research" }],
    ownerRole: { name: "Gift Processing" },
    purpose: "Record gifts accurately.",
    steps: [
      { position: 2, responsibleRole: { name: "Gift Processing" }, title: "Post gift" },
      { position: 1, responsibleRole: { name: "Gift Intake" }, title: "Receive gift" },
    ],
    systems: [{ name: "Advancement CRM", usage: "Records the gift" }],
    upstream: [],
  };
  assert.deepEqual(buildDocumentedQuestionContext(process, "purpose"), {
    heading: "Current documented purpose",
    lines: ["Record gifts accurately."],
  });
  assert.match(
    buildDocumentedQuestionContext(process, "boundary_start").lines[0],
    /not a separately approved start boundary/,
  );
  assert.deepEqual(
    buildDocumentedQuestionContext(process, "sequence").lines,
    ["1. Receive gift", "2. Post gift"],
  );
  assert.equal(
    buildDocumentedQuestionContext(process, "unresolved_questions"),
    null,
  );
});

test("inquiry context stays inquiry-scoped and excludes superseded or current-topic answers", () => {
  const context = buildInquiryKnownContext({
    currentPromptKey: "systems",
    observations: [
      {
        epistemicState: "known",
        id: "old",
        promptKey: "purpose",
        promptText: "Old purpose",
        responseText: "Old",
        supersedesObservationId: null,
      },
      {
        epistemicState: "known",
        id: "new",
        promptKey: "purpose",
        promptText: "Purpose",
        responseText: "Current",
        supersedesObservationId: "old",
      },
      {
        epistemicState: "known",
        id: "current-topic",
        promptKey: "systems",
        promptText: "Systems",
        responseText: "Do not pre-answer",
        supersedesObservationId: null,
      },
    ],
    questionText: "How does this work?",
    scopeStatement: "Explore the situation",
  });
  assert.equal(context.questionText, "How does this work?");
  assert.deepEqual(context.savedAnswers.map((answer) => answer.id), ["new"]);
});

test("Slice A UX makes reuse optional and preserves the manual answer path", async () => {
  const [processPage, inquiryPage, form] = await Promise.all([
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read(
      "app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx",
    ),
    read("app/studio/discovery/discovery-prior-observation-form.tsx"),
  ]);
  assert.match(processPage, /What Lotura already knows/);
  assert.match(processPage, /Something changed/);
  assert.match(processPage, /<DiscoveryAnswerForm/);
  assert.match(form, /Still accurate/);
  assert.match(processPage, /Confirmed from an earlier interview/);
  assert.match(inquiryPage, /Lotura is not assuming that it belongs to an existing Process/);
  assert.doesNotMatch(inquiryPage, /DiscoveryPriorObservationForm/);
});

test("Slice A privileges are insert-only and runtime remains read-only", async () => {
  const documentation = await read("docs/GUIDED_INTERVIEW_FOUNDATION.md");
  const start = documentation.indexOf("LAD-061 AI-Assisted Discovery Slice A");
  const end = documentation.indexOf("-- Added only when", start + 10);
  const delta = documentation.slice(start, end > start ? end : undefined);
  assert.match(delta, /GRANT SELECT ON TABLE discovery_observation_confirmations/);
  assert.match(delta, /GRANT INSERT \([\s\S]+ON discovery_observation_confirmations/);
  assert.match(delta, /discovery_observation_confirmations_id_seq/);
  assert.doesNotMatch(delta, /GRANT (?:UPDATE|DELETE|TRUNCATE)/);
  assert.match(documentation, /runtime role receives `SELECT`\s+only on `discovery_observation_confirmations`/);
});

test("all migration 0028 identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read(
    "drizzle/0028_ai_assisted_discovery_slice_a.sql",
  );
  const identifiers = [
    ...migration.matchAll(
      /(?:CONSTRAINT|INDEX|TRIGGER|FUNCTION|TABLE)\s+"?([a-z0-9_]+)"?/gi,
    ),
  ].map((match) => match[1]);
  for (const identifier of identifiers) {
    assert.ok(
      Buffer.byteLength(identifier, "utf8") <= 63,
      `${identifier} exceeds PostgreSQL's identifier limit`,
    );
  }
});
