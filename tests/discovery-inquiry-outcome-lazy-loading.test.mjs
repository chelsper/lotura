import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/outcomes/[reviewId]/page.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const inquiryId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const reviewId = "33333333-3333-4333-8333-333333333333";

function harness({ enabled = false, latest = true, outcome = "possible_new_process", authorize = true } = {}) {
  const events = [];
  const calls = [];
  const testModule = { exports: {} };
  const review = {
    id: reviewId, observations: [], outcomes: [{ id: "outcome", kind: outcome }],
    completedAt: "2026-01-01T00:00:00.000Z", reviewSequence: 1,
  };
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports,
    require(id) {
      if (id === "react/jsx-runtime") return require(id);
      if (id === "next/link") return { default: () => null };
      if (id === "next/navigation") return { notFound() { throw new Error("not found"); } };
      if (id === "next/server") return { connection: async () => {} };
      if (id === "@/app/ui/primitives") return { Alert: () => null, Badge: () => null, Card: () => null };
      if (id === "@/app/workspace-shell") return { WorkspacePageHeader: () => null, WorkspaceShell: () => null };
      if (id === "@/app/studio/discovery/discovery-process-baseline-form") return { DiscoveryProcessBaselineForm: () => null };
      if (id === "@/lib/workspace-experience") return {
        loadWorkspaceExperience: async () => {
          events.push("authorize");
          if (!authorize) throw new Error("sign in required");
          return { discovery: { enabled, organizationId: 71 }, authoring: { enabled: false } };
        },
      };
      if (id === "@/lib/discovery-inquiry-review-model.mjs") return {
        buildInquiryKnowledgeOutcomeCounts: () => ({ reviewed: 0, states: {} }),
        DISCOVERY_INQUIRY_REVIEW_OUTCOME_DETAILS: { [outcome]: { label: "Human conclusion" } },
      };
      if (id === "@/lib/process-family-data") return { loadProcessFamilyCatalog: async (...args) => { calls.push(["families", ...args]); return { families: [] }; } };
      if (id === "@/lib/discovery-data") {
        events.push("discovery-data-import");
        return {
          loadDiscoveryInquirySession: async () => ({ scopeStatement: "Fictional scope", questionText: "Fictional question" }),
          loadDiscoveryInquiryReview: async (...args) => args.length === 4 || latest ? review : { ...review, id: "later-review" },
        };
      }
      if (id === "@/lib/discovery-analyst-data") {
        events.push("analyst-data-import");
        if (!enabled || !authorize) throw new Error("DATABASE_URL is not configured.");
        return { loadLatestDiscoveryAnalystTurn: async (...args) => { calls.push(["analyst", ...args]); return null; } };
      }
      throw new Error(`Unexpected module: ${id}`);
    },
  });
  return { events, calls, run: () => testModule.exports.default({ params: Promise.resolve({ inquiryId, sessionId, reviewId }) }) };
}

test("public build can evaluate the outcome page without initializing the analyst database", () => {
  const h = harness();
  assert.deepEqual(h.events, []);
  assert.doesNotMatch(source, /^import\s+.*from "@\/lib\/discovery-analyst-data"/m);
});

test("disabled discovery and unauthenticated requests cannot import private data modules", async () => {
  for (const options of [{ enabled: false }, { enabled: true, authorize: false }]) {
    const h = harness(options);
    await assert.rejects(h.run, /not found|sign in required/);
    assert.deepEqual(h.events, ["authorize"]);
    assert.deepEqual(h.calls, []);
  }
});

test("reviews without a current Process-baseline outcome do not initialize analyst data", async () => {
  for (const options of [{ enabled: true, latest: false }, { enabled: true, outcome: "additional_validation_required" }]) {
    const h = harness(options);
    await h.run();
    assert.deepEqual(h.events, ["authorize", "discovery-data-import"]);
    assert.deepEqual(h.calls, []);
  }
});

test("current baseline review lazily loads the same tenant-scoped analyst context", async () => {
  const h = harness({ enabled: true });
  await h.run();
  assert.deepEqual(h.events, ["authorize", "discovery-data-import", "analyst-data-import"]);
  assert.deepEqual(h.calls.find((call) => call[0] === "analyst"), ["analyst", 71, sessionId, "inquiry"]);
  assert.deepEqual(h.calls.find((call) => call[0] === "families"), ["families", 71]);
});

const baselineSource = await readFile(new URL("../lib/discovery-process-baseline-administration.ts", import.meta.url), "utf8");
const baselineCode = ts.transpileModule(baselineSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function baselineHarness({ authorize = true, enabled = true } = {}) {
  const events = [];
  const calls = [];
  const testModule = { exports: {} };
  vm.runInNewContext(baselineCode, {
    module: testModule, exports: testModule.exports, process: { env: {} },
    require(id) {
      if (id === "server-only") return {};
      if (id === "@neondatabase/serverless") return { neon() { events.push("sql"); throw new Error("SQL must not run in this test"); } };
      if (id === "./authentication") return {
        requireWorkspaceAccess: async () => {
          events.push("authorize");
          if (!authorize) throw new Error("sign in required");
          return { mode: "private" };
        },
      };
      if (id === "./operating-model-authoring-policy.mjs") return {
        resolveOperatingModelAuthoringConfiguration: () => {
          events.push("configuration");
          return { enabled, organizationId: 71, actorIdentifier: "fictional-admin" };
        },
      };
      if (id === "./discovery-data") {
        events.push("discovery-data-import");
        if (!authorize || !enabled) throw new Error("DATABASE_URL is not configured.");
        return { loadDiscoveryInquiryReview: async (...args) => { calls.push(args); return null; } };
      }
      throw new Error(`Unexpected module: ${id}`);
    },
  });
  return {
    events, calls,
    run: () => testModule.exports.createDiscoveryProcessBaseline({
      familyConfirmed: false, inquiryId, name: "Fictional printing", ownerConfirmed: false,
      purpose: "Receive a fictional print request.", reviewId, reviewedBaseline: true,
      sessionId, steps: ["Check the request."], organizationId: 999,
    }),
  };
}

test("shared baseline administration evaluates without loading private discovery data", () => {
  const h = baselineHarness();
  assert.deepEqual(h.events, []);
  assert.doesNotMatch(baselineCode, /^const .*require\("\.\/discovery-data"\)/m);
});

test("baseline auth and disabled-authoring failures do not import data or initialize SQL", async () => {
  for (const options of [{ authorize: false }, { enabled: false }]) {
    const h = baselineHarness(options);
    const result = await h.run();
    assert.equal(result.ok, false);
    assert.equal(result.code, "unavailable");
    assert.deepEqual(h.events, options.authorize === false ? ["authorize"] : ["authorize", "configuration"]);
    assert.deepEqual(h.calls, []);
  }
});

test("authorized baseline loads review data using server-derived Organization scope before SQL", async () => {
  const h = baselineHarness();
  const result = await h.run();
  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
  assert.deepEqual(h.events, ["authorize", "configuration", "discovery-data-import"]);
  assert.deepEqual(h.calls, [[71, inquiryId, sessionId, reviewId], [71, inquiryId, sessionId]]);
});
