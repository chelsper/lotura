import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as hierarchy from "../lib/organization-unit-hierarchy.mjs";

const require = createRequire(import.meta.url);
const unitA = { id: "d99b5cba-486e-44f0-914c-1282bfd40c89", name: "Fictional Services", children: [], positions: [], parent: null };
const unitB = { id: "c4d7cbb1-56ed-40b8-bdda-627c3c37c8fc", name: "Fictional Services", children: [], positions: [], parent: null };
const childUnit = { id: "111f8820-a745-4a8e-8a6f-755a4435fc9b", name: "Fictional Child Unit", children: [], positions: [], parent: unitA };
const emptyUnit = { id: "1844c28b-bfe1-4612-9e1d-077e26fb1301", name: "Fictional Empty Unit", children: [], positions: [], parent: null };

function position(id, title, unit, extra = {}) {
  return { id, title, unit, assignments: [], mandates: [], primaryManager: null, directReports: [], occupancy: { label: "Not established", tone: "neutral" }, ...extra };
}
const localPosition = position("2a95a38b-ed91-46b0-a8d2-011d045ae523", "Local Print Coordinator", unitA);
const vacantPosition = position("b48865e3-0523-4d83-8260-b494e292a0ac", "Unoccupied Local Desk", unitA);
const otherPosition = position("39c88945-8aee-4b25-a74f-575e94f0c550", "Outside Finance Director", unitB, { directReports: [{ id: "report" }] });
const childPosition = position("29ac30d8-2152-4a7b-9b7d-669b39e3269a", "Child Unit Officer", childUnit);
const unassignedPosition = position("03893a4d-b195-48a8-a79f-5b7a2f2dc4b5", "No Unit Position", null);

function person(id, name, assignments, coverages = []) {
  return { id, name, assignments: assignments.map(position => ({ position, typeLabel: "Incumbent" })), coverages };
}
const localPerson = person("6bfa1939-0e7a-480e-8ce0-f64d33af7fcd", "Fictional Local Person", [localPosition]);
const sharedPerson = person("5b0f5f5a-d776-42f2-8180-a878665681ee", "Fictional Shared Person", [localPosition, otherPosition]);
const roleOnlyPerson = person("df6d9e97-405d-4268-89a7-836b3eed75cf", "Fictional Role-only Person", [], [{ position: localPosition, role: { name: "Local operational responsibility" } }]);
const fixture = {
  units: [unitA, unitB, childUnit, emptyUnit],
  positions: [localPosition, vacantPosition, otherPosition, childPosition, unassignedPosition],
  people: [localPerson, sharedPerson, roleOnlyPerson, person("outside-person", "Fictional Outside Person", [otherPosition]), person("child-person", "Fictional Child Person", [childPosition])],
  gaps: { provisionalUnits: 4, confirmedVacancies: 2, rolesWithoutMandates: 3, mandatesWithoutCoverage: 1 },
};

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}
deepFreeze(fixture);

async function render(props = {}, { query = "", view = "units" } = {}) {
  const source = await readFile(new URL("../app/organization/organization-browser.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const Box = ({ children, ...props }) => React.createElement("div", props, children);
  const loaded = { exports: {} };
  let stateIndex = 0;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(id) {
    if (id === "react") return { ...React, useState(initial) { const value = stateIndex === 0 ? view : stateIndex === 1 ? query : initial; stateIndex += 1; return [value, () => {}]; } };
    if (id === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (id === "@/lib/organization-unit-hierarchy.mjs") return hierarchy;
    if (id.endsWith("ui/icons")) return { ArrowIcon: () => null, OrganizationIcon: () => null, RoleIcon: () => null };
    if (id.endsWith("ui/primitives")) return {
      Badge: ({ children }) => React.createElement("span", null, children), Card: Box,
      EmptyState: ({ title, children }) => React.createElement("section", null, React.createElement("h3", null, title), children),
      SearchField: ({ label, ...props }) => React.createElement("input", { "aria-label": label, ...props }),
      cn: (...parts) => parts.filter(Boolean).join(" "),
    };
    return require(id);
  } });
  return renderToStaticMarkup(React.createElement(loaded.exports.OrganizationBrowser, { data: fixture, ...props }));
}

test("Unit job titles use exact recorded membership, not names, descendants, or missing assignments", async () => {
  const html = await render({ basePath: "/studio/organization", selectedView: "positions", unitId: unitA.id });
  assert.match(html, /Job titles · 2 matches/);
  assert.match(html, /Local Print Coordinator/);
  assert.match(html, /Unoccupied Local Desk/);
  assert.doesNotMatch(html, /Outside Finance Director|Child Unit Officer|No Unit Position/);
  assert.match(html, new RegExp(`href="/studio/organization/positions/${localPosition.id}"`));
  assert.match(html, /Recorded in this Unit only; child Units are not included/);
  assert.doesNotMatch(html, /Start with a leadership Position|Structural context|Roles without mandates|xl:grid-cols/);
});

test("Unit people require a Position assignment and show only titles in that Unit", async () => {
  const html = await render({ basePath: "/studio/organization", selectedView: "people", unitId: unitA.id });
  assert.match(html, /People · 2 matches/);
  assert.match(html, /Fictional Local Person/);
  assert.match(html, /Fictional Shared Person/);
  assert.doesNotMatch(html, /Fictional Role-only Person|Fictional Outside Person|Fictional Child Person|Outside Finance Director|Child Unit Officer|Local operational responsibility/);
  assert.match(html, new RegExp(`href="/studio/organization/people/${sharedPerson.id}"`));
  assert.equal(sharedPerson.assignments.length, 2, "Projection must not change source assignments");
  assert.equal(sharedPerson.assignments[1].position.title, "Outside Finance Director");
});

test("search stays inside scoped titles and does not match unrelated titles or operational coverage", async () => {
  const props = { selectedView: "people", unitId: unitA.id };
  const local = await render(props, { query: "local print" });
  assert.match(local, /Fictional Local Person/);
  assert.match(local, /Fictional Shared Person/);
  const shared = await render(props, { query: "shared person" });
  assert.match(shared, /Fictional Shared Person/);
  assert.doesNotMatch(shared, /Fictional Local Person/);
  for (const query of ["Outside Finance", "Local operational responsibility"]) {
    const html = await render(props, { query });
    assert.match(html, /No matches in this Unit/);
    assert.doesNotMatch(html, /Fictional Shared Person|Fictional Role-only Person/);
  }
  const titles = await render({ selectedView: "positions", unitId: unitA.id }, { query: "Outside" });
  assert.match(titles, /No matches in this Unit/);
});

test("empty Unit views explain how records belong without implying missing Roles or descendants", async () => {
  const people = await render({ selectedView: "people", unitId: emptyUnit.id });
  assert.match(people, /No people recorded in this Unit/);
  assert.match(people, /recorded Position assignment in this Unit/);
  const titles = await render({ basePath: "/studio/organization", selectedView: "positions", unitId: emptyUnit.id });
  assert.match(titles, /No job titles recorded in this Unit/);
  assert.match(titles, /Position is assigned to this Unit/);
});

test("unscoped public browsing retains all relationships, sidebar, search, and stable routes", async () => {
  const html = await render({ selectedView: "people" });
  assert.match(html, /Fictional Role-only Person/);
  assert.match(html, /Outside Finance Director/);
  assert.match(html, /Child Unit Officer/);
  assert.match(html, /Start with a leadership Position/);
  assert.match(html, /Structural context/);
  assert.match(html, new RegExp(`href="/organization/people/${sharedPerson.id}"`));
  const roleSearch = await render({ selectedView: "people" }, { query: "Local operational responsibility" });
  assert.match(roleSearch, /Fictional Role-only Person/);
  const tabs = await render();
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, />Positions</);
  assert.doesNotMatch(tabs, /Job titles|\/studio\//);
});
