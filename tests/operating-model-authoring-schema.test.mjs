import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0010 adds Process identity and one operating-model history table", async () => {
  const migration = await read(
    "drizzle/0010_process_identity_and_operating_model_history.sql",
  );
  assert.match(migration, /ALTER TABLE "processes" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid\(\) NOT NULL/);
  assert.match(migration, /CREATE TABLE "operating_model_changes"/);
  assert.equal([...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].length, 1);
  assert.doesNotMatch(migration, /(?:ALTER|DROP|TRUNCATE|DELETE FROM|UPDATE|INSERT INTO) "(?:process_steps|exceptions|systems|process_systems|process_dependencies|role_assignments)"/);
});

test("Process stable keys and history are immutable", async () => {
  const migration = await read(
    "drizzle/0010_process_identity_and_operating_model_history.sql",
  );
  assert.match(migration, /CREATE TRIGGER "processes_stable_key_immutable_trigger"/);
  assert.match(migration, /BEFORE UPDATE OF "stable_key" ON "processes"/);
  assert.match(migration, /process stable keys are immutable/);
  assert.match(migration, /CREATE TRIGGER "operating_model_changes_immutable_trigger"/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON "operating_model_changes"/);
});

test("the tenant-safe history prerequisite precedes its restrictive foreign key", async () => {
  const migration = await read(
    "drizzle/0010_process_identity_and_operating_model_history.sql",
  );
  assert.ok(
    migration.indexOf("processes_id_org_stable_key_unique") <
      migration.indexOf("operating_model_changes_process_org_stable_fk"),
  );
  assert.match(
    migration,
    /FOREIGN KEY \("process_id","organization_id","process_stable_key"\).*ON DELETE restrict/,
  );
});

test("history stores explicit audit semantics without pretending to be Process versions", async () => {
  const [migration, documentation] = await Promise.all([
    read("drizzle/0010_process_identity_and_operating_model_history.sql"),
    read("docs/OPERATING_MODEL_AUTHORING.md"),
  ]);
  for (const column of [
    "organization_id",
    "process_stable_key",
    "change_kind",
    "change_action",
    "before_state",
    "after_state",
    "reason",
    "effective_at",
    "actor_identifier",
    "created_at",
  ]) {
    assert.match(migration, new RegExp(`"${column}"`));
  }
  assert.match(documentation, /not (?:approved )?Process version history/i);
});

test("all explicit migration identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read(
    "drizzle/0010_process_identity_and_operating_model_history.sql",
  );
  const identifiers = [
    ...migration.matchAll(
      /(?:CONSTRAINT|INDEX|TRIGGER|FUNCTION|TYPE|TABLE)\s+(?:"public"\.)?"?([a-z0-9_]+)"?/gi,
    ),
  ].map((match) => match[1]);
  for (const identifier of identifiers) {
    assert.ok(Buffer.byteLength(identifier, "utf8") <= 63, `${identifier} exceeds PostgreSQL's identifier limit`);
  }
});
