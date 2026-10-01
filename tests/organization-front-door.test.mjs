import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const Box = ({ children }) => React.createElement("div", null, children);
const icons = new Proxy({}, { get: () => () => null });
function nodes(element, predicate) {
  if (!element || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap(item => nodes(item, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
}
async function compile(path, dependencies) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(await read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, process: { env: {} },
    require(id) {
      if (id === "react/jsx-runtime") return require(id);
      if (id === "next/link") return { default: Link };
      if (id.endsWith("/ui/icons")) return icons;
      if (id.endsWith("/ui/primitives")) return { Alert: Box, Badge: Box, Card: Box, cn: (...values) => values.filter(Boolean).join(" ") };
      if (id in dependencies) return dependencies[id];
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return loaded.exports;
}

for (const enabled of [false, true]) test(`Organization front door keeps the correct ${enabled ? "authorized Studio" : "read-only"} destination`, async () => {
  const { WorkspaceShell } = await compile("app/workspace-shell.tsx", {
    "@/lib/authentication": { requireWorkspaceAccess: async () => ({ authenticated: enabled }), workspaceAccessContext: async () => ({ authenticated: enabled }) },
    "@/lib/workspace-studio-availability": { workspaceStudioAvailable: async () => enabled },
    "@/lib/pilot-identity-policy.mjs": { resolvePilotIdentityAssociationConfiguration: () => ({ enabled: false }) },
    // These existing local-only document-preview dependencies may be absent in the release snapshot.
    "@/lib/discovery-policy.mjs": { resolveDiscoveryConfiguration: () => ({ enabled: false }) },
    "@/lib/operating-model-authoring-policy.mjs": { resolveOperatingModelAuthoringConfiguration: () => ({ enabled: false }) },
    "./workspace-tools-navigation": { WorkspaceToolsNavigation: () => null },
  });
  const tree = await WorkspaceShell({ activeView: "organization", asOf: "2026-10-01T12:00:00Z", children: null,
    configuration: { appearance: { accent: {}, logo: { kind: "text", text: "F" }, displayName: "Fictional Campus" } },
    source: { kind: "fixture", label: "Fictional" } });
  const navigation = nodes(tree, node => node.type?.name === "WorkspaceNavigation");
  assert.equal(navigation.length, 2, "desktop and mobile use the same navigation");
  for (const item of navigation) {
    const html = renderToStaticMarkup(React.createElement(item.type, item.props));
    assert.match(html, new RegExp(`aria-current="page"[^>]*href="${enabled ? "/studio/organization" : "/organization"}"`));
    if (!enabled) assert.doesNotMatch(html, /href="\/studio/);
    else assert.match(html, /href="\/studio"/);
  }
});

test("Studio offers direct peer links instead of hiding job titles behind Responsibilities", async () => {
  const { default: Page } = await compile("app/studio/page.tsx", {
    "next/server": { connection: async () => {} },
    "next/navigation": { notFound() { throw new Error("NOT_FOUND"); } },
    "@/lib/organization-structure-experience": { loadKnowledgeGapsExperience: async () => ({
      enabled: true, data: { people: [], positions: [], units: [], operationalRoles: [] },
      knowledgeGaps: { items: [] }, discovery: { enabled: false },
    }) },
    "../workspace-shell": { WorkspaceShell: Box, WorkspacePageHeader: Box },
  });
  const tree = await Page();
  const nav = nodes(tree, node => node.props?.["aria-label"] === "Organization shortcuts")[0];
  const html = renderToStaticMarkup(nav);
  for (const [label, href] of [["Units", "/studio/organization?view=units"], ["People", "/studio/organization?view=people"], ["Job titles", "/studio/organization?view=positions"], ["Responsibilities", "/studio/responsibilities"]]) {
    assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.includes(label));
  }
  assert.doesNotMatch(html, /#edit-position/);
});

test("organizational Studio pages keep Organization selected without broadening loader access", async () => {
  for (const path of ["organization", "organization/positions/[stableKey]", "organization/people/[stableKey]", "organization/units/[stableKey]", "organization/positions/new", "organization/people/new", "organization/units/new", "organization/positions/[stableKey]/describe-work", "responsibilities", "responsibilities/roles/new", "responsibilities/roles/[stableKey]"]) {
    const source = await read(`app/studio/${path}/page.tsx`);
    assert.match(source, /activeView="organization"/);
    assert.match(source, /notFound\(/);
  }
});
