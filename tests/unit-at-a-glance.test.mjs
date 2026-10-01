import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/studio/unit-at-a-glance.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const loaded = { exports: {} };
const primitives = {
  Badge: ({ children, tone, ...props }) => { void tone; return React.createElement("span", props, children); },
  Button: ({ children, variant, size, ...props }) => { void variant; void size; return React.createElement("button", props, children); },
  Card: ({ children, ...props }) => React.createElement("section", props, children),
};
vm.runInNewContext(compiled, {
  module: loaded, exports: loaded.exports,
  require(id) {
    if (id === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (id.endsWith("/primitives")) return primitives;
    return require(id);
  },
});
const { UnitAtAGlance } = loaded.exports;

const unit = { id: "unit-printing", name: "Fictional Printing" };
const processA = { id: "process:printing/one", name: "Print requests", status: "draft", relationships: ["participates"], systems: [] };
const processB = { id: "process:printing/two", name: "Print requests", status: "active", relationships: ["owns"], systems: [] };
const roleA = { id: "role:1", stableKey: "role-one", name: "Queue coordination", status: "active" };
const roleB = { id: "role:2", stableKey: "role-two", name: "Queue coordination", status: "active" };
const mandate = (id, role, scope, coverage = [], processes = []) => ({
  id, role, scope, coverage, processes, type: "shared", typeLabel: "Shared responsibility", revision: `revision-${id}`,
  systems: [], effectiveFrom: "2026-01-01", effectiveUntil: null,
});
const uncoveredA = mandate("mandate-day", roleA, "Daytime requests", [], [processA]);
const coveredA = mandate("mandate-evening", roleA, "Evening requests", [{
  id: "coverage-evening", type: "backup", typeLabel: "Backup", person: { id: "person-covered", name: "Casey Coverage" },
}], [processA]);
const uncoveredB = mandate("mandate-other", roleB, "Equipment requests", [], [processB]);
const positionA = {
  id: "position:coordinator/one", revision: "position-one-revision", title: "Coordinator", status: "active", unit,
  assignments: [{ id: "assignment-one", person: { id: "person-occupant", name: "Alex Occupant" }, type: "incumbent" }],
  primaryManager: null, mandates: [uncoveredA], processes: [], systems: [],
};
const positionB = {
  ...positionA, id: "position:coordinator/two", revision: "position-two-revision", assignments: [], mandates: [coveredA, uncoveredB],
};

function nodes(element, predicate) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap((item) => nodes(item, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
}
const coverageButtons = (tree) => nodes(tree, (node) => node.props?.onClick && /Who does this work\?/.test(node.props["aria-label"] ?? ""));
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const html = (tree) => renderToStaticMarkup(tree);

function render(positions = [positionA, positionB], overrides = {}) {
  const calls = [];
  const tree = UnitAtAGlance({ positions, onChooseCoverage: (...args) => calls.push(args), ...overrides });
  return { tree, calls, html: html(tree) };
}

test("summary counts exact identities, deduplicating shared Roles and Processes without merging namesakes", () => {
  const view = render();
  const content = text(view.html);
  assert.match(content, /2\s+job titles|job titles\s+2/i);
  assert.match(content, /2\s+(?:linked )?responsibilities|responsibilities\s+2/i);
  assert.match(content, /2\s+(?:connected )?Processes|Processes\s+2/i);
  assert.equal(coverageButtons(view.tree).length, 2);
  const links = nodes(view.tree, (node) => node.props?.href?.startsWith("/explorer/"));
  assert.deepEqual(links.map((node) => node.props.href).sort(), [processA, processB].map((process) => `/explorer/${encodeURIComponent(process.id)}`).sort());
});

test("missing coverage is per mandate, not inferred from occupants or the same Role held elsewhere", () => {
  const view = render();
  const choices = coverageButtons(view.tree);
  assert.equal(choices.length, 2);
  assert.ok(choices.some((node) => node.props["aria-label"].includes("Daytime requests")));
  assert.ok(choices.some((node) => node.props["aria-label"].includes("Equipment requests")));
  assert.ok(!choices.some((node) => node.props["aria-label"].includes("Evening requests")));
  assert.doesNotMatch(view.html, /Alex Occupant|Casey Coverage/);
  assert.equal(view.calls.length, 0);
});

test("coverage actions identify responsibility, job title and scope and pass the exact objects and trigger", () => {
  const view = render();
  for (const [scope, expectedPosition, expectedMandate] of [
    ["Daytime requests", positionA, uncoveredA], ["Equipment requests", positionB, uncoveredB],
  ]) {
    const button = coverageButtons(view.tree).find((node) => node.props["aria-label"].includes(scope));
    assert.match(button.props["aria-label"], /Queue coordination/);
    assert.match(button.props["aria-label"], /Coordinator/);
    assert.equal(button.props.type, "button");
    const trigger = { id: `trigger-${expectedMandate.id}` };
    button.props.onClick({ currentTarget: trigger });
    const call = view.calls.at(-1);
    assert.strictEqual(call[0], expectedPosition);
    assert.strictEqual(call[1], expectedMandate);
    assert.strictEqual(call[2], trigger);
  }
  assert.equal(view.calls.length, 2);
});

test("disabled state suppresses coverage callbacks even if a handler is invoked directly", () => {
  const view = render(undefined, { disabled: true });
  for (const button of coverageButtons(view.tree)) {
    assert.equal(button.props.disabled, true);
    button.props.onClick({ currentTarget: { id: "disabled-trigger" } });
  }
  assert.equal(view.calls.length, 0);
});

test("inactive Positions and inactive Roles do not become actionable missing-people items", () => {
  const inactivePosition = { ...positionA, id: "inactive-position", status: "inactive" };
  const inactiveRoleMandate = { ...uncoveredA, id: "inactive-role-mandate", role: { ...roleA, status: "inactive" } };
  const activePosition = { ...positionB, mandates: [inactiveRoleMandate] };
  const view = render([inactivePosition, activePosition]);
  assert.equal(coverageButtons(view.tree).length, 0);
  assert.equal(view.calls.length, 0);
});

test("missing Position or mandate revision gives a full-details fallback instead of an inline coverage action", () => {
  for (const position of [
    { ...positionA, mandates: [{ ...uncoveredA, revision: "" }] },
    { ...positionA, revision: "" },
  ]) {
    const view = render([position]);
    assert.equal(coverageButtons(view.tree).length, 0);
    assert.ok(nodes(view.tree, (node) => node.props?.href === `/studio/organization/positions/${encodeURIComponent(position.id)}`).length);
    assert.equal(view.calls.length, 0);
  }
});

test("Processes remain a collapsed native details section with encoded links and honest Draft state", () => {
  const view = render();
  const processDetails = nodes(view.tree, (node) => node.type === "details" && nodes(node, (child) => child.props?.href?.startsWith("/explorer/")).length)[0];
  assert.ok(processDetails);
  assert.notEqual(processDetails.props.open, true);
  assert.match(html(processDetails), /draft/i);
  assert.doesNotMatch(html(processDetails), /approved|validated|published/i);
  const links = nodes(processDetails, (node) => node.props?.href?.startsWith("/explorer/"));
  assert.equal(links.length, 2);
  assert.equal(view.calls.length, 0);
  const archived = render([{ ...positionA, mandates: [{ ...uncoveredA, processes: [{ ...processA, status: "archived" }] }] }]);
  assert.match(archived.html, /Archived/);
  assert.doesNotMatch(archived.html, /approved|validated|published/i);
});

test("only the first three missing-people items are initially expanded; the rest stay in closed details", () => {
  const positions = Array.from({ length: 6 }, (_, index) => ({
    ...positionA, id: `position-${index}`, title: `Coordinator ${index}`,
    mandates: [mandate(`mandate-${index}`, roleA, `Scope ${index}`)],
  }));
  const view = render(positions);
  const all = coverageButtons(view.tree);
  assert.equal(all.length, 6);
  const overflow = nodes(view.tree, (node) => node.type === "details" && coverageButtons(node).length)[0];
  assert.ok(overflow);
  assert.notEqual(overflow.props.open, true);
  assert.equal(coverageButtons(overflow).length, 3);
  assert.equal(all.filter((button) => !coverageButtons(overflow).includes(button)).length, 3);
  assert.equal(view.calls.length, 0);
});

test("zero recorded coverage never means a vacant Position, and absent responsibilities are not inferred", () => {
  const view = render([{ ...positionA, mandates: [] }]);
  assert.equal(coverageButtons(view.tree).length, 0);
  assert.equal(nodes(view.tree, (node) => node.props?.href?.startsWith("/explorer/")).length, 0);
  assert.doesNotMatch(view.html, /Alex Occupant|vacant|unassigned person/i);
  const uncovered = render([positionA]);
  assert.equal(coverageButtons(uncovered.tree).length, 1);
  assert.doesNotMatch(uncovered.html, /vacant|No people work here/i);
});

test("empty Unit remains neutral and opening the summary never writes, calls back, or mutates its inputs", () => {
  const empty = render([]);
  assert.equal(coverageButtons(empty.tree).length, 0);
  assert.doesNotMatch(empty.html, /complete|fully documented|all work covered|error|warning/i);
  const before = JSON.stringify([positionA, positionB]);
  const populated = render();
  assert.equal(JSON.stringify([positionA, positionB]), before);
  assert.equal(empty.calls.length + populated.calls.length, 0);
  assert.equal(nodes(populated.tree, (node) => node.type === "form" || node.props?.action || node.props?.onSubmit).length, 0);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:actions|database|server-db)["']/);
});
