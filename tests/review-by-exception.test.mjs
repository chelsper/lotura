import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  defaultDiscoveryReviewDisposition,
  discoveryReviewByExceptionSummary,
} from "../lib/discovery-proposal-model.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("LAD-062 authorizes exception-driven review without authorizing AI or canonical writes", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  assert.match(decisions, /LAD-062 — Process-bound reconciliation is exception-driven/);
  assert.match(decisions, /Finish with no changes/);
  assert.match(decisions, /human-authorized review\s+action, not an inference/);
  assert.match(decisions, /requires no schema,\s+migration, database privilege/);
  assert.match(decisions, /AI-selected dispositions[\s\S]*remain\s+separately governed work/);
});

test("review defaults keep known answers and preserve every uncertain evidence state for later", () => {
  assert.equal(defaultDiscoveryReviewDisposition("known"), "keep_documented");
  for (const state of [
    "assumed",
    "unknown",
    "needs_validation",
    "conflicting_observation",
  ]) {
    assert.equal(defaultDiscoveryReviewDisposition(state), "leave_for_later");
  }
});

test("review-by-exception summary preserves explicit choices and does not mutate its inputs", () => {
  const observations = [
    { epistemicState: "known", id: "known-default" },
    { epistemicState: "needs_validation", id: "later-default" },
    { epistemicState: "known", id: "selected" },
    { epistemicState: "unknown", id: "explicit-kept" },
  ];
  const decisions = [
    {
      decisionSequence: 1,
      disposition: "use_in_proposal",
      observationId: "selected",
    },
    {
      decisionSequence: 1,
      disposition: "keep_documented",
      observationId: "explicit-kept",
    },
  ];
  const before = structuredClone({ decisions, observations });
  const summary = discoveryReviewByExceptionSummary(observations, decisions);

  assert.deepEqual({ decisions, observations }, before);
  assert.deepEqual(summary, {
    canFinishNoChanges: false,
    canFinishSelectedChanges: true,
    included: 1,
    kept: 2,
    later: 1,
    remaining: 2,
    total: 4,
  });
});

test("one server action atomically defaults missing choices and finishes the existing review package", async () => {
  const [actions, administration] = await Promise.all([
    read("app/studio/discovery/actions.ts"),
    read("lib/discovery-administration.ts"),
  ]);
  assert.match(actions, /finishDiscoveryReviewByExceptionAction/);
  assert.match(actions, /buildDocumentedProcessSnapshot\(process\)/);
  assert.match(actions, /mode !== "no_changes" && mode !== "selected_changes"/);
  assert.match(administration, /finishDiscoveryReviewByException/);
  assert.match(administration, /context\.sql\.transaction/);
  assert.match(administration, /cross join missing_observations/);
  assert.match(administration, /epistemic_state = 'known'[\s\S]*keep_documented/);
  assert.match(administration, /else 'leave_for_later'/);
  assert.match(administration, /status = 'ready_for_review'/);
  assert.match(administration, /\$5::text = 'no_changes'[\s\S]*not exists/);
  assert.match(administration, /\$5::text = 'selected_changes'[\s\S]*exists/);
  assert.doesNotMatch(
    administration,
    /finishDiscoveryReviewByException[\s\S]*insert into operating_model_changes/i,
  );
});

test("the default reconciliation path finishes no change once and reveals per-answer controls only for exceptions", async () => {
  const [controls, route] = await Promise.all([
    read("app/studio/discovery/discovery-proposal-controls.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/reconcile/page.tsx"),
  ]);
  assert.match(controls, /Finish with no changes/);
  assert.match(controls, /Finish selected changes/);
  assert.match(route, /Review possible changes/);
  assert.match(route, /reviewingExceptions \? \(/);
  assert.match(route, /You do not need to save a choice for every other answer/);
  assert.match(route, /No per-answer review is required/);
  assert.match(route, /No Process change will be proposed or applied/);
});
