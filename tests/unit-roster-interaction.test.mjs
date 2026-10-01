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
const unit = { id: "unit-a", name: "Fictional Services", status: "active" };
const position = { id: "position-a", revision: "revision-before-edit", title: "Coordinator", status: "active", unit, assignments: [], mandates: [], occupancy: { label: "Not established", tone: "neutral" }, primaryManager: null };

function harness(currentUnit = unit) {
  let hooks, cursor;
  const stores = new Map();
  const effects = [];
  const listeners = new Map();
  let discard = false;
  let confirmations = 0;
  let refreshes = 0;
  let focusCalls = 0;
  let summaryFocusCalls = 0;
  const focusedIds = [];
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
    document: { getElementById: id => id === "unit-at-a-glance" ? { focus() { summaryFocusCalls++; } } : id === `unit-roster-edit-${position.id}` ? { focus() { focusedIds.push(id); } } : null },
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
      if (id === "./unit-position-create-panel") return { UnitPositionCreatePanel: "create-position" };
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
  const roster = data => render(loaded.exports.UnitRoster, { unit: currentUnit, data: data ?? { positions: [position] } });
  const panel = tree => find(tree, node => typeof node.type === "function" && node.type.name === "RosterEditPanel");
  function open(mode = "title", data, trigger = { focus() { focusCalls++; } }) {
    const label = { title: "Edit Coordinator", person: "Add person to Coordinator", manager: "Set manager for Coordinator", responsibilities: "Responsibilities for Coordinator" }[mode];
    find(roster(data), node => node.props?.["aria-label"] === label).props.onClick({ currentTarget: trigger });
    return panel(roster(data));
  }
  return {
    roster, panel, open, effects, listeners, focusedIds,
    renderPanel: node => render(node.type, node.props),
    allowDiscard: () => { discard = true; },
    setRefreshing: value => { refreshing = value; },
    get confirmations() { return confirmations; },
    get refreshes() { return refreshes; },
    get focusCalls() { return focusCalls; },
    get summaryFocusCalls() { return summaryFocusCalls; },
  };
}

test("the Unit menu opens local job creation with current data; saving refreshes and announces without closing it", () => {
  const h = harness();
  const data = { positions: [position], units: [unit] };
  const before = JSON.stringify(data);
  const trigger = { closest: () => null, focus() {} };
  const menu = find(h.roster(data), node => node.type === "add-menu");
  assert.equal(find(h.roster(data), node => node.type === "create-position"), undefined);
  menu.props.onAddPosition(trigger);
  const create = find(h.roster(data), node => node.type === "create-position");
  assert.strictEqual(create.props.unit, unit);
  assert.strictEqual(create.props.data, data);
  assert.equal(h.refreshes, 0, "opening creation has no mutation or refresh");
  assert.equal(h.panel(h.roster(data)), undefined);
  assert.equal(JSON.stringify(data), before);
  create.props.onSaved("Job title added to this Unit.");
  const savedTree = h.roster(data);
  assert.ok(find(savedTree, node => node.type === "create-position"));
  assert.equal(find(savedTree, node => node.props?.role === "status").props.children, "Job title added to this Unit.");
  assert.equal(h.refreshes, 1);
  const fresh = { ...data, positions: [...data.positions, { ...position, id: "position-new" }] };
  assert.strictEqual(find(h.roster(fresh), node => node.type === "create-position").props.data, fresh, "subsequent creation must use the refreshed duplicate list");
});

test("closing job creation restores focus to the visible Add menu summary and refreshes only when requested", () => {
  for (const refresh of [false, true]) {
    const h = harness();
    let menuFocus = 0;
    const summary = { isConnected: true, focus() { menuFocus++; } };
    const trigger = { closest: () => ({ querySelector: () => summary }), focus() { assert.fail("The hidden menu item must not receive focus"); } };
    find(h.roster(), node => node.type === "add-menu").props.onAddPosition(trigger);
    find(h.roster(), node => node.type === "create-position").props.onClose(refresh);
    const closed = h.roster();
    assert.equal(find(closed, node => node.type === "create-position"), undefined);
    h.effects.at(-1)();
    assert.equal(menuFocus, 1);
    assert.equal(h.refreshes, Number(refresh));
  }
});

test("job creation respects refresh, inactive Unit and open-editor guards, and cannot be replaced by background edits", () => {
  const trigger = { closest: () => null, focus() {} };
  for (const mode of ["refreshing", "inactive", "editing"]) {
    const h = harness(mode === "inactive" ? { ...unit, status: "inactive" } : unit);
    if (mode === "refreshing") h.setRefreshing(true);
    if (mode === "editing") h.open();
    find(h.roster(), node => node.type === "add-menu").props.onAddPosition(trigger);
    assert.equal(find(h.roster(), node => node.type === "create-position"), undefined, mode);
    assert.equal(h.refreshes, 0);
  }
  const h = harness();
  const mandate = { id: "mandate-a" }, target = { ...position, mandates: [mandate] };
  const data = { positions: [target] };
  find(h.roster(data), node => node.type === "add-menu").props.onAddPosition(trigger);
  for (const label of ["Edit Coordinator", "Add person to Coordinator", "Set manager for Coordinator", "Responsibilities for Coordinator"]) {
    find(h.roster(data), node => node.props?.["aria-label"] === label).props.onClick({ currentTarget: trigger });
  }
  find(h.roster(data), node => node.type === "unit-summary").props.onChooseCoverage(target, mandate, trigger);
  find(h.roster(data), node => node.type === "add-menu").props.onAddPosition(trigger);
  assert.ok(find(h.roster(data), node => node.type === "create-position"));
  assert.equal(h.panel(h.roster(data)), undefined);
  assert.equal(h.refreshes, 0);
});

test("opening an editor is local and retains the original identity/revision snapshot through refreshes", () => {
  const h = harness();
  const panel = h.open();
  assert.equal(panel.props.position, position);
  assert.equal(h.refreshes, 0);
  const freshData = { positions: [{ ...position, title: "A different saved title", revision: "new-revision" }] };
  assert.equal(h.panel(h.roster(freshData)).props.position.revision, "revision-before-edit");
  assert.equal(h.panel(h.roster(freshData)).props.data.positions[0], position);
});

for (const [mode, label, visibleText, column] of [
  ["person", "Add person to Coordinator", "Add person", 1],
  ["manager", "Set manager for Coordinator", "Set manager", 2],
]) test(`${mode}: an empty roster cell opens the exact existing editor and retains its original data snapshot`, () => {
  const h = harness();
  const data = { positions: [position], people: [{ id: "person-existing", name: "Fictional Person" }] };
  const before = JSON.stringify(data);
  const row = find(h.roster(data), node => node.type === "tr" && node.key === position.id);
  const shortcut = find(row.props.children[column], node => node.props?.["aria-label"] === label);
  assert.equal(shortcut.props.children, visibleText);
  assert.equal(shortcut.props.type, "button");
  const panel = h.open(mode, data);
  assert.equal(panel.props.initialMode, mode);
  assert.strictEqual(panel.props.position, position);
  assert.strictEqual(panel.props.data, data);
  const editor = find(h.renderPanel(panel), node => node.type === "editor");
  assert.equal(editor.props.mode, mode);
  assert.strictEqual(editor.props.position, position);
  assert.strictEqual(editor.props.data, data);
  assert.equal(find(h.renderPanel(panel), node => node.type === "responsibilities"), undefined);
  const fresh = { positions: [{ ...position, title: "Fresh title", revision: "fresh-revision" }], people: [] };
  assert.strictEqual(h.panel(h.roster(fresh)).props.data, data);
  assert.strictEqual(h.panel(h.roster(fresh)).props.position, position);
  assert.equal(h.refreshes, 0, "opening does not save or request a route refresh");
  assert.equal(JSON.stringify(data), before);
});

test("empty-cell shortcuts are independent and never offered for populated, inactive, or revisionless targets", () => {
  const assigned = { ...position, assignments: [{ id: "assignment-a", person: { id: "person-a", name: "Alex Example" }, typeLabel: "Regular occupant" }] };
  const managed = { ...position, primaryManager: { position: { id: "manager-a", title: "Services Director", unit } } };
  for (const [target, personAllowed, managerAllowed] of [
    [position, true, true], [assigned, false, true], [managed, true, false],
    [{ ...assigned, primaryManager: managed.primaryManager }, false, false],
    [{ ...position, status: "inactive" }, false, false], [{ ...position, revision: "" }, false, false],
  ]) {
    const h = harness();
    const tree = h.roster({ positions: [target] });
    assert.equal(Boolean(find(tree, node => node.props?.["aria-label"] === "Add person to Coordinator")), personAllowed);
    assert.equal(Boolean(find(tree, node => node.props?.["aria-label"] === "Set manager for Coordinator")), managerAllowed);
    assert.equal(h.panel(tree), undefined);
    assert.equal(h.refreshes, 0);
  }
});

for (const label of ["Add person to Coordinator", "Set manager for Coordinator"]) test(`${label}: refreshing disables the shortcut and its handler refuses direct invocation`, () => {
  const h = harness();
  h.setRefreshing(true);
  const shortcut = find(h.roster(), node => node.props?.["aria-label"] === label);
  assert.equal(shortcut.props.disabled, true);
  shortcut.props.onClick({ currentTarget: { focus() {} } });
  assert.equal(h.panel(h.roster()), undefined);
  assert.equal(h.refreshes, 0);
});

for (const mode of ["person", "manager"]) test(`${mode}: a direct entry keeps dirty changes when closing or switching is cancelled`, () => {
  const h = harness();
  const panel = h.open(mode);
  find(h.renderPanel(panel), node => node.type === "editor").props.onDirty();
  find(h.renderPanel(panel), node => node.props?.["aria-label"] === "Close editor").props.onClick();
  assert.ok(h.panel(h.roster()));
  assert.equal(h.confirmations, 1);
  find(h.renderPanel(panel), node => node.type === "button" && node.props.children === "Job title").props.onClick();
  assert.equal(find(h.renderPanel(panel), node => node.type === "editor").props.mode, mode);
  assert.equal(h.confirmations, 2);
  h.allowDiscard();
  find(h.renderPanel(panel), node => node.props?.["aria-label"] === "Close editor").props.onClick();
  assert.equal(h.panel(h.roster()), undefined);
  assert.equal(h.refreshes, 0, "discarding never saves");
});

for (const mode of ["person", "manager"]) test(`${mode}: filling an empty cell restores focus to the same row's Edit action`, () => {
  const h = harness();
  const trigger = { isConnected: false, focus() { assert.fail("The removed empty-cell action must not receive focus"); } };
  const panel = h.open(mode, undefined, trigger);
  find(h.renderPanel(panel), node => node.type === "editor").props.onSaved("Saved with history.");
  const filled = {
    ...position,
    assignments: [{ id: "assignment-new", person: { id: "person-new", name: "Alex Example" }, typeLabel: "Regular occupant" }],
    primaryManager: { position: { id: "manager-a", title: "Services Director", unit } },
  };
  h.roster({ positions: [filled] });
  h.effects.at(-1)();
  assert.deepEqual(h.focusedIds, [`unit-roster-edit-${position.id}`]);
  assert.equal(h.summaryFocusCalls, 0);
  assert.equal(h.refreshes, 1);
});

test("background empty-cell handlers cannot replace an already-open editor snapshot", () => {
  const h = harness();
  const panel = h.open("person");
  find(h.renderPanel(panel), node => node.type === "editor").props.onDirty();
  find(h.roster(), node => node.props?.["aria-label"] === "Set manager for Coordinator").props.onClick({ currentTarget: { focus() {} } });
  const stillOpen = h.panel(h.roster());
  assert.equal(stillOpen.props.initialMode, "person");
  assert.strictEqual(stillOpen.props.position, panel.props.position);
  assert.strictEqual(stillOpen.props.data, panel.props.data);
  assert.equal(h.refreshes, 0);
  assert.equal(h.confirmations, 0);
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

for (const mode of ["title", "person", "manager", "responsibilities"]) test(`${mode}: pending save blocks closing, Escape, section switches, and full-detail navigation`, () => {
  const h = harness();
  const panel = h.open(mode);
  find(h.renderPanel(panel), node => node.type === (mode === "responsibilities" ? "responsibilities" : "editor")).props.onPendingChange(true);
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

for (const mode of ["title", "person", "manager", "responsibilities"]) test(`${mode}: successful save closes the panel, announces success and refreshes in place once`, () => {
  const h = harness();
  const panel = h.open(mode);
  const message = { title: "Job title saved.", person: "Person assigned.", manager: "Reporting line saved.", responsibilities: "Responsibility linked." }[mode];
  find(h.renderPanel(panel), node => node.type === (mode === "responsibilities" ? "responsibilities" : "editor")).props.onSaved(message);
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

for (const mode of ["title", "person", "manager", "responsibilities"]) test(`${mode}: an unconfirmed save blocks section switching but allows close and refresh`, () => {
  const h = harness();
  const panel = h.open(mode);
  const childType = mode === "responsibilities" ? "responsibilities" : "editor";
  const child = find(h.renderPanel(panel), node => node.type === childType);
  child.props.onDirty(true);
  child.props.onSaveUnconfirmed();
  child.props.onPendingChange(false);
  h.allowDiscard();
  const tree = h.renderPanel(panel);
  for (const tab of elements(tree).filter(node => node.props?.["aria-pressed"] !== undefined)) {
    assert.equal(tab.props.disabled, true);
    tab.props.onClick();
  }
  assert.ok(find(h.renderPanel(panel), node => node.type === childType));
  if (mode !== "responsibilities") assert.equal(find(h.renderPanel(panel), node => node.type === "editor").props.mode, mode);
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
