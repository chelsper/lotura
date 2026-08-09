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

test("Organization Structure UI contains no edit, import, or persistence controls", async () => {
  const sources = await Promise.all(
    [
      "app/organization/page.tsx",
      "app/organization/organization-browser.tsx",
      "app/organization/organization-unit-detail.tsx",
      "app/organization/position-detail.tsx",
      "app/organization/person-detail.tsx",
      "app/organization/focused-hierarchy.tsx",
    ].map(read),
  );
  const combined = sources.join("\n");
  assert.doesNotMatch(combined, /use server|server action|method=.{0,3}["']post/i);
  assert.doesNotMatch(combined, /localStorage|sessionStorage|indexedDB|fetch\(/i);
  assert.doesNotMatch(combined, /Save|Create Position|Edit Position|Approve for import/);
});

test("Person UI excludes unrelated personal and institutional data categories", async () => {
  const source = await read("app/organization/person-detail.tsx");
  assert.doesNotMatch(
    source,
    /email|phone|address|compensation|salary|demographic|donor|student|performance/i,
  );
  assert.match(source, /organizational context only/i);
});
