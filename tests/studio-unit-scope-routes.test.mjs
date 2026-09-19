import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const unit = { id: "a3788edb-62d7-4406-a70f-326c0e1284e5", name: "Fictional Services" };
const sameNameUnit = { id: "f38dfbf6-4ebd-4e1c-9ea4-0480642db6f2", name: "Fictional Services" };
const childUnit = { id: "a9d8a320-1f38-40dc-913f-3f8b08f329b5", name: "Child Services", parent: unit };
const emptyUnit = { id: "b53f3c50-1212-48eb-8066-a7ec22d06cce", name: "Fictional Empty Unit" };
const positions = [
  { id: "local-position", title: "Local Coordinator", unit },
  { id: "local-vacant-position", title: "Local Vacant Seat", unit },
  { id: "outside-position", title: "Outside Manager", unit: sameNameUnit },
  { id: "child-position", title: "Child Unit Officer", unit: childUnit },
  { id: "unassigned-position", title: "No Unit", unit: null },
];
const people = [
  { id: "local-person", assignments: [{ position: positions[0] }] },
  { id: "shared-person", assignments: [{ position: positions[0] }, { position: positions[1] }, { position: positions[2] }] },
  { id: "outside-person", assignments: [{ position: positions[2] }] },
  { id: "child-person", assignments: [{ position: positions[3] }] },
  { id: "role-only-person", assignments: [], coverages: [{ position: positions[0] }] },
];

function role(stableKey, name, mandates) {
  return { stableKey, name, revision: "2026-09-19T12:00:00Z", description: null, status: "active", mandates, processes: [], systems: [], activity: [] };
}
function mandate(position, coverageCount) {
  return { position, mandate: { coverage: Array.from({ length: coverageCount }, (_, i) => ({ id: `${position.id}-${i}` })) } };
}
const sharedRole = role("12422637-3f32-401b-b2a3-a5bd92a9837c", "Shared fictional responsibility", [mandate(positions[0], 2), mandate(positions[2], 4), mandate(positions[3], 3)]);
const localRole = role("baff4cdb-4938-4437-815f-6c65ebad82f7", "Local fictional responsibility", [mandate(positions[1], 0)]);
const outsideRole = role("c160d0dd-7886-4cf0-a8a3-87ae93e618f1", "Outside fictional responsibility", [mandate(positions[2], 1)]);
const childRole = role("d7849104-51eb-43cc-822d-9d6553cc8e81", "Child fictional responsibility", [mandate(positions[3], 1)]);
const roles = [sharedRole, localRole, outsideRole, childRole, role("00d7ba69-f9db-44ec-bf6b-f245bf75f789", unit.name, [])];

async function harness(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const seen = {};
  const roleData = { roles };
  const experience = {
    enabled: true, changes: [], asOf: "2026-09-19", configuration: {}, source: "fictional",
    data: { units: [unit, sameNameUnit, childUnit, emptyUnit], positions, people, gaps: { rolesWithoutMandates: 1, mandatesWithoutCoverage: 1 } },
  };
  const Box = ({ children }) => React.createElement("div", null, children);
  const capture = name => function CapturedComponent(props) { seen[name] = props; return React.createElement("div", { "data-component": name }); };
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(id) {
    if (id === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (id === "next/server") return { connection: async () => {} };
    if (id === "next/navigation") return { notFound() { throw new Error("NOT_FOUND"); }, redirect(path) { throw new Error(`REDIRECT:${path}`); } };
    if (id === "@/lib/organization-structure-experience") return { loadWorkspaceStudioExperience: async () => experience };
    if (id === "@/lib/responsibility-builder") return { buildResponsibilityRoles() { seen.buildCount = (seen.buildCount ?? 0) + 1; return roleData.roles; } };
    if (id.endsWith("organization-browser")) return { OrganizationBrowser: capture("organizationBrowser") };
    if (id.endsWith("responsibility-browser")) return { ResponsibilityBrowser: capture("responsibilityBrowser") };
    if (id.endsWith("responsibility-role-workspace")) return { ResponsibilityRoleWorkspace: capture("roleWorkspace") };
    if (id.endsWith("organization-navigation")) return { OrganizationNavigation: capture("navigation") };
    if (id.endsWith("workspace-shell")) return { WorkspaceShell: Box, WorkspacePageHeader: capture("header") };
    if (id.endsWith("ui/primitives")) return { Alert: Box, Card: Box, Badge: Box };
    if (id.endsWith("ui/icons")) return { OrganizationIcon: () => null, RoleIcon: () => null };
    return require(id);
  } });
  return {
    experience, seen, roleData,
    async render(query = {}, stableKey = sharedRole.stableKey) {
      const element = await loaded.exports.default({ searchParams: Promise.resolve(query), params: Promise.resolve({ stableKey }) });
      return renderToStaticMarkup(element);
    },
  };
}

test("Organization route validates Unit identity from available tenant data and requires Studio access", async () => {
  const h = await harness("app/studio/organization/page.tsx");
  for (const invalid of ["unknown-unit", "", [unit.id], [unit.id, sameNameUnit.id]]) {
    await assert.rejects(() => h.render({ unit: invalid }), /NOT_FOUND/);
  }
  h.experience.data.units = [sameNameUnit, childUnit];
  await assert.rejects(() => h.render({ unit: unit.id }), /NOT_FOUND/);
  h.experience.enabled = false;
  await assert.rejects(() => h.render(), /NOT_FOUND/);
});

test("Organization Unit context defaults to job titles and counts only direct unique membership", async () => {
  const h = await harness("app/studio/organization/page.tsx");
  await h.render({ unit: unit.id });
  assert.equal(h.seen.organizationBrowser.selectedView, "positions");
  assert.equal(h.seen.organizationBrowser.unitId, unit.id);
  assert.equal(h.seen.navigation.unit.id, unit.id);
  assert.equal(h.seen.header.title, unit.name);
  assert.deepEqual(JSON.parse(JSON.stringify(h.seen.header.stats)), [{ label: "People", value: 2 }, { label: "Job titles", value: 2 }]);
  await h.render({ unit: unit.id, view: "people" });
  assert.equal(h.seen.organizationBrowser.selectedView, "people");
  assert.equal(h.seen.organizationBrowser.unitId, unit.id);
  await h.render();
  assert.equal(h.seen.organizationBrowser.selectedView, "units");
  assert.equal(h.seen.organizationBrowser.unitId, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(h.seen.header.stats)), [{ label: "People", value: 5 }, { label: "Job titles", value: 5 }, { label: "Units", value: 4 }]);
});

test("Responsibilities use exact Position Unit mandates and locally scoped coverage counts", async () => {
  const h = await harness("app/studio/responsibilities/page.tsx");
  const unchanged = JSON.stringify(roles);
  const html = await h.render({ unit: unit.id });
  const summaries = h.seen.responsibilityBrowser.roles;
  assert.deepEqual(Array.from(summaries, item => item.stableKey), [sharedRole.stableKey, localRole.stableKey]);
  assert.equal(summaries[0].mandateCount, 1);
  assert.equal(summaries[0].coverageCount, 2);
  assert.equal(summaries[1].mandateCount, 1);
  assert.equal(summaries[1].coverageCount, 0);
  assert.equal(h.seen.responsibilityBrowser.unitId, unit.id);
  assert.equal(h.seen.navigation.unit.id, unit.id);
  assert.deepEqual(JSON.parse(JSON.stringify(h.seen.header.stats)), [{ label: "Responsibilities", value: 2 }]);
  assert.ok(html.includes(`view=positions&amp;unit=${unit.id}`));
  assert.equal(JSON.stringify(roles), unchanged);
  await h.render({ unit: emptyUnit.id });
  assert.equal(h.seen.responsibilityBrowser.roles.length, 0);
  await h.render();
  assert.equal(h.seen.responsibilityBrowser.roles.length, roles.length);
  assert.equal(h.seen.responsibilityBrowser.roles[0].coverageCount, 9);
  assert.equal(h.seen.responsibilityBrowser.roles[0].mandateCount, 3);
});

test("Responsibilities reject unknown or array Unit parameters instead of silently widening scope", async () => {
  const h = await harness("app/studio/responsibilities/page.tsx");
  for (const invalid of ["unavailable-unit", "", [unit.id]]) {
    await assert.rejects(() => h.render({ unit: invalid }), /NOT_FOUND/);
  }
  h.experience.enabled = false;
  await assert.rejects(() => h.render({ unit: unit.id }), /NOT_FOUND/);
  assert.equal(h.seen.buildCount, undefined);
});

test("Role detail validates Unit identity and redirects stale membership to the canonical Role", async () => {
  const h = await harness("app/studio/responsibilities/roles/[stableKey]/page.tsx");
  for (const invalid of ["unavailable-unit", [unit.id]]) {
    await assert.rejects(() => h.render({ unit: invalid }), /NOT_FOUND/);
  }
  await assert.rejects(() => h.render({ unit: emptyUnit.id }), { message: `REDIRECT:/studio/responsibilities/roles/${sharedRole.stableKey}` });
  await assert.rejects(() => h.render({ unit: unit.id }, outsideRole.stableKey), { message: `REDIRECT:/studio/responsibilities/roles/${outsideRole.stableKey}` });
  const html = await h.render({ unit: unit.id });
  assert.equal(h.seen.navigation.unit.id, unit.id);
  assert.equal(h.seen.roleWorkspace.role.stableKey, sharedRole.stableKey);
  assert.ok(html.includes(`/studio/responsibilities?unit=${unit.id}`));
  await h.render({}, outsideRole.stableKey);
  assert.equal(h.seen.navigation.unit, undefined);
  assert.equal(h.seen.roleWorkspace.role.stableKey, outsideRole.stableKey);
  h.roleData.roles = roles.map(item => item.stableKey === sharedRole.stableKey ? { ...item, mandates: [] } : item);
  await assert.rejects(() => h.render({ unit: unit.id }), { message: `REDIRECT:/studio/responsibilities/roles/${sharedRole.stableKey}` });
  await h.render();
  assert.equal(h.seen.roleWorkspace.role.stableKey, sharedRole.stableKey);
  assert.equal(h.seen.roleWorkspace.role.mandates.length, 0);
  h.experience.enabled = false;
  await assert.rejects(() => h.render({ unit: unit.id }), /NOT_FOUND/);
});
