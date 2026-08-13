import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Organization is a permanent destination with four canonical routes", async () => {
  await Promise.all(
    [
      "app/organization/page.tsx",
      "app/organization/units/[unitId]/page.tsx",
      "app/organization/positions/[positionId]/page.tsx",
      "app/organization/people/[personId]/page.tsx",
    ].map((path) => access(new URL(path, root))),
  );
  const shell = await read("app/workspace-shell.tsx");
  assert.match(shell, /href: "\/organization"[\s\S]*label: "Organization"/);
  assert.ok(shell.indexOf('label: "Overview"') < shell.indexOf('label: "Organization"'));
  assert.ok(shell.indexOf('label: "Organization"') < shell.indexOf('label: "Explorer"'));
  assert.doesNotMatch(shell, /href: "\/organization-structure\/preview"/);
});

test("canonical structure URLs use stable keys and unknown identifiers return 404", async () => {
  const [unit, position, person, browser] = await Promise.all([
    read("app/organization/units/[unitId]/page.tsx"),
    read("app/organization/positions/[positionId]/page.tsx"),
    read("app/organization/people/[personId]/page.tsx"),
    read("app/organization/organization-browser.tsx"),
  ]);
  for (const [source, parameter, collection] of [
    [unit, "unitId", "units"],
    [position, "positionId", "positions"],
    [person, "personId", "people"],
  ]) {
    assert.match(source, new RegExp(`params: Promise<\\{ ${parameter}: string \\}>`));
    assert.match(source, new RegExp(`data\\.${collection}\\.find\\(\\(item\\) => item\\.id === ${parameter}\\)`));
    assert.match(source, /if \(!\w+\) notFound\(\);/);
  }
  assert.match(browser, /encodeURIComponent\(id\)/);
});

test("authoritative access runs before Organization Structure loading", async () => {
  const experience = await read("lib/organization-structure-experience.ts");
  const accessPosition = experience.indexOf("await requireWorkspaceAccess()");
  const loadPosition = experience.indexOf("await loadOrganizationStructure()");
  assert.ok(accessPosition >= 0);
  assert.ok(loadPosition > accessPosition);
});

test("the UI preserves the four structural distinctions and approved trust language", async () => {
  const sources = await Promise.all(
    [
      "app/organization/page.tsx",
      "app/organization/structure-context.tsx",
      "app/organization/organization-unit-detail.tsx",
      "app/organization/position-detail.tsx",
      "app/organization/person-detail.tsx",
      "app/organization/focused-hierarchy.tsx",
      "lib/organization-structure-data.mjs",
    ].map(read),
  );
  const combined = sources.join("\n").replace(/\s+/g, " ");
  for (const copy of [
    "Imported structure snapshot",
    "Partial reviewed structure",
    "Full reviewed import basis",
    "Provisional Unit — hierarchy has not been established",
    "Vacancy evidence is not complete for this snapshot",
    "Reporting relationships describe structure; they do not assign Process ownership",
    "A Person in the organizational model is not necessarily a Lotura User",
    "Source evidence does not by itself establish organizational truth",
    "Position is structural. Operational Role is responsibility. Person is current human coverage.",
  ]) {
    assert.match(combined, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(combined, /institutionally approved truth|confirmed organizational truth/i);
});

test("Organization Structure administration is explicit and disabled by default", async () => {
  const sources = await Promise.all(
    [
      "lib/organization-structure-experience.ts",
      "lib/organization-structure-administration-policy.mjs",
      "app/organization/organization-unit-detail.tsx",
      "app/organization/position-detail.tsx",
      "app/organization/person-detail.tsx",
      "app/organization/structure-administration-panel.tsx",
    ].map(read),
  );
  const combined = sources.join("\n");
  assert.match(combined, /LOTURA_STRUCTURE_ADMIN_MODE \|\| "disabled"/);
  assert.match(combined, /administrationEnabled \?/);
  assert.match(combined, /do not modify the source workbook or its import record/i);
  assert.match(combined, /Remove from current structure/);
  assert.doesNotMatch(combined, /localStorage|sessionStorage|indexedDB|fetch\(/i);
});

test("administration history renders deterministic UTC timestamps during hydration", async () => {
  const panel = await read("app/organization/structure-administration-panel.tsx");
  assert.match(panel, /function formatAdministrativeTimestamp/);
  assert.match(panel, /function formatAdministrativeDate/);
  assert.match(panel, /timeZone: "UTC"/);
  assert.doesNotMatch(panel, /\.toLocaleString\(\)|\.toLocaleDateString\(\)/);
});

test("organizational placement uses existing Unit identities instead of Unit renaming", async () => {
  const [panel, person] = await Promise.all([
    read("app/organization/structure-administration-panel.tsx"),
    read("app/organization/person-detail.tsx"),
  ]);
  assert.match(panel, /Move this Position to an Organization Unit/);
  assert.match(panel, /name="organizationUnitStableKey"/);
  assert.match(panel, /Choose an existing Unit by its stable identity/);
  assert.match(panel, /Rename this Organization Unit/);
  assert.match(panel, /It does not move a Person or Position/);
  assert.match(panel, /Another active Organization Unit already uses this name/);
  assert.match(panel, /onChange=\{\(event\) => setUnitName\(event\.target\.value\)\}/);
  assert.match(panel, /Parent Organization Unit/);
  assert.match(panel, /name="parentOrganizationUnitStableKey"/);
  assert.match(person, /Open this Position to change its Organization Unit/);
});

test("structure mutations are server-only, access-checked, scoped, and never hard-delete", async () => {
  const [actions, administration, policy, proxy] = await Promise.all([
    read("app/organization/actions.ts"),
    read("lib/organization-structure-administration.ts"),
    read("lib/organization-structure-administration-policy.mjs"),
    read("proxy.ts"),
  ]);
  assert.match(actions, /^"use server";/);
  assert.match(administration, /^import "server-only";/);
  assert.ok(
    administration.indexOf("await requireWorkspaceAccess()") <
      administration.indexOf("mutationClient(configuration.databaseUrl)"),
  );
  assert.match(administration, /organization_id = \$[1234]/);
  assert.doesNotMatch(administration, /delete\s+from/i);
  assert.match(policy, /LOTURA_STRUCTURE_ADMIN_DATABASE_URL/);
  assert.match(policy, /cannot reuse runtime, owner, or migration credentials/);
  assert.doesNotMatch(administration, /DATABASE_URL(?:_UNPOOLED)?/);
  assert.match(administration, /with changed as/i);
  assert.match(administration, /insert into organization_structure_changes/i);
  assert.match(administration, /replacePositionAssignment/);
  assert.match(administration, /correctPositionReportingRelationship/);
  assert.match(administration, /establishPositionReportingRelationship/);
  assert.match(administration, /replacePositionReportingRelationship/);
  assert.match(
    administration,
    /current_relation\.organization_id = \$2/,
  );
  assert.doesNotMatch(actions, /organizationId|organization_id/);
  assert.doesNotMatch(proxy, /organization-structure-administration|LOTURA_STRUCTURE_ADMIN_DATABASE_URL/);
});

test("Person UI excludes unrelated personal and institutional data categories", async () => {
  const source = await read("app/organization/person-detail.tsx");
  assert.doesNotMatch(
    source,
    /email|phone|address|compensation|salary|demographic|donor|student|performance/i,
  );
  assert.match(source, /organizational context only/i);
});
