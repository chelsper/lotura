import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the Server Action module exports async functions only at runtime", async () => {
  const [actions, actionState] = await Promise.all([
    read("app/organization/actions.ts"),
    read("app/organization/action-state.ts"),
  ]);
  assert.match(actions, /^"use server";/);
  assert.doesNotMatch(actions, /export const|export class|export enum/);
  assert.doesNotMatch(actions, /initialStructureActionState/);
  assert.match(actionState, /export const initialStructureActionState/);
});

test("every structural mutation reauthorizes and uses trusted server scope", async () => {
  const [actions, administration] = await Promise.all([
    read("app/organization/actions.ts"),
    read("lib/organization-structure-administration.ts"),
  ]);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(
    administration,
    /configuration\.organizationId/g,
  );
  assert.match(administration, /configuration\.actorIdentifier/g);
  assert.doesNotMatch(actions, /organizationId|actorIdentifier|databaseUrl/);
  assert.doesNotMatch(administration, /DATABASE_URL(?:_UNPOOLED)?/);
});

test("canonical change and history insertion share atomic changed-row CTEs", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  assert.match(administration, /with changed as/gi);
  assert.match(administration, /from changed, replacement/);
  assert.match(administration, /from changed\s+returning 1/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.doesNotMatch(
    administration,
    /(?:update|delete from) organization_structure_changes/i,
  );
});

test("all mutable structural records use compare-and-set revisions", async () => {
  const administration = await read(
    "lib/organization-structure-administration.ts",
  );
  const mutationStatements = [
    ...administration.matchAll(
      /(?:update organization_units|update positions|update people|update position_assignments|update position_reporting_relationships)[\s\S]*?returning (?:position_id|subordinate_position_id)?(?: as )?id/g,
    ),
  ].map((match) => match[0]);
  assert.ok(mutationStatements.length >= 8);
  for (const statement of mutationStatements) {
    assert.match(
      statement,
      /date_trunc\('milliseconds', updated_at\) = \$\d+::timestamptz/,
    );
    assert.match(statement, /organization_id = \$\d+/);
  }
  assert.ok(
    [
      ...administration.matchAll(
        /updated_at = date_trunc\('milliseconds', transaction_timestamp\(\)\)/g,
      ),
    ].length >= 16,
  );
  assert.doesNotMatch(
    administration,
    /(?<!milliseconds', )updated_at = \$\d+::timestamptz/,
  );
});

test("assignment and reporting maintenance preserve history rather than hard-delete", async () => {
  const [actions, administration, panel] = await Promise.all([
    read("app/organization/actions.ts"),
    read("lib/organization-structure-administration.ts"),
    read("app/organization/structure-administration-panel.tsx"),
  ]);
  for (const capability of [
    "endPositionAssignment",
    "replacePositionAssignment",
    "endPositionReportingRelationship",
    "correctPositionReportingRelationship",
    "establishPositionReportingRelationship",
    "replacePositionReportingRelationship",
  ]) {
    assert.match(administration, new RegExp(`export async function ${capability}`));
  }
  assert.match(actions, /endPositionAssignmentAction/);
  assert.match(panel, /Replace Assignment/);
  assert.match(panel, /End reporting relationship/);
  assert.match(panel, /Establish primary manager/);
  assert.match(panel, /Replace primary manager/);
  assert.match(panel, /Review before and after/);
  assert.doesNotMatch(administration, /delete\s+from/i);
});

test("the reviewed privilege contract is least-privilege and environment-isolated", async () => {
  const [administration, deployment] = await Promise.all([
    read("docs/ORGANIZATION_STRUCTURE_ADMINISTRATION.md"),
    read("docs/WORKSPACE_DEPLOYMENT_CONTRACT.md"),
  ]);
  assert.match(administration, /LOTURA_STRUCTURE_ADMIN_DATABASE_URL/);
  assert.match(administration, /GRANT INSERT \([\s\S]+organization_structure_changes/);
  assert.match(
    administration,
    /GRANT INSERT \([\s\S]+subordinate_position_id[\s\S]+ON position_reporting_relationships/,
  );
  assert.match(administration, /structural-write role does not require `SELECT`/);
  assert.match(administration, /neither `UPDATE` nor `DELETE`/);
  assert.match(deployment, /Northstar fixture only/);
  assert.match(deployment, /same reviewed shared `main`/);
  assert.match(deployment, /must not be configured in:[\s\S]+Public Demo[\s\S]+Preview[\s\S]+Development/);
});
