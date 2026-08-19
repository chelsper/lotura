import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("LAD-059 authorizes a typed acyclic Family graph without inheritance", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const start = decisions.indexOf("### LAD-059");
  assert.notEqual(start, -1);
  const decision = decisions.slice(start);
  assert.match(decision, /multiple broader contexts and multiple narrower Families/);
  assert.match(decision, /directed acyclic graph/);
  assert.match(decision, /does not provide[\s\S]*inherit/);
  assert.match(decision, /does not create another membership in any broader Family/);
  assert.match(decision, /Process composition and `ProcessDependency` remain separate/);
  assert.match(decision, /conflicts with and supersedes no accepted\s+decision/);
});

test("migration 0026 is forward-only and adds one explicit relationship model", async () => {
  const migration = await read("drizzle/0026_process_family_relationships.sql");
  assert.match(migration, /CREATE TYPE "public"\."process_family_relationship_type" AS ENUM\('broader_narrower'\)/);
  assert.match(migration, /CREATE TYPE "public"\."process_family_relationship_status" AS ENUM\('active', 'ended'\)/);
  assert.match(migration, /CREATE TABLE "process_family_relationships"/);
  assert.match(migration, /ADD VALUE 'process_family_relationship'/);
  assert.match(migration, /ADD VALUE 'add_process_family_relationship'/);
  assert.match(migration, /ADD VALUE 'end_process_family_relationship'/);
  assert.doesNotMatch(migration, /INSERT INTO "?process_families|INSERT INTO "?process_family_relationships|UPDATE "?processes|DELETE FROM|TRUNCATE/i);
  assert.doesNotMatch(migration, /parent_family_id|primary_family|process_version/i);
});

test("relationship identity, lifecycle, tenant scope, and graph safeguards are durable", async () => {
  const migration = await read("drizzle/0026_process_family_relationships.sql");
  assert.match(migration, /process_family_relationships_stable_key_unique/);
  assert.match(migration, /process_family_relationships_active_pair_unique/);
  assert.match(migration, /process_family_relationships_distinct_families_check/);
  assert.match(migration, /process_family_relationships_effective_shape_check/);
  assert.match(migration, /process_family_relationships_broader_org_fk/);
  assert.match(migration, /process_family_relationships_narrower_org_fk/);
  assert.match(migration, /process family relationship identity and effective start are immutable/);
  assert.match(migration, /ended process family relationships are immutable/);
  assert.match(migration, /WITH RECURSIVE descendants/i);
  assert.match(migration, /process family relationship would create a cycle/);
  assert.match(migration, /active memberships or relationships cannot be deactivated/);
});

test("relationship history has a typed tenant-safe target and remains outside Process versions", async () => {
  const [migration, administration] = await Promise.all([
    read("drizzle/0026_process_family_relationships.sql"),
    read("lib/process-family-administration.ts"),
  ]);
  assert.match(migration, /operating_model_changes_family_relationship_context_fk/);
  assert.match(migration, /WHEN 'process_family_relationship'[\s\S]+"process_family_relationship_id" IS NOT NULL/i);
  assert.equal(
    (administration.match(/'add_process_family_relationship'/g) ?? []).length >= 1,
    true,
  );
  assert.equal(
    (administration.match(/'end_process_family_relationship'/g) ?? []).length >= 1,
    true,
  );
  assert.equal(
    (administration.match(/insert into operating_model_changes/g) ?? []).length,
    7,
  );
  assert.doesNotMatch(administration, /insert into process_versions|update process_versions/i);
  assert.doesNotMatch(administration, /update operating_model_changes|delete from operating_model_changes/i);
});

test("Family relationship mutations reuse trusted Process-admin scope and stale-write protection", async () => {
  const [administration, actions] = await Promise.all([
    read("lib/process-family-administration.ts"),
    read("app/studio/process-families/actions.ts"),
  ]);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveOperatingModelAuthoringConfiguration/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.match(administration, /configuration\.organizationId/g);
  assert.match(administration, /configuration\.actorIdentifier/g);
  assert.match(administration, /family\.updated_at = \$3::timestamptz/g);
  assert.match(administration, /relationship\.updated_at = \$5::timestamptz/);
  assert.match(administration, /with recursive current_family/i);
  assert.match(administration, /would_cycle/);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
  assert.doesNotMatch(administration, /process\.env\.(?:DATABASE_URL|DATABASE_URL_UNPOOLED|LOTURA_STRUCTURE_ADMIN_DATABASE_URL)/);
});

test("Workspace Studio separates broader contexts, narrower Families, and direct Process membership", async () => {
  const [workspace, data] = await Promise.all([
    read("app/studio/process-families/process-family-workspace.tsx"),
    read("lib/process-family-data.ts"),
  ]);
  assert.match(workspace, /Broader work contexts/);
  assert.match(workspace, /More specific Families/);
  assert.match(workspace, /Processes directly in this Family/);
  assert.match(workspace, /does not create inheritance or a dependency/);
  assert.match(workspace, /Place this Family in a broader context/);
  assert.match(workspace, /End this Family relationship/);
  assert.match(data, /This would create a loop/);
  assert.match(data, /eq\(processFamilyRelationship\.organizationId, organizationId\)/);
  assert.match(data, /descendantFamilyIds/);
  assert.doesNotMatch(data, /insert\(|update\(|delete\(/);
});

test("the LAD-059 privilege delta is column-limited and runtime remains read-only", async () => {
  const documentation = await read("docs/OPERATING_MODEL_AUTHORING.md");
  const delta = documentation.slice(
    documentation.indexOf("## Process Family Relationships v0.1 privilege delta"),
  );
  assert.match(delta, /GRANT SELECT ON TABLE process_family_relationships/);
  assert.match(delta, /GRANT INSERT \([\s\S]+\) ON process_family_relationships/);
  assert.match(delta, /GRANT UPDATE \([\s\S]+\) ON process_family_relationships/);
  assert.match(delta, /GRANT INSERT \([\s\S]+process_family_relationship_id[\s\S]+ON operating_model_changes/);
  assert.match(delta, /runtime role receives `SELECT`/);
  assert.match(delta, /no relationship\s+`DELETE` or `TRUNCATE`/);
  assert.match(delta, /no history `UPDATE` or `DELETE`/);
  assert.match(delta, /does not mutate Process\s+membership, Process dependencies, or Process versions/);
});

test("all migration 0026 identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read("drizzle/0026_process_family_relationships.sql");
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
