import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { buildOrganizationStructureData } from "../lib/organization-structure-data.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const icons = { ChevronIcon: () => null, InfoIcon: () => null, SearchIcon: () => null };
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const actions = new Proxy({}, { get: (_target, name) => function action() { throw new Error(`Rendering must not call ${name}`); } });
let primitives;
async function load(path, states = []) {
  const source = await read(path);
  const expose = path.endsWith("structure-administration-panel.tsx")
    ? "\nexport { EditForm, EstablishRoleMandateForm, EstablishRoleCoverageForm };" : "";
  const { outputText } = ts.transpileModule(source + expose, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  let stateIndex = 0;
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, { module: compiled, exports: compiled.exports, require(id) {
    if (id === "react/jsx-runtime") return jsxRuntime;
    if (id === "react") return { ...React,
      useState(initial) { const value = stateIndex < states.length ? states[stateIndex] : initial; stateIndex += 1; return [value, () => {}]; },
      useActionState(action, initial) { return [initial, action, false]; },
    };
    if (id === "next/link") return { default: Link };
    if (id === "./icons") return icons;
    if (id.endsWith("ui/primitives")) return primitives;
    if (id.endsWith("/actions")) return actions;
    if (id.endsWith("/action-state")) return { initialStructureActionState: { status: "idle", message: "" } };
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return compiled.exports;
}
primitives = await load("app/ui/primitives.tsx");
const data = buildOrganizationStructureData(
  JSON.parse(await read("db/seeds/organization-structure.json")),
  JSON.parse(await read("db/seeds/process-explorer.json")),
  "2026-08-09T12:00:00.000Z",
);
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const labels = html => [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)].map(match => match[0]);
function labelFor(html, name) {
  const label = labels(html).find(value => value.includes(`name="${name}"`));
  assert.ok(label, `Expected a label for ${name}`);
  return label;
}
function required(html, name) {
  const label = labelFor(html, name);
  assert.match(label, /class="sr-only"> \(required\)/);
  assert.match(label, /<(?:input|select|textarea)\b[^>]*required=""/);
}
function optional(html, name) {
  const label = labelFor(html, name);
  assert.match(label, /optional/);
  assert.doesNotMatch(label, /\(required\)|required=""/);
}

test("required marker has both a visible star and accessible meaning", () => {
  const html = render(primitives.RequiredMark, {});
  assert.match(html, /aria-hidden="true">\*/);
  assert.match(html, /class="sr-only"> \(required\)/);
});

test("all required organization-maintenance controls are labeled, including removal confirmation", async () => {
  const { StructureAdministrationPanel } = await load("app/organization/structure-administration-panel.tsx");
  for (const [entityType, collection] of [["organization_unit", data.units], ["position", data.positions], ["person", data.people]]) {
    for (const entity of collection.filter(item => item.status === "active")) {
      const html = render(StructureAdministrationPanel, { changes: [], data, entity, entityType });
      const requiredControls = [...html.matchAll(/<(?:input|select|textarea)\b[^>]*required=""[^>]*>/g)];
      const markedLabels = labels(html).filter(label => /<(?:input|select|textarea)\b[^>]*required=""/.test(label));
      assert.equal(markedLabels.length, requiredControls.length, "Every required control must have a visible label");
      for (const label of markedLabels) assert.match(label, /class="sr-only"> \(required\)/, label);
      assert.match(html, /\* Required\. Everything else is optional\./);
    }
  }
});

test("title and name edits preserve optional placement and default audit fields", async () => {
  const { EditForm } = await load("app/organization/structure-administration-panel.tsx");
  for (const [entityType, entity, name, placement] of [
    ["organization_unit", data.units[0], "name", "parentOrganizationUnitStableKey"],
    ["position", data.positions[0], "title", "organizationUnitStableKey"],
    ["person", data.people[0], "displayName", null],
  ]) {
    const html = render(EditForm, { data, entity, entityType });
    for (const field of [name, "changeKind", "effectiveDate", "reason"]) required(html, field);
    if (placement) optional(html, placement);
    assert.match(html, /value="correction" selected=""/);
    assert.match(html, /name="effectiveDate"[^>]*value="\d{4}-\d{2}-\d{2}"/);
    assert.match(html, /name="expectedRevision"/);
    assert.match(html, /A short note/);
  }
});

test("new Units, Positions, and People only require their identity and history fields", async () => {
  const { StructureCreateForm } = await load("app/studio/organization/structure-create-form.tsx");
  for (const [entityType, name, placement] of [
    ["organization_unit", "name", "parentOrganizationUnitStableKey"],
    ["position", "title", "organizationUnitStableKey"],
    ["person", "displayName", null],
  ]) {
    const html = render(StructureCreateForm, { data, entityType });
    for (const field of [name, "changeKind", "effectiveDate", "reason"]) required(html, field);
    if (placement) optional(html, placement);
    assert.match(html, /\* Required\. Everything else is optional\./);
  }
});

test("structure mandate and coverage markers follow conditional validation", async () => {
  const position = data.positions.find(item => item.mandates.length > 0);
  for (const type of ["primary", "shared"]) {
    const { EstablishRoleMandateForm } = await load("app/organization/structure-administration-panel.tsx", ["create-new", type]);
    const html = render(EstablishRoleMandateForm, { data, position });
    required(html, "newRoleName");
    optional(html, "newRoleDescription");
    if (type === "shared") required(html, "scope");
    else optional(html, "scope");
  }
  for (const type of ["permanent", "interim", "acting", "delegated", "backup"]) {
    const { EstablishRoleCoverageForm } = await load("app/organization/structure-administration-panel.tsx", [type]);
    const html = render(EstablishRoleCoverageForm, { data, position, mandate: position.mandates[0] });
    if (type === "permanent") optional(html, "coverageReason");
    else required(html, "coverageReason");
  }
});
