import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const source = await readFile(new URL("../app/studio/unit-person-create-panel.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const unit = { id: "unit-a", name: "Fictional Services", status: "active" };
const person = { id: "person-a", name: "Alex Example", status: "active", assignments: [] };
const data = { people: [person], positions: [], units: [unit] };
function nodes(node) { return !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]; }
const find = (tree, predicate) => nodes(tree).find(predicate);
const button = (tree, label) => find(tree, node => node.type === "button" && node.props.children === label);
const field = (tree, name) => find(tree, node => node.props?.name === name);
const form = tree => find(tree, node => node.type?.name === "UnitPersonCreateForm");
const placement = tree => find(tree, node => node.type === "placement");

function harness() {
  let hooks, cursor = 0, discard = false;
  const stores = new Map(), effects = [], events = [], calls = [], tasks = [];
  let implementation = async () => ({ status: "success", stableKey: person.id, message: "Saved" });
  const fakeReact = { ...React,
    useState(initial) { const current = hooks, index = cursor++; if (!(index in current)) current[index] = typeof initial === "function" ? initial() : initial; return [current[index], next => { current[index] = typeof next === "function" ? next(current[index]) : next; }]; },
    useRef(initial) { return hooks[cursor++] ??= { current: initial }; },
    useEffect(effect) { effects.push(effect); },
    startTransition(callback) { tasks.push(callback()); },
  };
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports,
    FormData: class { constructor(form) { this.values = form.values; } },
    window: { confirm() { events.push(["confirm"]); return discard; }, addEventListener() {}, removeEventListener() {} },
    require(id) {
      if (id === "react") return fakeReact;
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id.endsWith("/action-state")) return { initialStructureActionState: { status: "idle", message: "" } };
      if (id.endsWith("/primitives")) return { Alert: "alert", Button: "button", Input: "input", RequiredMark: "required" };
      if (id.endsWith("/searchable-select")) return { SearchableSelect: "picker" };
      if (id.endsWith("/structure-picker-options")) return { personPickerOptions: people => people };
      if (id.endsWith("/structure-create-form")) return { CreationMetadataFields: "metadata" };
      if (id.endsWith("/unit-person-placement")) return { UnitPersonPlacement: "placement" };
      if (id === "./unit-person-create-action") return { createUnitPersonAction: async (...args) => { calls.push(args); return implementation(); } };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  function render(component, props) { if (!stores.has(component)) stores.set(component, []); hooks = stores.get(component); cursor = 0; return component(props); }
  const panelProps = { data, unit, refreshing: false, onClose: refresh => events.push(["close", refresh]), onSaved: message => events.push(["refresh", message]) };
  const formProps = { data, unit, onSaved: selected => events.push(["saved", selected]), onDirty: () => events.push(["dirty"]), onPendingChange: value => events.push(["pending", value]), onSaveUnconfirmed: () => events.push(["unconfirmed"]) };
  return { calls, events, effects,
    panel(overrides) { Object.assign(panelProps, overrides); return render(loaded.exports.UnitPersonCreatePanel, panelProps); },
    form(overrides) { Object.assign(formProps, overrides); return render(loaded.exports.UnitPersonCreateForm, formProps); },
    implement(next) { implementation = next; }, allowDiscard() { discard = true; },
    async settle() { await Promise.all(tasks.splice(0)); },
    submit(tree) { tree.props.onSubmit({ preventDefault() {}, currentTarget: { values: {} } }); },
    chooseExisting() { find(this.panel(), node => node.type === "picker").props.onChange({ target: { value: person.id } }); button(this.panel(), "Continue with this person").props.onClick(); },
  };
}

test("existing person is first choice; selection reuses exact identity without writes or automatic assignment", () => {
  const h = harness();
  assert.equal(form(h.panel()), undefined);
  assert.equal(button(h.panel(), "Continue with this person").props.disabled, true);
  h.chooseExisting();
  assert.equal(placement(h.panel()).props.person, person);
  assert.equal(placement(h.panel()).props.unit, unit);
  assert.equal(placement(h.panel()).key, person.id);
  assert.equal(h.calls.length, 0);
  assert.equal(h.events.length, 0);
});

test("new person creation only collects name and audited metadata, with explicit duplicate confirmation", () => {
  const h = harness();
  field(h.form(), "displayName").props.onChange({ target: { value: " ALEX EXAMPLE " } });
  const tree = h.form();
  assert.equal(tree.props.method, "post", "never put a name or change note in a URL before hydration");
  assert.equal(field(tree, "displayName").props.required, true);
  assert.equal(field(tree, "organizationUnitStableKey").props.value, unit.id);
  assert.equal(field(tree, "acknowledgePossibleDuplicate").props.required, true);
  assert.equal(field(tree, "acknowledgePossibleDuplicate").props.defaultChecked, undefined);
  for (const name of ["personStableKey", "positionStableKey", "assignmentType", "roleKey"]) assert.equal(field(tree, name), undefined);
});

test("creation prevents repeated submissions, locks success, and keeps ordinary error drafts editable", async () => {
  const h = harness();
  field(h.form(), "displayName").props.onChange({ target: { value: person.name } });
  h.implement(async () => ({ status: "error", message: "Check the name." }));
  h.submit(h.form()); await h.settle();
  assert.equal(field(h.form(), "displayName").props.value, person.name);
  assert.equal(find(h.form(), node => node.type === "fieldset").props.disabled, false);
  let resolve; h.implement(() => new Promise(done => { resolve = done; }));
  const tree = h.form(); h.submit(tree); h.submit(tree); h.submit(h.form());
  assert.equal(h.calls.length, 2);
  assert.equal(find(h.form(), node => node.type === "fieldset").props.disabled, true);
  resolve({ status: "success", stableKey: person.id }); await h.settle();
  assert.equal(h.events.filter(event => event[0] === "saved").length, 1);
  assert.equal(h.events.find(event => event[0] === "saved")[1].name, person.name);
  h.submit(h.form()); assert.equal(h.calls.length, 2);
});

for (const result of [{ status: "error", message: "Refresh", saveUnconfirmed: true }, { status: "success" }, new Error("transport")]) test(`uncertain creation (${result.message ?? "missing identity"}) freezes without announcing success`, async () => {
  const h = harness(); h.implement(async () => { if (result instanceof Error) throw result; return result; });
  h.submit(h.form()); await h.settle(); h.submit(h.form());
  assert.equal(h.calls.length, 1);
  assert.equal(find(h.form(), node => node.type === "fieldset").props.disabled, true);
  assert.equal(h.events.some(event => event[0] === "saved"), false);
  assert.equal(h.events.filter(event => event[0] === "unconfirmed").length, 1);
});

test("new Person waits for exact active saved identity before optional placement; refresh does not recreate it", () => {
  const h = harness(); button(h.panel(), "Create new person").props.onClick();
  form(h.panel()).props.onSaved({ id: "new-person", name: "Jamie Example", created: true });
  assert.equal(form(h.panel()), undefined);
  assert.equal(placement(h.panel()), undefined);
  for (const item of [{ ...person, id: "wrong-person" }, { ...person, id: "new-person", status: "inactive" }]) assert.equal(placement(h.panel({ data: { ...data, people: [item] } })), undefined);
  const saved = { ...person, id: "new-person" };
  assert.equal(placement(h.panel({ data: { ...data, people: [saved] }, refreshing: true })).props.embedded.disabled, true);
  assert.equal(placement(h.panel({ refreshing: false })).props.person, saved);
  assert.equal(h.calls.length, 0);
  assert.equal(h.events.filter(event => event[0] === "refresh").length, 1);
});

test("dirty Close/Escape/mode change need confirmation; pending and uncertain block switching", () => {
  const h = harness(); button(h.panel(), "Create new person").props.onClick();
  form(h.panel()).props.onDirty();
  button(h.panel(), "Choose existing person").props.onClick(); assert.ok(form(h.panel()));
  button(h.panel(), "Close").props.onClick(); h.panel().props.onCancel({ preventDefault() {} });
  assert.equal(h.events.some(event => event[0] === "close"), false);
  form(h.panel()).props.onPendingChange(true); h.allowDiscard();
  button(h.panel(), "Close").props.onClick(); assert.equal(h.events.some(event => event[0] === "close"), false);
  form(h.panel()).props.onPendingChange(false); form(h.panel()).props.onSaveUnconfirmed();
  assert.equal(button(h.panel(), "Choose existing person").props.disabled, true);
  button(h.panel(), "Choose existing person").props.onClick(); assert.ok(form(h.panel()));
  button(h.panel(), "Close").props.onClick(); assert.deepEqual(h.events.at(-1), ["close", true]);
});

test("assignment failure never recreates Person and retains placement until close and refresh", () => {
  const h = harness(); h.chooseExisting();
  placement(h.panel()).props.embedded.onDirty();
  button(h.panel(), "Choose another person").props.onClick(); assert.ok(placement(h.panel()));
  placement(h.panel()).props.embedded.onPendingChange(true);
  assert.equal(button(h.panel(), "Done for now").props.disabled, true);
  placement(h.panel()).props.embedded.onPendingChange(false);
  placement(h.panel()).props.embedded.onSaveUnconfirmed();
  assert.equal(button(h.panel(), "Choose another person").props.disabled, true);
  assert.equal(form(h.panel()), undefined); assert.equal(h.calls.length, 0);
  h.allowDiscard(); button(h.panel(), "Close").props.onClick(); assert.deepEqual(h.events.at(-1), ["close", true]);
});

test("assignment success clears dirty state and refreshes in place without replacing selected Person", () => {
  const h = harness(); h.chooseExisting();
  placement(h.panel()).props.embedded.onDirty();
  placement(h.panel()).props.embedded.onSaved("Alex assigned.");
  assert.equal(placement(h.panel()).props.person, person);
  assert.deepEqual(h.events.at(-1), ["refresh", "Alex assigned."]);
  button(h.panel(), "Done for now").props.onClick();
  assert.deepEqual(h.events.at(-1), ["close", false]);
  assert.equal(h.events.some(event => event[0] === "confirm"), false);
});
