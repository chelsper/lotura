import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const source = await readFile(new URL("../app/studio/unit-responsibility-coverage-form.tsx", import.meta.url), "utf8");
const code = compile(source);
const pickerOptions = { exports: {} };
vm.runInNewContext(compile(await readFile(new URL("../lib/structure-picker-options.ts", import.meta.url), "utf8")), {
  module: pickerOptions, exports: pickerOptions.exports,
});
const searchableSelectCode = compile(await readFile(new URL("../app/ui/searchable-select.tsx", import.meta.url), "utf8"));

const unit = { id: "unit-services", name: "Fictional Services" };
const otherUnit = { id: "unit-library", name: "Fictional Library" };
const role = { id: "role:42", stableKey: "role-stable-key", name: "Print queue coordination", status: "active", description: "Coordinate printing requests." };
const person = (id, name, assignments = [], status = "active") => ({ id, name, status, assignments });
const occupant = person("person-occupant", "Alex Occupant", [{ position: { id: "position-services", title: "Print Coordinator", unit } }]);
const elsewhere = person("person-other-unit", "Morgan Example", [{ position: { id: "position-library", title: "Library Assistant", unit: otherUnit } }]);
const unassigned = person("person-unassigned", "Casey Example");
const inactive = person("person-inactive", "Inactive Example", [], "inactive");
const namesake = person("person-namesake", "Casey Example");
const coverage = {
  id: "role-coverage:9", revision: "coverage-revision", person: occupant,
  type: "permanent", typeLabel: "Permanent", reason: "Reviewed fictional duties", effectiveFrom: "2026-01-01", effectiveUntil: null,
};
const mandate = {
  id: "role-mandate:7", revision: "mandate-revision", type: "primary", typeLabel: "Primary accountability", role,
  scope: null, reason: "Fictional reviewed work", coverage: [coverage], processes: [], systems: [],
  effectiveFrom: "2026-01-01", effectiveUntil: null,
};
const position = {
  id: "position-services", revision: "position-revision", title: "Print Coordinator", status: "active", unit,
  assignments: [{ id: "assignment-a", type: "incumbent", person: occupant }], mandates: [mandate],
  primaryManager: null, processes: [], systems: [],
};
const data = { people: [occupant, elsewhere, unassigned, inactive, namesake], positions: [position], operationalRoles: [role] };
const plain = (value) => JSON.parse(JSON.stringify(value));

function nodes(element, predicate) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap((item) => nodes(item, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
}
const field = (tree, name) => nodes(tree, (node) => node.props?.name === name)[0];
const form = (tree) => nodes(tree, (node) => node.type === "form")[0];
const cancelButton = (tree) => nodes(tree, (node) => node.props?.type === "button" && node.props?.onClick)[0];

function harness(overrides = {}) {
  const states = [];
  let cursor = 0;
  const calls = [];
  const events = [];
  let implementation = async () => ({ status: "success", message: "Coverage recorded with history." });
  const primitives = {
    Alert: ({ children, tone, ...props }) => React.createElement("div", { ...props, "data-tone": tone }, children),
    Button: ({ children, variant, ...props }) => { void variant; return React.createElement("button", props, children); },
    Badge: ({ children, tone, ...props }) => { void tone; return React.createElement("span", props, children); },
    Input: (props) => React.createElement("input", props),
    Select: (props) => React.createElement("select", props),
    RequiredMark: () => React.createElement("span", null, " *"),
  };
  const selectModule = { exports: {} };
  vm.runInNewContext(searchableSelectCode, {
    module: selectModule, exports: selectModule.exports,
    require(id) { return id === "./primitives" ? primitives : require(id); },
  });
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    FormData: class TestFormData {
      constructor(target) { this.values = { ...target.values }; }
      get(key) { return this.values[key] ?? null; }
      set(key, value) { this.values[key] = value; }
      entries() { return Object.entries(this.values)[Symbol.iterator](); }
    },
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
      if (id === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
      if (id.endsWith("/actions")) return {
        establishRoleCoverageAction: async (previous, formData) => {
          calls.push({ name: "establishRoleCoverageAction", previous, formData });
          return implementation();
        },
      };
      if (id.endsWith("/action-state")) return { initialStructureActionState: { status: "idle", message: "" } };
      if (id.endsWith("/structure-administration-panel")) return {
        ChangeMetadataFields: ({ fixedKind }) => React.createElement("input", { name: "changeKind", type: "hidden", value: fixedKind }),
      };
      if (id.endsWith("/primitives")) return primitives;
      if (id.endsWith("/searchable-select")) return selectModule.exports;
      if (id.endsWith("/structure-picker-options")) return pickerOptions.exports;
      return require(id);
    },
  });
  const props = {
    position, mandate, data, onSaved: (message) => events.push(["saved", message]),
    onPendingChange: (value) => events.push(["pending", value]), onDirty: () => events.push(["dirty"]),
    onCancel: () => events.push(["cancel"]), onSaveUnconfirmed: () => events.push(["unconfirmed"]), ...overrides,
  };
  const render = () => { cursor = 0; return loaded.exports.UnitResponsibilityCoverageForm(props); };
  function change(name, value) {
    const tree = render();
    const target = { name, value };
    field(tree, name).props.onChange?.({ target });
    form(tree)?.props.onChange?.({ target });
  }
  return {
    render, calls, events, props, change,
    html: () => renderToStaticMarkup(render()),
    implement: (next) => { implementation = next; },
    submit: async (overrides = {}) => {
      const tree = render();
      const target = form(tree);
      if (!target) return;
      const values = { changeKind: "organizational_change", reason: "Reviewed fictional coverage", effectiveDate: "2026-09-28" };
      for (const node of nodes(tree, (item) => Boolean(item.props?.name))) {
        values[node.props.name] = node.props.value ?? node.props.defaultValue ?? "";
      }
      return target.props.onSubmit({ preventDefault() {}, currentTarget: { values: { ...values, ...overrides } } });
    },
  };
}

function choose(editor, personKey = elsewhere.id, type = "permanent") {
  editor.change("personStableKey", personKey);
  editor.change("coverageType", type);
}

test("coverage form names the responsibility and position and begins with explicit blank Person and type choices", () => {
  const editor = harness();
  const tree = editor.render();
  assert.match(editor.html(), /Print queue coordination/);
  assert.match(editor.html(), /Print Coordinator/);
  assert.equal(field(tree, "personStableKey").props.value, "");
  assert.equal(field(tree, "personStableKey").props.required, true);
  assert.equal(field(tree, "coverageType").props.value, "");
  assert.equal(field(tree, "coverageType").props.required, true);
  const types = nodes(field(tree, "coverageType"), (node) => node.type === "option").map((node) => node.props.value);
  assert.deepEqual(types, ["", "permanent", "interim", "acting", "delegated", "backup"]);
  assert.equal(editor.calls.length, 0);
});

test("all active workspace People remain eligible including other Units, unassigned people, and namesakes", () => {
  const editor = harness();
  const picker = field(editor.render(), "personStableKey");
  const options = Array.from(picker.props.options);
  assert.deepEqual(options.map((option) => option.value), [occupant.id, elsewhere.id, unassigned.id, namesake.id]);
  assert.match(options.find((option) => option.value === elsewhere.id).label, /Library Assistant.*Fictional Library/);
  assert.match(options.find((option) => option.value === unassigned.id).label, /No current job title recorded/);
  assert.notEqual(options.find((option) => option.value === unassigned.id).label, options.find((option) => option.value === namesake.id).label);
  assert.match(editor.html(), /type="search"/);
  assert.doesNotMatch(editor.html(), /Inactive Example/);
});

test("only recorded coverage is shown and opening the form does not mutate organizational evidence", () => {
  const before = JSON.stringify({ data, position, mandate });
  const editor = harness();
  const html = editor.html();
  assert.match(html, /Alex Occupant/);
  assert.match(html, /Normally handles this work/);
  const coverageList = nodes(editor.render(), (node) => node.type === "ul")[0];
  const recorded = renderToStaticMarkup(coverageList);
  assert.match(recorded, /Alex Occupant/);
  assert.doesNotMatch(recorded, /Morgan Example|Casey Example/);
  assert.equal(JSON.stringify({ data, position, mandate }), before);
  assert.equal(editor.calls.length, 0);
  assert.equal(editor.events.length, 0);
  assert.equal(field(editor.render(), "assignmentType"), undefined);
  assert.equal(field(editor.render(), "managerPositionStableKey"), undefined);
  assert.equal(field(editor.render(), "ownerRoleId"), undefined);
  assert.equal(field(editor.render(), "coverageRecordKey"), undefined);
});

test("coverage sends only explicit target identity, selected Person/type, and existing audit metadata", async () => {
  const editor = harness();
  choose(editor, unassigned.id, "backup");
  const tree = editor.render();
  assert.equal(field(tree, "positionStableKey").props.value, position.id);
  assert.equal(field(tree, "mandateRecordKey").props.value, mandate.id);
  assert.equal(field(tree, "expectedRevision").props.value, mandate.revision);
  assert.equal(nodes(tree, (node) => node.props?.fixedKind)[0].props.fixedKind, "organizational_change");
  await editor.submit({ coverageReason: "Cover the queue during absences" });
  assert.equal(editor.calls.length, 1);
  assert.equal(editor.calls[0].name, "establishRoleCoverageAction");
  assert.deepEqual(plain(Object.fromEntries(editor.calls[0].formData.entries())), {
    changeKind: "organizational_change", reason: "Reviewed fictional coverage", effectiveDate: "2026-09-28",
    positionStableKey: position.id, mandateRecordKey: mandate.id, expectedRevision: mandate.revision,
    personStableKey: unassigned.id, coverageType: "backup", coverageReason: "Cover the queue during absences",
  });
});

test("nonpermanent coverage requires nonblank context; permanent coverage keeps it optional", async () => {
  for (const type of ["interim", "acting", "delegated", "backup"]) {
    const editor = harness();
    choose(editor, elsewhere.id, type);
    assert.equal(field(editor.render(), "coverageReason").props.required, true, type);
    await editor.submit({ coverageReason: "" });
    await editor.submit({ coverageReason: "   " });
    assert.equal(editor.calls.length, 0, type);
    await editor.submit({ coverageReason: "Fictional temporary coverage" });
    assert.equal(editor.calls.length, 1, type);
    assert.equal(editor.calls[0].formData.get("coverageType"), type);
  }
  const permanent = harness();
  choose(permanent);
  assert.notEqual(field(permanent.render(), "coverageReason").props.required, true);
  await permanent.submit({ coverageReason: "" });
  assert.equal(permanent.calls.length, 1);
});

test("an exact Person/type duplicate is blocked but the same Person may explicitly provide another coverage type", async () => {
  const duplicate = harness();
  choose(duplicate, occupant.id, "permanent");
  await duplicate.submit();
  assert.equal(duplicate.calls.length, 0);
  const anotherType = harness();
  choose(anotherType, occupant.id, "backup");
  await anotherType.submit({ coverageReason: "Cover the queue during an absence" });
  assert.equal(anotherType.calls.length, 1);
  assert.equal(anotherType.calls[0].formData.get("personStableKey"), occupant.id);
  assert.equal(anotherType.calls[0].formData.get("coverageType"), "backup");
  assert.equal(anotherType.calls[0].formData.get("coverageRecordKey"), null);
});

test("missing, inactive, unknown, and unsupported choices do not dispatch coverage", async () => {
  const blank = harness();
  await blank.submit();
  assert.equal(blank.calls.length, 0);
  blank.change("personStableKey", elsewhere.id);
  await blank.submit();
  assert.equal(blank.calls.length, 0);
  for (const personKey of [inactive.id, "unknown-person", "create-new"]) {
    const editor = harness();
    choose(editor, personKey);
    await editor.submit();
    assert.equal(editor.calls.length, 0, personKey);
  }
  const unsupported = harness();
  choose(unsupported, elsewhere.id, "inferred");
  await unsupported.submit({ coverageReason: "Not an allowed coverage type" });
  assert.equal(unsupported.calls.length, 0);
});

test("inactive Position or Role, missing mandate, mismatched mandate, and missing revision block writes", async () => {
  for (const override of [
    { position: { ...position, status: "inactive" } },
    { mandate: { ...mandate, role: { ...role, status: "inactive" } } },
    { position: { ...position, mandates: [] } },
    { mandate: { ...mandate, id: "role-mandate:unrelated" } },
    { mandate: { ...mandate, role: { ...role, id: "role:unrelated" } } },
    { mandate: { ...mandate, revision: "" } },
    { mandate: { ...mandate, revision: "unmatched-revision" } },
  ]) {
    const editor = harness(override);
    if (field(editor.render(), "personStableKey")) choose(editor);
    await editor.submit();
    assert.equal(editor.calls.length, 0, JSON.stringify(override));
    const fieldsets = nodes(editor.render(), (node) => node.type === "fieldset");
    assert.ok(!fieldsets.length || fieldsets.every((node) => node.props.disabled));
  }
});

test("each target and selection in the submitted payload must exactly match the reviewed form", async () => {
  for (const forged of [
    { personStableKey: unassigned.id }, { coverageType: "backup", coverageReason: "Unexpected change" },
    { positionStableKey: "different-position" }, { mandateRecordKey: "different-mandate" }, { expectedRevision: "different-revision" },
  ]) {
    const editor = harness();
    choose(editor);
    await editor.submit(forged);
    assert.equal(editor.calls.length, 0, JSON.stringify(forged));
  }
});

test("no active People is an honest non-writing empty state", async () => {
  const editor = harness({ data: { ...data, people: [inactive] } });
  await editor.submit();
  assert.equal(editor.calls.length, 0);
  assert.match(editor.html(), /No[^<]*(?:active|people|person)|not[^<]*available/i);
});

test("choices and context mark unsaved edits, and Back cancels without dispatching", () => {
  const editor = harness();
  choose(editor);
  form(editor.render()).props.onChange({ target: { name: "coverageReason", value: "Draft context" } });
  assert.ok(editor.events.filter(([name]) => name === "dirty").length >= 3);
  const back = cancelButton(editor.render());
  assert.notEqual(back.props.disabled, true);
  back.props.onClick();
  assert.deepEqual(editor.events.at(-1), ["cancel"]);
  assert.equal(editor.calls.length, 0);
});

test("pending prevents duplicate saves and disables editing and Back; success is reported once", async () => {
  const editor = harness();
  choose(editor);
  editor.events.length = 0;
  let release;
  editor.implement(() => new Promise((resolve) => { release = resolve; }));
  const saving = editor.submit();
  assert.deepEqual(editor.events, [["pending", true]]);
  const tree = editor.render();
  assert.equal(nodes(tree, (node) => node.type === "fieldset")[0].props.disabled, true);
  const back = cancelButton(tree);
  const backInDisabledFieldset = nodes(nodes(tree, (node) => node.type === "fieldset" && node.props.disabled)[0], (node) => node === back).length > 0;
  assert.ok(back.props.disabled || backInDisabledFieldset);
  back.props.onClick();
  assert.ok(!editor.events.some(([name]) => name === "cancel"));
  await editor.submit();
  assert.equal(editor.calls.length, 1);
  release({ status: "success", message: "Coverage recorded with history." });
  await saving;
  assert.deepEqual(editor.events.slice(0, 2), [["pending", true], ["pending", false]]);
  const saved = editor.events.filter(([name]) => name === "saved");
  assert.equal(saved.length, 1);
  assert.match(saved[0][1], /recorded|saved|added/i);
  await editor.submit();
  assert.equal(editor.calls.length, 1);
  assert.equal(editor.events.filter(([name]) => name === "saved").length, 1);
});

test("validation errors retain the explicit Person and type and permit corrections without signaling success", async () => {
  const editor = harness();
  choose(editor, unassigned.id, "acting");
  editor.implement(async () => ({ status: "error", message: "This mandate changed. Refresh before saving." }));
  await editor.submit({ coverageReason: "Acting during leave" });
  const tree = editor.render();
  assert.match(editor.html(), /This mandate changed/);
  assert.equal(field(tree, "personStableKey").props.value, unassigned.id);
  assert.equal(field(tree, "coverageType").props.value, "acting");
  assert.equal(nodes(tree, (node) => node.type === "fieldset")[0].props.disabled, false);
  assert.equal(editor.calls[0].formData.get("coverageReason"), "Acting during leave");
  assert.ok(!editor.events.some(([name]) => name === "saved"));
  assert.ok(!editor.events.some(([name]) => name === "unconfirmed"));
});

test("an unconfirmed save hides backend detail, retains choices, and freezes retries and Back", async () => {
  const editor = harness();
  choose(editor, elsewhere.id, "delegated");
  editor.implement(async () => { throw new Error("private database connection secret"); });
  await editor.submit({ coverageReason: "Delegated review this month" });
  const html = editor.html();
  assert.match(html, /couldn&#x27;t confirm|could not confirm/i);
  assert.match(html, /refresh/i);
  assert.doesNotMatch(html, /private database connection secret/);
  const tree = editor.render();
  assert.equal(field(tree, "personStableKey").props.value, elsewhere.id);
  assert.equal(field(tree, "coverageType").props.value, "delegated");
  const disabledFieldset = nodes(tree, (node) => node.type === "fieldset")[0];
  assert.equal(disabledFieldset.props.disabled, true);
  const back = cancelButton(tree);
  assert.ok(back.props.disabled || nodes(disabledFieldset, (node) => node === back).length > 0);
  back.props.onClick();
  await editor.submit({ coverageReason: "Delegated review this month" });
  assert.equal(editor.calls.length, 1);
  assert.deepEqual(editor.events.at(-1), ["pending", false]);
  assert.equal(editor.events.filter(([name]) => name === "unconfirmed").length, 1);
  assert.ok(!editor.events.some(([name]) => name === "saved" || name === "cancel"));
});
