import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const code = ts.transpileModule(await readFile(new URL("../app/studio/unit-roster.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
const find = (node, predicate) => elements(node).find(predicate);
const unit = { id: "unit-a", name: "Fictional Services" };
const position = { id: "position-a", revision: "revision-before-edit", title: "Coordinator", status: "active", unit, assignments: [], occupancy: { label: "Not established", tone: "neutral" }, primaryManager: null };

function harness() {
  let hooks, cursor;
  const stores = new Map();
  const effects = [];
  const listeners = new Map();
  let discard = false;
  let confirmations = 0;
  let refreshes = 0;
  let focusCalls = 0;
  const fakeReact = {
    ...React,
    useState(initial) {
      const current = hooks;
      const index = cursor++;
      if (!(index in current)) current[index] = initial;
      return [current[index], value => { current[index] = typeof value === "function" ? value(current[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return hooks[index] ??= { current: initial };
    },
    useEffect(effect) { effects.push(effect); },
    useTransition: () => [false, callback => callback()],
  };
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    window: {
      confirm: () => { confirmations++; return discard; },
      addEventListener: (name, handler) => listeners.set(name, handler),
      removeEventListener: name => listeners.delete(name),
    },
    require(id) {
      if (id === "react") return fakeReact;
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "next/navigation") return { useRouter: () => ({ refresh: () => { refreshes++; } }) };
      if (id === "next/link") return { default: "link" };
      if (id === "../ui/primitives") return { Badge: "badge", Button: "button", Card: "card" };
      if (id === "./unit-roster-editor") return { UnitRosterEditor: "editor" };
      if (id === "./unit-add-menu") return { UnitAddMenu: "add-menu" };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  function render(component, props) {
    if (!stores.has(component)) stores.set(component, []);
    hooks = stores.get(component);
    cursor = 0;
    return component(props);
  }
  const roster = data => render(loaded.exports.UnitRoster, { unit, data: data ?? { positions: [position] } });
  const panel = tree => find(tree, node => typeof node.type === "function" && node.type.name === "RosterEditPanel");
  function open() {
    find(roster(), node => node.props?.["aria-label"] === "Edit Coordinator").props.onClick({ currentTarget: { focus() { focusCalls++; } } });
    return panel(roster());
  }
  return {
    roster, panel, open, effects, listeners,
    renderPanel: node => render(node.type, node.props),
    allowDiscard: () => { discard = true; },
    get confirmations() { return confirmations; },
    get refreshes() { return refreshes; },
    get focusCalls() { return focusCalls; },
  };
}

test("opening an editor is local and retains the original identity/revision snapshot through refreshes", () => {
  const h = harness();
  const panel = h.open();
  assert.equal(panel.props.position, position);
  assert.equal(h.refreshes, 0);
  const freshData = { positions: [{ ...position, title: "A different saved title", revision: "new-revision" }] };
  assert.equal(h.panel(h.roster(freshData)).props.position.revision, "revision-before-edit");
  assert.equal(h.panel(h.roster(freshData)).props.data.positions[0], position);
});

test("dirty edits are kept when cancelling discard, and closing saves nothing", () => {
  const h = harness();
  const panel = h.open();
  find(h.renderPanel(panel), node => node.type === "editor").props.onDirty();
  find(h.renderPanel(panel), node => node.props?.["aria-label"] === "Close editor").props.onClick();
  assert.ok(h.panel(h.roster()));
  assert.equal(h.confirmations, 1);
  h.allowDiscard();
  find(h.renderPanel(panel), node => node.props?.["aria-label"] === "Close editor").props.onClick();
  assert.equal(h.panel(h.roster()), undefined);
  assert.equal(h.refreshes, 0);
});

test("pending save blocks closing, Escape, section switches, and full-detail navigation", () => {
  const h = harness();
  const panel = h.open();
  find(h.renderPanel(panel), node => node.type === "editor").props.onPendingChange(true);
  const tree = h.renderPanel(panel);
  const close = find(tree, node => node.props?.["aria-label"] === "Close editor");
  assert.equal(close.props.disabled, true);
  close.props.onClick();
  let prevented = 0;
  tree.props.onCancel({ preventDefault() { prevented++; } });
  find(tree, node => node.type === "link").props.onClick({ preventDefault() { prevented++; } });
  assert.equal(prevented, 2);
  assert.ok(h.panel(h.roster()));
  assert.equal(h.confirmations, 0);
  for (const node of elements(tree).filter(node => node.props?.["aria-pressed"] !== undefined)) assert.equal(node.props.disabled, true);
});

test("successful save closes the panel, announces success and refreshes in place once", () => {
  const h = harness();
  const panel = h.open();
  find(h.renderPanel(panel), node => node.type === "editor").props.onSaved("Job title saved.");
  const tree = h.roster();
  assert.equal(h.panel(tree), undefined);
  assert.equal(h.refreshes, 1);
  assert.equal(find(tree, node => node.props?.role === "status").props.children, "Job title saved.");
  h.effects.at(-1)();
  assert.equal(h.focusCalls, 1, "return keyboard focus to the triggering row after the refresh");
});

test("Escape uses the same dirty guard and the native dialog supplies modal focus handling", () => {
  const h = harness();
  const panel = h.open();
  find(h.renderPanel(panel), node => node.type === "editor").props.onDirty();
  const tree = h.renderPanel(panel);
  assert.equal(tree.type, "dialog");
  assert.equal(tree.props["aria-labelledby"], "unit-roster-edit-title");
  let prevented = false;
  tree.props.onCancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.ok(h.panel(h.roster()));
  assert.equal(h.confirmations, 1);
});
