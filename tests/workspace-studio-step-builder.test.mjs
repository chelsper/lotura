import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0014 adds only the approved Step Builder schema delta", async () => {
  const migration = await read("drizzle/0014_workspace_studio_step_builder.sql");

  for (const value of [
    "create_step",
    "update_step",
    "reorder_steps",
    "change_step_responsibility",
  ]) {
    assert.match(migration, new RegExp(`ADD VALUE '${value}'`));
  }
  assert.match(migration, /ADD VALUE 'process_step'/);
  assert.match(
    migration,
    /ALTER TABLE "process_steps" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid\(\) NOT NULL/,
  );
  assert.match(migration, /process_step_id/);
  assert.match(migration, /process_step_stable_key/);
  assert.doesNotMatch(migration, /CREATE TABLE|DROP TABLE|DELETE FROM|TRUNCATE/);
  assert.doesNotMatch(
    migration,
    /ALTER TABLE "(?:roles|systems|exceptions|process_systems|process_dependencies|role_assignments|role_mandates|role_coverages|people|positions|organization_units)"/,
  );
});

test("Step stable identity and tenant-safe history references are enforced", async () => {
  const migration = await read("drizzle/0014_workspace_studio_step_builder.sql");
  assert.ok(
    migration.indexOf("process_steps_id_process_org_stable_unique") <
      migration.indexOf("operating_model_changes_step_org_stable_fk"),
  );
  assert.match(
    migration,
    /FOREIGN KEY \("process_step_id","process_id","organization_id","process_step_stable_key"\).*ON DELETE restrict/,
  );
  assert.match(migration, /operating_model_changes_target_shape_check/);
  assert.match(migration, /"process_step_id","process_id","organization_id","process_step_stable_key"/);
  assert.match(migration, /CREATE TRIGGER "process_steps_stable_key_immutable_trigger"/);
  assert.match(migration, /process step stable keys are immutable/);
});

test("adjacent Step swaps retain uniqueness with deferred commit-time enforcement", async () => {
  const [migration, administration] = await Promise.all([
    read("drizzle/0014_workspace_studio_step_builder.sql"),
    read("lib/operating-model-administration.ts"),
  ]);
  assert.match(
    migration,
    /UNIQUE\("process_id","position"\) DEFERRABLE INITIALLY IMMEDIATE/,
  );
  assert.match(
    administration,
    /set constraints "process_steps_process_id_position_unique" deferred/,
  );
  assert.match(administration, /candidate\.position = current\.position \+ \$7::integer/);
  assert.match(administration, /Number\(row\.changed_count \?\? 0\) !== 2/);
  assert.match(administration, /Number\(row\.history_count \?\? 0\) !== 2/);
});

test("Step mutations remain organization-scoped, stale-safe, and atomically audited", async () => {
  const administration = await read("lib/operating-model-administration.ts");
  for (const action of [
    "create_step",
    "update_step",
    "reorder_steps",
    "change_step_responsibility",
  ]) {
    assert.match(administration, new RegExp(`'${action}'`));
  }
  assert.match(administration, /'process_step'/g);
  assert.match(administration, /configuration\.organizationId/g);
  assert.match(administration, /configuration\.actorIdentifier/g);
  assert.match(administration, /expectedStepRevision/g);
  assert.match(administration, /isolationLevel: "Serializable"/g);
  assert.match(administration, /insert into operating_model_changes/g);
  assert.doesNotMatch(administration, /(?:update|delete from) operating_model_changes/i);
  assert.doesNotMatch(administration, /delete from process_steps/i);
});

test("responsibility is explicit or inherited and never inferred from structural context", async () => {
  const [administration, workspace] = await Promise.all([
    read("lib/operating-model-administration.ts"),
    read("app/process-authoring/process-authoring-workspace.tsx"),
  ]);
  assert.match(administration, /where organization_id = \$1 and id = \$7::integer and status = 'active'/);
  assert.match(administration, /'responsibilityBasis'.*'inherited'/s);
  assert.match(administration, /'responsibilityBasis'.*'explicit'/s);
  assert.match(
    administration,
    /Step responsibility is now unclear because no Process Owner is assigned/,
  );
  assert.match(workspace, /Inherit from Process Owner/);
  assert.match(workspace, /does not mean nobody is responsible/);
  assert.match(workspace, /Person, Position, coverage, and reporting context are not inferred/);
  assert.doesNotMatch(administration, /position_assignments|position_reporting_relationships/);
});

test("Step Builder UI exposes bounded authoring and honest lifecycle language", async () => {
  const workspace = await read("app/process-authoring/process-authoring-workspace.tsx");
  assert.match(workspace, /Add a Step/);
  assert.match(workspace, /Edit wording/);
  assert.match(workspace, /Set responsibility/);
  assert.match(workspace, /Change order/);
  assert.match(workspace, /Move earlier/);
  assert.match(workspace, /Move later/);
  assert.match(workspace, /Step removal is not available/);
  assert.match(workspace, /governed retirement lifecycle/);
  assert.doesNotMatch(workspace, /Delete Step|Retire Step/);
});

test("the Process-admin privilege delta is Step-specific and remains least-privileged", async () => {
  const documentation = await read("docs/OPERATING_MODEL_AUTHORING.md");
  assert.match(documentation, /SELECT ON TABLE roles, processes, process_steps, operating_model_changes/);
  assert.match(documentation, /GRANT INSERT \([\s\S]+\) ON process_steps/);
  assert.match(documentation, /GRANT UPDATE \([\s\S]+\) ON process_steps/);
  assert.match(documentation, /No `DELETE` or `TRUNCATE` on Process Steps/);
  assert.match(documentation, /System, Exception, and Process-System privileges are limited/);
  assert.match(documentation, /No mutation privileges on Process dependencies/);
  assert.match(documentation, /No `UPDATE` or `DELETE` on `operating_model_changes`/);
});

test("all migration 0014 identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read("drizzle/0014_workspace_studio_step_builder.sql");
  const identifiers = [
    ...migration.matchAll(
      /(?:CONSTRAINT|INDEX|TRIGGER|FUNCTION|TYPE|TABLE)\s+(?:"public"\.)?"?([a-z0-9_]+)"?/gi,
    ),
  ].map((match) => match[1]);
  for (const identifier of identifiers) {
    assert.ok(
      Buffer.byteLength(identifier, "utf8") <= 63,
      `${identifier} exceeds PostgreSQL's identifier limit`,
    );
  }
});
