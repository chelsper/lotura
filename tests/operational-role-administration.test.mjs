import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0009 adds only truthful mandate and coverage history actions", async () => {
  const migration = await read(
    "drizzle/0009_operational_role_administration.sql",
  );
  for (const action of [
    "establish_role_mandate",
    "end_role_mandate",
    "establish_role_coverage",
    "end_role_coverage",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `ALTER TYPE "public"\\."organization_structure_change_action" ADD VALUE '${action}'`,
      ),
    );
  }
  assert.doesNotMatch(
    migration,
    /CREATE TABLE|DROP|TRUNCATE|DELETE FROM|UPDATE\s|INSERT INTO/i,
  );
});

test("Position administration keeps structure, responsibility, and coverage explicit", async () => {
  const panel = await read(
    "app/organization/structure-administration-panel.tsx",
  );
  assert.match(panel, /Operational responsibility maintenance/);
  assert.match(panel, /Select a durable responsibility/);
  assert.match(panel, /Create a new Operational Role/);
  assert.match(
    panel,
    /Position title and reporting line are context only\. They never\s+create or select an Operational Role automatically/,
  );
  assert.match(
    panel,
    /Position occupancy is context only\. Selecting a Person here records a\s+separate, explicit operational-coverage decision/,
  );
  assert.doesNotMatch(panel, /defaultValue=\{position\.title\}/);
});

test("new Operational Roles exist only inside an atomic first-mandate transaction", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(
    administration,
    /created_role as \([\s\S]+insert into roles[\s\S]+mandate as \([\s\S]+insert into role_mandates[\s\S]+audit as \(/,
  );
  assert.match(administration, /from changed, created_role, mandate\s+returning 1/);
  assert.match(
    administration,
    /lower\(trim\(existing_role\.name\)\) = lower\(trim\(\$5\)\)/,
  );
  assert.match(
    administration,
    /console\.error\("organization_structure_role_mandate_failed", \{ sqlState \}\)/,
  );
  assert.doesNotMatch(
    administration,
    /console\.error\([^;\n]*(?:message|stack|query|values)/,
  );
});

test("mandate and coverage writes are tenant-scoped and compare-and-set protected", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  for (const functionName of [
    "establishRoleMandate",
    "endRoleMandate",
    "establishRoleCoverage",
    "endRoleCoverage",
  ]) {
    assert.match(
      administration,
      new RegExp(`export async function ${functionName}`),
    );
  }
  assert.match(
    administration,
    /where organization_id = \$1 and id = \$2 and status = 'active'/,
  );
  assert.match(
    administration,
    /where organization_id = \$1 and stable_key = \$2::uuid\s+and status = 'active'/,
  );
  assert.ok(
    [
      ...administration.matchAll(
        /date_trunc\('milliseconds', updated_at\) = \$\d+::timestamptz/g,
      ),
    ].length >= 12,
  );
  assert.ok(
    [...administration.matchAll(/administrationAccess\(\)/g)].length >= 12,
  );
});

test("every mandate and coverage mutation appends history in the same statement", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  for (const action of [
    "establish_role_mandate",
    "end_role_mandate",
    "establish_role_coverage",
    "end_role_coverage",
  ]) {
    assert.match(administration, new RegExp(`["']${action}["']`));
  }
  assert.match(administration, /from changed, mandate\s+returning 1/);
  assert.match(administration, /from changed, coverage\s+returning 1/);
  assert.doesNotMatch(
    administration,
    /update organization_structure_changes|delete from organization_structure_changes/i,
  );
});

test("shared mandates and non-permanent coverage require explanatory context", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(
    administration,
    /Shared responsibility requires an explicit scope/,
  );
  assert.match(
    administration,
    /Temporary or delegated coverage requires a specific reason/,
  );
  assert.match(administration, /role_mandates_shared_scope_check|mandateType === "shared"/);
});

test("a mandate cannot end while current coverage still depends on it", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(administration, /has_current_coverage/);
  assert.match(
    administration,
    /End current Role Coverage before ending this mandate/,
  );
  assert.match(
    administration,
    /not exists \([\s\S]+from role_coverages current_coverage/,
  );
});

test("the read projection exposes active Roles and relationship revisions without changing FLOW", async () => {
  const [declarations, projection, neon] = await Promise.all([
    read("lib/organization-structure-data.d.mts"),
    read("lib/organization-structure-data.mjs"),
    read("lib/organization-structure-neon.ts"),
  ]);
  assert.match(declarations, /operationalRoles: Array/);
  assert.match(declarations, /export type StructureMandate[\s\S]+revision: string/);
  assert.match(projection, /operatingModel\.roles\.map/);
  assert.match(projection, /revision: revision\(mandate, revisionFallback\)/);
  assert.match(projection, /revision: revision\(item, revisionFallback\)/);
  assert.match(neon, /updatedAt: roleMandate\.updatedAt/);
  assert.match(neon, /updatedAt: roleCoverage\.updatedAt/);
});

test("the least-privilege contract grants only required responsibility-bridge writes", async () => {
  const documentation = await read(
    "docs/ORGANIZATION_STRUCTURE_ADMINISTRATION.md",
  );
  assert.match(documentation, /GRANT INSERT \(organization_id, name, description, status\)/);
  assert.match(documentation, /ON role_mandates TO <structure_admin_role>/);
  assert.match(documentation, /ON role_coverages TO <structure_admin_role>/);
  assert.match(documentation, /roles_id_seq/);
  assert.match(documentation, /role_mandates_id_seq/);
  assert.match(documentation, /role_coverages_id_seq/);
  assert.match(documentation, /receives neither `UPDATE` nor `DELETE`/);
  assert.match(documentation, /no `DELETE`, `TRUNCATE`/);
});
