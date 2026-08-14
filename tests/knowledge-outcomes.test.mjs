import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildDiscoveryKnowledgeOutcome } from "../lib/discovery-knowledge-outcome.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function observation(id, overrides = {}) {
  return {
    epistemicState: "known",
    id,
    topic: "sequence",
    ...overrides,
  };
}

function decision(observationId, disposition, decisionSequence = 1) {
  return { decisionSequence, disposition, observationId };
}

test("a completed review can produce a durable successful no-change outcome", () => {
  const observations = [
    ...Array.from({ length: 5 }, (_, index) => observation(`kept-${index + 1}`)),
    observation("later-1", { epistemicState: "needs_validation", topic: "boundary" }),
    observation("later-2", { epistemicState: "unknown" }),
    observation("later-3", { epistemicState: "assumed" }),
    observation("later-4", { epistemicState: "conflicting_observation" }),
  ];
  const decisions = [
    ...observations.slice(0, 5).map((item) => decision(item.id, "keep_documented")),
    ...observations.slice(5).map((item) => decision(item.id, "leave_for_later")),
  ];
  const before = structuredClone({ decisions, observations });
  const outcome = buildDiscoveryKnowledgeOutcome({
    completedAt: "2026-08-14T12:00:00.000Z",
    completedByActor: "fictional-reviewer",
    decisions,
    observations,
  });

  assert.deepEqual({ decisions, observations }, before);
  assert.equal(outcome.reviewedObservationIds.length, 9);
  assert.equal(outcome.documentedObservationIds.length, 5);
  assert.equal(outcome.laterObservationIds.length, 4);
  assert.equal(outcome.needsValidationObservationIds.length, 4);
  assert.equal(outcome.selectedObservationIds.length, 0);
  assert.equal(outcome.structuredChangeCount, 0);
  assert.equal(outcome.noChangesProposed, true);
  assert.equal(outcome.stage, "no_changes");
  assert.deepEqual(outcome.unresolvedBoundaryObservationIds, ["later-1"]);
  assert.deepEqual(outcome.conflictingObservationIds, ["later-4"]);
  assert.equal(outcome.completedByActor, "fictional-reviewer");
});

test("selected evidence is distinct from a specific structured change", () => {
  const observations = [observation("selected")];
  const decisions = [decision("selected", "use_in_proposal")];
  const outcome = buildDiscoveryKnowledgeOutcome({ decisions, observations });

  assert.equal(outcome.selectedObservationIds.length, 1);
  assert.equal(outcome.structuredChangeCount, 0);
  assert.equal(outcome.noChangesProposed, false);
  assert.equal(outcome.stage, "evidence_selected");
});

test("current active mapping revisions determine the structured outcome", () => {
  const observations = [observation("selected-a"), observation("selected-b")];
  const decisions = observations.map((item) => decision(item.id, "use_in_proposal"));
  const mapping = {
    items: [
      {
        action: "update_process_purpose",
        itemId: "change-a",
        itemSequence: 1,
        sourceObservationIds: ["selected-a"],
        state: "active",
      },
      {
        action: "update_process_purpose",
        itemId: "change-a",
        itemSequence: 2,
        sourceObservationIds: ["selected-a"],
        state: "withdrawn",
      },
      {
        action: "add_process_step",
        itemId: "change-b",
        itemSequence: 1,
        sourceObservationIds: ["selected-b"],
        state: "active",
      },
      {
        action: "preserve_unresolved",
        itemId: "unresolved-a",
        itemSequence: 1,
        sourceObservationIds: ["selected-a"],
        state: "active",
      },
    ],
    status: "ready_for_proposal_review",
  };
  const outcome = buildDiscoveryKnowledgeOutcome({ decisions, mapping, observations });

  assert.equal(outcome.structuredChangeCount, 1);
  assert.equal(outcome.unresolvedMappingCount, 1);
  assert.equal(outcome.noChangesProposed, false);
  assert.equal(outcome.stage, "ready_for_proposal_review");
});

test("a ready mapping that only preserves unresolved evidence proposes no change", () => {
  const observations = [observation("selected", { epistemicState: "needs_validation" })];
  const outcome = buildDiscoveryKnowledgeOutcome({
    decisions: [decision("selected", "use_in_proposal")],
    mapping: {
      items: [{
        action: "preserve_unresolved",
        itemId: "unresolved",
        itemSequence: 1,
        sourceObservationIds: ["selected"],
        state: "active",
      }],
      status: "ready_for_proposal_review",
    },
    observations,
  });

  assert.equal(outcome.structuredChangeCount, 0);
  assert.equal(outcome.unresolvedMappingCount, 1);
  assert.equal(outcome.noChangesProposed, true);
  assert.equal(outcome.stage, "no_changes");
});

test("only decisions for the supplied active evidence enter the outcome", () => {
  const outcome = buildDiscoveryKnowledgeOutcome({
    decisions: [
      decision("active", "keep_documented"),
      decision("superseded", "use_in_proposal"),
      decision("active", "leave_for_later", 2),
    ],
    observations: [observation("active", { epistemicState: "unknown" })],
  });

  assert.deepEqual(outcome.reviewedObservationIds, ["active"]);
  assert.deepEqual(outcome.laterObservationIds, ["active"]);
  assert.equal(outcome.selectedObservationIds.length, 0);
});

test("LAD-051 and product documentation preserve the no-change branch", async () => {
  const [decisions, principles, roadmap, vision, guided, studio] = await Promise.all([
    read("ARCHITECTURE_DECISIONS.md"),
    read("PRODUCT_PRINCIPLES.md"),
    read("PRODUCT_ROADMAP.md"),
    read("PRODUCT_VISION.md"),
    read("docs/GUIDED_INTERVIEW_FOUNDATION.md"),
    read("docs/WORKSPACE_STUDIO.md"),
  ]);

  assert.match(decisions, /LAD-051 — Discovery may conclude with a durable Knowledge Outcome/);
  assert.match(decisions, /adds no table,\s+migration, database privilege, credential, environment variable, or write path/);
  assert.match(principles, /No change is a valid outcome/);
  assert.match(vision, /Proposal\s+is one possible branch/);
  assert.match(roadmap, /Knowledge Outcomes/);
  assert.match(guided, /does not create or link to an\s+empty structured-mapping workspace/);
  assert.match(studio, /Counts support the explanation; they are not a score/);
});

test("the outcome UX remains read-only, conversational, and private-workspace gated", async () => {
  const [interview, outcomeModel, reconciliation] = await Promise.all([
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read("lib/discovery-knowledge-outcome.mjs"),
    read("app/studio/discovery/interviews/[sessionId]/reconcile/page.tsx"),
  ]);

  assert.match(interview, /View interview outcome/);
  assert.match(reconciliation, /Knowledge outcome/);
  assert.match(reconciliation, /What we learned/);
  assert.match(reconciliation, /No changes were proposed\. This is a complete and valid outcome/);
  assert.match(reconciliation, /Only a later, separately approved application can change it/);
  assert.match(reconciliation, /timeZoneName: "short"/);
  assert.doesNotMatch(reconciliation, /dateStyle|timeStyle/);
  assert.match(reconciliation, /loadWorkspaceExperience\(\)/);
  assert.ok(
    reconciliation.indexOf("if (!experience.discovery.enabled) notFound()")
      < reconciliation.indexOf("loadDiscoveryProposalMapping"),
  );
  assert.doesNotMatch(outcomeModel, /score|confidence|AI/i);
  assert.doesNotMatch(reconciliation, /canonical|sanitized working draft/i);
});
