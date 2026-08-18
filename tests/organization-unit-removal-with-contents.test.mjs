import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0022 adds only the distinct Unit-removal history action", async () => {
  const [migration, schema] = await Promise.all([
    read("drizzle/0022_retire_unit_and_move_contents.sql"),
    read("db/schema.ts"),
  ]);

  assert.match(
    migration,
    /ALTER TYPE "public"\."organization_structure_change_action" ADD VALUE 'retire_unit_and_move_contents'/,
  );
  assert.match(schema, /"retire_unit_and_move_contents"/);
  assert.doesNotMatch(
    migration,
    /CREATE TABLE|DROP|DELETE|TRUNCATE|UPDATE|INSERT INTO|ALTER TABLE/i,
  );
  assert.equal([...migration.matchAll(/ALTER TYPE/g)].length, 1);
});

test("populated Unit removal is server-authorized, tenant-scoped, stale-safe, and atomic", async () => {
  const [actions, administration] = await Promise.all([
    read("app/organization/actions.ts"),
    read("lib/organization-structure-administration.ts"),
  ]);

  assert.match(
    actions,
    /export async function removeOrganizationUnitAndMoveContentsAction/,
  );
  assert.match(
    administration,
    /export async function removeOrganizationUnitAndMoveContents/,
  );
  assert.match(administration, /await administrationAccess\(\)/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
  assert.match(administration, /expectedImpactFingerprint/);
  assert.match(administration, /expectedTargetRevision/);
  assert.match(administration, /await atomicQuery\(/);
  assert.match(
    administration,
    /action: "retire_unit_and_move_contents"/,
  );
});

test("populated Unit removal moves only direct structural contents and retires the source", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  const start = administration.indexOf(
    "async function transferOrganizationUnitContents",
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

test("populated Unit removal rejects unsafe destinations and stale impact", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );

  assert.match(administration, /input\.sourceStableKey === input\.targetStableKey/);
  assert.match(administration, /descendants\(id\) as/);
  assert.match(
    administration,
    /not exists \(\s*select 1 from descendants where descendants\.id = target\.id\s*\)/,
  );
  assert.match(administration, /impact\.fingerprint = \$6::text/);
  assert.match(
    administration,
    /date_trunc\('milliseconds', source\.updated_at\)/,
  );
  assert.match(
    administration,
    /date_trunc\('milliseconds', target\.updated_at\)/,
  );
});

test("populated Unit removal records complete history or rolls everything back", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );

  assert.match(administration, /position_history as \(/);
  assert.match(administration, /child_history as \(/);
  assert.match(administration, /source_history as \(/);
  assert.match(administration, /contentsMovedToOrganizationUnitStableKey/);
  assert.match(administration, /directPositionsMoved/);
  assert.match(administration, /directChildUnitsMoved/);
  assert.match(administration, /position_history_count/);
  assert.match(administration, /child_history_count/);
  assert.match(
    administration,
    /Number\(result\?\.position_history_count[\s\S]*=== positionsMoved/,
  );
});

test("Studio explains the removal impact without presenting hard deletion", async () => {
  const [panel, docs, decisions] = await Promise.all([
    read("app/organization/structure-administration-panel.tsx"),
    read("docs/ORGANIZATION_STRUCTURE_ADMINISTRATION.md"),
    read("ARCHITECTURE_DECISIONS.md"),
  ]);

  assert.match(panel, /Remove Unit and move its contents/);
  assert.match(panel, /Direct \{isMerge \? "merge" : "removal"\} impact/);
  assert.match(panel, /name=\{isMerge \? "confirmMerge" : "confirmRemovalWithContents"\}/);
  assert.match(panel, /current occupant/);
  assert.match(panel, /Operational Role/);
  assert.match(panel, /retire—not delete—the/);
  assert.match(docs, /Removing a populated Organization Unit/);
  assert.match(decisions, /LAD-054 — Removing a populated Organization Unit/);
});
