import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import * as model from "../lib/discovery-analyst-model.mjs";

const longKnown = "Fictional policy evidence with conditions and exceptions. ".repeat(160);
const longUncertain = "Fictional handoff still needs validation by another participant. ".repeat(140);
const context = {
  sessionKind: "inquiry",
  process: { name: "Fictional gift acceptance" },
  observations: [
    { promptKey: "purpose", epistemicState: "known", responseText: longKnown },
    { promptKey: "systems", epistemicState: "needs_validation", responseText: longUncertain },
  ],
};

const legacySnapshot = {
  ...model.createDiscoveryAnalystFallback(context),
  clear: [longKnown],
  needsValidation: [longUncertain],
};

test("long saved answers produce a displayable fallback without changing human evidence", () => {
  const original = structuredClone(context);
  const fallback = model.createDiscoveryAnalystFallback(context);
  assert.deepEqual(model.validateDiscoveryAnalystResult(fallback), fallback);
  for (const excerpt of [...fallback.clear, ...fallback.needsValidation]) {
    assert.ok(excerpt.length <= 1200);
    assert.match(excerpt, /Excerpt only; see the full answer in the evidence transcript/);
  }
  assert.deepEqual(context, original);
  assert.ok(fallback.needsValidation[0].startsWith("Fictional handoff still needs validation"));
});

test("legacy fallback snapshots are adapted on read without modifying stored history", () => {
  const original = structuredClone(legacySnapshot);
  assert.equal(model.validateDiscoveryAnalystResult(legacySnapshot), null);
  const snapshot = model.readStoredDiscoveryAnalystResult(legacySnapshot, "deterministic-analyst-fallback");
  assert.ok(snapshot);
  assert.equal(snapshot.nextQuestion.text, legacySnapshot.nextQuestion.text);
  assert.deepEqual(snapshot, model.validateDiscoveryAnalystResult(snapshot));
  assert.deepEqual(legacySnapshot, original);
  assert.deepEqual(model.readStoredDiscoveryAnalystResult(snapshot, "deterministic-analyst-fallback"), snapshot);
});

test("legacy adaptation never relaxes external AI validation or repairs unrelated corruption", () => {
  for (const provider of ["openai", "other-provider", undefined]) {
    assert.equal(model.readStoredDiscoveryAnalystResult(legacySnapshot, provider), null);
  }
  for (const invalid of [
    null,
    [],
    { ...legacySnapshot, nextQuestion: { ...legacySnapshot.nextQuestion, topic: "invented" } },
    { ...legacySnapshot, clear: [123] },
    { ...legacySnapshot, clear: Array(17).fill(longKnown) },
    { ...legacySnapshot, narrative: "x".repeat(6001) },
  ]) {
    assert.equal(model.readStoredDiscoveryAnalystResult(invalid, "deterministic-analyst-fallback"), null);
  }
});

test("short and unknown answers remain readable and keep their evidence grouping", () => {
  const fallback = model.createDiscoveryAnalystFallback({
    ...context,
    observations: [
      { promptKey: "purpose", epistemicState: "known", responseText: "A short fictional answer." },
      { promptKey: "systems", epistemicState: "unknown", responseText: null, promptText: "Which fictional system?" },
    ],
  });
  assert.deepEqual(fallback.clear, ["A short fictional answer."]);
  assert.deepEqual(fallback.needsValidation, ["Which fictional system?"]);
  assert.ok(model.validateDiscoveryAnalystResult(fallback));
});

test("fallback explanations distinguish AI failure from a refreshed AI synthesis", () => {
  for (const [reason, explanation] of [
    ["invalid_response", /could not validate the AI response/],
    ["timeout", /did not finish within the time limit/],
    ["prohibited_or_oversized_context", /content or size checks/],
  ]) {
    const fallback = model.createDiscoveryAnalystFallback(context, reason);
    assert.match(fallback.nextQuestion.rationale, explanation);
    assert.ok(model.validateDiscoveryAnalystResult(fallback));
  }
});

test("the real analyst reader displays a legacy fallback row instead of returning no turn", async () => {
  const { outputText } = ts.transpileModule(
    await readFile(new URL("../lib/discovery-analyst-data.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  );
  const row = {
    createdAt: new Date("2026-09-04T12:00:00Z"),
    providerKey: "deterministic-analyst-fallback",
    modelIdentifier: "coverage-guided-v1",
    snapshot: legacySnapshot,
    decisionId: null,
    inputTokens: null, outputTokens: null, totalTokens: null, estimatedCostMicrousd: null,
    suggestionId: "fictional-suggestion",
    suggestionPromptKey: legacySnapshot.nextQuestion.promptKey,
    suggestionRationale: legacySnapshot.nextQuestion.rationale,
    suggestionText: legacySnapshot.nextQuestion.text,
    suggestionTopic: legacySnapshot.nextQuestion.topic,
  };
  const query = {
    from() { return this; }, innerJoin() { return this; }, leftJoin() { return this; },
    where() { return this; }, orderBy() { return this; }, async limit() { return [row]; },
  };
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "server-only") return {};
      if (name === "drizzle-orm") return { and() {}, desc() {}, eq() {} };
      if (name === "@/db") return { db: { select: () => query } };
      if (name === "@/db/schema") return { discoveryAssistanceDecision: {}, discoveryAssistanceRun: {}, discoveryAssistanceSuggestion: {} };
      if (name === "./discovery-analyst-model.mjs") return model;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const turn = await exports.loadDiscoveryAnalystTurn(1, "fictional-session", 7, "inquiry");
  assert.ok(turn);
  assert.equal(turn.suggestion.id, "fictional-suggestion");
  assert.equal(turn.suggestion.answered, false);
  assert.equal(turn.requestMetadata, null);
  assert.equal(turn.providerKey, "deterministic-analyst-fallback");
  assert.match(turn.snapshot.clear[0], /Excerpt only/);
  assert.equal(row.snapshot.clear[0], longKnown);
});
