import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildDocumentedProcessSnapshot,
  currentDiscoveryProposalDecisions,
  discoveryProposalReadiness,
} from "../lib/discovery-proposal-model.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const fictionalProcess = {
  downstream: [],
  exceptions: [],
  id: "process:41",
  name: "Fictional Intake Review",
  ownerRole: {
    currentAssignee: { assignmentType: "permanent", name: "Fictional Person" },
    currentCoverage: [{ coverageType: "permanent", name: "Fictional Person" }],
    description: null,
    id: "role:9",
    name: "Fictional Review Owner",
    revision: null,
    stableKey: null,
    status: "active",
  },
  purpose: "Review a fictional intake.",
  roleIds: ["role:9"],
  status: "draft",
  steps: [{
    id: "step:1",
    instructions: "Review the fictional item.",
    position: 1,
    responsibleRole: { id: "role:9", name: "Fictional Review Owner" },
    title: "Review item",
  }],
  systems: [],
  upstream: [],
};

test("the documented Process snapshot is deterministic and excludes Person coverage context", () => {
  const before = structuredClone(fictionalProcess);
  const snapshot = buildDocumentedProcessSnapshot(fictionalProcess);

  assert.deepEqual(fictionalProcess, before);
  assert.equal(snapshot.process.name, "Fictional Intake Review");
  assert.deepEqual(snapshot.process.ownerRole, {
    id: "role:9",
    name: "Fictional Review Owner",
  });
  assert.doesNotMatch(JSON.stringify(snapshot), /Fictional Person/);
  assert.deepEqual(snapshot.steps, fictionalProcess.steps);
});

test("later append-only choices become current without erasing the earlier decision", () => {
  const decisions = [
    {
      decisionSequence: 2,
      disposition: "leave_for_later",
      observationId: "observation-a",
    },
    {
      decisionSequence: 1,
      disposition: "use_in_proposal",
      observationId: "observation-a",
    },
    {
      decisionSequence: 1,
      disposition: "keep_documented",
      observationId: "observation-b",
    },
  ];
  const before = structuredClone(decisions);
  const current = currentDiscoveryProposalDecisions(decisions);

  assert.deepEqual(decisions, before);
  assert.equal(current.get("observation-a").disposition, "leave_for_later");
  assert.equal(current.get("observation-b").disposition, "keep_documented");
  assert.equal(decisions.length, 3);
});

test("readiness requires one current human choice for every active answer", () => {
  const observationIds = ["a", "b", "c"];
  const partial = discoveryProposalReadiness(observationIds, [
    { decisionSequence: 1, disposition: "use_in_proposal", observationId: "a" },
    { decisionSequence: 1, disposition: "leave_for_later", observationId: "b" },
  ]);
  assert.deepEqual(partial, {
    canFinish: false,
    included: 1,
    kept: 0,
    later: 1,
    remaining: 1,
    reviewed: 2,
    total: 3,
  });

  const complete = discoveryProposalReadiness(observationIds, [
    { decisionSequence: 1, disposition: "use_in_proposal", observationId: "a" },
    { decisionSequence: 1, disposition: "leave_for_later", observationId: "b" },
    { decisionSequence: 1, disposition: "keep_documented", observationId: "c" },
  ]);
  assert.equal(complete.canFinish, true);
  assert.equal(complete.remaining, 0);
});

test("migration 0017 adds only tenant-safe proposal staging with immutable identity and decisions", async () => {
  const migration = await read("drizzle/0017_discovery_proposed_update.sql");
  assert.match(migration, /CREATE TABLE "discovery_proposals"/);
  assert.match(migration, /CREATE TABLE "discovery_proposal_decisions"/);
  assert.match(migration, /DEFAULT gen_random_uuid\(\)/);
  assert.match(migration, /discovery_proposals_session_process_fk/);
  assert.match(migration, /discovery_proposal_decisions_proposal_fk/);
  assert.match(migration, /discovery_proposal_decisions_observation_fk/);
  assert.ok(
    migration.indexOf("discovery_sessions_identity_process_unique") <
      migration.indexOf("discovery_proposals_session_process_fk"),
  );
  assert.match(migration, /discovery proposal source context is immutable/);
  assert.match(migration, /revision must advance by exactly one/);
  assert.match(migration, /review-ready discovery proposals cannot be changed/);
  assert.match(migration, /discovery proposal decisions are append-only/);
  assert.doesNotMatch(migration, /UPDATE "processes"|ALTER TABLE "processes"/);
  assert.doesNotMatch(migration, /operating_model_changes/);

  for (const identifier of migration.matchAll(/"([^"]+)"/g)) {
    assert.ok(
      Buffer.byteLength(identifier[1]) <= 63,
      `PostgreSQL identifier exceeds 63 bytes: ${identifier[1]}`,
    );
  }
});

test("proposal writes reauthorize, derive scope and actor, use stale-write protection, and never write Process facts", async () => {
  const [actions, administration] = await Promise.all([
    read("app/studio/discovery/actions.ts"),
    read("lib/discovery-administration.ts"),
  ]);
  assert.match(actions, /await loadWorkspaceExperience\(\)/);
  assert.match(actions, /buildDocumentedProcessSnapshot\(process\)/);
  assert.doesNotMatch(actions, /text\(formData, "organizationId"\)/);
  assert.doesNotMatch(actions, /formData\.get\("organizationId"\)/);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
  assert.match(administration, /insert into discovery_proposals/);
  assert.match(administration, /insert into discovery_proposal_decisions/);
  assert.match(administration, /proposal\.revision = \$3::integer/);
  assert.match(administration, /proposal\.status = 'draft'/);
  assert.match(administration, /session\.status = 'ready_for_review'/);
  assert.match(administration, /supersedes_observation_stable_key = observation\.stable_key/);
  assert.match(administration, /proposal\.status = 'ready_for_review'/);
  assert.match(administration, /A finished proposed update cannot be silently changed/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.doesNotMatch(administration, /insert into operating_model_changes/i);
  assert.doesNotMatch(administration, /(?:insert into|update|delete from) (?:processes|process_steps|roles|systems|exceptions|process_dependencies)/i);
});

test("the review UX keeps interview evidence, human choices, readiness, and approval visibly distinct", async () => {
  const [controls, interview, model, route] = await Promise.all([
    read("app/studio/discovery/discovery-proposal-controls.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read("lib/discovery-proposal-model.mjs"),
    read("app/studio/discovery/interviews/[sessionId]/reconcile/page.tsx"),
  ]);
  assert.match(model, /Use in proposed update/);
  assert.match(model, /Keep what is documented/);
  assert.match(model, /Leave for later/);
  assert.match(controls, /Finish proposed update/);
  assert.match(interview, /Review and prepare an update/);
  assert.match(interview, /Continue proposed update/);
  assert.match(interview, /View proposed update/);
  assert.match(interview, /these interview answers can no longer be corrected in place/);
  assert.match(route, /It has not been approved or applied/);
  assert.match(route, /You do not need to append a correction first/);
  assert.match(route, /choose Leave for later/);
  assert.match(route, /No correction is required/);
  assert.match(route, /does not turn free text into Steps, Roles, Systems, Exceptions, or dependencies/);
  assert.match(route, /Earlier choices remain in history/);
  assert.doesNotMatch(`${controls}\n${route}`, /canonical|sanitized working draft/i);
  assert.doesNotMatch(`${controls}\n${route}`, /AI-generated|automatically apply/i);
});

test("the documented privilege contract remains Discovery-specific and append-only", async () => {
  const guidance = await read("docs/GUIDED_INTERVIEW_FOUNDATION.md");
  assert.match(guidance, /GRANT SELECT ON TABLE discovery_proposals, discovery_proposal_decisions/);
  assert.match(guidance, /GRANT INSERT \([\s\S]*documented_process_snapshot/);
  assert.match(guidance, /GRANT UPDATE \([\s\S]*status, revision, ready_at, ready_by_actor, updated_at/);
  assert.match(guidance, /discovery_proposal_decisions_id_seq/);
  assert.match(guidance, /runtime role may receive `SELECT` on the two Discovery tables/);
  assert.match(guidance, /no write privilege on Process, Step, Role, System/);
  assert.match(guidance, /does not approve or change the Process/);
});
