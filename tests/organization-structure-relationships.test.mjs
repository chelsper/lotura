import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0008 adds only truthful reporting-history actions", async () => {
  const migration = await read(
    "drizzle/0008_organization_structure_relationship_administration.sql",
  );
  assert.match(
    migration,
    /ALTER TYPE "public"\."organization_structure_change_action" ADD VALUE 'establish_reporting_relationship'/,
  );
  assert.match(
    migration,
    /ALTER TYPE "public"\."organization_structure_change_action" ADD VALUE 'replace_reporting_relationship'/,
  );
  assert.doesNotMatch(
    migration,
    /CREATE TABLE|DROP|TRUNCATE|DELETE FROM|UPDATE\s|INSERT INTO/i,
  );
});

test("Organization Unit parent maintenance is explicit and cycle-safe", async () => {
  const [actions, administration, panel, structureMigration] = await Promise.all([
    read("app/organization/actions.ts"),
    read("lib/organization-structure-administration.ts"),
    read("app/organization/structure-administration-panel.tsx"),
    read("drizzle/0004_structural_identity_and_current_organization_context.sql"),
  ]);
  assert.match(actions, /parentOrganizationUnitStableKey/);
  assert.match(administration, /parent_organization_unit_id = \$2/);
  assert.match(administration, /organization_id = \$4/);
  assert.match(administration, /An Organization Unit cannot be its own parent/);
  assert.match(panel, /Parent Unit \/ Reports within/);
  assert.match(panel, /Descendant Units are excluded/);
  assert.match(panel, /does not create a manager relationship or assign Process ownership/);
  assert.match(
    structureMigration,
    /CREATE CONSTRAINT TRIGGER "organization_units_parent_cycle_constraint_trigger"/,
  );
  assert.match(structureMigration, /DEFERRABLE INITIALLY DEFERRED/);
});

test("manager maintenance is Position-to-Position with occupant context", async () => {
  const [administration, panel, person] = await Promise.all([
    read("lib/organization-structure-administration.ts"),
    read("app/organization/structure-administration-panel.tsx"),
    read("app/organization/person-detail.tsx"),
  ]);
  assert.match(
    administration,
    /export async function establishPositionReportingRelationship/,
  );
  assert.match(
    administration,
    /export async function replacePositionReportingRelationship/,
  );
  assert.match(panel, /Reporting is maintained between Positions, never\s+directly between\s+People/);
  assert.match(panel, /Current occupants are shown only to help identify the correct\s+structural seats/);
  assert.match(panel, /position\.assignments\.map/);
  assert.match(person, /A Person may occupy more than one Position/);
  assert.match(person, /maintained separately on each Position/);
});

test("establish and replace are scoped, compare-and-set, and atomically audited", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(
    administration,
    /and stable_key = \$3::uuid\s+and date_trunc\('milliseconds', updated_at\) = \$4::timestamptz/,
  );
  assert.match(
    administration,
    /'organizational_change', 'establish_reporting_relationship'/,
  );
  assert.match(
    administration,
    /from changed, relationship\s+returning 1/,
  );
  assert.match(
    administration,
    /'organizational_change', 'replace_reporting_relationship'/,
  );
  assert.match(administration, /from changed, replacement\s+returning 1/g);
  assert.match(
    administration,
    /current_relation\.organization_id = \$2/,
  );
});

test("reporting changes preserve one primary relationship and cycle boundaries", async () => {
  const [administration, reportingMigration] = await Promise.all([
    read("lib/organization-structure-administration.ts"),
    read("drizzle/0005_occupancy_and_reporting_structure.sql"),
  ]);
  assert.match(
    administration,
    /current_relation\.relationship_type = 'primary'/,
  );
  assert.match(administration, /relationship_type = 'primary'/g);
  assert.match(
    reportingMigration,
    /position_reporting_one_active_primary_per_subordinate_idx/,
  );
  assert.match(
    reportingMigration,
    /CREATE CONSTRAINT TRIGGER "position_reporting_primary_cycle_constraint_trigger"/,
  );
  assert.match(reportingMigration, /DEFERRABLE INITIALLY DEFERRED/);
});

test("history targets the subordinate Position instead of relationship row ids", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(administration, /returning position_id as id/);
  assert.ok(
    [...administration.matchAll(/returning subordinate_position_id as id/g)]
      .length >= 3,
  );
});

test("the reviewed write-role contract expands only for relationship maintenance", async () => {
  const documentation = await read(
    "docs/ORGANIZATION_STRUCTURE_ADMINISTRATION.md",
  );
  assert.match(
    documentation,
    /parent_organization_unit_id/,
  );
  assert.match(
    documentation,
    /GRANT INSERT \([\s\S]+subordinate_position_id[\s\S]+ON position_reporting_relationships/,
  );
  assert.match(
    documentation,
    /position_reporting_relationships_id_seq/,
  );
  assert.match(documentation, /receives neither `UPDATE` nor `DELETE`/);
  assert.match(documentation, /no `DELETE`, `TRUNCATE`/);
});
