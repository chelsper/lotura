import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { buildKnowledgeGaps } from "../lib/knowledge-gaps.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const asOf = "2026-08-17T12:00:00.000Z";

function sources() {
  return {
    operatingModel: {
      exceptions: [],
      memberships: [],
      organization: { name: "Fictional Organization" },
      processDependencies: [],
      processSystems: [],
      roleAssignments: [],
      systems: [],
      users: [],
      roles: [
        { key: "role:1", stableKey: "role-stable-1", name: "Fictional Owner", status: "active" },
        { key: "role:2", stableKey: "role-stable-2", name: "Fictional Reviewer", status: "active" },
      ],
      processes: [
        { key: "process:1", name: "Unowned Work", status: "draft" },
        { key: "process:2", name: "Owned Work", ownerRoleKey: "role:1", status: "draft" },
      ],
      processSteps: [
        { instructions: "Do work.", key: "step:1", position: 1, processKey: "process:1", title: "Unresolved handoff" },
        { instructions: "Do work.", key: "step:2", position: 1, processKey: "process:2", title: "Owner fallback applies" },
      ],
    },
    structure: {
      organization: { name: "Fictional Organization" },
      snapshot: { approvedForImportAt: asOf, importedAt: asOf, isPartial: false, sourceAsOf: asOf, stableKey: "snapshot", vacancyEvidenceComplete: false },
      organizationUnits: [],
      people: [],
      positionAssignments: [],
      positionReportingRelationships: [],
      positions: [{ effectiveFrom: "2026-01-01T00:00:00.000Z", stableKey: "position-1", status: "active", title: "Fictional Position" }],
      roleMandates: [{ effectiveFrom: "2026-01-01T00:00:00.000Z", key: "mandate:1", mandateType: "primary", positionKey: "position-1", roleKey: "role:2", status: "active" }],
      roleCoverages: [],
    },
  };
}

test("Knowledge Gaps derives only the approved responsibility questions", () => {
  const input = sources();
  const result = buildKnowledgeGaps({ ...input, asOf, organizationKey: "organization:1" });

  assert.equal(result.counts.responsibility, 3);
  assert.deepEqual(
    result.groups[0].items.map((item) => item.sourceType).sort(),
    ["process", "process_step", "role_mandate"],
  );
  assert.ok(!result.items.some((item) => item.sourceStableKey === "step:2"));
  assert.match(
    result.items.find((item) => item.sourceType === "role_mandate").whyReview,
    /does not establish.*vacant/i,
  );
});

test("current evidence states and latest leave-for-later choices become explainable questions", () => {
  const input = sources();
  input.structure.roleCoverages.push({ effectiveFrom: "2026-01-01T00:00:00.000Z", key: "coverage:1", personKey: "person:1", roleMandateKey: "mandate:1", status: "active" });
  const observations = [
    { createdAt: asOf, epistemicState: "needs_validation", id: "observation-1", processKey: "process-stable-1", processName: "Unowned Work", promptText: "Who validates the handoff?", sessionId: "session-1", supersedesObservationId: null },
    { createdAt: asOf, epistemicState: "unknown", id: "observation-2", processKey: "process-stable-1", processName: "Unowned Work", promptText: "What happens next?", sessionId: "session-1", supersedesObservationId: null },
    { createdAt: asOf, epistemicState: "conflicting_observation", id: "observation-3", processKey: "process-stable-1", processName: "Unowned Work", promptText: "Which path is normal?", sessionId: "session-1", supersedesObservationId: null },
    { createdAt: asOf, epistemicState: "known", id: "observation-4", processKey: "process-stable-1", processName: "Unowned Work", promptText: "What is confirmed?", sessionId: "session-1", supersedesObservationId: null },
  ];
  const result = buildKnowledgeGaps({
    ...input,
    asOf,
    discovery: {
      observations,
      decisions: [
        { createdAt: asOf, decisionSequence: 1, disposition: "keep_documented", observationId: "observation-4" },
        { createdAt: asOf, decisionSequence: 2, disposition: "leave_for_later", observationId: "observation-4" },
      ],
    },
    organizationKey: "organization:1",
  });

  assert.equal(result.counts.discovery, 4);
  assert.deepEqual(
    result.groups[1].items.map((item) => item.sourceType).sort(),
    ["discovery_observation", "discovery_observation", "discovery_observation", "discovery_review_choice"],
  );
  assert.ok(result.items.every((item) => item.organizationKey === "organization:1"));
});

test("superseded observations and ended mandates do not remain current gaps", () => {
  const input = sources();
  input.structure.roleMandates[0].status = "ended";
  input.structure.roleMandates[0].effectiveUntil = "2026-07-01T00:00:00.000Z";
  const result = buildKnowledgeGaps({
    ...input,
    asOf,
    discovery: {
      decisions: [],
      observations: [
        { createdAt: asOf, epistemicState: "unknown", id: "old", processKey: "process-stable-1", processName: "Unowned Work", promptText: "Old question", sessionId: "session-1", supersedesObservationId: null },
        { createdAt: asOf, epistemicState: "known", id: "new", processKey: "process-stable-1", processName: "Unowned Work", promptText: "Current answer", sessionId: "session-1", supersedesObservationId: "old" },
      ],
    },
    organizationKey: "organization:1",
  });

  assert.ok(!result.items.some((item) => item.sourceStableKey === "old"));
  assert.ok(!result.items.some((item) => item.sourceType === "role_mandate"));
});

test("the private read-only Studio surface fails closed before its Neon reader loads", async () => {
  await access(new URL("app/studio/knowledge-gaps/page.tsx", root));
  const [experience, page, studio] = await Promise.all([
    read("lib/organization-structure-experience.ts"),
    read("app/studio/knowledge-gaps/page.tsx"),
    read("app/studio/page.tsx"),
  ]);
  const start = experience.indexOf("export async function loadKnowledgeGapsExperience");
  const source = experience.slice(start);
  assert.ok(start >= 0);
  assert.ok(source.indexOf("await requireWorkspaceAccess()") < source.indexOf("import(\"./knowledge-gaps-neon\")"));
  assert.ok(source.indexOf("if (!context.enabled) return context") < source.indexOf("import(\"./knowledge-gaps-neon\")"));
  assert.match(page, /if \(!experience\.enabled\) notFound\(\)/);
  assert.doesNotMatch(page, /action=|server action|mutation/i);
  assert.match(studio, /href: "\/studio\/knowledge-gaps"/);
});
