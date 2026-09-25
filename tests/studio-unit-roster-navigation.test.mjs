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
const Box = ({ children, tone }) => React.createElement("div", { "data-tone": tone }, children);
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
      if (id === "next/navigation") return { useRouter: () => ({ refresh() { throw new Error("Rendering must not refresh the route"); } }) };
      if (id.endsWith("ui/primitives")) return {
        Alert: Box, Badge: Box, Card: Box, ExpandableSection: Box,
        EmptyState: ({ title, children }) => React.createElement("div", null, React.createElement("h3", null, title), children),
        Button: ({ children, variant, ...props }) => { void variant; return React.createElement("button", props, children); },
        cn: (...parts) => parts.filter(Boolean).join(" "),
      };
      if (id.endsWith("ui/icons")) return { ArrowIcon: () => null, RoleIcon: () => null, SystemIcon: () => null };
      return require(id);
    },
  });
  return testModule.exports;
}
const { OrganizationNavigation } = await load("app/studio/organization-navigation.tsx");
const { UnitAddMenu } = await load("app/studio/unit-add-menu.tsx");
const { UnitRoster } = await load("app/studio/unit-roster.tsx", {
  "./unit-add-menu": { UnitAddMenu },
  "./unit-roster-editor": { UnitRosterEditor: () => { throw new Error("The editor must remain closed until a person chooses Edit"); } },
});
const { StudioStructureDetail } = await load("app/studio/studio-structure-detail.tsx", {
  "./organization-navigation": { OrganizationNavigation },
  "./unit-roster": { UnitRoster },
  "@/lib/organization-unit-hierarchy.mjs": { organizationUnitPath: () => [] },
  "../organization/structure-administration-panel": { StructureAdministrationPanel: () => null },
  "../organization/unit-hierarchy-context": { UnitHierarchyContext: () => null },
});
const { PositionDetail } = await load("app/organization/position-detail.tsx", {
  "../workspace-shell": { formatOperatingModelTimestamp: value => value },
  "./focused-hierarchy": { FocusedHierarchy: () => null },
  "./structure-context": { StructureContext: () => null },
});
const unit = { id: "unit-a", name: "Fictional Services", status: "active", positions: [], parent: null };
const child = { ...unit, id: "unit-child", name: "Child Unit", parent: unit };
const assigned = { id: "assignment-1", typeLabel: "Incumbent", person: { id: "person-1", name: "Fictional Alex" } };
const position = (overrides = {}) => ({
  id: "position-1", title: "Services Coordinator", status: "active", revision: 1, unit,
  occupancy: { id: "occupied", label: "Occupied", tone: "success" },
  assignments: [assigned], mandates: [], primaryManager: null,
  ...overrides,
});
const renderDetail = (entityType, entity, positions = []) => renderToStaticMarkup(React.createElement(StudioStructureDetail, {
  entityType, entity, changes: [], data: { positions, units: [unit, child] },
}));
const assertHref = (html, href) => assert.ok(html.includes(`href="${href.replaceAll("&", "&amp;")}"`), href);

test("Add to this Unit uses existing scoped creation routes and stays hidden on inactive Units", () => {
  const html = renderToStaticMarkup(React.createElement(UnitAddMenu, { unit: { ...unit, id: "unit/a" } }));
  assert.match(html, /<summary[^>]*>Add to this Unit<\/summary>/);
  assertHref(html, "/studio/organization/positions/new?unit=unit%2Fa");
  assertHref(html, "/studio/organization/people/new?unit=unit%2Fa");
  assertHref(html, "/studio/organization/units/new?parent=unit%2Fa");
  assert.doesNotMatch(html, /<form|<input|responsibilities\/roles\/new/);
  assert.equal(renderToStaticMarkup(React.createElement(UnitAddMenu, { unit: { ...unit, status: "inactive" } })), "");
});

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
  assert.match(html, /scope="col">Reports to/);
  assert.match(html, /aria-label="Edit Services Coordinator"/);
  assert.doesNotMatch(html, /Child Specialist|Child Person|Unplaced Specialist|Unrelated process-like responsibility/);
});

test("Unit roster shows the recorded manager Position even outside this Unit, without inferring a Unit head", () => {
  const manager = { id: "external-manager", title: "Shared Services Director", unit: { id: "other-unit", name: "Shared Services" } };
  const documented = position({ primaryManager: { id: "reporting-1", revision: 1, position: manager } });
  const unknown = position({ id: "unknown-manager", title: "Support Coordinator" });
  const html = renderDetail("organization_unit", { ...unit, head: { name: "Do not infer this Unit head" } }, [documented, unknown]);
  assertHref(html, "/studio/organization/positions/external-manager");
  assert.match(html, /Shared Services Director/);
  assert.match(html, /Not yet recorded/);
  assert.doesNotMatch(html, /Do not infer this Unit head/);
  assert.equal([...html.matchAll(/href="\/studio\/organization\/positions\/external-manager"/g)].length, 1);
});

test("only active exact-Unit Positions offer in-place editing; inactive rows remain visible", () => {
  const active = position();
  const inactive = position({ id: "inactive-position", title: "Former Services Lead", status: "inactive" });
  const childPosition = position({ id: "child-position", title: "Child Specialist", unit: child });
  const html = renderDetail("organization_unit", unit, [active, inactive, childPosition]);
  assert.match(html, /Former Services Lead/);
  assertHref(html, "/studio/organization/positions/inactive-position#edit-position");
  assert.match(html, /aria-label="Edit Services Coordinator"/);
  assert.doesNotMatch(html, /aria-label="Edit Former Services Lead"|aria-label="Edit Child Specialist"/);
  assert.equal([...html.matchAll(/aria-label="Edit /g)].length, 1);
});

test("matching job titles and shared occupancy retain separate recorded identities", () => {
  const shared = position({
    assignments: [assigned, { id: "assignment-2", typeLabel: "Job share", person: { id: "person-2", name: "Fictional Casey" } }],
  });
  const second = position({ id: "position-2", assignments: [] });
  const before = JSON.stringify([shared, second]);
  const html = renderDetail("organization_unit", unit, [shared, second]);
  assertHref(html, "/studio/organization/positions/position-1#edit-position");
  assertHref(html, "/studio/organization/positions/position-2#edit-position");
  assertHref(html, "/studio/organization/people/person-1");
  assertHref(html, "/studio/organization/people/person-2");
  assert.equal([...html.matchAll(/aria-label="Edit Services Coordinator"/g)].length, 2);
  assert.match(html, /Job share/);
  assert.equal(JSON.stringify([shared, second]), before, "rendering must not merge matching titles or rewrite occupancy");
});

test("roster preserves documented vacancy and not-established distinctions without manufacturing an occupant", () => {
  const vacant = position({ id: "vacant", title: "Vacant Position", assignments: [], occupancy: { id: "vacant", label: "Vacant", tone: "warning" } });
  const unknown = position({ id: "unknown", title: "Uncertain Position", assignments: [], occupancy: { id: "not_established", label: "Occupancy not established", tone: "neutral" } });
  const before = JSON.stringify([vacant, unknown]);
  const html = renderDetail("organization_unit", unit, [vacant, unknown]);
  assert.match(html, />Vacant<\/div>/);
  assert.match(html, />Person not yet recorded<\/div>/);
  assert.equal([...html.matchAll(/Not yet recorded/g)].length, 4);
  assert.match(html, /people and managers can wait/);
  assert.equal(JSON.stringify([vacant, unknown]), before, "friendly labels must not change vacancy evidence or assignments");
  const rosterTable = html.slice(html.indexOf("<table"), html.indexOf("</table>"));
  assert.doesNotMatch(rosterTable, /Fictional Alex|\/studio\/organization\/people\//);
  assert.match(renderDetail("organization_unit", unit), /No job titles have been recorded directly in this Unit yet/);
});

test("Position detail keeps unknown staffing separate from reviewed vacancy and optional responsibilities neutral", () => {
  const unknown = position({ assignments: [], systems: [], occupancy: { id: "not_established", label: "Occupancy not established", tone: "neutral" } });
  const render = current => renderToStaticMarkup(React.createElement(PositionDetail, { administrationEnabled: false, data: {}, position: current, processAcquisitionEnabled: false }));
  const before = JSON.stringify(unknown);
  const html = render(unknown);
  assert.match(html, /<h3>Person not yet recorded<\/h3>/);
  assert.match(html, /Missing information does not mean this Position is vacant/);
  assert.match(html, /data-tone="info">Responsibilities not yet recorded/);
  assert.doesNotMatch(html, /data-tone="warning"|<form/);
  assert.equal(JSON.stringify(unknown), before);
  const vacant = render({ ...unknown, occupancy: { id: "vacant", label: "Vacant", tone: "warning" } });
  assert.match(vacant, /<h3>Vacant Position<\/h3>/);
  assert.match(vacant, /vacancy evidence is complete/);
  assert.doesNotMatch(vacant, /Person not yet recorded/);
});

test("Position detail retains a coverage warning for an established responsibility without a recorded person", () => {
  const recorded = position({ systems: [], mandates: [{ id: "mandate-1", role: { name: "Request coordination" }, processes: [], coverage: [] }] });
  const html = renderToStaticMarkup(React.createElement(PositionDetail, { administrationEnabled: false, data: {}, position: recorded, processAcquisitionEnabled: false }));
  assert.match(html, /data-tone="warning">This role mandate has no current person-level role coverage recorded/);
  assert.match(html, /No Process links recorded yet/);
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
