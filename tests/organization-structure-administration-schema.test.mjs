import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0007 adds only the append-only structure change ledger", async () => {
  const migration = await read(
    "drizzle/0007_organization_structure_administration.sql",
  );
  assert.match(
    migration,
    /CREATE TABLE "organization_structure_changes"/,
  );
  assert.equal(
    [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].length,
    1,
  );
  assert.match(
    migration,
    /"stable_key" uuid DEFAULT gen_random_uuid\(\) NOT NULL/,
  );
  assert.match(
    migration,
    /organization_structure_changes_target_check.*entity_type.*organization_unit.*position.*person/s,
  );
  assert.match(
    migration,
    /organization_structure_changes_json_objects_check/,
  );
  assert.doesNotMatch(
    migration,
    /(?:ALTER|DROP|TRUNCATE|DELETE FROM|UPDATE|INSERT INTO) "(?:organization_units|people|positions|position_assignments|position_reporting_relationships|role_mandates|role_coverages)"/,
  );
});

test("change history retains explicit target identity and structural actions", async () => {
  const migration = await read(
    "drizzle/0007_organization_structure_administration.sql",
  );
  assert.match(
    migration,
    /organization_structure_change_entity_type.*'organization_unit', 'position', 'person'/,
  );
  assert.match(migration, /"target_stable_key" uuid NOT NULL/);
  for (const action of [
    "end_assignment",
    "replace_assignment",
    "end_reporting_relationship",
    "correct_reporting_relationship",
  ]) {
    assert.match(migration, new RegExp(`'${action}'`));
  }
});

test("change targets are tenant-safe, restrictive, and exactly one entity", async () => {
  const migration = await read(
    "drizzle/0007_organization_structure_administration.sql",
  );
  for (const constraint of [
    "organization_structure_changes_unit_org_fk",
    "organization_structure_changes_position_org_fk",
    "organization_structure_changes_person_org_fk",
  ]) {
    assert.match(
      migration,
      new RegExp(`${constraint}[^;]+ON DELETE restrict`),
    );
  }
  assert.match(
    migration,
    /FOREIGN KEY \("organization_unit_id","organization_id","target_stable_key"\)/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \("position_id","organization_id","target_stable_key"\)/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \("person_id","organization_id","target_stable_key"\)/,
  );
});

test("composite target prerequisites precede the audit foreign keys", async () => {
  const migration = await read(
    "drizzle/0007_organization_structure_administration.sql",
  );
  for (const [prerequisite, foreignKey] of [
    [
      "organization_units_id_org_stable_key_unique",
      "organization_structure_changes_unit_org_fk",
    ],
    [
      "positions_id_org_stable_key_unique",
      "organization_structure_changes_position_org_fk",
    ],
    [
      "people_id_org_stable_key_unique",
      "organization_structure_changes_person_org_fk",
    ],
  ]) {
    assert.ok(
      migration.indexOf(prerequisite) < migration.indexOf(foreignKey),
      `${prerequisite} must precede ${foreignKey}`,
    );
  }
});

test("change history is immutable at the database boundary", async () => {
  const migration = await read(
    "drizzle/0007_organization_structure_administration.sql",
  );
  assert.match(
    migration,
    /CREATE TRIGGER "organization_structure_changes_immutable_trigger"/,
  );
  assert.match(
    migration,
    /BEFORE UPDATE OR DELETE ON "organization_structure_changes"/,
  );
  assert.match(
    migration,
    /RAISE EXCEPTION 'organization structure change records are immutable'/,
  );
});

test("all explicit migration identifiers stay within PostgreSQL's limit", async () => {
  const migration = await read(
    "drizzle/0007_organization_structure_administration.sql",
  );
  const identifiers = [
    ...migration.matchAll(
      /(?:CONSTRAINT|INDEX|TRIGGER|FUNCTION|TYPE|TABLE)\s+(?:"public"\.)?"?([a-z0-9_]+)"?/gi,
    ),
  ].map((match) => match[1]);
  for (const identifier of identifiers) {
    assert.ok(
      Buffer.byteLength(identifier, "utf8") <= 63,
      `${identifier} exceeds PostgreSQL's 63-byte identifier limit`,
    );
  }
});
