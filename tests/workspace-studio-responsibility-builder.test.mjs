import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0012 gives Operational Roles random immutable stable identity", async () => {
  const migration = await read("drizzle/0012_workspace_studio_responsibility_builder.sql");
  assert.match(migration, /roles" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid\(\) NOT NULL/);
  assert.match(migration, /roles_stable_key_unique/);
  assert.match(migration, /roles_id_org_stable_key_unique/);
  assert.match(migration, /roles_stable_key_immutable_trigger/);
  assert.match(migration, /lotura_prevent_stable_key_update/);
  assert.ok(
    migration.indexOf("roles_id_org_stable_key_unique") <
      migration.indexOf("organization_structure_changes_role_org_fk"),
    "the composite Role key must exist before the history foreign key",
  );
});

test("Role-targeted history is tenant-safe, restrictive, and exactly typed", async () => {
  const [schema, migration] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0012_workspace_studio_responsibility_builder.sql"),
  ]);
  assert.match(schema, /"operational_role"/);
  assert.match(schema, /roleId: integer\("role_id"\)/);
  assert.match(schema, /organization_structure_changes_role_org_fk/);
  assert.match(schema, /foreignColumns: \[role\.id, role\.organizationId, role\.stableKey\]/);
  assert.match(migration, /ON DELETE restrict/);
  assert.match(migration, /entity_type" = 'operational_role'/);
  assert.match(migration, /organization_structure_changes_role_created_idx/);
});

test("Role creation and its first mandate append two atomic history events", async () => {
  const source = await read("lib/organization-structure-administration.ts");
  assert.match(source, /created_role as \([\s\S]+mandate as \([\s\S]+role_audit as \([\s\S]+position_audit as \(/);
  assert.match(source, /'operational_role', created_role\.stable_key/);
  assert.match(source, /'position', \$3::uuid/);
  assert.match(source, /from changed, created_role, mandate, role_audit/);
  assert.match(source, /role_audit_count/);
  assert.doesNotMatch(source, /insert into roles[\s\S]{0,300}commit/i);
});

test("Role maintenance is scoped, stale-write protected, and never changes stable identity", async () => {
  const source = await read("lib/organization-structure-administration.ts");
  for (const name of ["updateOperationalRole", "inactivateOperationalRole"]) {
    assert.match(source, new RegExp(`export async function ${name}`));
  }
  assert.match(source, /where id = \$3 and organization_id = \$4 and stable_key = \$5::uuid/);
  assert.match(source, /date_trunc\('milliseconds', updated_at\) = \$6::timestamptz/);
  assert.match(source, /targetDescriptor\("operational_role"\)/);
  assert.doesNotMatch(source, /update roles[\s\S]{0,240}set stable_key/i);
  assert.doesNotMatch(source, /delete from roles/i);
});

test("Role inactivation fails closed across current responsibility dependencies", async () => {
  const source = await read("lib/organization-structure-administration.ts");
  for (const table of [
    "processes",
    "process_steps",
    "exceptions",
    "systems",
    "role_assignments",
    "role_mandates",
  ]) {
    assert.match(source, new RegExp(`from ${table} x`));
  }
  assert.match(source, /status in \('scheduled', 'active'\)/);
  assert.match(source, /Role is still referenced by current or scheduled operating-model responsibility/);
});

test("Responsibility Builder routes require authoritative Studio access before data", async () => {
  const [list, create, detail, experience] = await Promise.all([
    read("app/studio/responsibilities/page.tsx"),
    read("app/studio/responsibilities/roles/new/page.tsx"),
    read("app/studio/responsibilities/roles/[stableKey]/page.tsx"),
    read("lib/organization-structure-experience.ts"),
  ]);
  for (const route of [list, create, detail]) {
    assert.match(route, /loadWorkspaceStudioExperience/);
    assert.match(route, /if \(!experience\.enabled\) notFound\(\)/);
  }
  assert.ok(
    experience.indexOf("requireWorkspaceAccess()") <
      experience.indexOf("loadOrganizationStructure()"),
  );
  assert.match(detail, /candidate\.stableKey === stableKey/);
  assert.match(detail, /if \(!role \|\| !role\.stableKey \|\| !role\.revision\) notFound\(\)/);
});

test("Responsibility UX keeps Role, Position, Person, mandate, and coverage distinct", async () => {
  const [list, create, detail] = await Promise.all([
    read("app/studio/responsibilities/page.tsx"),
    read("app/studio/responsibilities/role-create-form.tsx"),
    read("app/studio/responsibilities/responsibility-role-workspace.tsx"),
  ]);
  assert.match(list, /Roles outlive people/);
  assert.match(list, /never inferred from a title or reporting line/);
  assert.match(create, /Name the durable responsibility—not the current Person or Position title/);
  assert.match(create, /Human coverage remains a separate decision/);
  assert.match(detail, /Position occupancy does not create coverage/);
  assert.match(detail, /Context only/);
});

test("server actions derive scope and actor from the existing protected boundary", async () => {
  const [actions, administration] = await Promise.all([
    read("app/studio/responsibilities/actions.ts"),
    read("lib/organization-structure-administration.ts"),
  ]);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
  assert.match(administration, /const runtimeAccess = await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveOrganizationStructureAdministrationConfiguration/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
});

test("the reviewed privilege delta remains column-limited and append-only", async () => {
  const documentation = await read("docs/ORGANIZATION_STRUCTURE_ADMINISTRATION.md");
  assert.match(documentation, /GRANT UPDATE \(name, description, status, updated_at\)\s+ON roles/);
  assert.match(documentation, /organization_unit_id, position_id, person_id, role_id/);
  for (const table of ["role_assignments", "processes", "process_steps", "exceptions", "systems"]) {
    assert.match(documentation, new RegExp(table));
  }
  assert.match(documentation, /receives neither `UPDATE` nor `DELETE` on\s+`organization_structure_changes`/);
  assert.match(documentation, /no table-wide `INSERT` or `UPDATE`, and no `DELETE`, `TRUNCATE`/);
});

test("existing operating-model keys remain canonical while Role stable identity is additive", async () => {
  const [mapper, data] = await Promise.all([
    read("lib/process-explorer-neon-data.mjs"),
    read("lib/process-explorer-data.ts"),
  ]);
  assert.match(mapper, /key: key\("role", item\.id\)/);
  assert.match(mapper, /stableKey: item\.stableKey/);
  assert.match(data, /id: role\.key/);
  assert.match(data, /stableKey: role\.stableKey \?\? null/);
});

test("LAD-038 records the approved scope and explicit deferrals", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  assert.match(decisions, /LAD-038 — Operational Roles have immutable identity/);
  assert.match(decisions, /Role creation in Responsibility Builder v0\.1 must occur atomically\s+with its first explicit Position mandate/);
  assert.match(decisions, /Position title, Person, Position Assignment, reporting relationship, or\s+current coverage/);
  assert.match(decisions, /Standalone orphan Role\s+creation, Role reactivation/);
});
