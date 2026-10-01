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
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const unit = { id: "unit/a", name: "Fictional Services", status: "active", parent: null, positions: [], children: [] };
const otherUnit = { ...unit, id: "unit-b" };
function position(id, title, unit) {
  return { id, title, unit, assignments: [], mandates: [], primaryManager: null, directReports: [], occupancy: { label: "Not established", tone: "neutral" } };
}
const currentJob = position("job/a", "Printing Coordinator", unit);
const otherJob = position("job-b", "Outside Coordinator", otherUnit);
const data = {
  units: [unit, otherUnit], positions: [currentJob, otherJob],
  people: [
    { id: "person/a", name: "Fictional Alex", assignments: [{ position: currentJob, typeLabel: "Incumbent" }], coverages: [] },
    { id: "person-b", name: "Fictional Morgan", assignments: [{ position: otherJob, typeLabel: "Incumbent" }], coverages: [] },
  ],
  gaps: { provisionalUnits: 0, confirmedVacancies: 0, rolesWithoutMandates: 0, mandatesWithoutCoverage: 0 },
};
const Box = ({ children }) => React.createElement("section", null, children);
const Link = ({ children, scroll, ...props }) => { void scroll; return React.createElement("a", props, children); };
const primitives = {
  Card: Box, Badge: Box, EmptyState: Box,
  SearchField: ({ label, ...props }) => React.createElement("input", { "aria-label": label, ...props }),
  cn: (...parts) => parts.filter(Boolean).join(" "),
};
async function load(path, stubs = {}) {
  const loaded = { exports: {} };
  vm.runInNewContext(ts.transpileModule(await read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    module: loaded, exports: loaded.exports,
    require(id) {
      if (id in stubs) return stubs[id];
      if (id === "react" || id === "react/jsx-runtime") return require(id);
      if (id === "next/link") return { default: Link };
      if (id === "@/lib/organization-unit-hierarchy.mjs") return hierarchy;
      if (id.endsWith("ui/primitives")) return primitives;
      if (id.endsWith("ui/icons")) return { OrganizationIcon: () => null, ArrowIcon: () => null, RoleIcon: () => null };
      throw new Error(`Unexpected navigation dependency: ${id}`);
    },
  });
  return loaded.exports;
}
const { OrganizationNavigation } = await load("app/studio/organization-navigation.tsx");
const { OrganizationBrowser } = await load("app/organization/organization-browser.tsx");
const href = (html, value) => assert.ok(html.includes(`href="${value.replaceAll("&", "&amp;")}"`), value);

async function pageHarness(studio = false, current = { enabled: true, data }, error) {
  const events = [];
  const { default: page } = await load(studio ? "app/studio/organization/page.tsx" : "app/organization/page.tsx", {
    "next/server": { connection: async () => { events.push("connection"); } },
    "next/navigation": { notFound() { throw new Error("NEXT_NOT_FOUND"); } },
    "@/lib/organization-structure-experience": {
      loadWorkspaceStudioExperience: async () => { events.push("private-loader"); if (error) throw error; return current; },
      loadOrganizationStructureExperience: async () => { events.push("browse-loader"); if (error) throw error; return current; },
    },
    [studio ? "../../workspace-shell" : "../workspace-shell"]: {
      WorkspaceShell: Box,
      WorkspacePageHeader: ({ title, description }) => React.createElement("header", null, React.createElement("h1", null, title), description),
    },
    [studio ? "../../organization/organization-browser" : "./organization-browser"]: { OrganizationBrowser },
    "../organization-navigation": { OrganizationNavigation },
    "./structure-context": {
      StructureContext: () => React.createElement("p", null, "Fictional source provenance"),
      VacancyEvidenceNotice: () => React.createElement("p", null, "Fictional vacancy evidence notice"),
    },
  });
  return { events, render: async query => renderToStaticMarkup(await page({ searchParams: Promise.resolve(query) })) };
}

test("Studio has four peer views in the same order, preserving exact Unit context until All units is chosen", () => {
  const html = renderToStaticMarkup(React.createElement(OrganizationNavigation, { activeView: "people", unit }));
  const peerLabels = [...html.matchAll(/<a[^>]+class="inline-flex min-h-10[^>]*>([^<]+)<\/a>/g)].map(match => match[1]);
  assert.deepEqual(peerLabels, ["Units", "People", "Job titles", "Responsibilities"]);
  for (const value of ["/studio/organization/units/unit%2Fa", "/studio/organization?view=people&unit=unit%2Fa", "/studio/organization?view=positions&unit=unit%2Fa", "/studio/responsibilities?unit=unit%2Fa", "/studio/organization?view=units"]) href(html, value);
  assert.match(html, />All units →<\/a>/);
  assert.equal([...html.matchAll(/aria-current="page"/g)].length, 1);
  assert.doesNotMatch(html, /<form/);
});

test("the read Organization page restores each URL view with browser-history links, not local-only tabs", async () => {
  const view = await pageHarness();
  for (const selected of ["units", "people", "positions"]) {
    const html = await view.render({ view: selected });
    for (const destination of ["units", "people", "positions"]) href(html, `/organization?view=${destination}`);
    assert.match(html, new RegExp(`aria-current="page"[^>]+href="/organization\\?view=${selected}"`));
    assert.equal([...html.matchAll(/aria-current="page"/g)].length, 1);
    if (selected === "people") assert.match(html, /Fictional Alex/);
    if (selected === "positions") assert.match(html, /Printing Coordinator/);
    assert.doesNotMatch(html, /\/studio\/|<form|role="tab"|role="tablist"/);
  }
  assert.deepEqual(view.events, ["connection", "browse-loader", "connection", "browse-loader", "connection", "browse-loader"]);
});

test("URL view validation falls back safely, while unknown or ambiguous Unit scope never widens to the whole organization", async () => {
  for (const studio of [false, true]) {
    const view = await pageHarness(studio);
    for (const invalid of ["unknown", "https://example.com", ["people", "positions"], undefined]) {
      assert.match(await view.render({ view: invalid }), /Units · 2 matches/);
    }
    for (const invalid of ["missing", [unit.id], ""]) {
      await assert.rejects(view.render({ view: "people", unit: invalid }), /NEXT_NOT_FOUND/);
    }
  }
});

test("read-only Unit browsing preserves direct membership across People and Job titles without private links", async () => {
  const view = await pageHarness();
  const people = await view.render({ view: "people", unit: unit.id });
  assert.match(people, /Fictional Alex/);
  assert.doesNotMatch(people, /Fictional Morgan|Outside Coordinator|\/studio\//);
  href(people, "/organization?view=positions&unit=unit%2Fa");
  href(people, "/organization?view=units");
  href(people, "/organization/units/unit%2Fa");
  const jobs = await view.render({ view: "positions", unit: unit.id });
  assert.match(jobs, /Printing Coordinator/);
  assert.doesNotMatch(jobs, /Outside Coordinator/);
  href(jobs, "/organization?view=people&unit=unit%2Fa");
});

test("lists come before closed provenance and help notices without deleting the existing context", async () => {
  const browse = await pageHarness();
  const html = await browse.render({ view: "people" });
  assert.ok(html.indexOf("Fictional Alex") < html.indexOf("About this information"));
  assert.match(html, /Fictional source provenance/);
  assert.match(html, /Fictional vacancy evidence notice/);
  assert.doesNotMatch(html, /<details[^>]*\bopen=/);
  const studio = await pageHarness(true);
  const editing = await studio.render({ view: "people" });
  assert.ok(editing.indexOf("Fictional Alex") < editing.indexOf("About this view"));
  assert.match(editing, /does not assign responsibility or Process ownership/);
  assert.doesNotMatch(editing, /<details[^>]*\bopen=/);
});

test("authorized Studio creation keeps the selected Unit and browse authentication still runs through its existing loader", async () => {
  const studio = await pageHarness(true);
  const html = await studio.render({ view: "people", unit: unit.id });
  href(html, "/studio/organization/people/new?unit=unit%2Fa");
  href(html, "/studio/organization/positions/new?unit=unit%2Fa");
  href(html, "/studio/organization/units/new?parent=unit%2Fa");
  assert.deepEqual(studio.events, ["connection", "private-loader"]);
  const disabled = await pageHarness(true, { enabled: false });
  await assert.rejects(disabled.render({}), /NEXT_NOT_FOUND/);
  const authenticationError = new Error("AUTH_REQUIRED");
  const browse = await pageHarness(false, undefined, authenticationError);
  await assert.rejects(browse.render({}), error => error === authenticationError);
  assert.deepEqual(browse.events, ["connection", "browse-loader"]);
});

test("inactive Unit lists remain visible without creation links that require an active Unit", async () => {
  const studio = await pageHarness(true, { enabled: true, data: { ...data, units: [{ ...unit, status: "inactive" }, otherUnit] } });
  const html = await studio.render({ view: "people", unit: unit.id });
  assert.match(html, /Fictional Alex/);
  assert.doesNotMatch(html, /\/new\?|Add child Unit|Add person|Add job title/);
  href(html, "/studio/organization?view=units");
});
