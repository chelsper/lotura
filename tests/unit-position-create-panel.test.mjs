import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const source = await readFile(new URL("../app/studio/unit-position-create-panel.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const unit = { id: "unit-a", name: "Fictional Services", status: "active" };
const position = { id: "position-a", title: "Services Coordinator", status: "active", unit, revision: "revision-1", assignments: [], primaryManager: null };
const savedJob = { id: position.id, title: position.title, another: false };
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(predicate);
const field = (tree, name) => find(tree, node => node.props?.name === name);
const button = (tree, label) => find(tree, node => node.type === "button" && node.props.children === label);
const createForm = tree => find(tree, node => node.type?.name === "UnitPositionCreateForm");
const editor = tree => find(tree, node => node.type === "roster-editor");

function harness() {
  let hooks, cursor = 0, confirmResult = false;
  const stores = new Map(), effects = [], listeners = new Map(), calls = [], events = [], tasks = [];
  let implementation = async () => ({ status: "success", stableKey: position.id, message: "Saved with history." });
  const fakeReact = {
    ...React,
    useState(initial) {
      const current = hooks, index = cursor++;
      if (!(index in current)) current[index] = typeof initial === "function" ? initial() : initial;
      return [current[index], next => { current[index] = typeof next === "function" ? next(current[index]) : next; }];
    },
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useEffect(effect) { effects.push(effect); },
    startTransition(callback) { tasks.push(callback()); },
  };
  const compiled = { exports: {} };
  vm.runInNewContext(code, {
    module: compiled, exports: compiled.exports,
    FormData: class { constructor(form) { this.values = form.values; } get(name) { return this.values[name] ?? null; } },
    window: {
      confirm(message) { events.push(["confirm", message]); return confirmResult; },
      addEventListener(name, callback) { listeners.set(name, callback); },
      removeEventListener(name) { listeners.delete(name); },
    },
    require(id) {
      if (id === "react") return fakeReact;
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id.endsWith("/action-state")) return { initialStructureActionState: { status: "idle", message: "" } };
      if (id.endsWith("/primitives")) return { Alert: "alert", Button: "button", Input: "input", RequiredMark: "required" };
      if (id === "./organization/structure-create-form") return { CreationMetadataFields: "metadata" };
      if (id === "./unit-roster-editor") return { UnitRosterEditor: "roster-editor" };
      if (id === "./unit-position-create-action") return { createUnitPositionAction: async (previous, formData) => { calls.push({ previous, formData }); return implementation(); } };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  function render(component, props, key = component.name) {
    if (!stores.has(key)) stores.set(key, []);
    hooks = stores.get(key);
    cursor = 0;
    effects.length = 0;
    return component(props);
  }
  const formProps = {
    data: { positions: [] }, unit,
    onSaved: job => events.push(["saved", job]), onDirty: () => events.push(["dirty"]),
    onPendingChange: value => events.push(["pending", value]), onSaveUnconfirmed: () => events.push(["unconfirmed"]),
  };
  const panelProps = {
    data: { positions: [] }, unit, refreshing: false,
    onClose: refresh => events.push(["close", refresh]), onSaved: message => events.push(["refresh", message]),
  };
  return {
    calls, events, listeners, effects, panelProps, formProps,
    form(overrides) { Object.assign(formProps, overrides); return render(compiled.exports.UnitPositionCreateForm, formProps); },
    panel(overrides) { Object.assign(panelProps, overrides); return render(compiled.exports.UnitPositionCreatePanel, panelProps); },
    renderForm(node) { return render(node.type, node.props, `nested-form-${node.key}`); },
    implement(next) { implementation = next; }, confirm(value) { confirmResult = value; },
    async settle() { await Promise.all(tasks.splice(0)); },
    submit(tree, value = "save", values = {}) { tree.props.onSubmit({ preventDefault() {}, currentTarget: { values }, nativeEvent: { submitter: { value } } }); },
  };
}

test("creation is scoped to the Unit and never implicitly assigns a Person, manager, or responsibility", () => {
  const h = harness(), tree = h.form();
  assert.equal(field(tree, "organizationUnitStableKey").props.value, unit.id);
  assert.equal(field(tree, "title").props.required, true);
  assert.equal(field(tree, "title").props.maxLength, 255);
  for (const name of ["personStableKey", "managerPositionStableKey", "assignmentType", "roleKey"]) assert.equal(field(tree, name), undefined);
  assert.ok(find(tree, node => node.type === "metadata"));
  assert.equal(h.calls.length, 0);
  tree.props.onChange();
  assert.deepEqual(h.events, [["dirty"]]);
});

test("create form blocks concurrent submissions and locks after confirmed success", async () => {
  const h = harness();
  let resolve;
  h.implement(() => new Promise(done => { resolve = done; }));
  field(h.form(), "title").props.onChange({ target: { value: "  Services Coordinator  " } });
  const tree = h.form();
  h.submit(tree); h.submit(tree); h.submit(h.form());
  assert.equal(h.calls.length, 1);
  assert.equal(find(h.form(), node => node.type === "fieldset").props.disabled, true);
  resolve({ status: "success", stableKey: position.id, message: "Saved" });
  await h.settle();
  assert.equal(h.events.filter(event => event[0] === "saved").length, 1);
  const job = h.events.find(event => event[0] === "saved")[1];
  assert.equal(job.id, position.id); assert.equal(job.title, position.title); assert.equal(job.another, false);
  h.submit(h.form());
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.events.filter(event => event[0] === "pending"), [["pending", true], ["pending", false]]);
});

test("Save and add another records intent only after confirmed save; ordinary errors retain the title and allow correction", async () => {
  const h = harness();
  field(h.form(), "title").props.onChange({ target: { value: position.title } });
  h.implement(async () => ({ status: "error", message: "Review the duplicate title." }));
  h.submit(h.form(), "another"); await h.settle();
  assert.equal(field(h.form(), "title").props.value, position.title);
  assert.equal(find(h.form(), node => node.type === "fieldset").props.disabled, false);
  assert.equal(h.events.some(event => event[0] === "saved"), false);
  h.implement(async () => ({ status: "success", stableKey: position.id, message: "Saved" }));
  h.submit(h.form(), "another"); await h.settle();
  assert.equal(h.events.find(event => event[0] === "saved")[1].another, true);
});

for (const [name, result] of [
  ["reported unconfirmed save", { status: "error", message: "Close and refresh", saveUnconfirmed: true }],
  ["malformed success without identity", { status: "success", message: "Saved" }],
  ["transport failure", new Error("Transport failed")],
]) test(`${name} freezes creation and never retries or announces success`, async () => {
  const h = harness();
  h.implement(async () => { if (result instanceof Error) throw result; return result; });
  h.submit(h.form()); await h.settle();
  assert.equal(find(h.form(), node => node.type === "fieldset").props.disabled, true);
  assert.equal(h.events.filter(event => event[0] === "unconfirmed").length, 1);
  assert.equal(h.events.some(event => event[0] === "saved"), false);
  h.submit(h.form()); assert.equal(h.calls.length, 1);
});

test("duplicate confirmation is explicit, exact-Unit and active only", () => {
  const h = harness();
  field(h.form(), "title").props.onChange({ target: { value: " services coordinator " } });
  const tree = h.form({ data: { positions: [position] } });
  const acknowledgement = field(tree, "acknowledgePossibleDuplicate");
  assert.equal(acknowledgement.props.required, true);
  assert.equal(acknowledgement.props.checked, undefined);
  assert.equal(acknowledgement.props.defaultChecked, undefined);
  for (const record of [{ ...position, status: "inactive" }, { ...position, unit: { id: "other-unit" } }]) {
    assert.equal(field(h.form({ data: { positions: [record] } }), "acknowledgePossibleDuplicate"), undefined);
  }
});

test("the dialog preserves dirty entries on cancelled Close/Escape and pending saves block both", () => {
  const h = harness();
  createForm(h.panel()).props.onDirty();
  button(h.panel(), "Close").props.onClick();
  let prevented = 0;
  h.panel().props.onCancel({ preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.equal(h.events.filter(event => event[0] === "confirm").length, 2);
  assert.equal(h.events.some(event => event[0] === "close"), false);
  createForm(h.panel()).props.onPendingChange(true);
  assert.equal(button(h.panel(), "Close").props.disabled, true);
  h.confirm(true);
  button(h.panel(), "Close").props.onClick();
  h.panel().props.onCancel({ preventDefault() {} });
  assert.equal(h.events.some(event => event[0] === "close"), false);
  createForm(h.panel()).props.onPendingChange(false);
  button(h.panel(), "Close").props.onClick();
  assert.deepEqual(h.events.filter(event => event[0] === "close"), [["close", false]]);
});

test("optional editors wait for the saved exact-Unit active identity and a revision, then use a frozen snapshot", () => {
  const h = harness();
  createForm(h.panel()).props.onSaved(savedJob);
  assert.equal(editor(h.panel()), undefined);
  assert.equal(button(h.panel(), "Add a person (optional)").props.disabled, true);
  for (const wrong of [{ ...position, id: "other-position" }, { ...position, unit: { id: "other-unit" } }, { ...position, status: "inactive" }, { ...position, revision: "" }]) {
    const tree = h.panel({ data: { positions: [wrong] } });
    button(tree, "Add a person (optional)").props.onClick();
    assert.equal(editor(h.panel()), undefined);
  }
  const fresh = { positions: [position], people: [] };
  assert.equal(button(h.panel({ data: fresh, refreshing: true }), "Add a person (optional)").props.disabled, true);
  const tree = h.panel({ refreshing: false });
  button(tree, "Add a person (optional)").props.onClick();
  assert.equal(editor(h.panel()).props.position, position);
  assert.equal(editor(h.panel()).props.data, fresh);
  const newer = { positions: [{ ...position, revision: "different-revision" }], people: [] };
  const opened = editor(h.panel({ data: newer }));
  assert.equal(opened.props.position, position);
  assert.equal(opened.props.data, fresh);
  assert.equal(h.calls.length, 0, "opening follow-up does not call any mutation");
});

test("an optional save waits for a changed Position revision before the next editor, without recreating the job", () => {
  const h = harness();
  createForm(h.panel()).props.onSaved(savedJob);
  button(h.panel({ data: { positions: [position] } }), "Add a person (optional)").props.onClick();
  editor(h.panel()).props.onSaved("Person saved.");
  let tree = h.panel();
  assert.equal(editor(tree), undefined);
  assert.equal(button(tree, "Add a manager (optional)").props.disabled, true);
  button(tree, "Add a manager (optional)").props.onClick();
  assert.equal(editor(h.panel()), undefined);
  const updated = { ...position, revision: "revision-2", assignments: [{ person: { name: "Alex Example" }, typeLabel: "Regular occupant" }] };
  tree = h.panel({ data: { positions: [updated] } });
  assert.equal(button(tree, "Add a person (optional)"), undefined);
  button(tree, "Add a manager (optional)").props.onClick();
  assert.equal(editor(h.panel()).props.position.revision, "revision-2");
  assert.equal(editor(h.panel()).props.mode, "manager");
  assert.equal(createForm(h.panel()), undefined);
  assert.equal(h.calls.length, 0);
});

test("optional editor dirty cancellation and ambiguous recovery preserve the saved job and never create another", () => {
  const h = harness();
  createForm(h.panel()).props.onSaved(savedJob);
  button(h.panel({ data: { positions: [position] } }), "Add a manager (optional)").props.onClick();
  editor(h.panel()).props.onDirty();
  button(h.panel(), "Back to saved job").props.onClick();
  assert.ok(editor(h.panel()));
  editor(h.panel()).props.onPendingChange(true);
  assert.equal(button(h.panel(), "Back to saved job").props.disabled, true);
  editor(h.panel()).props.onPendingChange(false);
  editor(h.panel()).props.onSaveUnconfirmed();
  assert.equal(button(h.panel(), "Back to saved job").props.disabled, true);
  h.confirm(true);
  button(h.panel(), "Close").props.onClick();
  assert.deepEqual(h.events.filter(event => event[0] === "close"), [["close", true]]);
  assert.equal(h.calls.length, 0);
});

test("Save and add another mounts a fresh blank form and keeps its draft through roster refresh", () => {
  const h = harness();
  createForm(h.panel()).props.onSaved({ ...savedJob, another: true });
  const next = createForm(h.panel());
  assert.ok(next); assert.equal(next.key, position.id);
  assert.equal(field(h.renderForm(next), "title").props.value, "");
  field(h.renderForm(next), "title").props.onChange({ target: { value: "Second distinct job" } });
  const whileRefreshing = createForm(h.panel({ data: { positions: [position] }, refreshing: true }));
  assert.equal(whileRefreshing.key, next.key);
  assert.equal(field(h.renderForm(whileRefreshing), "title").props.value, "Second distinct job");
  assert.equal(editor(h.panel()), undefined);
  assert.equal(h.calls.length, 0);
});

test("just-saved titles require explicit duplicate acknowledgement before the refreshed roster arrives", () => {
  const h = harness();
  createForm(h.panel()).props.onSaved({ ...savedJob, another: true });
  const next = createForm(h.panel());
  assert.equal(next.props.data.positions.length, 0);
  assert.equal(next.props.recentTitles[0], position.title);
  field(h.renderForm(next), "title").props.onChange({ target: { value: position.title.toUpperCase() } });
  const acknowledgement = field(h.renderForm(next), "acknowledgePossibleDuplicate");
  assert.ok(acknowledgement);
  assert.equal(acknowledgement.props.required, true);
  assert.equal(acknowledgement.props.checked, undefined);
});

test("an uncertain second create keeps its form, error, and draft visible instead of showing the previous job as saved", async () => {
  const h = harness();
  createForm(h.panel()).props.onSaved({ ...savedJob, another: true });
  const next = createForm(h.panel({ data: { positions: [position] } }));
  field(h.renderForm(next), "title").props.onChange({ target: { value: "Second distinct job" } });
  next.props.onDirty();
  h.implement(async () => ({ status: "error", message: "Check whether the second job saved before retrying.", saveUnconfirmed: true }));
  h.submit(h.renderForm(next)); await h.settle();
  const current = createForm(h.panel());
  assert.ok(current, "the second form must not disappear on unconfirmed save");
  assert.equal(current.key, next.key);
  const lockedForm = h.renderForm(current);
  assert.equal(field(lockedForm, "title").props.value, "Second distinct job");
  assert.equal(find(lockedForm, node => node.type === "fieldset").props.disabled, true);
  assert.equal(find(lockedForm, node => node.type === "alert").props.children, "Check whether the second job saved before retrying.");
  h.confirm(true); button(h.panel(), "Close").props.onClick();
  assert.deepEqual(h.events.filter(event => event[0] === "close"), [["close", true]]);
});
