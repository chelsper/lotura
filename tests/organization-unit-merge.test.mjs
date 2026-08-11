import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0013 expands only the structural history action enum", async () => {
  const [migration, schema] = await Promise.all([
    read("drizzle/0013_organization_unit_merge.sql"),
    read("db/schema.ts"),
  ]);

  assert.match(
    migration,
    /ALTER TYPE "public"\."organization_structure_change_action" ADD VALUE 'merge_unit'/,
  );
  assert.match(schema, /"merge_unit"/);
  assert.doesNotMatch(
    migration,
    /CREATE TABLE|DROP|DELETE|TRUNCATE|UPDATE|INSERT INTO|ALTER TABLE/i,
  );
  assert.equal([...migration.matchAll(/ALTER TYPE/g)].length, 1);
});

test("Unit merge is server-authorized, tenant-scoped, stale-safe, and atomic", async () => {
  const [actions, administration] = await Promise.all([
    read("app/organization/actions.ts"),
    read("lib/organization-structure-administration.ts"),
  ]);

  assert.match(actions, /export async function mergeOrganizationUnitAction/);
  assert.match(administration, /export async function mergeOrganizationUnit/);
  assert.match(administration, /await administrationAccess\(\)/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
  assert.match(administration, /expectedImpactFingerprint/);
  assert.match(administration, /expectedTargetRevision/);
  assert.match(administration, /date_trunc\('milliseconds', source\.updated_at\)/);
  assert.match(administration, /date_trunc\('milliseconds', target\.updated_at\)/);
  assert.match(administration, /await atomicQuery\(/);
});

test("Unit merge preserves identities and changes only direct structural placement", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  const start = administration.indexOf(
    "export async function mergeOrganizationUnit",
  );
  const end = administration.indexOf("\nasync function assignmentContext", start);
  const source = administration.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(source, /update positions position/);
  assert.match(source, /set organization_unit_id = eligible\.target_id/);
  assert.match(source, /update organization_units child/);
  assert.match(source, /set parent_organization_unit_id = eligible\.target_id/);
  assert.match(source, /update organization_units source/);
  assert.match(source, /set status = 'retired'/);
  assert.doesNotMatch(source, /delete\s+from/i);
  assert.doesNotMatch(source, /set\s+stable_key/i);
  for (const table of [
    "people",
    "position_assignments",
    "position_reporting_relationships",
    "role_mandates",
    "role_coverages",
    "processes",
    "process_steps",
  ]) {
    assert.doesNotMatch(source, new RegExp(`update\\s+${table}`, "i"));
  }
});

test("Unit merge rejects self and descendant targets before retiring the source", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(
    administration,
    /input\.sourceStableKey === input\.targetStableKey/,
  );
  assert.match(administration, /descendants\(id\) as/);
  assert.match(
    administration,
    /not exists \(\s*select 1 from descendants where descendants\.id = target\.id\s*\)/,
  );
  assert.match(administration, /impact\.fingerprint = \$6::text/);
  assert.match(
    administration,
    /\(select count\(\*\) from moved_positions\)[\s\S]*\(select count\(\*\) from position_before\)/,
  );
  assert.match(
    administration,
    /\(select count\(\*\) from moved_children\)[\s\S]*\(select count\(\*\) from child_before\)/,
  );
});

test("Unit merge writes complete append-only history for every affected identity", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(administration, /position_history as \(/);
  assert.match(administration, /child_history as \(/);
  assert.match(administration, /source_history as \(/);
  assert.match(
    administration,
    /'organization_unit'[\s\S]*'merge_unit'/,
  );
  assert.match(administration, /mergedIntoOrganizationUnitStableKey/);
  assert.match(administration, /directPositionsMoved/);
  assert.match(administration, /directChildUnitsMoved/);
  assert.match(administration, /position_history_count/);
  assert.match(administration, /child_history_count/);
});

test("Studio presents an explicit merge preview without changing browse surfaces", async () => {
  const [panel, docs] = await Promise.all([
    read("app/organization/structure-administration-panel.tsx"),
    read("docs/ORGANIZATION_STRUCTURE_ADMINISTRATION.md"),
  ]);

  assert.match(panel, /Merge into an existing Unit/);
  assert.match(panel, /Direct merge impact/);
  assert.match(panel, /This list excludes the source and all of its descendants/);
  assert.match(panel, /retire—not delete—the\s+source identity/);
  assert.match(panel, /name="confirmMerge"/);
  assert.match(panel, /mergeImpactFingerprint/);
  assert.match(docs, /Merging duplicate Organization Units/);
  assert.match(docs, /No other structural or operating-model relationship changes/);
});
