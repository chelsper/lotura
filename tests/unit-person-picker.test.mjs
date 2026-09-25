import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const unit = { id: "fictional-services", name: "Fictional Services", status: "active" };
const otherUnit = { id: "fictional-library", name: "Fictional Library", status: "active" };
const position = { id: "fictional-coordinator", title: "Coordinator", status: "active", unit };
const person = { id: "person-one", name: "Fictional Alex", status: "active", assignments: [{ position }] };
const namesake = { ...person, id: "person-two", assignments: [{ position: { ...position, id: "fictional-librarian", title: "Librarian", unit: otherUnit } }] };
const unassigned = { id: "person-three", name: "Fictional Casey", status: "active", assignments: [] };
const inactive = { ...person, id: "inactive-person", name: "Inactive Person", status: "inactive" };
const data = { units: [unit, otherUnit], people: [person, namesake, unassigned, inactive], positions: [position] };

function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
const find = (node, predicate) => elements(node).find(predicate);
const textContent = node => node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(textContent).join("") : typeof node === "object" ? textContent(node.props?.children) : String(node);
const createForm = props => React.createElement("div", { "data-create-person": props.entityType, "data-unit": props.initialUnitStableKey });
const primitive = name => function TestPrimitive(props) { return React.createElement(name, props); };

async function load(path, overrides = {}) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(await read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    require(id) {
      if (id in overrides) return overrides[id];
      if (id === "react") return React;
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "next/link") return { default: primitive("a") };
      if (id === "../../ui/primitives") return { Button: primitive("button"), Select: primitive("select"), RequiredMark: () => React.createElement("span", null, " (required)") };
      if (id === "./structure-create-form") return { StructureCreateForm: createForm };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return loaded.exports;
}

async function harness(input = data) {
  const hooks = [];
  let cursor = 0;
  const { UnitPersonPicker } = await load("app/studio/organization/unit-person-picker.tsx", {
    react: { ...React, useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], value => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    } },
  });
  return { render() { cursor = 0; return UnitPersonPicker({ data: input, unit }); } };
}

const choice = (tree, label) => find(tree, node => node.props?.type === "button" && textContent(node) === label);
const selector = tree => find(tree, node => node.props?.name === "person");
const continuation = tree => find(tree, node => node.props?.type === "submit");
const creationPanel = tree => find(tree, node => node.type === "div" && node.props?.children?.type === createForm);
const markup = tree => renderToStaticMarkup(tree);

test("Unit chooser prefers existing People and submits exact identities through a read-only GET", async () => {
  const h = await harness();
  const tree = h.render();
  assert.equal(choice(tree, "Choose existing person").props["aria-pressed"], true);
  assert.equal(choice(tree, "Create new person").props["aria-pressed"], false);
  const form = find(tree, node => node.type === "form");
  assert.equal(form.props.method, "get");
  assert.equal(form.props.action, "/studio/organization/people/new");
  assert.equal(form.props.onSubmit, undefined);
  assert.equal(find(form, node => node.props?.name === "unit").props.value, unit.id);
  assert.equal(selector(tree).props.required, true);
  assert.equal(selector(tree).props.value, "");
  assert.equal(continuation(tree).props.disabled, true);
  assert.equal(creationPanel(tree).props.hidden, true);
  assert.doesNotMatch(markup(form), /name="(?:personStableKey|positionStableKey|reason|changeKind|effectiveDate)"|method="post"/);
});

test("Person options are active stable identities with documented context, not name-based merges", async () => {
  const tree = (await harness()).render();
  const options = elements(selector(tree)).filter(node => node.type === "option" && node.props.value);
  assert.deepEqual(options.map(option => option.props.value), [person.id, namesake.id, unassigned.id]);
  assert.match(textContent(options[0]), /Fictional Alex.*Coordinator.*Fictional Services/);
  assert.match(textContent(options[1]), /Fictional Alex.*Librarian.*Fictional Library/);
  assert.doesNotMatch(textContent(options[0]), /Record /);
  assert.doesNotMatch(textContent(options[1]), /Record /);
  assert.match(textContent(options[2]), /No current job title recorded/);
  assert.doesNotMatch(textContent(options[2]), /Fictional Services|Coordinator|Librarian/);
  assert.doesNotMatch(markup(selector(tree)), /inactive-person|Inactive Person/);
});

test("otherwise indistinguishable same-name People remain separate choices with record identifiers", async () => {
  const first = { ...person, id: "fictional-person-11111111" };
  const second = { ...person, id: "fictional-person-22222222" };
  const tree = (await harness({ ...data, people: [first, second] })).render();
  const options = elements(selector(tree)).filter(node => node.type === "option" && node.props.value);
  assert.deepEqual(options.map(option => option.props.value), [first.id, second.id]);
  assert.match(textContent(options[0]), /Record 11111111/);
  assert.match(textContent(options[1]), /Record 22222222/);
});

test("selecting an existing Person only enables continuation; invalid or inactive identities stay disabled", async () => {
  const h = await harness();
  for (const value of [person.id, namesake.id]) {
    selector(h.render()).props.onChange({ target: { value } });
    const tree = h.render();
    assert.equal(selector(tree).props.value, value);
    assert.equal(continuation(tree).props.disabled, false);
    assert.ok(find(tree, node => node.props?.href === `/studio/organization/people/${value}`));
    assert.match(markup(tree), /Nothing changes until you save an assignment/);
  }
  for (const value of ["", inactive.id, "foreign-person", person.name]) {
    selector(h.render()).props.onChange({ target: { value } });
    const tree = h.render();
    assert.equal(continuation(tree).props.disabled, true);
    assert.equal(elements(tree).some(node => node.props?.href?.startsWith("/studio/organization/people/")), false);
  }
});

test("switching choices leaves the creation form mounted and retains existing-person selection", async () => {
  const h = await harness();
  selector(h.render()).props.onChange({ target: { value: person.id } });
  const firstPanel = creationPanel(h.render());
  assert.equal(firstPanel.props.children.props.data, data);
  assert.equal(firstPanel.props.children.props.entityType, "person");
  assert.equal(firstPanel.props.children.props.initialUnitStableKey, unit.id);
  for (const [label, hidden] of [["Create new person", false], ["Choose existing person", true], ["Create new person", false]]) {
    choice(h.render(), label).props.onClick();
    const tree = h.render();
    const panel = creationPanel(tree);
    assert.ok(panel, "The create form must stay in the tree across choices");
    assert.equal(panel.type, firstPanel.type);
    assert.equal(panel.key, firstPanel.key);
    assert.equal(panel.props.children.type, firstPanel.props.children.type);
    assert.equal(panel.props.children.key, firstPanel.props.children.key);
    assert.equal(panel.props.hidden, hidden);
    assert.equal(choice(tree, label).props["aria-pressed"], true);
    assert.equal(selector(tree).props.value, person.id);
  }
});

test("no active People defaults to new-person creation and never invents a selection", async () => {
  const h = await harness({ ...data, people: [inactive] });
  const tree = h.render();
  assert.equal(choice(tree, "Create new person").props["aria-pressed"], true);
  assert.equal(creationPanel(tree).props.hidden, false);
  assert.equal(selector(tree), undefined);
  assert.equal(continuation(tree), undefined);
  choice(tree, "Choose existing person").props.onClick();
  assert.match(markup(h.render()), /No active people are recorded yet/);
});

test("new-person pending lifecycle disables switching until the existing creation action completes", async () => {
  const h = await harness();
  choice(h.render(), "Create new person").props.onClick();
  creationPanel(h.render()).props.children.props.onPendingChange(true);
  const pending = h.render();
  assert.equal(choice(pending, "Choose existing person").props.disabled, true);
  assert.equal(choice(pending, "Create new person").props.disabled, true);
  assert.equal(creationPanel(pending).props.hidden, false);
  creationPanel(pending).props.children.props.onPendingChange(false);
  const complete = h.render();
  assert.equal(choice(complete, "Choose existing person").props.disabled, false);
  assert.equal(choice(complete, "Create new person").props.disabled, false);
});

test("only Unit-scoped Person creation uses the chooser; selected People reuse existing placement", async () => {
  const Picker = () => React.createElement("div", { "data-picker": true });
  const Placement = () => React.createElement("div", { "data-placement": true });
  const Box = ({ children }) => React.createElement("div", null, children);
  const { StudioCreatePage } = await load("app/studio/studio-create-page.tsx", {
    "../ui/primitives": { Alert: Box, Card: Box },
    "./organization/structure-create-form": { StructureCreateForm: createForm },
    "./organization/unit-person-picker": { UnitPersonPicker: Picker },
    "./organization/unit-person-placement": { UnitPersonPlacement: Placement },
  });
  const scoped = StudioCreatePage({ data, entityType: "person", initialUnitStableKey: unit.id });
  assert.equal(find(scoped, node => node.type === Picker).props.unit, unit);
  assert.equal(find(scoped, node => node.type === createForm), undefined);
  for (const props of [{ entityType: "person" }, { entityType: "position", initialUnitStableKey: unit.id }, { entityType: "organization_unit", initialUnitStableKey: unit.id }]) {
    const tree = StudioCreatePage({ data, ...props });
    assert.equal(find(tree, node => node.type === Picker), undefined);
    assert.ok(find(tree, node => node.type === createForm));
  }
  const selected = StudioCreatePage({ data, entityType: "person", initialUnitStableKey: unit.id, savedPerson: person });
  assert.equal(find(selected, node => node.type === Placement).props.person, person);
  assert.equal(find(selected, node => node.type === Picker), undefined);
  assert.equal(find(selected, node => node.type === createForm), undefined);
  assert.match(markup(selected), /Choose a job title for Fictional Alex/);
  assert.doesNotMatch(markup(selected), /Fictional Alex is saved|new Person|new person record/);
});
