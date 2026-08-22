import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createMockClarityDraft,
  createMockQuestionSuggestions,
  fingerprintAssistanceValue,
  validateMockSuggestions,
} from "../lib/discovery-assistance-model.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const processPacket = {
  currentQuestion: "Which Systems are used?",
  participantFocus: "the library handoff",
  promptKey: "systems",
  sessionKind: "process",
  sources: [
    {
      kind: "process_snapshot",
      sequence: 1,
      snapshot: { name: "Printing", purpose: "Provide printing" },
    },
    {
      kind: "process_observation",
      sequence: 2,
      snapshot: {
        epistemicState: "needs_validation",
        responseText: "A physical card may still be required.",
      },
    },
  ],
  topic: "systems",
};

test("LAD-063 authorizes only attributable mocked assistance", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const start = decisions.indexOf("### LAD-063");
  assert.notEqual(start, -1);
  const end = decisions.indexOf("### LAD-062", start);
  const decision = decisions.slice(start, end > start ? end : undefined);
  assert.match(decision, /only provider in this slice is a deterministic server-only mock/);
  assert.match(decision, /suggestion alone never advances an interview or becomes\s+evidence/);
  assert.match(decision, /use, edit, skip, or reject/);
  assert.match(decision, /no external model request, provider SDK, secret/);
  assert.match(decision, /conflicts with or supersedes no accepted\s+decision/);
});

test("the mocked adapter produces at most three contextual suggestions deterministically", () => {
  const suggestions = createMockQuestionSuggestions(processPacket);
  assert.equal(suggestions.length, 3);
  assert.ok(validateMockSuggestions(suggestions));
  assert.deepEqual(createMockQuestionSuggestions(processPacket), suggestions);
  assert.match(suggestions[0].suggestedText, /library handoff/);
  assert.match(suggestions[0].rationale, /uncertain or needs validation/);
  assert.equal(
    fingerprintAssistanceValue({ b: 2, a: 1 }),
    fingerprintAssistanceValue({ a: 1, b: 2 }),
  );
});

test("clarity help keeps original, draft, and final human choice separate", () => {
  const draft = createMockClarityDraft(
    processPacket,
    "  library printing   still needs a card. ",
  );
  assert.equal(draft.kind, "clarity_draft");
  assert.equal(draft.originalText, "library printing   still needs a card.");
  assert.equal(draft.suggestedText, "Library printing still needs a card.");
  assert.notEqual(draft.originalText, draft.suggestedText);
  assert.ok(validateMockSuggestions([draft]));
  assert.equal(
    validateMockSuggestions([{ ...draft, kind: "unsupported_kind" }]),
    false,
  );
});

test("migration 0029 creates typed append-only assistance history with exact context guards", async () => {
  const migration = await read("drizzle/0029_ai_assisted_discovery_slice_b.sql");
  for (const table of ["runs", "sources", "suggestions", "decisions"]) {
    assert.match(migration, new RegExp(`CREATE TABLE "discovery_assistance_${table}"`));
    assert.match(migration, new RegExp(`discovery_assistance_${table}_append_only`));
  }
  assert.match(migration, /discovery_assistance_runs_session_shape_check/);
  assert.match(migration, /discovery_assistance_runs_source_context_unique/);
  assert.match(migration, /requested_session_revision/);
  assert.match(migration, /"prompt_key" varchar\(64\) NOT NULL/);
  assert.match(migration, /validate_discovery_assistance_run_context/);
  assert.match(migration, /session_revision <> NEW\.requested_session_revision/);
  assert.match(migration, /session_prompt_key <> NEW\.prompt_key/);
  assert.match(migration, /source_prompt_key <> run_record\.prompt_key/);
  assert.match(migration, /source_created_at > run_record\.created_at/);
  assert.match(migration, /supersedes_observation_stable_key/);
  assert.match(migration, /assistance decision observation differs from the run session/);
  assert.match(migration, /observation_prompt_key <> run_record\.prompt_key/);
  assert.match(migration, /assistance decision does not match the preserved human evidence/);
  assert.match(migration, /assistance decision disposition differs from the selected text/);
  assert.doesNotMatch(
    migration,
    /(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE) "?(?:processes|process_steps|systems|exceptions|operating_model_changes)"?/i,
  );
});

test("assistance requests persist bounded sources and suggestions without creating evidence", async () => {
  const [administration, provider] = await Promise.all([
    read("lib/discovery-assistance-administration.ts"),
    read("lib/discovery-assistance-provider.ts"),
  ]);
  const processStart = administration.indexOf("async function persistProcessRun");
  const inquiryStart = administration.indexOf("async function persistInquiryRun");
  const requestStart = administration.indexOf("export async function requestProcessDiscoveryAssistance");
  const processOperation = administration.slice(processStart, inquiryStart);
  const inquiryOperation = administration.slice(inquiryStart, requestStart);
  for (const operation of [processOperation, inquiryOperation]) {
    assert.match(operation, /revision = \$[45]::integer/);
    assert.match(operation, /status = 'in_progress'/);
    assert.match(operation, /current_question_key = \$[56]::varchar\(64\)/);
    assert.match(operation, /insert into discovery_assistance_runs/);
    assert.match(operation, /insert into discovery_assistance_sources/);
    assert.match(operation, /insert into discovery_assistance_suggestions/);
    assert.doesNotMatch(operation, /insert into discovery_(?:inquiry_)?observations/);
    assert.doesNotMatch(operation, /update discovery_(?:inquiry_)?sessions/);
  }
  assert.match(administration, /discoveryAssistanceProvider\.suggestQuestions/);
  assert.match(administration, /discoveryAssistanceProvider\.draftClarity/);
  assert.match(provider, /export type DiscoveryAssistanceProvider/);
  assert.match(provider, /strictlyValidated/);
  assert.match(provider, /key: "mocked_provider"/);
  assert.doesNotMatch(administration, /openai|anthropic|gemini/i);
  const logger = administration.slice(
    administration.indexOf("function logFailure"),
    administration.indexOf("async function assistanceWriteContext"),
  );
  assert.match(logger, /code:[\s\S]*constraint:[\s\S]*operation/);
  assert.doesNotMatch(logger, /responseText|promptText|participantFocus/);
});

test("using assistance atomically saves human evidence and attribution while dismissing does not advance", async () => {
  const administration = await read("lib/discovery-assistance-administration.ts");
  for (const [startName, endName] of [
    ["export async function decideProcessDiscoverySuggestion", "export async function decideInquiryDiscoverySuggestion"],
    ["export async function decideInquiryDiscoverySuggestion", "export async function dismissDiscoverySuggestion"],
  ]) {
    const start = administration.indexOf(startName);
    const end = administration.indexOf(endName, start + 1);
    const operation = administration.slice(start, end);
    assert.match(operation, /insert into discovery_(?:inquiry_)?observations/);
    assert.match(operation, /insert into discovery_assistance_decisions/);
    assert.match(operation, /inserted_other_decisions/);
    assert.match(operation, /other\.stable_key <> selected\.stable_key/);
    assert.match(operation, /revision = revision \+ 1/);
    assert.match(operation, /exists \(select 1 from inserted_decision\)/);
    assert.doesNotMatch(operation, /(?:insert into|update|delete from) (?:processes|process_steps|systems|exceptions|operating_model_changes)/i);
  }
  const dismissStart = administration.indexOf("export async function dismissDiscoverySuggestion");
  const dismiss = administration.slice(dismissStart);
  assert.match(dismiss, /insert into discovery_assistance_decisions/);
  assert.doesNotMatch(dismiss, /update discovery_(?:inquiry_)?sessions/);
  assert.doesNotMatch(dismiss, /insert into discovery_(?:inquiry_)?observations/);
});

test("Slice B UX is optional, human-reviewed, and keeps the standard interview path", async () => {
  const [processPage, inquiryPage, requestForm, suggestionForm] = await Promise.all([
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
    read("app/studio/discovery/discovery-assistance-request-form.tsx"),
    read("app/studio/discovery/discovery-assistance-suggestion-form.tsx"),
  ]);
  for (const page of [processPage, inquiryPage]) {
    assert.match(page, /Optional assistance/);
    assert.match(page, /deterministic mocked provider/);
    assert.match(page, /DiscoveryAssistanceRequestForm/);
    assert.match(page, /DiscoveryAssistanceSuggestionForm/);
    assert.match(page, /await import\("@\/lib\/discovery-assistance-data"\)/);
    assert.doesNotMatch(page, /^import .*discovery-assistance-data/m);
  }
  assert.match(processPage, /<DiscoveryAnswerForm/);
  assert.match(inquiryPage, /<DiscoveryInquiryAnswerForm/);
  assert.match(requestForm, /Suggest a better question/);
  assert.match(requestForm, /Help make this clearer/);
  assert.match(suggestionForm, /Suggested by Lotura/);
  assert.match(suggestionForm, /What you wrote/);
  assert.match(suggestionForm, /Clearer draft — edit before preserving/);
  assert.match(suggestionForm, /Skip this suggestion/);
  assert.match(suggestionForm, /Keep my original wording/);
  assert.match(suggestionForm, /suggestion is not evidence/);
});

test("Slice B privilege documentation is insert-only and runtime stays read-only", async () => {
  const documentation = await read("docs/GUIDED_INTERVIEW_FOUNDATION.md");
  const start = documentation.indexOf("LAD-063 AI-Assisted Discovery Slice B");
  const end = documentation.indexOf("-- Added only when", start + 10);
  const delta = documentation.slice(start, end > start ? end : undefined);
  for (const table of ["runs", "sources", "suggestions", "decisions"]) {
    assert.match(delta, new RegExp(`discovery_assistance_${table}`));
  }
  assert.doesNotMatch(delta, /GRANT (?:UPDATE|DELETE|TRUNCATE)/);
  assert.match(documentation, /runtime role receives `SELECT`\s+only on the four assistance tables/);
});

test("all migration 0029 identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read("drizzle/0029_ai_assisted_discovery_slice_b.sql");
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
