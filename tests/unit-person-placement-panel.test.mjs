import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const source = await readFile(new URL("../app/studio/organization/unit-person-placement.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const unit = { id: "unit-a", name: "Fictional Services", status: "active" };
const person = { id: "person-a", name: "Alex Example", status: "active", assignments: [] };
const position = { id: "position-a", title: "Coordinator", status: "active", unit, revision: "original-revision", assignments: [] };
const second = { ...position, id: "position-b", title: "Assistant" };
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(predicate);
const picker = tree => find(tree, node => node.type === "picker");
const formNode = tree => find(tree, node => node.type?.name === "AssignmentForm");
const field = (tree, name) => find(tree, node => node.props?.name === name);

function harness({ embedded = true, data = { positions: [position, second] }, currentPerson = person } = {}) {
  let hooks, cursor = 0, confirmation = false;
  const stores = new Map(), calls = [], events = [];
  let implementation = async () => ({ status: "success", message: "Saved" });
  const compiled = { exports: {} };
  vm.runInNewContext(code, {
    module: compiled, exports: compiled.exports,
    window: { confirm(message) { events.push(["confirm", message]); return confirmation; } },
    FormData: class { constructor(form) { this.values = form.values; } get(name) { return this.values[name] ?? null; } },
    require(id) {
      if (id === "react") return {
        ...React,
        useState(initial) {
          const current = hooks, index = cursor++;
          if (!(index in current)) current[index] = typeof initial === "function" ? initial() : initial;
          return [current[index], next => { current[index] = typeof next === "function" ? next(current[index]) : next; }];
        },
        useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
      };
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "next/link") return { default: "link" };
      if (id === "next/navigation") return { useRouter: () => ({ refresh() { events.push(["refresh"]); } }) };
      if (id.endsWith("/structure-picker-options")) return { positionPickerOptions: positions => positions.map(item => ({ value: item.id, label: item.title })) };
      if (id.endsWith("/actions")) return { establishPositionAssignmentAction: async (previous, formData) => { calls.push({ previous, formData }); return implementation(); } };
      if (id.endsWith("/action-state")) return { initialStructureActionState: { status: "idle", message: "" } };
      if (id.endsWith("/structure-administration-panel")) return { ChangeMetadataFields: "metadata" };
      if (id.endsWith("/primitives")) return { Alert: "alert", Button: "button", RequiredMark: "required", Select: "select" };
      if (id.endsWith("/searchable-select")) return { SearchableSelect: "picker" };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  const callbacks = {
    onDirty: () => events.push(["dirty"]), onPendingChange: value => events.push(["pending", value]),
    onSaveUnconfirmed: () => events.push(["unconfirmed"]), onSaved: message => events.push(["saved", message]),
  };
  const props = { data, person: currentPerson, unit, ...(embedded ? { embedded: callbacks } : {}) };
  function render(component, componentProps, key = component.name) {
    if (!stores.has(key)) stores.set(key, []);
    hooks = stores.get(key); cursor = 0;
    return component(componentProps);
  }
  function placement(overrides) { Object.assign(props, overrides); return render(compiled.exports.UnitPersonPlacement, props); }
  function form(node = formNode(placement())) { return render(node.type, node.props, node.key); }
  return {
    placement, form, props, calls, events,
    choose(id) { picker(placement()).props.onChange({ target: { value: id } }); },
    confirm(value) { confirmation = value; }, implement(value) { implementation = value; },
    submit(tree = form(), values = {}) { return tree.props.onSubmit({ preventDefault() {}, currentTarget: { values } }); },
  };
}

test("embedded placement offers only active exact-Unit jobs not already held by this Person, with no auto-selection or links", () => {
  const data = { positions: [position, second, { ...position, id: "foreign", unit: { id: "other-unit" } }, { ...position, id: "inactive", status: "inactive" }, { ...position, id: "already-held", assignments: [{ person }] }] };
  const h = harness({ data }), tree = h.placement();
  assert.deepEqual(Array.from(picker(tree).props.options, option => option.value), [position.id, second.id]);
  assert.equal(picker(tree).props.value, "");
  assert.equal(formNode(tree), undefined);
  assert.equal(nodes(tree).some(node => node.type === "link"), false);
  assert.equal(h.calls.length, 0);
  for (const id of ["foreign", "inactive", "already-held", "unknown"]) {
    h.choose(id); assert.equal(formNode(h.placement()), undefined);
  }
});

test("selection freezes the exact Position revision and identity across refreshes without creating an assignment", () => {
  const h = harness(); h.choose(position.id);
  const first = formNode(h.placement());
  assert.equal(first.props.position, position);
  h.placement({ data: { positions: [{ ...position, title: "Changed title", revision: "fresh-revision" }, second] } });
  const current = formNode(h.placement());
  assert.equal(current.props.position, position);
  const tree = h.form(current);
  assert.equal(field(tree, "positionStableKey").props.value, position.id);
  assert.equal(field(tree, "expectedRevision").props.value, position.revision);
  assert.equal(field(tree, "personStableKey").props.value, person.id);
  assert.equal(picker(h.placement()).props.options.find(item => item.value === position.id).label, position.title);
  h.placement({ data: { positions: [second] } });
  assert.equal(formNode(h.placement()).props.position, position, "a refresh must not discard the frozen form");
  assert.equal(h.calls.length, 0);
  assert.equal(h.events.filter(event => event[0] === "dirty").length, 1);
});

test("occupied Positions use additive assignment and never offer incumbent replacement or infer responsibilities", async () => {
  const occupied = { ...position, assignments: [{ type: "incumbent", person: { id: "other-person" } }] };
  const h = harness({ data: { positions: [occupied] } }); h.choose(position.id);
  const tree = h.form();
  assert.equal(tree.props.method, "post", "assignment metadata must not fall back to a query string before hydration");
  assert.equal(field(tree, "assignmentType").props.defaultValue, "");
  assert.deepEqual(nodes(field(tree, "assignmentType")).filter(node => node.type === "option").map(node => node.props.value), ["", "job_share", "interim", "acting", "backup"]);
  for (const name of ["assignmentRecordKey", "replacementPersonStableKey", "roleKey", "managerPositionStableKey"]) assert.equal(field(tree, name), undefined);
  assert.ok(find(tree, node => node.type === "metadata"));
  await h.submit(tree, { assignmentType: "job_share" });
  assert.equal(h.calls.length, 1);
  assert.doesNotMatch(source, /replacePositionAssignmentAction|establishRole|createPerson/);
});

test("an empty job defaults to regular occupant, while selecting a Person with jobs elsewhere remains allowed", () => {
  const h = harness({ currentPerson: { ...person, assignments: [{ position: { unit: { id: "other-unit" } } }] } });
  h.choose(position.id);
  assert.equal(field(h.form(), "assignmentType").props.defaultValue, "incumbent");
  assert.equal(field(h.form(), "personStableKey").props.value, person.id);
});

test("dirty assignment fields prevent changing jobs until the person explicitly discards", () => {
  const h = harness(); h.choose(position.id);
  h.form().props.onChange(); h.choose(second.id);
  assert.equal(formNode(h.placement()).props.position, position);
  assert.equal(h.events.filter(event => event[0] === "confirm").length, 1);
  h.confirm(true); h.choose(second.id);
  assert.equal(formNode(h.placement()).props.position, second);
  assert.equal(h.events.filter(event => event[0] === "dirty").length, 3);
});

test("pending saves block repeat submissions and job changes; confirmed embedded success signals parent without route refresh", async () => {
  const h = harness(); h.choose(position.id);
  let resolve;
  h.implement(() => new Promise(done => { resolve = done; }));
  const firstTree = h.form(), firstSave = h.submit(firstTree);
  await h.submit(firstTree);
  assert.equal(h.calls.length, 1);
  assert.equal(picker(h.placement()).props.disabled, true);
  h.choose(second.id); assert.equal(formNode(h.placement()).props.position, position);
  resolve({ status: "success", message: "Saved" }); await firstSave;
  assert.equal(formNode(h.placement()), undefined);
  assert.equal(picker(h.placement()), undefined);
  assert.equal(h.events.some(event => event[0] === "refresh"), false);
  assert.equal(h.events.filter(event => event[0] === "saved").length, 1);
  assert.deepEqual(h.events.filter(event => event[0] === "pending"), [["pending", true], ["pending", false]]);
});

for (const [label, result] of [["returned generic error", { status: "error", message: "Could not save." }], ["lost response", new Error("Private transport error")]]) {
  test(`${label} freezes the form and job selector and propagates recovery without recreating the Person`, async () => {
    const h = harness(); h.choose(position.id);
    h.implement(async () => { if (result instanceof Error) throw result; return result; });
    await h.submit();
    const tree = h.placement();
    assert.equal(picker(tree).props.disabled, true);
    assert.equal(find(h.form(), node => node.type === "fieldset").props.disabled, true);
    h.choose(second.id); assert.equal(formNode(h.placement()).props.position, position);
    await h.submit(); assert.equal(h.calls.length, 1);
    assert.equal(h.events.filter(event => event[0] === "unconfirmed").length, 1);
    assert.equal(h.events.some(event => ["saved", "refresh"].includes(event[0])), false);
    assert.ok(nodes(h.form()).some(node => typeof node.props?.children === "string" && node.props.children.includes("Do not create the person again")));
  });
}

test("parent disable, inactive Person/Unit and missing Position revision prevent saves even through direct handlers", async () => {
  for (const changed of [
    { embedded: { disabled: true, onDirty() {}, onPendingChange() {}, onSaved() {}, onSaveUnconfirmed() {} } },
    { person: { ...person, status: "inactive" } }, { unit: { ...unit, status: "inactive" } },
  ]) {
    const h = harness(); h.choose(position.id); h.placement(changed);
    assert.equal(picker(h.placement()).props.disabled, true);
    await h.submit(); assert.equal(h.calls.length, 0);
  }
  const h = harness({ data: { positions: [{ ...position, revision: "" }] } }); h.choose(position.id);
  await h.submit(); assert.equal(h.calls.length, 0);
});

test("standalone placement retains existing links and refreshes after confirmed assignment", async () => {
  const h = harness({ embedded: false });
  const tree = h.placement();
  const links = nodes(tree).filter(node => node.type === "link").map(node => node.props.href);
  assert.deepEqual(links, [`/studio/organization/units/${unit.id}#unit-people-job-titles`, `/studio/organization/people/${person.id}`]);
  h.choose(position.id); await h.submit();
  assert.deepEqual(h.events.filter(event => event[0] === "refresh"), [["refresh"]]);
  const empty = harness({ data: { positions: [] } }).placement();
  assert.equal(nodes(empty).some(node => node.type === "link"), false);
  assert.ok(nodes(empty).some(node => typeof node.props?.children === "string" && node.props.children.includes("Their record stays saved")));
});
