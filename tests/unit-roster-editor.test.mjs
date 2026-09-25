import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/studio/unit-roster-editor.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

const unit = { id: "unit-a", name: "Fictional Services" };
const assignment = (id, personId, name) => ({ id, revision: `revision-${id}`, type: "incumbent", typeLabel: "Regular occupant", person: { id: personId, name } });
const position = {
  id: "position-a", revision: "position-revision", title: "Services Coordinator", status: "active", unit,
  assignments: [assignment("assignment-a", "person-a", "Alex Example")],
  primaryManager: null,
};
const manager = { id: "position-manager", title: "Services Director", status: "active", unit, assignments: [] };
const crossUnitManager = { id: "position-cross-unit", title: "Program Director", status: "active", unit: { id: "unit-b", name: "Fictional Programs" }, assignments: [] };
const person = (id, name, status = "active") => ({ id, name, status, assignments: [] });
const data = { people: [person("person-a", "Alex Example"), person("person-b", "Morgan Example"), person("person-inactive", "Inactive Example", "inactive")], positions: [position, manager, crossUnitManager] };

function nodes(element, predicate) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap((item) => nodes(item, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
}
const field = (tree, name) => nodes(tree, (node) => node.props?.name === name)[0];

function harness(mode, overrides = {}) {
  const states = [];
  let cursor = 0;
  const events = [];
  const calls = [];
  const confirmations = [];
  let confirmationResult = true;
  const actions = {};
  let implementation = async () => ({ status: "success", message: "Saved with history." });
  for (const name of ["correctPositionReportingRelationshipAction", "establishPositionAssignmentAction", "establishPositionReportingRelationshipAction", "replacePositionAssignmentAction", "replacePositionReportingRelationshipAction", "updateStructureEntityAction"]) {
    actions[name] = async (previous, formData) => {
      calls.push({ name, previous, formData });
      return implementation();
    };
  }
  const primitives = {
    Alert: ({ children, tone, ...props }) => React.createElement("div", { ...props, "data-tone": tone }, children),
    Button: ({ children, variant, ...props }) => { void variant; return React.createElement("button", props, children); },
    Input: (props) => React.createElement("input", props),
    Select: (props) => React.createElement("select", props),
    RequiredMark: () => React.createElement("span", null, " *"),
  };
  const testModule = { exports: {} };
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports,
    window: { confirm(message) { confirmations.push(message); return confirmationResult; } },
    FormData: class TestFormData { constructor(form) { this.values = form.values; } get(key) { return this.values[key] ?? null; } },
    require(id) {
      if (id === "react") return {
        ...React,
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
          return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
        },
        useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
      };
      if (id.endsWith("/actions")) return actions;
      if (id.endsWith("/action-state")) return { initialStructureActionState: { status: "idle", message: "" } };
      if (id.endsWith("/structure-administration-panel")) return { ChangeMetadataFields: ({ fixedKind }) => React.createElement("input", { name: "changeKind", type: "hidden", value: fixedKind ?? "correction" }) };
      if (id.endsWith("/primitives")) return primitives;
      return require(id);
    },
  });
  const props = { mode, position, data, onSaved: (message) => events.push(["saved", message]), onPendingChange: (value) => events.push(["pending", value]), onDirty: () => events.push(["dirty"]), ...overrides };
  function render() { cursor = 0; return testModule.exports.UnitRosterEditor(props); }
  return {
    render, events, calls, confirmations,
    html: () => renderToStaticMarkup(render()),
    implement: (next) => { implementation = next; },
    confirm: (value) => { confirmationResult = value; },
    submit: (values = {}) => render().props.onSubmit({ preventDefault() {}, currentTarget: { values } }),
  };
}

test("title-only editing preserves the exact Unit, identity and revision", () => {
  const editor = harness("title");
  const tree = editor.render();
  assert.equal(field(tree, "entityType").props.value, "position");
  assert.equal(field(tree, "stableKey").props.value, position.id);
  assert.equal(field(tree, "expectedRevision").props.value, position.revision);
  assert.equal(field(tree, "organizationUnitStableKey").props.value, unit.id);
  assert.equal(field(tree, "title").props.required, true);
  assert.equal(field(tree, "managerPositionStableKey"), undefined);
  assert.match(editor.html(), /This changes the title, not its people, Unit, or responsibilities/);
  assert.equal(editor.calls.length, 0);
});

test("multiple occupants require an explicit assignment; replacements exclude already assigned and inactive people", async () => {
  const second = assignment("assignment-b", "person-c", "Casey Example");
  const editor = harness("person", { position: { ...position, assignments: [...position.assignments, second] } });
  let tree = editor.render();
  assert.equal(field(tree, "assignmentRecordKey").props.value, "");
  await editor.submit();
  assert.equal(editor.calls.length, 0);
  nodes(tree, (node) => node.props?.value === "" && node.props?.onChange && !node.props?.name)[0].props.onChange({ target: { value: second.id } });
  tree = editor.render();
  assert.equal(field(tree, "assignmentRecordKey").props.value, second.id);
  assert.equal(field(tree, "expectedRevision").props.value, second.revision);
  const choices = field(tree, "replacementPersonStableKey");
  assert.deepEqual(nodes(choices, (node) => node.type === "option").map((node) => node.props.value), ["", "person-b"]);
  await editor.submit({ assignmentRecordKey: second.id, expectedRevision: second.revision });
  assert.equal(editor.calls[0].name, "replacePositionAssignmentAction");
});

test("an unoccupied Position links an existing Person using the existing assignment action", async () => {
  const editor = harness("person", { position: { ...position, assignments: [] } });
  const tree = editor.render();
  assert.equal(field(tree, "positionStableKey").props.value, position.id);
  assert.equal(field(tree, "expectedRevision").props.value, position.revision);
  assert.ok(field(tree, "personStableKey"));
  assert.equal(field(tree, "assignmentType").props.defaultValue, "incumbent");
  assert.equal(field(tree, "assignmentRecordKey"), undefined);
  await editor.submit();
  assert.equal(editor.calls[0].name, "establishPositionAssignmentAction");
});

test("manager corrections and organizational changes use different actions while preserving exact relationship identity", async () => {
  const relationship = { id: "reporting-a", revision: "reporting-revision", type: "primary", reason: "Recorded context", position: manager };
  const correct = harness("manager", { position: { ...position, primaryManager: relationship } });
  const tree = correct.render();
  assert.equal(field(tree, "reportingRecordKey").props.value, relationship.id);
  assert.equal(field(tree, "expectedRevision").props.value, relationship.revision);
  assert.equal(field(tree, "relationshipType").props.value, "primary");
  assert.equal(field(tree, "relationshipReason").props.required, undefined);
  assert.match(correct.html(), /Fictional Programs/);
  await correct.submit();
  assert.equal(correct.calls[0].name, "correctPositionReportingRelationshipAction");

  const replace = harness("manager", { position: { ...position, primaryManager: relationship } });
  nodes(replace.render(), (node) => node.props?.value === "correction" && node.props?.onChange)[0].props.onChange({ target: { value: "organizational_change" } });
  const replacementTree = replace.render();
  assert.equal(field(replacementTree, "relationshipType"), undefined);
  const options = nodes(field(replacementTree, "managerPositionStableKey"), (node) => node.type === "option").map((node) => node.props.value);
  assert.deepEqual(options, ["", crossUnitManager.id]);
  await replace.submit();
  assert.equal(replace.calls[0].name, "replacePositionReportingRelationshipAction");

  const establish = harness("manager");
  await establish.submit();
  assert.equal(establish.calls[0].name, "establishPositionReportingRelationshipAction");
});

test("pending submissions disable the whole form, resist double clicks, and notify success once", async () => {
  const editor = harness("title");
  let release;
  editor.implement(() => new Promise((resolve) => { release = resolve; }));
  const saving = editor.submit({ title: "Updated title" });
  assert.deepEqual(editor.events, [["pending", true]]);
  assert.equal(nodes(editor.render(), (node) => node.type === "fieldset")[0].props.disabled, true);
  await editor.submit();
  assert.equal(editor.calls.length, 1);
  release({ status: "success", message: "Saved with history." });
  await saving;
  editor.render();
  assert.deepEqual(editor.events, [["pending", true], ["pending", false], ["saved", "Saved with history."]]);
  assert.equal(editor.calls[0].formData.get("title"), "Updated title");
});

test("validation errors keep editing available; unconfirmed saves reveal no thrown detail or automatic retry", async () => {
  const editor = harness("title");
  editor.implement(async () => ({ status: "error", message: "This record changed. Refresh before saving." }));
  await editor.submit();
  assert.match(editor.html(), /This record changed/);
  assert.equal(nodes(editor.render(), (node) => node.type === "fieldset")[0].props.disabled, false);
  assert.ok(!editor.events.some(([name]) => name === "saved"));
  editor.implement(async () => { throw new Error("private backend detail"); });
  await editor.submit();
  assert.match(editor.html(), /couldn&#x27;t confirm the save/);
  assert.doesNotMatch(editor.html(), /private backend detail/);
  assert.equal(nodes(editor.render(), (node) => node.type === "fieldset")[0].props.disabled, true);
  await editor.submit();
  assert.equal(editor.calls.length, 2);
  assert.deepEqual(editor.events.at(-1), ["pending", false]);
});

test("switching manager intent asks before discarding an edited choice and can be cancelled", () => {
  const relationship = { id: "reporting-a", revision: "reporting-revision", type: "primary", position: manager };
  const editor = harness("manager", { position: { ...position, primaryManager: relationship } });
  let tree = editor.render();
  tree.props.onChange({ target: { name: "managerPositionStableKey" } });
  editor.confirm(false);
  nodes(tree, (node) => node.props?.value === "correction" && node.props?.onChange)[0].props.onChange({ target: { value: "organizational_change" } });
  tree = editor.render();
  assert.equal(editor.confirmations.length, 1);
  assert.equal(field(tree, "relationshipType").props.value, "primary");
  editor.confirm(true);
  nodes(tree, (node) => node.props?.value === "correction" && node.props?.onChange)[0].props.onChange({ target: { value: "organizational_change" } });
  assert.equal(field(editor.render(), "relationshipType"), undefined);
  assert.equal(editor.confirmations.length, 2);
  assert.equal(editor.calls.length, 0);
});

test("inactive and revisionless records never dispatch a write", async () => {
  for (const override of [{ status: "inactive" }, { revision: "" }]) {
    const editor = harness("title", { position: { ...position, ...override } });
    assert.equal(nodes(editor.render(), (node) => node.type === "fieldset")[0].props.disabled, true);
    await editor.submit();
    assert.equal(editor.calls.length, 0);
  }
});
