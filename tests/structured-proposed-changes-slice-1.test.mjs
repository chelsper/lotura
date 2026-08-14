import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  currentDiscoveryMappingItems,
  discoveryMappingReadiness,
} from "../lib/discovery-mapping-model.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("append-only mapping revisions preserve current state without mutating input", () => {
  const items = [
    {
      action: "update_process_purpose",
      itemId: "purpose-item",
      itemSequence: 1,
      sourceObservationIds: ["answer-1"],
      state: "active",
    },
    {
      action: "update_process_purpose",
      itemId: "purpose-item",
      itemSequence: 2,
      sourceObservationIds: ["answer-1", "answer-2"],
      state: "withdrawn",
    },
    {
      action: "preserve_unresolved",
      itemId: "question-item",
      itemSequence: 1,
      sourceObservationIds: ["answer-3"],
      state: "active",
    },
  ];
  const before = structuredClone(items);
  const current = currentDiscoveryMappingItems(items);

  assert.deepEqual(items, before);
  assert.equal(current.size, 2);
  assert.equal(current.get("purpose-item").state, "withdrawn");
  assert.equal(current.get("question-item").state, "active");
});

test("mapping readiness requires every included answer to have an active treatment", () => {
  const partial = discoveryMappingReadiness(["a", "b", "c"], [
    {
      action: "update_process_purpose",
      itemId: "purpose",
      itemSequence: 1,
      sourceObservationIds: ["a"],
      state: "active",
    },
    {
      action: "preserve_unresolved",
      itemId: "question",
      itemSequence: 1,
      sourceObservationIds: ["b"],
      state: "active",
    },
  ]);
  assert.deepEqual(partial, {
    activeItems: 2,
    canFinish: false,
    proposedChanges: 1,
    unresolved: 1,
    uncoveredObservationIds: ["c"],
    withdrawnItems: 0,
  });

  const complete = discoveryMappingReadiness(["a", "b", "c"], [
    {
      action: "update_process_purpose",
      itemId: "purpose",
      itemSequence: 1,
      sourceObservationIds: ["a", "c"],
      state: "active",
    },
    {
      action: "preserve_unresolved",
      itemId: "question",
      itemSequence: 1,
      sourceObservationIds: ["b"],
      state: "active",
    },
  ]);
  assert.equal(complete.canFinish, true);
  assert.deepEqual(complete.uncoveredObservationIds, []);
});

test("migration 0018 adds only typed mapping staging with append-only history", async () => {
  const migration = await read(
    "drizzle/0018_structured_proposed_changes_slice_1.sql",
  );
  assert.match(migration, /CREATE TYPE "public"\."discovery_mapping_action"/);
  assert.match(migration, /'update_process_purpose'/);
  assert.match(migration, /'change_process_owner'/);
  assert.match(migration, /'preserve_unresolved'/);
  assert.match(migration, /CREATE TABLE "discovery_proposal_mappings"/);
  assert.match(migration, /CREATE TABLE "discovery_mapping_items"/);
  assert.match(migration, /CREATE TABLE "discovery_mapping_sources"/);
  assert.match(migration, /DEFAULT gen_random_uuid\(\)/);
  assert.ok(
    migration.indexOf("discovery_proposals_full_context_unique") <
      migration.indexOf("discovery_mappings_proposal_context_fk"),
  );
  assert.match(migration, /discovery_mapping_items_owner_role_fk/);
  assert.match(migration, /discovery_mapping_sources_observation_fk/);
  assert.match(migration, /discovery mapping source context is immutable/);
  assert.match(migration, /discovery mapping item revisions are append-only/);
  assert.match(migration, /discovery mapping source links are append-only/);
  assert.match(migration, /review-ready discovery mappings cannot be changed/);
  assert.doesNotMatch(migration, /UPDATE "processes"|INSERT INTO "operating_model_changes"/i);

  for (const identifier of migration.matchAll(/"([^"]+)"/g)) {
    assert.ok(
      Buffer.byteLength(identifier[1]) <= 63,
      `PostgreSQL identifier exceeds 63 bytes: ${identifier[1]}`,
    );
  }
});

test("mapping writes reauthorize, derive tenant and actor, validate Roles, and never change the operating model", async () => {
  const [actions, administration] = await Promise.all([
    read("app/studio/discovery/actions.ts"),
    read("lib/discovery-mapping-administration.ts"),
  ]);
  assert.match(actions, /await loadWorkspaceExperience\(\)/);
  assert.match(actions, /fingerprintDocumentedProcessSnapshot/);
  assert.doesNotMatch(actions, /formData\.get\("organizationId"\)/);
  assert.doesNotMatch(actions, /text\(formData, "organizationId"\)/);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.match(administration, /insert into discovery_proposal_mappings/);
  assert.match(administration, /insert into discovery_mapping_items/);
  assert.match(administration, /insert into discovery_mapping_sources/);
  assert.match(administration, /role\.status = 'active'/);
  assert.match(administration, /proposal\.documented_process_fingerprint/);
  assert.match(administration, /mapping\.revision = \$3::integer/);
  assert.match(administration, /mapping\.status = 'draft'/);
  assert.match(administration, /No partial change was retained/);
  assert.doesNotMatch(
    administration,
    /(?:insert into|update|delete from) (?:processes|process_steps|roles|systems|exceptions|process_dependencies|operating_model_changes)/i,
  );
});

test("Slice 1 UI keeps evidence, proposal, review, and application visibly separate", async () => {
  const [controls, page, reconcile] = await Promise.all([
    read("app/studio/discovery/discovery-mapping-controls.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/map/page.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/reconcile/page.tsx"),
  ]);
  assert.match(reconcile, /Turn notes into specific changes/);
  assert.match(page, /Human-authored/);
  assert.match(page, /not been approved or applied/);
  assert.match(page, /documented Process has not changed/);
  assert.match(page, /future governed rebase/);
  assert.match(page, /Steps and responsibility, an existing System, an Exception, a dependency/);
  assert.match(controls, /existing active Operational Role/);
  assert.match(controls, /does not infer ownership from a Person, Position, title, coverage, or reporting line/);
  assert.doesNotMatch(`${controls}\n${page}`, /AI-generated|automatically apply/i);
});

test("LAD-049 and least-privilege documentation preserve the manual lifecycle boundary", async () => {
  const [decisions, guidance] = await Promise.all([
    read("ARCHITECTURE_DECISIONS.md"),
    read("docs/GUIDED_INTERVIEW_FOUNDATION.md"),
  ]);
  assert.match(decisions, /LAD-049 — Structured proposed changes/);
  assert.match(decisions, /implementation authorized for Structured Proposed Changes v0\.1, Slice 1/);
  assert.match(decisions, /does not mean approved, applied, published/);
  assert.match(guidance, /GRANT SELECT ON TABLE roles, discovery_proposal_mappings/);
  assert.match(guidance, /GRANT INSERT \([\s\S]*ON discovery_mapping_items/);
  assert.match(guidance, /discovery_mapping_sources_id_seq/);
  assert.match(guidance, /No row is written to `processes`/);
  assert.match(guidance, /Human approval and atomic application/);
});
