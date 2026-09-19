import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const stableKey = "12345678-1234-4123-8123-123456789abc";
const role = {
  id: "role:17", stableKey, revision: "2026-09-19T12:00:00Z",
  name: "Print Queue Coordinator", description: "Coordinates printing requests.",
  status: "active", mandates: [], processes: [], systems: [], activity: [],
};

function primitive(tag) {
  return function Primitive({ children, ...props }) {
    delete props.tone;
    delete props.variant;
    return React.createElement(tag, props, children);
  };
}

async function load(path, { pending = false } = {}) {
  const code = ts.transpileModule(await read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  const calledActions = [];
  const actions = new Proxy({}, { get: (_target, name) => function action() { throw new Error(`Render must not call ${name}`); } });
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(id) {
    if (id === "react/jsx-runtime") return jsxRuntime;
    if (id === "react") return { ...React, useActionState(action, initial) { calledActions.push(action); return [initial, action, pending]; } };
    if (id === "next/link") return { default: primitive("a") };
    if (id === "@/app/ui/icons") return { ArrowIcon: primitive("svg"), RoleIcon: primitive("svg") };
    if (id === "@/app/ui/primitives") return {
      Alert: primitive("aside"), Badge: primitive("span"), Button: primitive("button"),
      Card: primitive("section"), FieldLabel: primitive("span"), Input: primitive("input"),
      Select: primitive("select"), SearchField: primitive("input"),
    };
    if (id === "@/app/organization/action-state") return { initialStructureActionState: { status: "idle", message: "" } };
    if (id === "./actions" || id === "@/app/organization/actions") return actions;
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return { ...loaded.exports, calledActions };
}

test("Role editor is directly reachable and visible without opening a disclosure", async () => {
  const { ResponsibilityRoleWorkspace } = await load("app/studio/responsibilities/responsibility-role-workspace.tsx");
  const html = renderToStaticMarkup(React.createElement(ResponsibilityRoleWorkspace, { data: { positions: [], people: [] }, role }));
  const editor = html.slice(html.indexOf('id="edit-role"'), html.indexOf("</section>"));
  assert.match(editor, /Edit Role name/);
  assert.match(editor, /<form/);
  assert.doesNotMatch(editor, /<details/);
  assert.match(editor, /name="name"[^>]*value="Print Queue Coordinator"/);
  assert.match(editor, /name="stableKey"[^>]*value="12345678-1234-4123-8123-123456789abc"/);
  assert.match(editor, /name="expectedRevision"/);
  assert.match(editor, /name="reason"[^>]*required=""/);
  assert.match(editor, /Its connections stay in place/);
  assert.match(editor, /previous name stays in history/);
  assert.match(editor, /Save Role changes/);
});

test("pending Role edits show feedback and inactive Roles have no edit form", async () => {
  const pending = await load("app/studio/responsibilities/responsibility-role-workspace.tsx", { pending: true });
  const html = renderToStaticMarkup(React.createElement(pending.ResponsibilityRoleWorkspace, { data: { positions: [], people: [] }, role }));
  assert.match(html, /<button[^>]*disabled=""[^>]*>Saving…/);
  const inactive = renderToStaticMarkup(React.createElement(pending.ResponsibilityRoleWorkspace, { data: { positions: [], people: [] }, role: { ...role, status: "inactive" } }));
  assert.doesNotMatch(inactive, /<form|Save Role changes/);
});

test("Role list makes editing explicit and uses immutable identity, not the Role name or legacy ID", async () => {
  const { ResponsibilityBrowser } = await load("app/studio/responsibilities/responsibility-browser.tsx");
  const render = status => renderToStaticMarkup(React.createElement(ResponsibilityBrowser, { roles: [{ ...role, status, coverageCount: 0, mandateCount: 0, processCount: 0, systemCount: 0 }] }));
  const html = render("active");
  assert.match(html, new RegExp(`href="/studio/responsibilities/roles/${stableKey}#edit-role"`));
  assert.match(html, /Edit Role name and details/);
  assert.doesNotMatch(html, /href="[^"]*(?:role:17|Print Queue Coordinator)/);
  const inactive = render("inactive");
  assert.match(inactive, /View Role history/);
  assert.doesNotMatch(inactive, /#edit-role|Edit Role name and details/);
});

test("renaming continues through existing authenticated, tenant-scoped, atomic history path", async () => {
  const ui = await read("app/studio/responsibilities/responsibility-role-workspace.tsx");
  const actions = await read("app/studio/responsibilities/actions.ts");
  const administration = await read("lib/organization-structure-administration.ts");
  const update = administration.slice(administration.indexOf("export async function updateOperationalRole("), administration.indexOf("export async function inactivateOperationalRole("));
  assert.match(ui, /useActionState\(updateOperationalRoleAction, initialStructureActionState\)/);
  assert.match(actions, /await updateOperationalRole\(/);
  assert.match(administration, /async function administrationAccess\(\)[\s\S]*?requireWorkspaceAccess\(\)/);
  assert.match(update, /await administrationAccess\(\)/);
  assert.match(update, /organization_id = \$4 and stable_key = \$5::uuid/);
  assert.match(update, /revisionsMatch\(current, input.expectedRevision\)/);
  assert.match(update, /atomicQuery\([\s\S]*auditCte\(targetDescriptor\("operational_role"\)/);
  assert.doesNotMatch(update, /set stable_key|delete from|update (?:people|positions|role_mandates|role_coverages|processes)/i);
});
