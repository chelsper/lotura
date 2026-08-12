import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0015 adds immutable System and Exception identity with explicit history vocabulary", async () => {
  const migration = await read("drizzle/0015_workspace_studio_technology_exceptions.sql");
  for (const value of [
    "create_system",
    "update_system",
    "deactivate_system",
    "link_system",
    "update_system_usage",
    "unlink_system",
    "create_exception",
    "update_exception",
    "deactivate_exception",
  ]) {
    assert.match(migration, new RegExp(`ADD VALUE '${value}'`));
  }
  for (const value of ["system", "process_system", "exception"]) {
    assert.match(migration, new RegExp(`ADD VALUE '${value}'`));
  }
  assert.match(migration, /"systems" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid\(\) NOT NULL/);
  assert.match(migration, /"exceptions" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid\(\) NOT NULL/);
  assert.match(migration, /CREATE TRIGGER "systems_stable_key_immutable_trigger"/);
  assert.match(migration, /CREATE TRIGGER "exceptions_stable_key_immutable_trigger"/);
  assert.match(migration, /systems_name_not_blank_check/);
  assert.match(migration, /process_systems_usage_not_blank_check/);
  assert.doesNotMatch(migration, /CREATE TABLE|DROP TABLE|DELETE FROM|TRUNCATE/);
});

test("history target shapes are typed, tenant-safe, restrictive, and ordered after prerequisites", async () => {
  const migration = await read("drizzle/0015_workspace_studio_technology_exceptions.sql");
  assert.ok(
    migration.indexOf("systems_id_org_stable_unique") <
      migration.indexOf("operating_model_changes_system_org_stable_fk"),
  );
  assert.ok(
    migration.indexOf("exceptions_id_process_org_stable_unique") <
      migration.indexOf("operating_model_changes_exception_org_stable_fk"),
  );
  assert.match(
    migration,
    /FOREIGN KEY \("system_id","organization_id","system_stable_key"\).*ON DELETE restrict/,
  );
  assert.match(
    migration,
    /FOREIGN KEY \("exception_id","process_id","organization_id","exception_stable_key"\).*ON DELETE restrict/,
  );
  assert.match(migration, /"entity_type" = 'system'.*"process_id" is null/s);
  assert.match(migration, /"entity_type" = 'process_system'.*"process_id" is not null.*"system_id" is not null/s);
  assert.match(migration, /"entity_type" = 'exception'.*"exception_id" is not null/s);
});

test("Technology and Exception mutations reuse the protected authoring boundary and trusted scope", async () => {
  const [administration, actions] = await Promise.all([
    read("lib/technology-exceptions-administration.ts"),
    read("app/process-authoring/actions.ts"),
  ]);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveOperatingModelAuthoringConfiguration/);
  assert.match(administration, /configuration\.organizationId/g);
  assert.match(administration, /configuration\.actorIdentifier/g);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.doesNotMatch(administration, /process\.env\.(?:DATABASE_URL|DATABASE_URL_UNPOOLED|LOTURA_STRUCTURE_ADMIN_DATABASE_URL)/);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
});

test("every canonical Technology or Exception change appends history atomically", async () => {
  const administration = await read("lib/technology-exceptions-administration.ts");
  for (const action of [
    "create_system",
    "update_system",
    "deactivate_system",
    "link_system",
    "update_system_usage",
    "unlink_system",
    "create_exception",
    "update_exception",
    "deactivate_exception",
  ]) {
    assert.match(administration, new RegExp(`'${action}'`));
  }
  const historyInsertions = administration.match(/insert into operating_model_changes/g) ?? [];
  assert.equal(historyInsertions.length, 9);
  assert.match(administration, /from changed/g);
  assert.doesNotMatch(administration, /(?:update|delete from) operating_model_changes/i);
  assert.match(administration, /expectedSystemRevision/);
  assert.match(administration, /expectedExceptionRevision/);
  assert.match(administration, /expectedRevision/);
});

test("System lifecycle and Process-System relationship semantics are bounded", async () => {
  const administration = await read("lib/technology-exceptions-administration.ts");
  assert.match(administration, /Unlink this System from every current Process before deactivating it/);
  assert.match(administration, /where organization_id = \$1[\s\S]+status = 'active'/);
  assert.match(administration, /delete from process_systems target/);
  assert.doesNotMatch(administration, /delete from systems/i);
  assert.doesNotMatch(administration, /truncate systems/i);
  assert.match(administration, /System unlinked from the current Process\. Prior relationship history was preserved/);
});

test("Exception authoring supports optional same-Process Step and active same-Organization Role context", async () => {
  const administration = await read("lib/technology-exceptions-administration.ts");
  assert.match(administration, /join current_process current[\s\S]+where step\.stable_key = \$\d+::uuid/);
  assert.match(administration, /where organization_id = \$1[\s\S]+status = 'active'/);
  assert.match(administration, /item\.status = 'active'/);
  assert.match(administration, /stepStableKey/);
  assert.match(administration, /ownerRoleName/);
  assert.doesNotMatch(administration, /delete from exceptions/i);
  assert.doesNotMatch(administration, /position_assignments|position_reporting_relationships/);
});

test("Technology routes authorize before organization-scoped reads and unknown identities fail closed", async () => {
  const [catalogRoute, createRoute, detailRoute, data] = await Promise.all([
    read("app/studio/technology/page.tsx"),
    read("app/studio/technology/new/page.tsx"),
    read("app/studio/technology/systems/[stableKey]/page.tsx"),
    read("lib/technology-authoring-data.ts"),
  ]);
  for (const route of [catalogRoute, createRoute, detailRoute]) {
    assert.match(route, /await loadWorkspaceExperience\(\)/);
    assert.match(route, /if \(!experience\.authoring\.enabled\) notFound\(\)/);
  }
  assert.ok(
    detailRoute.indexOf("await loadWorkspaceExperience") <
      detailRoute.indexOf("loadTechnologySystemContext("),
  );
  assert.match(detailRoute, /if \(!context\) notFound\(\)/);
  assert.match(data, /eq\(system\.organizationId, organizationId\)/g);
  assert.match(data, /eq\(processSystem\.organizationId, organizationId\)/g);
  assert.doesNotMatch(data, /insert\(|update\(|delete\(/);
});

test("Studio UX separates catalog maintenance, documented use, and legitimate alternate paths", async () => {
  const [studio, technology, system, process] = await Promise.all([
    read("app/studio/page.tsx"),
    read("app/studio/technology/page.tsx"),
    read("app/studio/technology/system-workspace.tsx"),
    read("app/process-authoring/process-authoring-workspace.tsx"),
  ]);
  assert.match(studio, /href: "\/studio\/technology"/);
  assert.match(technology, /does not establish criticality, performance, or risk/);
  assert.match(system, /Every current Process relationship must be removed first/);
  assert.match(system, /Append-only activity/);
  assert.match(process, /Link an existing System/);
  assert.match(process, /A link documents reach; it does not establish criticality/);
  assert.match(process, /Document legitimate alternate paths, not every error/);
  assert.match(process, /Remove from current draft/);
  assert.match(process, /Process dependencies remain read-only/);
  assert.doesNotMatch(process, /Add dependency|Approve Process|AI interview/);
});

test("the Process-admin privilege delta is column-limited and preserves append-only history", async () => {
  const documentation = await read("docs/OPERATING_MODEL_AUTHORING.md");
  assert.match(documentation, /GRANT SELECT ON TABLE systems, exceptions, process_systems/);
  assert.match(documentation, /GRANT INSERT \([\s\S]+\) ON systems/);
  assert.match(documentation, /GRANT UPDATE \([\s\S]+\) ON systems/);
  assert.match(documentation, /GRANT INSERT \([\s\S]+\) ON exceptions/);
  assert.match(documentation, /GRANT UPDATE \([\s\S]+\) ON exceptions/);
  assert.match(documentation, /GRANT UPDATE \(usage\) ON process_systems/);
  assert.match(documentation, /GRANT DELETE ON process_systems/);
  assert.match(documentation, /No `UPDATE` or `DELETE` on `operating_model_changes`/);
  assert.match(documentation, /`DELETE` on `systems` and `exceptions`/);
  assert.match(documentation, /dependency mutation.*remain denied/s);
});

test("LAD-041 records the bounded platform decision and explicit deferrals", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const decision = decisions.slice(decisions.indexOf("### LAD-041"));
  assert.match(decision, /randomly\s+generated Lotura UUID/);
  assert.match(decision, /relationship is identified by the immutable\s+Process and System pair/);
  assert.match(decision, /legitimate\s+alternate-path Exception/);
  assert.match(decision, /Process dependencies.*reactivation.*hard deletion/s);
  assert.match(decision, /AI, and FLOW changes remain intentionally deferred/);
});

test("all migration 0015 identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read("drizzle/0015_workspace_studio_technology_exceptions.sql");
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
