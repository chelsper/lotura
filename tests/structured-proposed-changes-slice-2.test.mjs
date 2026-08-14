import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DISCOVERY_MAPPING_ACTION_LABELS,
  DISCOVERY_MAPPING_ACTIONS,
} from "../lib/discovery-mapping-model.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const slice2Actions = [
  "add_process_step",
  "revise_process_step",
  "change_step_responsibility",
  "link_existing_system",
  "add_process_exception",
  "revise_process_exception",
  "add_process_dependency",
];

test("Slice 2 exposes only the approved conversational mapping actions", () => {
  for (const action of slice2Actions) {
    assert.ok(DISCOVERY_MAPPING_ACTIONS.includes(action));
    assert.equal(typeof DISCOVERY_MAPPING_ACTION_LABELS[action], "string");
    assert.ok(DISCOVERY_MAPPING_ACTION_LABELS[action].length > 0);
  }
  assert.equal(DISCOVERY_MAPPING_ACTIONS.length, 10);
});

test("migration 0019 expands typed proposal targets without operating-model writes", async () => {
  const migration = await read(
    "drizzle/0019_structured_proposed_changes_slice_2.sql",
  );
  for (const action of slice2Actions) {
    assert.match(migration, new RegExp(`'${action}'`));
  }
  assert.match(migration, /discovery_mappings_identity_process_unique/);
  assert.match(migration, /discovery_items_mapping_process_fk/);
  assert.match(migration, /discovery_items_process_step_fk/);
  assert.match(migration, /discovery_items_responsible_role_fk/);
  assert.match(migration, /discovery_items_system_fk/);
  assert.match(migration, /discovery_items_exception_fk/);
  assert.match(migration, /discovery_items_related_process_fk/);
  assert.match(migration, /discovery_items_typed_target_pairs_check/);
  assert.match(migration, /discovery_items_related_process_distinct_check/);
  assert.match(migration, /ON DELETE restrict/i);
  assert.ok(
    migration.indexOf("discovery_mappings_identity_process_unique") <
      migration.indexOf("discovery_items_mapping_process_fk"),
  );
  assert.doesNotMatch(
    migration,
    /(?:INSERT INTO|UPDATE|DELETE FROM) "?(?:processes|process_steps|roles|systems|exceptions|process_dependencies)"?/i,
  );
  for (const identifier of migration.matchAll(/"([^"]+)"/g)) {
    assert.ok(
      Buffer.byteLength(identifier[1]) <= 63,
      `PostgreSQL identifier exceeds 63 bytes: ${identifier[1]}`,
    );
  }
});

test("Slice 2 writes explicit tenant-safe targets and no operating-model facts", async () => {
  const [actions, administration, schema] = await Promise.all([
    read("app/studio/discovery/actions.ts"),
    read("lib/discovery-mapping-administration.ts"),
    read("db/schema.ts"),
  ]);
  assert.match(actions, /saveDiscoveryMappingItemSlice2/);
  assert.match(actions, /await loadWorkspaceExperience\(\)/);
  assert.doesNotMatch(actions, /organizationId.*formData|formData.*organizationId/);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.match(administration, /step\.stable_key = \$8::uuid/);
  assert.match(administration, /role\.status = 'active'/);
  assert.match(administration, /system\.status = 'active'/);
  assert.match(administration, /proposal\.process_id <> related\.id/);
  assert.match(administration, /mapping\.revision = \$6::integer/);
  assert.match(administration, /process_step_stable_key from current_item/);
  assert.match(administration, /exception_stable_key from current_item/);
  assert.doesNotMatch(
    administration,
    /(?:insert into|update|delete from) (?:processes|process_steps|roles|systems|exceptions|process_systems|process_dependencies|operating_model_changes)/i,
  );
  assert.match(schema, /discovery_items_process_step_fk/);
  assert.match(schema, /discovery_items_related_process_distinct_check/);
});

test("the human mapping UX presents explicit existing targets and preserves the application boundary", async () => {
  const [controls, page, data] = await Promise.all([
    read("app/studio/discovery/discovery-mapping-controls.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/map/page.tsx"),
    read("lib/discovery-data.ts"),
  ]);
  assert.match(controls, /Existing Step/);
  assert.match(controls, /Responsible Operational Role/);
  assert.match(controls, /Existing System/);
  assert.match(controls, /Existing Exception/);
  assert.match(controls, /Related Process/);
  assert.match(controls, /Whole Process/);
  assert.match(page, /Human-authored/);
  assert.match(page, /not been approved or applied/);
  assert.match(page, /documented Process has not changed/);
  assert.match(page, /Steps and responsibility, an existing System, an Exception, a dependency/);
  assert.match(data, /loadDiscoveryMappingCatalog/);
  assert.match(data, /alreadyLinked/);
  assert.doesNotMatch(`${controls}\n${page}`, /AI-generated|automatically apply/i);
});

test("LAD-050 and the documented privilege delta keep Slice 2 proposal-only", async () => {
  const [decisions, guidance, roadmap] = await Promise.all([
    read("ARCHITECTURE_DECISIONS.md"),
    read("docs/GUIDED_INTERVIEW_FOUNDATION.md"),
    read("PRODUCT_ROADMAP.md"),
  ]);
  assert.match(decisions, /LAD-050 — Structured proposed-change mappings/);
  assert.match(decisions, /implementation authorized for Structured Proposed Changes v0\.1, Slice 2/);
  assert.match(decisions, /no mutation privilege on[\s\S]*Processes, Steps, Roles, Systems, Exceptions/);
  assert.match(guidance, /GRANT SELECT ON TABLE process_steps, systems, exceptions/);
  assert.match(guidance, /process_step_id, process_step_stable_key/);
  assert.match(guidance, /typed proposals, not executable instructions/);
  assert.match(guidance, /It does not approve or apply anything/);
  assert.match(roadmap, /Slice 2\s+adds explicit typed proposals/);
});
