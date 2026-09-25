import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import { buildOrganizationStructureData } from "../lib/organization-structure-data.mjs";
import { organizationUnitPath } from "../lib/organization-unit-hierarchy.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
async function compile(path, dependencies) {
  const { outputText } = ts.transpileModule(await read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiled,
    exports: compiled.exports,
    require(id) {
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return compiled.exports;
}

const icon = () => null;
const icons = { RoleIcon: icon, SystemIcon: icon, ChevronIcon: icon, InfoIcon: icon, SearchIcon: icon, ArrowIcon: icon };
const primitives = await compile("app/ui/primitives.tsx", { "./icons": icons });
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const common = {
  "next/link": { default: Link },
  "../ui/primitives": primitives,
  "../ui/icons": icons,
  "../workspace-shell": { formatOperatingModelTimestamp: (value) => value },
  "./structure-context": { StructureContext: () => null },
  "./focused-hierarchy": { FocusedHierarchy: () => null },
};
const { PersonDetail } = await compile("app/organization/person-detail.tsx", common);
const { PositionDetail } = await compile("app/organization/position-detail.tsx", common);
const { StudioStructureDetail } = await compile("app/studio/studio-structure-detail.tsx", {
  ...common,
  "@/lib/organization-unit-hierarchy.mjs": { organizationUnitPath },
  "../organization/structure-administration-panel": { StructureAdministrationPanel: () => null },
  "../organization/unit-hierarchy-context": { UnitHierarchyContext: () => null },
  "./organization-navigation": { OrganizationNavigation: () => null },
  "./unit-roster": { UnitRoster: () => null },
});
const fixture = buildOrganizationStructureData(
  JSON.parse(await read("db/seeds/organization-structure.json")),
  JSON.parse(await read("db/seeds/process-explorer.json")),
  "2026-08-09T12:00:00.000Z",
);
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
const titleLinks = (html) => hrefs(html).filter((href) => href.endsWith("#edit-position"));
const roleLinks = (html) => hrefs(html).filter((href) => href.endsWith("#edit-role"));
const positionEditHref = (id) => `/studio/organization/positions/${encodeURIComponent(id)}#edit-position`;
function assertNoNestedAnchors(html) {
  let depth = 0;
  for (const match of html.matchAll(/<\/?a(?:\s[^>]*|)>/g)) {
    depth += match[0].startsWith("</") ? -1 : 1;
    assert.ok(depth >= 0 && depth <= 1, "links must not contain other links");
  }
  assert.equal(depth, 0);
}

test("Person offers a title edit for every documented Position, not a guessed primary job", () => {
  const person = fixture.people.find((item) => item.name === "Taylor Brooks");
  assert.equal(person.assignments.length, 2);
  const before = JSON.stringify(person);
  const html = render(PersonDetail, { administrationEnabled: true, data: fixture, person });
  assert.deepEqual(titleLinks(html), person.assignments.map((item) => positionEditHref(item.position.id)));
  assert.match(html, /Edit title or Unit/);
  assertNoNestedAnchors(html);
  assert.equal(JSON.stringify(person), before, "rendering must not mutate organizational identity");
});

test("Person without an assignment does not receive an inferred job-title editor", () => {
  const person = { ...fixture.people[0], assignments: [], reportingContexts: [] };
  const html = render(PersonDetail, { administrationEnabled: true, data: fixture, person });
  assert.deepEqual(titleLinks(html), []);
  assert.match(html, /No current Position Assignment/);
});

test("Position header links to its own stable editor even for a shared Position", () => {
  const position = fixture.positions.find((item) => item.title === "Billing Coordinator");
  assert.equal(position.assignments.length, 2);
  const html = render(PositionDetail, { administrationEnabled: true, data: fixture, position, processAcquisitionEnabled: false });
  assert.deepEqual(titleLinks(html), [positionEditHref(position.id)]);
  for (const assignment of position.assignments) assert.ok(html.includes(assignment.person.name));
  assertNoNestedAnchors(html);
});

test("Studio Person routes each job-title edit to the corresponding Position", () => {
  const person = fixture.people.find((item) => item.name === "Taylor Brooks");
  const html = render(StudioStructureDetail, { changes: [], data: fixture, entity: person, entityType: "person" });
  assert.match(html, /Job titles belong to Positions/);
  assert.deepEqual(titleLinks(html), person.assignments.map((item) => positionEditHref(item.position.id)));
  assertNoNestedAnchors(html);
  const withoutAssignments = render(StudioStructureDetail, { changes: [], data: fixture, entity: { ...person, assignments: [] }, entityType: "person" });
  assert.deepEqual(titleLinks(withoutAssignments), []);
});

test("Role editors use the stable Role key rather than its legacy model identifier", () => {
  const data = structuredClone(fixture);
  const person = data.people.find((item) => item.name === "Taylor Brooks");
  const role = data.operationalRoles.find((item) => item.id === person.coverages[0].role.id);
  role.stableKey = "a40caada-53dc-48c6-87d6-2721f2674469";
  const expected = `/studio/responsibilities/roles/${role.stableKey}#edit-role`;
  const personHtml = render(PersonDetail, { administrationEnabled: true, data, person });
  assert.deepEqual(roleLinks(personHtml), [expected]);
  assert.ok(!hrefs(personHtml).includes(`/studio/responsibilities/roles/${role.id}#edit-role`));
  const position = data.positions.find((item) => item.mandates.some((mandate) => mandate.role.id === role.id));
  position.mandates.find((item) => item.role.id === role.id).role.stableKey = role.stableKey;
  const positionHtml = render(PositionDetail, { administrationEnabled: true, data, position, processAcquisitionEnabled: false });
  assert.deepEqual(roleLinks(positionHtml), [expected]);
  assertNoNestedAnchors(personHtml);
  assertNoNestedAnchors(positionHtml);
});

test("Role editors stay hidden when stable identity is missing or null", () => {
  for (const missingKey of [null, undefined]) {
    const data = structuredClone(fixture);
    for (const role of data.operationalRoles) role.stableKey = missingKey;
    for (const position of data.positions) {
      for (const mandate of position.mandates) mandate.role.stableKey = missingKey;
    }
    const person = data.people.find((item) => item.coverages.length > 0);
    const position = data.positions.find((item) => item.mandates.length > 0);
    assert.deepEqual(roleLinks(render(PersonDetail, { administrationEnabled: true, data, person })), []);
    assert.deepEqual(roleLinks(render(PositionDetail, { administrationEnabled: true, data, position, processAcquisitionEnabled: false })), []);
  }
});

test("read-only organizational views never expose title or Role editing controls", () => {
  const data = structuredClone(fixture);
  for (const role of data.operationalRoles) role.stableKey = "a40caada-53dc-48c6-87d6-2721f2674469";
  for (const position of data.positions) {
    for (const mandate of position.mandates) mandate.role.stableKey = "a40caada-53dc-48c6-87d6-2721f2674469";
  }
  const person = data.people.find((item) => item.name === "Taylor Brooks");
  const position = data.positions.find((item) => item.mandates.length > 0);
  for (const html of [
    render(PersonDetail, { administrationEnabled: false, data, person }),
    render(PositionDetail, { administrationEnabled: false, data, position, processAcquisitionEnabled: false }),
  ]) {
    assert.deepEqual(titleLinks(html), []);
    assert.deepEqual(roleLinks(html), []);
    assert.doesNotMatch(html, /Maintain in Workspace Studio|Edit title|Edit Role name/);
  }
});

test("inactive Roles do not offer rename controls even when a stable key exists", () => {
  const data = structuredClone(fixture);
  for (const role of data.operationalRoles) {
    role.stableKey = "a40caada-53dc-48c6-87d6-2721f2674469";
    role.status = "inactive";
  }
  for (const position of data.positions) {
    for (const mandate of position.mandates) {
      mandate.role.stableKey = "a40caada-53dc-48c6-87d6-2721f2674469";
      mandate.role.status = "inactive";
    }
  }
  const person = data.people.find((item) => item.coverages.length > 0);
  const position = data.positions.find((item) => item.mandates.length > 0);
  assert.deepEqual(roleLinks(render(PersonDetail, { administrationEnabled: true, data, person })), []);
  assert.deepEqual(roleLinks(render(PositionDetail, { administrationEnabled: true, data, position, processAcquisitionEnabled: false })), []);
});

test("Position deep-link opens the existing editor without changing its identity, action, or provenance fields", async () => {
  const source = await read("app/organization/structure-administration-panel.tsx");
  assert.match(source, /id=\{entityType === "position" \? "edit-position" : undefined\}>\s*<details open>/);
  const editForm = source.slice(source.indexOf("function EditForm("), source.indexOf("function RemovalForm("));
  assert.match(editForm, /useActionState\(\s*updateStructureEntityAction,\s*initialStructureActionState/);
  assert.match(editForm, /<form action=\{action\}/);
  assert.match(editForm, /<HiddenIdentity entity=\{entity\} entityType=\{entityType\}/);
  assert.match(editForm, /defaultValue=\{\(entity as OrganizationPosition\)\.title\} maxLength=\{255\} name="title" required/);
  assert.match(editForm, /This changes the title for everyone assigned to this Position/);
  assert.match(editForm, /<ChangeMetadataFields \/>/);
  assert.match(editForm, /<Button disabled=\{pending\} type="submit"/);
  const identity = source.slice(source.indexOf("function HiddenIdentity("), source.indexOf("function EditForm("));
  for (const field of ["entityType", "stableKey", "expectedRevision"]) assert.ok(identity.includes(`name="${field}"`));
  for (const field of ["changeKind", "effectiveDate", "reason"]) assert.ok(source.includes(`name="${field}"`));
});
