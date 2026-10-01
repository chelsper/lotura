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
const position = { id: "position-a", revision: "revision-before-edit", title: "Coordinator", status: "active", unit, assignments: [], mandates: [], occupancy: { label: "Not established", tone: "neutral" }, primaryManager: null };

function harness() {
  let hooks, cursor;
  const stores = new Map();
  const effects = [];
  const listeners = new Map();
  let discard = false;
  let confirmations = 0;
  let refreshes = 0;
  let focusCalls = 0;
  let summaryFocusCalls = 0;
  let refreshing = false;
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
    useTransition: () => [refreshing, callback => callback()],
  };
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    document: { getElementById: id => id === "unit-at-a-glance" ? { focus() { summaryFocusCalls++; } } : null },
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
      if (id === "./unit-responsibilities-panel") return { UnitResponsibilitiesPanel: "responsibilities" };
      if (id === "./unit-add-menu") return { UnitAddMenu: "add-menu" };
      if (id === "./unit-at-a-glance") return { UnitAtAGlance: "unit-summary" };
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
  function open(mode = "title") {
    const label = mode === "responsibilities" ? "Responsibilities for Coordinator" : "Edit Coordinator";
    find(roster(), node => node.props?.["aria-label"] === label).props.onClick({ currentTarget: { focus() { focusCalls++; } } });
    return panel(roster());
  }
  return {
    roster, panel, open, effects, listeners,
    renderPanel: node => render(node.type, node.props),
    allowDiscard: () => { discard = true; },
    setRefreshing: value => { refreshing = value; },
    get confirmations() { return confirmations; },
    get refreshes() { return refreshes; },
    get focusCalls() { return focusCalls; },
    get summaryFocusCalls() { return summaryFocusCalls; },
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

test("Unit summary receives only direct-Unit positions and opens the exact responsibility snapshot", () => {
  const h = harness();
  const mandate = { id: "mandate-b", revision: "mandate-revision" };
  const own = { ...position, mandates: [mandate] };
  const child = { ...position, id: "child-position", unit: { id: "child-unit", parent: unit } };
  const unplaced = { ...position, id: "unplaced", unit: null };
  const data = { positions: [own, child, unplaced] };
  const summary = find(h.roster(data), node => node.type === "unit-summary");
  assert.deepEqual(summary.props.positions, [own]);
  assert.equal(summary.props.disabled, false);
  const trigger = { focus() {} };
  summary.props.onChooseCoverage(child, mandate, trigger);
  summary.props.onChooseCoverage(own, { ...mandate }, trigger);
  assert.equal(h.panel(h.roster(data)), undefined, "reject targets outside the rendered snapshot");
  summary.props.onChooseCoverage(own, mandate, trigger);
  const panel = h.panel(h.roster(data));
  assert.equal(panel.props.data, data);
  assert.equal(panel.props.position, own);
  assert.equal(panel.props.initialMode, "responsibilities");
  assert.equal(panel.props.initialCoverageMandateId, mandate.id);
  const childForm = find(h.renderPanel(panel), node => node.type === "responsibilities");
  assert.equal(childForm.props.initialCoverageMandateId, mandate.id);
  assert.equal(h.refreshes, 0);
  const fresh = { positions: [{ ...own, revision: "newer", mandates: [] }] };
  assert.equal(h.panel(h.roster(fresh)).props.position, own, "route refresh must not rebase an open form");
});

test("summary actions stay disabled during refresh and saved gaps return focus to the summary", () => {
  const h = harness();
  const mandate = { id: "mandate-b" };
  const own = { ...position, mandates: [mandate] };
  const data = { positions: [own] };
  const trigger = { isConnected: false, focus() { assert.fail("A removed gap button must not receive focus"); } };
  h.setRefreshing(true);
  const locked = find(h.roster(data), node => node.type === "unit-summary");
  assert.equal(locked.props.disabled, true);
  locked.props.onChooseCoverage(own, mandate, trigger);
  assert.equal(h.panel(h.roster(data)), undefined);
  h.setRefreshing(false);
  find(h.roster(data), node => node.type === "unit-summary").props.onChooseCoverage(own, mandate, trigger);
  const panel = h.panel(h.roster(data));
  find(h.renderPanel(panel), node => node.type === "responsibilities").props.onSaved("Person recorded.");
  h.roster({ positions: [] });
  h.effects.at(-1)();
  assert.equal(h.summaryFocusCalls, 1);
  assert.equal(h.refreshes, 1);
});

test("switching away from a direct coverage entry clears that entry point when returning", () => {
  const h = harness();
  const mandate = { id: "mandate-b" };
  const own = { ...position, mandates: [mandate] };
  const data = { positions: [own] };
  find(h.roster(data), node => node.type === "unit-summary").props.onChooseCoverage(own, mandate, { focus() {} });
  const panel = h.panel(h.roster(data));
  find(h.renderPanel(panel), node => node.type === "button" && node.props.children === "Job title").props.onClick();
  find(h.renderPanel(panel), node => node.type === "button" && node.props.children === "Responsibilities").props.onClick();
  assert.equal(find(h.renderPanel(panel), node => node.type === "responsibilities").props.initialCoverageMandateId, undefined);
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

for (const mode of ["title", "responsibilities"]) test(`${mode}: pending save blocks closing, Escape, section switches, and full-detail navigation`, () => {
  const h = harness();
  const panel = h.open(mode);
  find(h.renderPanel(panel), node => node.type === (mode === "title" ? "editor" : "responsibilities")).props.onPendingChange(true);
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

for (const mode of ["title", "responsibilities"]) test(`${mode}: successful save closes the panel, announces success and refreshes in place once`, () => {
  const h = harness();
  const panel = h.open(mode);
  const message = mode === "title" ? "Job title saved." : "Responsibility linked.";
  find(h.renderPanel(panel), node => node.type === (mode === "title" ? "editor" : "responsibilities")).props.onSaved(message);
  const tree = h.roster();
  assert.equal(h.panel(tree), undefined);
  assert.equal(h.refreshes, 1);
  assert.equal(find(tree, node => node.props?.role === "status").props.children, message);
  h.effects.at(-1)();
  assert.equal(h.focusCalls, 1, "return keyboard focus to the triggering row after the refresh");
});

test("responsibilities open directly with the Position snapshot and no navigation or save", () => {
  const h = harness();
  const panel = h.open("responsibilities");
  assert.equal(panel.props.initialMode, "responsibilities");
  const child = find(h.renderPanel(panel), node => node.type === "responsibilities");
  assert.equal(child.props.position, position);
  assert.equal(child.props.data.positions[0], position);
  assert.equal(find(h.renderPanel(panel), node => node.type === "editor"), undefined);
  assert.equal(h.refreshes, 0);
});

test("switching to responsibilities honors unsaved title edits", () => {
  const h = harness();
  const panel = h.open();
  find(h.renderPanel(panel), node => node.type === "editor").props.onDirty();
  const switchMode = () => find(h.renderPanel(panel), node => node.type === "button" && node.props.children === "Responsibilities").props.onClick();
  switchMode();
  assert.ok(find(h.renderPanel(panel), node => node.type === "editor"));
  assert.equal(h.confirmations, 1);
  h.allowDiscard();
  switchMode();
  assert.ok(find(h.renderPanel(panel), node => node.type === "responsibilities"));
  assert.equal(h.refreshes, 0);
});

test("discarding a responsibility subform clears the outer dirty guard", () => {
  const h = harness();
  const panel = h.open("responsibilities");
  find(h.renderPanel(panel), node => node.type === "responsibilities").props.onDirty(true);
  find(h.renderPanel(panel), node => node.type === "responsibilities").props.onDirty(false);
  find(h.renderPanel(panel), node => node.props?.["aria-label"] === "Close editor").props.onClick();
  assert.equal(h.panel(h.roster()), undefined);
  assert.equal(h.confirmations, 0);
  assert.equal(h.refreshes, 0);
});

test("an unconfirmed responsibility save blocks section switching but allows close and refresh", () => {
  const h = harness();
  const panel = h.open("responsibilities");
  const child = find(h.renderPanel(panel), node => node.type === "responsibilities");
  child.props.onDirty(true);
  child.props.onSaveUnconfirmed();
  child.props.onPendingChange(false);
  h.allowDiscard();
  const tree = h.renderPanel(panel);
  for (const tab of elements(tree).filter(node => node.props?.["aria-pressed"] !== undefined)) {
    assert.equal(tab.props.disabled, true);
    tab.props.onClick();
  }
  assert.ok(find(h.renderPanel(panel), node => node.type === "responsibilities"));
  assert.equal(h.confirmations, 0, "mode handlers also guard against bypassing disabled buttons");
  const close = find(tree, node => node.props?.["aria-label"] === "Close editor");
  assert.equal(close.props.disabled, false);
  close.props.onClick();
  assert.equal(h.panel(h.roster()), undefined);
  assert.equal(h.refreshes, 1, "closing fetches a fresh roster before another attempt");
  assert.equal(find(h.roster(), node => node.props?.role === "status").props.children, "", "an uncertain save must not announce success");
});

test("responsibility counts and manager cells match their column headings", () => {
  const h = harness();
  const tree = h.roster({ positions: [{ ...position, mandates: [{ id: "mandate-a" }], primaryManager: { position: { id: "manager-a", title: "Services Director", unit } } }] });
  const headings = elements(tree).filter(node => node.type === "th" && node.props.scope === "col");
  assert.equal(headings[3].props.children, "Responsibilities");
  const row = find(tree, node => node.type === "tr" && node.key === position.id);
  const cells = row.props.children;
  assert.equal(find(cells[2], node => node.type === "link").props.children, "Services Director");
  assert.equal(find(cells[3], node => node.type === "button").props.children, "1 linked");
});

test("inactive Positions expose recorded responsibilities without an Edit shortcut", () => {
  const h = harness();
  const tree = h.roster({ positions: [{ ...position, status: "inactive" }] });
  assert.equal(find(tree, node => node.props?.["aria-label"] === "Edit Coordinator"), undefined);
  assert.equal(find(tree, node => node.props?.["aria-label"] === "Responsibilities for Coordinator").props.children, "View responsibilities");
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
