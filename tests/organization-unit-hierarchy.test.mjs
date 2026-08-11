import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildOrganizationUnitHierarchy,
  organizationUnitPath,
} from "../lib/organization-unit-hierarchy.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function unit(id, name, parent = null) {
  return {
    id,
    name,
    parent,
    children: [],
    positions: [],
    isProvisional: false,
    status: "active",
    revision: "2026-08-11T00:00:00.000Z",
  };
}

test("Organization Unit hierarchy supports multiple roots and nested children", () => {
  const athletics = unit("athletics", "Athletics");
  const administration = unit("admin", "Athletics – Administration", athletics);
  const sports = unit("sports", "Athletics – Sports", athletics);
  const basketball = unit("basketball", "Basketball", sports);
  athletics.children = [administration, sports];
  sports.children = [basketball];
  const academics = unit("academics", "Academics");

  const hierarchy = buildOrganizationUnitHierarchy([
    sports,
    academics,
    basketball,
    administration,
    athletics,
  ]);

  assert.deepEqual(
    hierarchy.map((node) => node.unit.name),
    ["Academics", "Athletics"],
  );
  const athleticsNode = hierarchy[1];
  assert.equal(athleticsNode.descendantCount, 3);
  assert.deepEqual(
    athleticsNode.children.map((node) => node.unit.name),
    ["Athletics – Administration", "Athletics – Sports"],
  );
  assert.equal(athleticsNode.children[1].children[0].unit.name, "Basketball");
});

test("hierarchy paths preserve stable Unit identity instead of inferring from names", () => {
  const rootUnit = unit("root-key", "Athletics");
  const sports = unit("sports-key", "Athletics – Sports", rootUnit);
  const basketball = unit("basketball-key", "Basketball", sports);
  assert.deepEqual(
    organizationUnitPath([basketball, sports, rootUnit], basketball.id).map(
      (item) => item.id,
    ),
    ["root-key", "sports-key", "basketball-key"],
  );
});

test("defensive hierarchy projection terminates malformed cyclic evidence", () => {
  const first = unit("first", "First");
  const second = unit("second", "Second", first);
  first.parent = second;
  first.children = [second];
  second.children = [first];
  const hierarchy = buildOrganizationUnitHierarchy([first, second]);
  assert.equal(hierarchy.length, 1);
  assert.ok(hierarchy[0].descendantCount <= 1);
});

test("Organization browser renders an expandable focused Unit tree and path-aware search", async () => {
  const browser = await read("app/organization/organization-browser.tsx");
  assert.match(browser, /buildOrganizationUnitHierarchy/);
  assert.match(browser, /role="tree"/);
  assert.match(browser, /role="treeitem"/);
  assert.match(browser, /aria-label=\{`\$\{expanded \? "Collapse" : "Expand"\}/);
  assert.match(browser, /organizationUnitPath\(data\.units, unit\.id\)/);
  assert.match(browser, /total descendants/);
});

test("Unit details expose hierarchy paths, direct children, and contextual child creation", async () => {
  const [context, browseDetail, studioDetail, newPage, form] = await Promise.all([
    read("app/organization/unit-hierarchy-context.tsx"),
    read("app/organization/organization-unit-detail.tsx"),
    read("app/studio/studio-structure-detail.tsx"),
    read("app/studio/organization/units/new/page.tsx"),
    read("app/studio/organization/structure-create-form.tsx"),
  ]);
  const combined = [context, browseDetail, studioDetail, newPage, form].join("\n");
  assert.match(context, /Where this Unit sits/);
  assert.match(context, /Direct child Units/);
  assert.match(context, /Add child Unit/);
  assert.match(
    context,
    /does not establish Position reporting, Process ownership, or operational responsibility/,
  );
  assert.match(browseDetail, /units\/new\?parent=/);
  assert.match(studioDetail, /UnitHierarchyContext/);
  assert.match(newPage, /searchParams: Promise<\{ parent\?: string \| string\[\] \}>/);
  assert.match(newPage, /unit\.id === parentStableKey && unit\.status === "active"/);
  assert.match(form, /initialUnitStableKey/);
  assert.match(form, /Parent Organization Unit/);
  assert.doesNotMatch(combined, /parent Unit.*reports to|reports within/i);
});

test("Organization Hierarchy v0.1 requires no schema or migration expansion", async () => {
  const [schema, journal] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/meta/_journal.json"),
  ]);
  assert.match(schema, /parentOrganizationUnitId/);
  assert.doesNotMatch(journal, /organization hierarchy v0\.1/i);
});
