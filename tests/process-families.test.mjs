import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0023 adds first-class Process Families and explicit memberships only", async () => {
  const migration = await read("drizzle/0023_process_families.sql");
  assert.match(migration, /CREATE TABLE "process_families"/);
  assert.match(migration, /CREATE TABLE "process_family_memberships"/);
  assert.match(migration, /process_family_membership_status.*active.*ended/);
  for (const value of [
    "create_process_family",
    "update_process_family",
    "deactivate_process_family",
    "add_process_family_membership",
    "end_process_family_membership",
  ]) {
    assert.match(migration, new RegExp(`ADD VALUE '${value}'`));
  }
  assert.match(migration, /ADD VALUE 'process_family'/);
  assert.match(migration, /ADD VALUE 'process_family_membership'/);
  assert.doesNotMatch(migration, /parent_process|primary_family|inherit|subprocess|composition/);
  assert.doesNotMatch(migration, /INSERT INTO "?process_families|UPDATE "?processes|DELETE FROM|TRUNCATE/i);
});

test("Family and membership identity, lifecycle, and tenant boundaries are durable", async () => {
  const migration = await read("drizzle/0023_process_families.sql");
  assert.match(migration, /process_families_stable_key_unique/);
  assert.match(migration, /process_family_memberships_stable_key_unique/);
  assert.match(migration, /process_family_memberships_active_pair_unique.*WHERE "process_family_memberships"\."status" = 'active'/);
  assert.match(migration, /FOREIGN KEY \("process_family_id","organization_id"\).*ON DELETE restrict/);
  assert.match(migration, /FOREIGN KEY \("process_id","organization_id"\).*ON DELETE restrict/);
  assert.match(migration, /process_families_identity_status_trigger/);
  assert.match(migration, /process_family_memberships_guard_trigger/);
  assert.match(migration, /inactive process families cannot be reactivated/);
  assert.match(migration, /process family with active memberships cannot be deactivated/);
  assert.match(migration, /ended process family memberships are immutable/);
});

test("Family history targets are typed, tenant-safe, and append to the existing operating-model ledger", async () => {
  const migration = await read("drizzle/0023_process_families.sql");
  assert.match(migration, /operating_model_changes_family_org_stable_fk/);
  assert.match(migration, /operating_model_changes_family_membership_context_fk/);
  assert.match(migration, /"entity_type" = 'process_family'.*"process_family_id" is not null/s);
  assert.match(migration, /"entity_type" = 'process_family_membership'.*"process_id" is not null.*"process_family_membership_id" is not null/s);
  assert.doesNotMatch(migration, /CREATE TABLE "process_family_changes"/);
  assert.ok(
    migration.indexOf("process_family_memberships_identity_context_unique") <
      migration.indexOf("operating_model_changes_family_membership_context_fk"),
  );
});

test("Family mutations reuse the protected Process-admin boundary and trusted scope", async () => {
  const [administration, actions] = await Promise.all([
    read("lib/process-family-administration.ts"),
    read("app/studio/process-families/actions.ts"),
  ]);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveOperatingModelAuthoringConfiguration/);
  assert.match(administration, /configuration\.organizationId/g);
  assert.match(administration, /configuration\.actorIdentifier/g);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.doesNotMatch(administration, /process\.env\.(?:DATABASE_URL|DATABASE_URL_UNPOOLED|LOTURA_STRUCTURE_ADMIN_DATABASE_URL)/);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
});

test("every Family mutation is stale-safe and atomically appends exact history", async () => {
  const [administration, data] = await Promise.all([
    read("lib/process-family-administration.ts"),
    read("lib/process-family-data.ts"),
  ]);
  for (const action of [
    "create_process_family",
    "update_process_family",
    "deactivate_process_family",
    "add_process_family_membership",
    "end_process_family_membership",
  ]) {
    assert.match(administration, new RegExp(`'${action}'`));
  }
  assert.equal(
    (administration.match(/insert into operating_model_changes/g) ?? []).length,
    7,
  );
  assert.match(administration, /expectedFamilyRevision/g);
  assert.match(administration, /expectedMembershipRevision/);
  assert.match(administration, /family\.updated_at = \$3::timestamptz/g);
  assert.match(administration, /membership\.updated_at = \$5::timestamptz/);
  assert.match(data, /sql<string>`\$\{processFamily\.updatedAt\}::text`/g);
  assert.match(data, /sql<string>`\$\{processFamilyMembership\.updatedAt\}::text`/);
  assert.match(administration, /with current_family as[\s\S]+history as/);
  assert.doesNotMatch(administration, /(?:update|delete from) operating_model_changes/i);
  assert.doesNotMatch(administration, /delete from process_families|delete from process_family_memberships/i);
});

test("Process Family UX remains explicit, conversational, and non-inheriting", async () => {
  const [studio, catalog, workspace, processes, processDetail] = await Promise.all([
    read("app/studio/page.tsx"),
    read("app/studio/process-families/page.tsx"),
    read("app/studio/process-families/process-family-workspace.tsx"),
    read("app/studio/processes/process-builder-browser.tsx"),
    read("app/studio/processes/[processId]/page.tsx"),
  ]);
  assert.match(studio, /href: "\/studio\/process-families"/);
  assert.match(catalog, /A Process may belong to more than one Family/);
  assert.match(catalog, /never creates inheritance, dependency, or approval/);
  assert.match(await read("lib/process-family-data.ts"), /memberProcessNames/);
  assert.match(await read("app\/studio\/process-families\/process-family-browser.tsx"), /\.\.\.family\.memberProcessNames/);
  assert.match(workspace, /Each member Process keeps its own purpose, Steps, responsibilities, Systems, Exceptions, governance, and history/);
  assert.match(workspace, /Add an existing Process/);
  assert.match(workspace, /End this Family membership/);
  assert.match(workspace, /Append-only activity/);
  assert.equal(
    (workspace.match(/<ChangeFields today=\{today\} \/>/g) ?? []).length,
    6,
    "definition, membership add/end, relationship add/end, and Family deactivation must preserve change classification",
  );
  assert.match(processes, /Family:/);
  assert.match(processDetail, /Process Family context/);
  assert.doesNotMatch(workspace, /inherits? from Family|Approve Family/i);
});

test("Family routes authorize before organization-scoped reads and fail closed", async () => {
  const [catalogRoute, createRoute, detailRoute, data] = await Promise.all([
    read("app/studio/process-families/page.tsx"),
    read("app/studio/process-families/new/page.tsx"),
    read("app/studio/process-families/[stableKey]/page.tsx"),
    read("lib/process-family-data.ts"),
  ]);
  for (const route of [catalogRoute, createRoute, detailRoute]) {
    assert.match(route, /await loadWorkspaceExperience\(\)/);
    assert.match(route, /if \(!experience\.authoring\.enabled\) notFound\(\)/);
  }
  assert.ok(
    detailRoute.indexOf("await loadWorkspaceExperience") <
      detailRoute.indexOf("loadProcessFamilyContext("),
  );
  assert.match(detailRoute, /if \(!context\) notFound\(\)/);
  assert.match(data, /eq\(processFamily\.organizationId, organizationId\)/g);
  assert.match(data, /eq\(processFamilyMembership\.organizationId, organizationId\)/g);
  assert.doesNotMatch(data, /insert\(|update\(|delete\(/);
});

test("the reviewed privilege delta remains least-privilege and runtime stays read-only", async () => {
  const documentation = await read("docs/OPERATING_MODEL_AUTHORING.md");
  const delta = documentation.slice(documentation.indexOf("## Process Families v0.1 privilege delta"));
  assert.match(delta, /GRANT SELECT ON TABLE process_families, process_family_memberships/);
  assert.match(delta, /GRANT INSERT \([\s\S]+\) ON process_families/);
  assert.match(delta, /GRANT UPDATE \([\s\S]+\) ON process_families/);
  assert.match(delta, /GRANT INSERT \([\s\S]+\) ON process_family_memberships/);
  assert.match(delta, /GRANT UPDATE \([\s\S]+\) ON process_family_memberships/);
  assert.match(delta, /runtime role receives `SELECT`/);
  assert.match(delta, /no `DELETE` or `TRUNCATE`/);
  assert.match(delta, /no history `UPDATE` or `DELETE`/);
  assert.match(delta, /no Role, Position, Person, Unit, System, Exception/);
});

test("LAD-055 records explicit membership without hierarchy or inheritance", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const decision = decisions.slice(decisions.indexOf("### LAD-055"));
  assert.match(decision, /many-to-many/);
  assert.match(decision, /no primary Family/i);
  assert.match(decision, /does not provide or inherit/i);
  assert.match(decision, /Existing `ProcessDependency` remains operational reliance/);
  assert.match(decision, /same serializable transaction/);
  assert.match(decision, /existing dedicated Process-admin boundary/);
});

test("all migration 0023 identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read("drizzle/0023_process_families.sql");
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
