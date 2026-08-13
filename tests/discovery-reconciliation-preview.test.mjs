import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildDiscoveryReconciliationEvidence } from "../lib/discovery-reconciliation-preview.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function observation(overrides = {}) {
  return {
    actorIdentifier: "fictional-reviewer",
    createdAt: "2026-01-01T00:00:00.000Z",
    epistemicState: "known",
    id: "fictional-observation",
    promptKey: "purpose",
    promptText: "Why does this fictional work exist?",
    responseText: "It prepares a fictional result.",
    sequence: 1,
    supersedesObservationId: null,
    topic: "purpose",
    ...overrides,
  };
}

test("reconciliation preview groups exact active interview notes without interpreting them", () => {
  const input = [
    observation({ id: "purpose-original" }),
    observation({
      epistemicState: "needs_validation",
      id: "purpose-correction",
      responseText: "The exact fictional purpose needs validation.",
      sequence: 2,
      supersedesObservationId: "purpose-original",
    }),
    observation({
      id: "steps",
      promptKey: "sequence",
      promptText: "What happens?",
      responseText: "1. Receive it. 2. Review it. 3. Record it.",
      sequence: 3,
      topic: "sequence",
    }),
  ];
  const before = structuredClone(input);
  const sections = buildDiscoveryReconciliationEvidence(input);

  assert.deepEqual(input, before);
  assert.deepEqual(
    sections.find((section) => section.key === "definition").evidence,
    [
      {
        epistemicState: "needs_validation",
        id: "purpose-correction",
        promptKey: "purpose",
        promptText: "Why does this fictional work exist?",
        responseText: "The exact fictional purpose needs validation.",
        sequence: 2,
      },
    ],
  );
  assert.equal(
    sections.find((section) => section.key === "steps").evidence[0].responseText,
    "1. Receive it. 2. Review it. 3. Record it.",
  );
  assert.equal(sections.length, 8);
});

test("the comparison route authorizes before reads and preserves the proposal boundary", async () => {
  const [route, interview, decisions, guidance] = await Promise.all([
    read("app/studio/discovery/interviews/[sessionId]/reconcile/page.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read("ARCHITECTURE_DECISIONS.md"),
    read("docs/GUIDED_INTERVIEW_FOUNDATION.md"),
  ]);

  assert.ok(route.indexOf("loadWorkspaceExperience()") < route.indexOf("loadDiscoverySession"));
  assert.match(route, /if \(!experience\.discovery\.enabled\) notFound\(\)/);
  assert.match(route, /session\.status !== "ready_for_review"/);
  assert.match(route, /experience\.data\.processes\.find/);
  assert.match(interview, /Review and prepare an update/);
  assert.match(route, /Current documented Process/);
  assert.match(route, /Interview notes/);
  assert.match(route, /Saving a choice records review work only/);
  assert.match(route, /does not approve or apply it/);
  assert.doesNotMatch(route, /canonical/i);
  assert.doesNotMatch(route, /administration|insert into|update processes|delete from/i);
  assert.match(decisions, /LAD-044 — Discovery comparison/);
  assert.match(guidance, /Free text is not silently converted into structured Steps/);
});

test("working-draft presentation uses conversational language without weakening the internal state key", async () => {
  const [configuration, shell, principles] = await Promise.all([
    read("lib/workspace-configuration.mjs"),
    read("app/workspace-shell.tsx"),
    read("PRODUCT_PRINCIPLES.md"),
  ]);

  assert.match(configuration, /"sanitized-working-draft"/);
  assert.match(configuration, /label: "Working draft"/);
  assert.match(configuration, /check it for sensitive information/);
  assert.doesNotMatch(configuration, /label: "Sanitized working draft"/);
  assert.match(shell, /saved changes keep their history/);
  assert.match(principles, /Conversational language at the product surface/);
});
