import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  activeDiscoveryObservations,
  analyzeDiscoveryReview,
} from "../lib/discovery-review-signals.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const observation = (overrides = {}) => ({
  epistemicState: "known",
  id: "fictional-observation",
  promptKey: "purpose",
  responseText: "Fictional work is documented.",
  supersedesObservationId: null,
  ...overrides,
});

test("review signals inspect active evidence without changing observations", () => {
  const input = [
    observation({ id: "start", promptKey: "boundary_start", epistemicState: "needs_validation", responseText: "The exact start needs validation." }),
    observation({ id: "end", promptKey: "boundary_end", responseText: "The work is complete after review." }),
    observation({ id: "sequence", promptKey: "sequence", responseText: "1. Receive the item. 2. Review it. 3. Record it." }),
  ];
  const before = structuredClone(input);
  const signals = analyzeDiscoveryReview(input);

  assert.deepEqual(input, before);
  assert.deepEqual(
    signals.map((signal) => signal.kind).sort(),
    [],
  );
});

test("Known uncertainty language becomes a review question, not a reclassification", () => {
  const input = [observation({ responseText: "The Finance handoff needs validation." })];
  const [signal] = analyzeDiscoveryReview(input);
  assert.equal(signal.kind, "certainty_language_mismatch");
  assert.equal(input[0].epistemicState, "known");
  assert.match(signal.detail, /Lotura has not changed either one/);
  assert.equal(signal.title, "Check the certainty label");
});

test("correction chains retain history and surface possible context loss", () => {
  const input = [
    observation({ id: "original", responseText: "Fictional Scanner records the image and Fictional Ledger records the entry." }),
    observation({ id: "correction", supersedesObservationId: "original", responseText: "Same answer." }),
  ];
  assert.deepEqual(activeDiscoveryObservations(input).map((item) => item.id), ["correction"]);
  assert.equal(analyzeDiscoveryReview(input)[0].kind, "correction_context_loss");
  assert.match(analyzeDiscoveryReview(input)[0].detail, /append a correction that keeps that detail/);
});

test("deliberate non-Known labels move forward without another immediate review prompt", () => {
  const input = [
    observation({
      id: "start",
      promptKey: "boundary_start",
      epistemicState: "needs_validation",
      responseText: "The exact start needs validation.",
    }),
    observation({ id: "end", promptKey: "boundary_end", responseText: "The work is complete after review." }),
    observation({
      id: "assumed-sequence",
      epistemicState: "assumed",
      promptKey: "sequence",
      responseText: "1. Receive the item. 2. Review it. 3. Record it.",
    }),
    observation({ id: "prior", responseText: "A detailed fictional description." }),
    observation({
      id: "needs-validation-correction",
      epistemicState: "needs_validation",
      responseText: "Changed to Needs validation.",
      supersedesObservationId: "prior",
    }),
  ];

  assert.deepEqual(analyzeDiscoveryReview(input), []);
});

test("Known confirms a multi-part answer without requiring duplicate review", () => {
  const signals = analyzeDiscoveryReview([
    observation({
      promptKey: "sequence",
      responseText: "1. Receive the item. 2. Review it. 3. Record it. 4. Send it.",
    }),
    observation({
      id: "dependencies",
      promptKey: "dependencies",
      responseText: "Before: Fictional Intake prepares the work. After: Fictional Reporting receives it.",
    }),
  ]);
  assert.deepEqual(signals, []);
});

test("substantive corrections and honest uncertainty do not create false certainty signals", () => {
  const input = [
    observation({
      id: "original",
      responseText: "The Fictional Scanner records the image before the Fictional Ledger records the entry.",
    }),
    observation({
      id: "correction",
      supersedesObservationId: "original",
      epistemicState: "needs_validation",
      responseText: "The Fictional Scanner records the image; whether the Fictional Ledger receives it next needs validation.",
    }),
  ];
  assert.deepEqual(analyzeDiscoveryReview(input), []);
});

test("the review UI is presentation-only and corrections preserve active content by default", async () => {
  const [page, form, decisions, documentation] = await Promise.all([
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read("app/studio/discovery/discovery-correction-form.tsx"),
    read("ARCHITECTURE_DECISIONS.md"),
    read("docs/GUIDED_INTERVIEW_FOUNDATION.md"),
  ]);
  assert.match(page, /Things to review/);
  assert.match(page, /Deterministic review · No AI/);
  assert.match(page, /review prompts—not findings, truth, or automatic reclassification/);
  assert.match(page, /Review Observation/);
  assert.match(form, /defaultValue=\{currentResponseText \|\| ""\}/);
  assert.match(form, /useState\(currentEpistemicState\)/);
  assert.match(decisions, /LAD-043 — Deterministic Discovery review signals/);
  assert.match(documentation, /computed at read time/);
  assert.doesNotMatch(page, /correctDiscoveryObservationAction/);
});
