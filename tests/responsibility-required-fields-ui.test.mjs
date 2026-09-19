import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const person = { id: "f44cbd1f-1ed0-43d0-9547-62d252326468", name: "Fictional coordinator", status: "active" };
const position = { id: "71515112-d452-4fb4-94cb-fc6734a130c2", title: "Printing Coordinator", status: "active", revision: "2026-09-19T12:00:00Z", unit: null };
const coverage = { id: "fictional-coverage", person, typeLabel: "Permanent", revision: position.revision };
const item = { position, mandate: { id: "fictional-mandate", revision: position.revision, typeLabel: "Primary", scope: null, coverage: [coverage] } };
const role = { id: "role:17", stableKey: "632088d2-d37d-424a-a8fa-9a43eb0cbd29", revision: position.revision, name: "Print Queue Coordinator", description: null, status: "active", mandates: [item], processes: [], systems: [], activity: [] };
const data = { positions: [position], people: [person] };

function primitive(tag) {
  return function Primitive({ children, ...props }) {
    delete props.tone;
    delete props.variant;
    return React.createElement(tag, props, children);
  };
}

async function load(path, stateOverrides = []) {
  const source = await read(path);
  const privateExports = path.endsWith("responsibility-role-workspace.tsx")
    ? "\nexport { EditRoleForm, AddMandateForm, AddCoverageForm };" : "";
  const code = ts.transpileModule(source + privateExports, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  let stateIndex = 0;
  const loaded = { exports: {} };
  const actions = new Proxy({}, { get: (_target, name) => function action() { throw new Error(`Rendering must not call ${name}`); } });
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(id) {
    if (id === "react/jsx-runtime") return jsxRuntime;
    if (id === "react") return { ...React,
      useState(initial) { const value = stateIndex < stateOverrides.length ? stateOverrides[stateIndex] : initial; stateIndex += 1; return [value, () => {}]; },
      useActionState(action, initial) { return [initial, action, false]; },
    };
    if (id === "next/link") return { default: primitive("a") };
    if (id === "@/app/ui/icons") return { ArrowIcon: primitive("svg") };
    if (id === "@/app/ui/primitives") return {
      Alert: primitive("aside"), Badge: primitive("span"), Button: primitive("button"), Card: primitive("section"),
      FieldLabel: primitive("span"), Input: primitive("input"), Select: primitive("select"),
      RequiredMark: () => React.createElement("span", { "aria-label": "required" }, " *"),
    };
    if (id === "@/app/organization/action-state") return { initialStructureActionState: { status: "idle", message: "" } };
    if (id === "./actions" || id === "@/app/organization/actions") return actions;
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return loaded.exports;
}

function labelFor(html, name) {
  const label = [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)].map(match => match[0]).find(value => value.includes(`name="${name}"`));
  assert.ok(label, `Expected a visible label for ${name}`);
  return label;
}

function required(html, name) {
  const label = labelFor(html, name);
  assert.match(label, /aria-label="required"/);
  assert.match(label, /<(?:input|select|textarea)\b[^>]*required=""/);
}

function optional(html, name) {
  const label = labelFor(html, name);
  assert.match(label, /optional/);
  assert.doesNotMatch(label, /aria-label="required"|required=""/);
}

test("Role editing visibly marks actual requirements and leaves the description optional", async () => {
  const { EditRoleForm } = await load("app/studio/responsibilities/responsibility-role-workspace.tsx");
  const html = renderToStaticMarkup(React.createElement(EditRoleForm, { role }));
  assert.match(html, /\* Required; other fields are optional\./);
  for (const name of ["name", "changeKind", "effectiveDate", "reason"]) required(html, name);
  optional(html, "description");
  assert.match(html, /value="correction" selected=""/);
  assert.match(html, /name="effectiveDate"[^>]*value="\d{4}-\d{2}-\d{2}"/);
});

test("Role creation keeps defaults and does not require a description or primary mandate scope", async () => {
  const { RoleCreateForm } = await load("app/studio/responsibilities/role-create-form.tsx");
  const html = renderToStaticMarkup(React.createElement(RoleCreateForm, { data }));
  for (const name of ["newRoleName", "positionStableKey", "mandateType", "effectiveDate", "reason"]) required(html, name);
  optional(html, "newRoleDescription");
  optional(html, "scope");
  assert.match(html, /value="primary" selected=""/);
  assert.match(html, /\* Required; other fields are optional\./);
});

test("shared mandate scope is marked required only when sharing is selected", async () => {
  const create = await load("app/studio/responsibilities/role-create-form.tsx", [position.id, "shared"]);
  const createHtml = renderToStaticMarkup(React.createElement(create.RoleCreateForm, { data }));
  required(createHtml, "scope");
  const primary = await load("app/studio/responsibilities/responsibility-role-workspace.tsx", ["", "primary"]);
  const primaryHtml = renderToStaticMarkup(React.createElement(primary.AddMandateForm, { data, role }));
  optional(primaryHtml, "scope");
  const shared = await load("app/studio/responsibilities/responsibility-role-workspace.tsx", ["", "shared"]);
  const sharedHtml = renderToStaticMarkup(React.createElement(shared.AddMandateForm, { data, role }));
  required(sharedHtml, "scope");
});

test("coverage context is optional for permanent coverage and visibly required for temporary coverage", async () => {
  for (const type of ["permanent", "interim", "acting", "delegated", "backup"]) {
    const { AddCoverageForm } = await load("app/studio/responsibilities/responsibility-role-workspace.tsx", [type]);
    const html = renderToStaticMarkup(React.createElement(AddCoverageForm, { data, item }));
    for (const name of ["personStableKey", "coverageType", "effectiveDate", "reason"]) required(html, name);
    if (type === "permanent") optional(html, "coverageReason");
    else required(html, "coverageReason");
  }
});

test("all required visible Role controls are labeled and current coverage links to the existing Person identity", async () => {
  const { ResponsibilityRoleWorkspace } = await load("app/studio/responsibilities/responsibility-role-workspace.tsx");
  const html = renderToStaticMarkup(React.createElement(ResponsibilityRoleWorkspace, { data, role }));
  const labels = [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)].map(match => match[0]);
  for (const label of labels.filter(value => /<(?:input|select|textarea)\b[^>]*required=""/.test(value))) {
    assert.match(label, /aria-label="required"/, `Unmarked required field: ${label}`);
  }
  assert.match(html, new RegExp(`href="/studio/organization/people/${person.id}"`));
  assert.match(html, /Fictional coordinator · Permanent/);
  assert.match(html, /name="stableKey"[^>]*value="632088d2-d37d-424a-a8fa-9a43eb0cbd29"/);
  assert.match(html, /name="expectedRevision"/);
});
