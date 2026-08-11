import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("every Process mutation reauthorizes and derives Organization and actor server-side", async () => {
  const [actions, administration] = await Promise.all([
    read("app/process-authoring/actions.ts"),
    read("lib/operating-model-administration.ts"),
  ]);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /configuration\.organizationId/g);
  assert.match(administration, /configuration\.actorIdentifier/g);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
  assert.doesNotMatch(administration, /process\.env\.(?:DATABASE_URL|DATABASE_URL_UNPOOLED)/);
});

test("canonical changes and history insertions are one serializable operation", async () => {
  const administration = await read("lib/operating-model-administration.ts");
  assert.match(administration, /with current_process as/gi);
  assert.match(administration, /insert into operating_model_changes/gi);
  assert.match(administration, /from changed/gi);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.doesNotMatch(administration, /(?:update|delete from) operating_model_changes/i);
});

test("definition and ownership changes use deterministic stale-write protection", async () => {
  const administration = await read("lib/operating-model-administration.ts");
  const comparisons = administration.match(/date_trunc\('milliseconds', target\.updated_at\) = \$\d+::timestamptz/g) ?? [];
  assert.equal(comparisons.length, 2);
  assert.match(administration, /updated_at = date_trunc\('milliseconds', transaction_timestamp\(\)\)/g);
  assert.match(administration, /This Process changed after the page loaded/);
});

test("ownership is explicit, same-organization, active-Role only, and clearable only for Drafts", async () => {
  const [administration, workspace] = await Promise.all([
    read("lib/operating-model-administration.ts"),
    read("app/process-authoring/process-authoring-workspace.tsx"),
  ]);
  assert.match(administration, /where organization_id = \$1[\s\S]+and status = 'active'/);
  assert.match(administration, /if \(ownerRoleId && !input\.ownerConfirmed\)/);
  assert.match(administration, /current\.status = 'draft'/);
  assert.match(workspace, /never inferred from a Person, Position title, or reporting line/);
  assert.match(workspace, /Position and person details provide current context only/);
  assert.doesNotMatch(administration, /role_mandates|role_coverages|positions|people/);
});

test("the Maintain route requires authoritative access and fails closed", async () => {
  const [route, experience] = await Promise.all([
    read("app/explorer/[processId]/maintain/page.tsx"),
    read("lib/workspace-experience.ts"),
  ]);
  assert.match(route, /await loadWorkspaceExperience\(\)/);
  assert.match(route, /if \(!authoring\.enabled\) notFound\(\)/);
  assert.match(route, /loadProcessAuthoringContext/);
  assert.ok(
    route.indexOf("await loadWorkspaceExperience") <
      route.indexOf("const context = await loadProcessAuthoringContext"),
  );
  assert.match(experience, /const runtimeAccess = await requireWorkspaceAccess\(\)/);
  assert.match(experience, /resolveOperatingModelAuthoringConfiguration/);
});

test("the authoring projection is organization-scoped, read-only, and excludes legacy RoleAssignment", async () => {
  const [data, route] = await Promise.all([
    read("lib/operating-model-authoring-data.ts"),
    read("app/explorer/[processId]/maintain/page.tsx"),
  ]);
  for (const table of ["processTable", "role", "position", "person", "roleMandate", "roleCoverage", "operatingModelChange"]) {
    assert.match(data, new RegExp(`eq\\(${table}\\.organizationId, organizationId\\)`));
  }
  assert.doesNotMatch(data, /insert\(|update\(|delete\(|roleAssignment/);
  assert.doesNotMatch(data, /^import \{ db \} from "@\/db";/m);
  assert.match(data, /const \{ db \} = await import\("@\/db"\)/);
  assert.match(data, /currentAt/);
  assert.match(data, /snapshotAsOf/);
  assert.doesNotMatch(data, /transaction_timestamp/);
  assert.match(route, /decodedProcessId,\s+asOf/);
});

test("the least-privilege contract excludes unrelated writes and immutable-history mutation", async () => {
  const documentation = await read("docs/OPERATING_MODEL_AUTHORING.md");
  assert.match(documentation, /LOTURA_PROCESS_ADMIN_DATABASE_URL/);
  assert.match(documentation, /GRANT UPDATE \([\s\S]+name,[\s\S]+purpose,[\s\S]+owner_role_id,[\s\S]+updated_at[\s\S]+\) ON processes/);
  assert.match(documentation, /GRANT INSERT \([\s\S]+ON operating_model_changes/);
  assert.match(documentation, /No `UPDATE` or `DELETE` on `operating_model_changes`/);
  assert.match(documentation, /No privileges on Process Steps, Systems, Exceptions, dependencies/);
});
