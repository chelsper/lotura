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
const read = (path) => readFile(new URL(path, root), "utf8");
const Box = ({ children, className }) => React.createElement("div", { className }, children);
const Link = ({ children, scroll, ...props }) => {
  void scroll;
  return React.createElement("a", props, children);
};
const primitives = {
  Alert: Box, Badge: Box, Card: Box, EmptyState: Box,
  cn: (...parts) => parts.filter(Boolean).join(" "),
  SearchField: ({ label, ...props }) => React.createElement("input", { "aria-label": label, ...props }),
};
const icons = { ArrowIcon: () => null, OrganizationIcon: () => null, RoleIcon: () => null };

async function load(path, stubs = {}) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(await read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports,
    require(id) {
      if (id in stubs) return stubs[id];
      if (id === "next/link") return { default: Link };
      if (id.endsWith("ui/primitives")) return primitives;
      if (id.endsWith("ui/icons")) return icons;
      return require(id);
    },
  });
  return testModule.exports;
}

test("Studio navigation links directly to four distinct views and identifies the active one", async () => {
  const { OrganizationNavigation } = await load("app/studio/organization-navigation.tsx");
  for (const activeView of ["units", "positions", "people", "roles"]) {
    const html = renderToStaticMarkup(React.createElement(OrganizationNavigation, { activeView }));
    assert.match(html, /aria-label="Organization and responsibilities"/);
    for (const href of ["/studio/organization?view=units", "/studio/organization?view=positions", "/studio/organization?view=people", "/studio/responsibilities"]) {
      assert.ok(html.includes(`href="${href}"`));
    }
    assert.equal([...html.matchAll(/aria-current="page"/g)].length, 1);
    const activeHref = activeView === "roles" ? "/studio/responsibilities" : `/studio/organization?view=${activeView}`;
    assert.match(html, new RegExp(`aria-current="page"[^>]*href="${activeHref.replace("?", "\\?")}"`));
  }
});

test("Studio validates requested views on the server and still checks authorized access", async () => {
  const experience = { enabled: true, data: { people: [], positions: [], units: [] } };
  const { default: page } = await load("app/studio/organization/page.tsx", {
    "next/navigation": { notFound() { throw new Error("not found"); } },
    "next/server": { connection: async () => {} },
    "@/lib/organization-structure-experience": { loadWorkspaceStudioExperience: async () => experience },
    "../../organization/organization-browser": { OrganizationBrowser: ({ selectedView }) => React.createElement("div", { "data-view": selectedView }) },
    "../../workspace-shell": { WorkspaceShell: Box, WorkspacePageHeader: Box },
    "../organization-navigation": { OrganizationNavigation: Box },
  });
  for (const [view, expected] of [["people", "people"], ["positions", "positions"], ["units", "units"], [undefined, "units"], ["https://example.com", "units"], [["people", "positions"], "units"]]) {
    const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve({ view }) }));
    assert.ok(html.includes(`data-view="${expected}"`));
  }
  experience.enabled = false;
  await assert.rejects(() => page({ searchParams: Promise.resolve({ view: "people" }) }), /not found/);
});

test("shared browser respects the Studio view without removing public browse controls", async () => {
  const { OrganizationBrowser } = await load("app/organization/organization-browser.tsx", {
    "@/lib/organization-unit-hierarchy.mjs": { buildOrganizationUnitHierarchy: () => [], organizationUnitPath: () => [] },
  });
  const data = { people: [{ id: "person-id", name: "Fictional Person", assignments: [], coverages: [] }], positions: [], units: [], gaps: {} };
  const studioHtml = renderToStaticMarkup(React.createElement(OrganizationBrowser, { basePath: "/studio/organization", data, selectedView: "people" }));
  assert.match(studioHtml, /Fictional Person/);
  assert.match(studioHtml, /href="\/studio\/organization\/people\/person-id"/);
  assert.doesNotMatch(studioHtml, /role="tablist"/);
  const browseHtml = renderToStaticMarkup(React.createElement(OrganizationBrowser, { data }));
  assert.match(browseHtml, /role="tablist"/);
  assert.doesNotMatch(browseHtml, /\/studio\//);
  const source = await read("app/organization/organization-browser.tsx");
  assert.match(source, /const view = selectedView \?\? localView/);
  assert.match(source, /const \[query, setQuery\] = useState\(""\)/);
  assert.doesNotMatch(source, /useEffect|setQuery\(""\)/);
});

test("Position connections use existing Unit, Person, Role, and manager identities only", async () => {
  const { OrganizationNavigation } = await load("app/studio/organization-navigation.tsx");
  const { StudioStructureDetail } = await load("app/studio/studio-structure-detail.tsx", {
    "@/lib/organization-unit-hierarchy.mjs": { organizationUnitPath: () => [] },
    "../organization/structure-administration-panel": { StructureAdministrationPanel: Box },
    "../organization/unit-hierarchy-context": { UnitHierarchyContext: Box },
    "./organization-navigation": { OrganizationNavigation },
    "./unit-roster": { UnitRoster: Box },
  });
  const position = {
    id: "position-id", title: "Coordinator", status: "active", occupancy: { label: "Occupied" },
    unit: { id: "unit-id", name: "Services" },
    assignments: [{ typeLabel: "Permanent", person: { id: "person-id", name: "Fictional Person" } }],
    mandates: [{ role: { stableKey: "role-id", name: "Request triage" } }, { role: { stableKey: null, name: "Unidentified role" } }],
    primaryManager: { position: { id: "manager-id", title: "Manager" } },
  };
  const html = renderToStaticMarkup(React.createElement(StudioStructureDetail, { changes: [], data: { units: [] }, entity: position, entityType: "position" }));
  for (const href of ["/studio/organization/units/unit-id", "/studio/organization/people/person-id", "/studio/responsibilities/roles/role-id?unit=unit-id", "/studio/organization/positions/manager-id"]) {
    assert.ok(html.includes(`href="${href}"`));
  }
  assert.doesNotMatch(html, /roles\/null|roles\/undefined|Unidentified role/);
});

test("responsibility cards retain Unit context without presenting shared Process counts as Unit membership", async () => {
  const { ResponsibilityBrowser } = await load("app/studio/responsibilities/responsibility-browser.tsx");
  const roles = [{
    stableKey: "role-id", name: "Fictional request coordination", status: "active",
    description: "Coordinates requests", mandateCount: 2, coverageCount: 1,
    processCount: 3, systemCount: 4,
  }];
  const scoped = renderToStaticMarkup(React.createElement(ResponsibilityBrowser, { roles, unitId: "unit-id" }));
  assert.match(scoped, /href="\/studio\/responsibilities\/roles\/role-id\?unit=unit-id#edit-role"/);
  assert.match(scoped, /2 Position mandates · 1 current coverage in this Unit/);
  assert.doesNotMatch(scoped, /3 Processes|4 Systems/);
  const global = renderToStaticMarkup(React.createElement(ResponsibilityBrowser, { roles }));
  assert.match(global, /3 Processes · 4 Systems/);
  assert.match(global, /href="\/studio\/responsibilities\/roles\/role-id#edit-role"/);
});
