import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("migration 0011 expands only the structural history action enum", async () => {
  const [migration, schema] = await Promise.all([
    read("drizzle/0011_workspace_studio_organization_builder.sql"),
    read("db/schema.ts"),
  ]);
  for (const action of ["create", "establish_assignment"]) {
    assert.match(
      migration,
      new RegExp(
        `ALTER TYPE "public"\\."organization_structure_change_action" ADD VALUE '${action}'`,
      ),
    );
    assert.match(schema, new RegExp(`"${action}"`));
  }
  assert.doesNotMatch(
    migration,
    /CREATE TABLE|DROP|DELETE|TRUNCATE|UPDATE|INSERT INTO|ALTER TABLE/i,
  );
  assert.equal(
    [...migration.matchAll(/ALTER TYPE/g)].length,
    2,
  );
});

test("Workspace Studio exposes the approved Organization Builder routes", async () => {
  const routes = [
    "app/studio/page.tsx",
    "app/studio/organization/page.tsx",
    "app/studio/organization/units/new/page.tsx",
    "app/studio/organization/units/[stableKey]/page.tsx",
    "app/studio/organization/positions/new/page.tsx",
    "app/studio/organization/positions/[stableKey]/page.tsx",
    "app/studio/organization/people/new/page.tsx",
    "app/studio/organization/people/[stableKey]/page.tsx",
  ];
  await Promise.all(routes.map((path) => access(new URL(path, root))));
  const source = (await Promise.all(routes.map(read))).join("\n");
  assert.match(source, /loadWorkspaceStudioExperience/);
  assert.match(source, /if \(!experience\.enabled\) notFound\(\)/);
  assert.match(source, /params: Promise<\{ stableKey: string \}>/);
  assert.match(source, /data\.units\.find\(\(item\) => item\.id === stableKey\)/);
  assert.match(source, /data\.positions\.find\(\(item\) => item\.id === stableKey\)/);
  assert.match(source, /data\.people\.find\(\(item\) => item\.id === stableKey\)/);
});

test("Studio access fails closed before any structure source load", async () => {
  const experience = await read("lib/organization-structure-experience.ts");
  const studioStart = experience.indexOf(
    "export async function loadWorkspaceStudioExperience",
  );
  const studioSource = experience.slice(studioStart);
  assert.ok(studioStart >= 0);
  assert.ok(
    studioSource.indexOf("await requireWorkspaceAccess()") <
      studioSource.indexOf("await loadOrganizationStructure()"),
  );
  assert.ok(
    studioSource.indexOf("if (!administration.enabled)") <
      studioSource.indexOf("await loadOrganizationStructure()"),
  );
  assert.match(studioSource, /return \{ enabled: false as const \}/);
});

test("public and browse surfaces never expose canonical mutation controls", async () => {
  const [shell, unit, position, person, studioDetail] = await Promise.all([
    read("app/workspace-shell.tsx"),
    read("app/organization/organization-unit-detail.tsx"),
    read("app/organization/position-detail.tsx"),
    read("app/organization/person-detail.tsx"),
    read("app/studio/studio-structure-detail.tsx"),
  ]);
  assert.match(shell, /studioOnly: true/);
  assert.match(shell, /studioEnabled/);
  for (const source of [unit, position, person]) {
    assert.doesNotMatch(source, /StructureAdministrationPanel/);
    assert.match(source, /Maintain in Workspace Studio/);
  }
  assert.match(studioDetail, /StructureAdministrationPanel/);
  assert.match(studioDetail, /Source evidence remains unchanged/);
});

test("creation uses database-generated stable keys and atomic append-only history", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  for (const capability of [
    "createOrganizationUnit",
    "createPosition",
    "createPerson",
  ]) {
    assert.match(
      administration,
      new RegExp(`export async function ${capability}`),
    );
  }
  assert.match(administration, /changed\.stable_key/);
  assert.match(administration, /'create'/);
  assert.match(administration, /'\{\}'::jsonb/);
  assert.doesNotMatch(
    administration,
    /insert into (?:organization_units|positions|people)[\s\S]{0,220}stable_key/i,
  );
  assert.doesNotMatch(administration, /delete\s+from/i);
});

test("creation SQL explicitly types values reused by inserts and duplicate checks", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(
    administration,
    /select \$1::integer, \$2::varchar\(255\), \$3::integer,/,
  );
  assert.match(
    administration,
    /select \$1::integer, \$2::integer, \$3::varchar\(255\),/,
  );
  assert.match(
    administration,
    /select \$1::integer, \$2::varchar\(255\), 'active'/,
  );
  assert.match(administration, /lower\(trim\(\$2::text\)\)/);
  assert.match(administration, /lower\(trim\(\$3::text\)\)/);
});

test("creation and assignment reauthorize, scope related keys, and never accept Organization from clients", async () => {
  const [actions, administration] = await Promise.all([
    read("app/organization/actions.ts"),
    read("lib/organization-structure-administration.ts"),
  ]);
  assert.match(administration, /await administrationAccess\(\)/g);
  assert.match(administration, /configuration\.organizationId/g);
  assert.match(administration, /configuration\.actorIdentifier/g);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
  assert.match(administration, /selected_person\.organization_id = \$2/);
  assert.match(administration, /parent\.organization_id = \$1/);
  assert.match(administration, /unit\.organization_id = \$1/);
});

test("possible duplicates require explicit review while legitimate duplicates remain representable", async () => {
  const [form, administration] = await Promise.all([
    read("app/studio/organization/structure-create-form.tsx"),
    read("lib/organization-structure-administration.ts"),
  ]);
  assert.match(form, /A matching active \{label\} already exists/);
  assert.match(form, /name="acknowledgePossibleDuplicate"/);
  assert.match(form, /Duplicate names and titles can be legitimate/);
  assert.match(administration, /acknowledgePossibleDuplicate/);
  assert.match(administration, /lower\(trim\(duplicate\.name\)\)/);
  assert.match(administration, /lower\(trim\(duplicate\.title\)\)/);
  assert.match(administration, /lower\(trim\(duplicate\.display_name\)\)/);
});

test("creation failures preserve the review reason and disclose only safe failure categories", async () => {
  const [form, administration] = await Promise.all([
    read("app/studio/organization/structure-create-form.tsx"),
    read("lib/organization-structure-administration.ts"),
  ]);
  assert.match(form, /const \[reason, setReason\] = useState\(""\)/);
  assert.match(form, /<CreationMetadataFields reason=\{reason\} setReason=\{setReason\} \/>/);
  assert.match(form, /value=\{reason\}/);
  assert.match(administration, /organizationUnitCreationFailure/);
  assert.match(administration, /code === "42501"/);
  assert.match(administration, /code === "40001"/);
  assert.match(administration, /\["23503", "23505", "23514"\]\.includes\(code\)/);
  assert.doesNotMatch(
    administration,
    /console\.error\([^\n]+(?:message|databaseUrl|reason|name)/,
  );
});

test("initial Position Assignment preserves the Person, Position, and Role boundary", async () => {
  const [administration, panel] = await Promise.all([
    read("lib/organization-structure-administration.ts"),
    read("app/organization/structure-administration-panel.tsx"),
  ]);
  assert.match(administration, /export async function establishPositionAssignment/);
  assert.match(administration, /'establish_assignment'/);
  assert.match(administration, /update positions[\s\S]+date_trunc\('milliseconds', updated_at\)/);
  assert.match(administration, /insert into position_assignments/);
  assert.match(administration, /from changed, assignment/);
  assert.match(panel, /This records structural occupancy only/);
  assert.match(panel, /does not grant an Operational Role, Role Coverage, Process ownership, or application access/);
});

test("manually created Positions do not inherit source-import vacancy certainty", async () => {
  const [data, adapter] = await Promise.all([
    read("lib/organization-structure-data.mjs"),
    read("lib/organization-structure-neon.ts"),
  ]);
  assert.match(adapter, /introducedByImportId: position\.introducedByImportId/);
  assert.match(data, /item\.introducedByImportId === imported\.id/);
  assert.match(
    data,
    /vacancyEvidenceComplete && position\.vacancyEvidenceSupported !== false/,
  );
});

test("the reviewed structural-write privilege expansion stays column- and sequence-limited", async () => {
  const contract = await read("docs/ORGANIZATION_STRUCTURE_ADMINISTRATION.md");
  for (const table of ["people", "organization_units", "positions"]) {
    assert.match(contract, new RegExp(`ON ${table} TO <structure_admin_role>`));
  }
  for (const sequence of [
    "people_id_seq",
    "organization_units_id_seq",
    "positions_id_seq",
  ]) {
    assert.match(contract, new RegExp(sequence));
  }
  assert.match(contract, /receives neither `UPDATE` nor `DELETE`/);
  assert.match(contract, /no table-wide `INSERT` or `UPDATE`/);
});
