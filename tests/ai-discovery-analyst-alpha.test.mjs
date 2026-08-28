import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createDiscoveryAnalystFallback,
  validateDiscoveryAnalystResult,
} from "../lib/discovery-analyst-model.mjs";
import {
  DISCOVERY_ANALYST_RESPONSES_ENDPOINT,
  buildDiscoveryAnalystRequest,
  executeOpenAIDiscoveryAnalyst,
} from "../lib/discovery-analyst-openai.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const fictionalCredential = "sk-fictional-discovery-analyst-credential-123456789";

const context = {
  latestSynthesis: null,
  observations: [
    {
      epistemicState: "needs_validation",
      id: "20000000-0000-4000-8000-000000000001",
      promptKey: "systems",
      promptText: "Which Systems support this work?",
      responseText: "A physical card may still be needed at the printer.",
      sequence: 1,
      topic: "systems",
    },
  ],
  process: {
    dependencies: [],
    exceptions: [],
    name: "Fictional Campus Printing",
    ownerRole: "Fictional Library Services",
    purpose: "Help fictional participants print documents.",
    status: "draft",
    steps: [],
    systems: [],
  },
  scopeStatement: "Understand the ordinary printing handoff.",
  session: {
    id: 41,
    processId: 12,
    processStableKey: "20000000-0000-4000-8000-000000000002",
    revision: 2,
    stableKey: "20000000-0000-4000-8000-000000000003",
  },
};

const result = {
  acknowledgement: "That uncertainty is useful to preserve.",
  clear: ["The Process supports campus printing."],
  conflicts: [],
  narrative: "Campus printing may depend on a physical card at the printer, but that dependency still needs validation.",
  needsValidation: ["Whether a physical card is still required."],
  nextQuestion: {
    promptKey: "systems",
    rationale: "The current evidence names a possible card dependency without explaining its function.",
    text: "What is the physical card used for at the printer?",
    topic: "systems",
  },
  openQuestions: ["What is the physical card used for?"],
  participantsNeeded: [],
  process: {
    alternatePaths: [],
    approvals: [],
    dependencies: [],
    endBoundary: null,
    exceptions: [],
    handoffs: [],
    ownerRole: "Fictional Library Services",
    participants: [],
    purpose: "Help fictional participants print documents.",
    steps: [],
    systems: ["A physical card may be used at the printer."],
    trigger: null,
  },
  suggestedEpistemicState: "needs_validation",
};

function response(payload) {
  const body = JSON.stringify(payload);
  return {
    headers: { get: () => String(body.length) },
    ok: true,
    async text() { return body; },
  };
}

test("the analyst validates one adaptive question and a noncanonical working synthesis", () => {
  assert.deepEqual(validateDiscoveryAnalystResult(result), result);
  assert.equal(
    validateDiscoveryAnalystResult({
      ...result,
      nextQuestion: { ...result.nextQuestion, topic: "boundary" },
    }),
    null,
  );
  const fallback = createDiscoveryAnalystFallback(context);
  assert.match(fallback.narrative, /Fictional Campus Printing/);
  assert.equal(fallback.nextQuestion.promptKey, "purpose");
  assert.equal(fallback.needsValidation.length, 1);
});

test("the analyst makes exactly one foreground tool-free stateless Responses request", async () => {
  let calls = 0;
  let captured;
  const providerPayload = {
    model: "gpt-5.6-terra",
    output: [
      { summary: [], type: "reasoning" },
      {
        content: [{ text: JSON.stringify(result), type: "output_text" }],
        role: "assistant",
        status: "completed",
        type: "message",
      },
    ],
    status: "completed",
    usage: {
      input_tokens: 500,
      input_tokens_details: { cached_tokens: 100 },
      output_tokens: 200,
      total_tokens: 700,
    },
  };
  const providerResult = await executeOpenAIDiscoveryAnalyst({
    apiKey: fictionalCredential,
    context,
    fetchImpl: async (url, init) => {
      calls += 1;
      captured = { init, url };
      return response(providerPayload);
    },
    providerProjectId: "proj_fictional_analyst",
    timeoutMs: 100,
  });
  assert.equal(calls, 1);
  assert.equal(captured.url, DISCOVERY_ANALYST_RESPONSES_ENDPOINT);
  const request = JSON.parse(captured.init.body);
  assert.equal(request.model, "gpt-5.6-terra");
  assert.equal(request.reasoning.effort, "medium");
  assert.equal(request.store, false);
  assert.equal(request.background, false);
  assert.equal(request.tool_choice, "none");
  assert.deepEqual(request.tools, []);
  assert.equal("conversation" in request, false);
  assert.equal("previous_response_id" in request, false);
  assert.equal(providerResult.ok, true);
  assert.deepEqual(providerResult.result, result);
  assert.equal(providerResult.providerMetadata.requestCount, 1);
});

test("prohibited context fails before a provider request", async () => {
  let calls = 0;
  const providerResult = await executeOpenAIDiscoveryAnalyst({
    apiKey: fictionalCredential,
    context: { ...context, scopeStatement: "password: fictional-secret" },
    fetchImpl: async () => {
      calls += 1;
      return response({});
    },
    providerProjectId: "proj_fictional_analyst",
  });
  assert.equal(calls, 0);
  assert.deepEqual(providerResult, {
    ok: false,
    reason: "prohibited_or_oversized_context",
  });
});

test("LAD-067 and migration 0031 preserve the existing evidence and authority boundaries", async () => {
  const [decisions, migration, administration, page, interview] = await Promise.all([
    read("ARCHITECTURE_DECISIONS.md"),
    read("drizzle/0031_ai_discovery_analyst_alpha.sql"),
    read("lib/discovery-analyst-administration.ts"),
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read("app/studio/discovery/discovery-analyst-interview.tsx"),
  ]);
  assert.match(decisions, /LAD-067 — AI Discovery Analyst Alpha/);
  assert.match(decisions, /model\s+questions and syntheses remain append-only assistance\s+artifacts/i);
  assert.match(migration, /analyst_enabled/);
  assert.match(migration, /analysis_snapshot/);
  assert.match(migration, /run_record\.analyst_turn/);
  assert.match(migration, /discovery analyst authorization is immutable/);
  assert.match(administration, /insert into discovery_observations/);
  assert.match(administration, /insert into discovery_assistance_runs/);
  assert.match(administration, /insert into discovery_assistance_sources/);
  assert.match(administration, /insert into discovery_assistance_suggestions/);
  assert.match(administration, /insert into discovery_assistance_decisions/);
  assert.doesNotMatch(
    administration,
    /(?:insert into|update|delete from) (?:processes|process_steps|systems|exceptions|operating_model_changes)/i,
  );
  assert.match(page, /DiscoveryAnalystStartForm/);
  assert.match(page, /DiscoveryAnalystInterview/);
  assert.match(interview, /What do you understand so far\?/);
  assert.match(interview, /Correct Lotura&apos;s interpretation/);
  assert.match(interview, /Finish interview/);
});

test("the request builder contains only the bounded interview context", () => {
  const request = buildDiscoveryAnalystRequest(context);
  const serialized = JSON.stringify(request);
  assert.match(serialized, /Fictional Campus Printing/);
  assert.match(serialized, /physical card/);
  assert.doesNotMatch(serialized, /actorIdentifier|databaseUrl|personId|email/);
});
