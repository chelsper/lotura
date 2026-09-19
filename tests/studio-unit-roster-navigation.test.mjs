import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
const Box = ({ children }) => React.createElement("div", null, children);
const Link = ({ children, scroll, ...props }) => {
  void scroll;
  return React.createElement("a", props, children);
};
async function load(path, stubs = {}) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(await readFile(new URL(path, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports,
    require(id) {
      if (id in stubs) return stubs[id];
      if (id === "next/link") return { default: Link };
      if (id.endsWith("ui/primitives")) return { Badge: Box, Card: Box, cn: (...parts) => parts.filter(Boolean).join(" ") };
      if (id.endsWith("ui/icons")) return { ArrowIcon: () => null };
      return require(id);
    },
  });
  return testModule.exports;
}
const { OrganizationNavigation } = await load("app/studio/organization-navigation.tsx");
const { StudioStructureDetail } = await load("app/studio/studio-structure-detail.tsx", {
  "./organization-navigation": { OrganizationNavigation },
  "@/lib/organization-unit-hierarchy.mjs": { organizationUnitPath: () => [] },
  "../organization/structure-administration-panel": { StructureAdministrationPanel: () => null },
  "../organization/unit-hierarchy-context": { UnitHierarchyContext: () => null },
});
const unit = { id: "unit-a", name: "Fictional Services", status: "active", positions: [], parent: null };
const child = { ...unit, id: "unit-child", name: "Child Unit", parent: unit };
const assigned = { id: "assignment-1", typeLabel: "Incumbent", person: { id: "person-1", name: "Fictional Alex" } };
const position = (overrides = {}) => ({
  id: "position-1", title: "Services Coordinator", status: "active", unit,
  occupancy: { id: "occupied", label: "Occupied", tone: "success" },
  assignments: [assigned], mandates: [], primaryManager: null,
  ...overrides,
});
const renderDetail = (entityType, entity, positions = []) => renderToStaticMarkup(React.createElement(StudioStructureDetail, {
  entityType, entity, changes: [], data: { positions, units: [unit, child] },
}));
const assertHref = (html, href) => assert.ok(html.includes(`href="${href.replaceAll("&", "&amp;")}"`), href);

test("global navigation uses job-title and responsibility labels without changing entity routes", () => {
  const html = renderToStaticMarkup(React.createElement(OrganizationNavigation, { activeView: "positions" }));
  assert.match(html, />Job titles<\/a>/);
  assert.match(html, />Responsibilities<\/a>/);
  assertHref(html, "/studio/organization?view=positions");
  assertHref(html, "/studio/responsibilities");
  assert.doesNotMatch(html, /unit=|All units/);
});

test("Unit navigation keeps exact scope in each destination and supplies an unscoped escape", () => {
  const scopedUnit = { id: "unit/a", name: "Fictional Services" };
  const html = renderToStaticMarkup(React.createElement(OrganizationNavigation, { activeView: "people", unit: scopedUnit }));
  for (const href of ["/studio/organization/units/unit%2Fa", "/studio/organization?view=positions&unit=unit%2Fa", "/studio/organization?view=people&unit=unit%2Fa", "/studio/responsibilities?unit=unit%2Fa", "/studio/organization?view=units"]) assertHref(html, href);
  assert.match(html, /In <a[^>]+>Fictional Services<\/a>/);
  assert.match(html, />All units →<\/a>/);
  assert.equal([...html.matchAll(/aria-current="page"/g)].length, 1);
});

test("Unit roster shows exact-Unit Positions and linked people, without descendant or process leakage", () => {
  const own = position({ mandates: [{ role: { name: "Unrelated process-like responsibility" } }] });
  const childPosition = position({ id: "child-position", title: "Child Specialist", unit: child, assignments: [{ ...assigned, person: { id: "child-person", name: "Child Person" } }] });
  const elsewhere = position({ id: "other-position", title: "Unplaced Specialist", unit: null });
  const html = renderDetail("organization_unit", { ...unit, positions: [childPosition] }, [own, childPosition, elsewhere]);
  assert.match(html, /People and job titles/);
  assert.match(html, /In this Unit only/);
  assertHref(html, "/studio/organization/positions/position-1#edit-position");
  assertHref(html, "/studio/organization/people/person-1");
  assert.match(html, /Fictional Alex/);
  assert.match(html, /Incumbent/);
  assert.match(html, /scope="col">Job title/);
  assert.doesNotMatch(html, /Child Specialist|Child Person|Unplaced Specialist|Unrelated process-like responsibility/);
});

test("roster preserves documented vacancy and not-established distinctions without manufacturing an occupant", () => {
  const vacant = position({ id: "vacant", title: "Vacant Position", assignments: [], occupancy: { id: "vacant", label: "Vacant", tone: "warning" } });
  const unknown = position({ id: "unknown", title: "Uncertain Position", assignments: [], occupancy: { id: "not_established", label: "Occupancy not established", tone: "neutral" } });
  const html = renderDetail("organization_unit", unit, [vacant, unknown]);
  assert.match(html, />Vacant<\/div>/);
  assert.match(html, />Occupancy not established<\/div>/);
  assert.equal([...html.matchAll(/No current Person recorded/g)].length, 2);
  assert.doesNotMatch(html, /Fictional Alex|\/studio\/organization\/people\//);
  assert.match(renderDetail("organization_unit", unit), /No job titles have been recorded directly in this Unit yet/);
});

test("Person scope follows one documented distinct Unit, never guessing among several Units", () => {
  const person = (positions) => ({ id: "person-1", name: "Fictional Alex", status: "active", assignments: positions.map((item, index) => ({ id: `assignment-${index}`, position: item })) });
  const one = renderDetail("person", person([position(), position({ id: "position-2" })]));
  assertHref(one, "/studio/organization?view=people&unit=unit-a");
  for (const positions of [[], [position({ unit: null })], [position(), position({ unit: child })]]) {
    const html = renderDetail("person", person(positions));
    assert.doesNotMatch(html, /unit=/);
    assertHref(html, "/studio/organization?view=people");
  }
});

test("Position responsibility links preserve its recorded Unit, but do not invent one", () => {
  const withRole = position({ mandates: [{ role: { stableKey: "role-1", name: "Request coordination" } }] });
  const html = renderDetail("position", withRole);
  assertHref(html, "/studio/responsibilities/roles/role-1?unit=unit-a");
  assertHref(html, "/studio/organization?view=positions&unit=unit-a");
  assert.match(html, /Responsibility: Request coordination/);
  const unplaced = renderDetail("position", { ...withRole, unit: null });
  assertHref(unplaced, "/studio/responsibilities/roles/role-1");
  assert.doesNotMatch(unplaced, /unit=/);
});
