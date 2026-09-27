import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { buildOrganizationStructureData } from "../lib/organization-structure-data.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const icons = { ChevronIcon: () => null, InfoIcon: () => null, SearchIcon: () => null };
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const actions = new Proxy({}, { get: (target, name) => target[name] ??= function action() { throw new Error(`Rendering must not call ${name}`); } });
let primitives;
let pickerOptions;
let searchableSelect;
async function load(path, states = [], pending = false) {
  const source = await read(path);
  const expose = path.endsWith("structure-administration-panel.tsx")
    ? "\nexport { EditForm, EstablishRoleMandateForm, EstablishRoleCoverageForm, EstablishAssignmentForm, ReplaceAssignmentForm, EndAssignmentForm, CorrectReportingForm, EstablishReportingForm, ReplaceReportingForm, EndReportingForm };" : "";
  const { outputText } = ts.transpileModule(source + expose, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  let stateIndex = 0;
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, { module: compiled, exports: compiled.exports, require(id) {
    if (id === "react/jsx-runtime") return jsxRuntime;
    if (id === "react") return { ...React,
      useState(initial) { const value = stateIndex < states.length ? states[stateIndex] : initial; stateIndex += 1; return [value, () => {}]; },
      useActionState(action, initial) { return [initial, action, pending]; },
    };
    if (id === "next/link") return { default: Link };
    if (id === "./icons") return icons;
    if (id.endsWith("/primitives")) return primitives;
    if (id.endsWith("/searchable-select")) return searchableSelect;
    if (id.endsWith("/structure-picker-options")) return pickerOptions;
    if (id.endsWith("/actions")) return actions;
    if (id.endsWith("/action-state")) return { initialStructureActionState: { status: "idle", message: "" } };
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return compiled.exports;
}
primitives = await load("app/ui/primitives.tsx");
pickerOptions = await load("lib/structure-picker-options.ts");
searchableSelect = await load("app/ui/searchable-select.tsx");
const data = buildOrganizationStructureData(
  JSON.parse(await read("db/seeds/organization-structure.json")),
  JSON.parse(await read("db/seeds/process-explorer.json")),
  "2026-08-09T12:00:00.000Z",
);
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const labels = html => [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)].map(match => match[0]);
function labelFor(html, name) {
  const control = [...html.matchAll(/<(?:input|select|textarea)\b[^>]*>/g)].map(match => match[0]).find(value => value.includes(`name="${name}"`));
  assert.ok(control, `Expected a control for ${name}`);
  return labelForControl(html, control);
}
function labelForControl(html, control) {
  const controlId = control.match(/\bid="([^"]+)"/)?.[1];
  const label = labels(html).find(value => value.includes(control) || (controlId && value.includes(`for="${controlId}"`)));
  assert.ok(label, `Expected a label for ${control}`);
  return `${label}${control}`;
}
function required(html, name) {
  const label = labelFor(html, name);
  assert.match(label, /class="sr-only"> \(required\)/);
  assert.match(label, /<(?:input|select|textarea)\b[^>]*required=""/);
}
function optional(html, name) {
  const label = labelFor(html, name);
  assert.match(label, /optional/);
  assert.doesNotMatch(label, /\(required\)|required=""/);
}

test("required marker has both a visible star and accessible meaning", () => {
  const html = render(primitives.RequiredMark, {});
  assert.match(html, /aria-hidden="true">\*/);
  assert.match(html, /class="sr-only"> \(required\)/);
});

test("all required organization-maintenance controls are labeled, including removal confirmation", async () => {
  const { StructureAdministrationPanel } = await load("app/organization/structure-administration-panel.tsx");
  for (const [entityType, collection] of [["organization_unit", data.units], ["position", data.positions], ["person", data.people]]) {
    for (const entity of collection.filter(item => item.status === "active")) {
      const html = render(StructureAdministrationPanel, { changes: [], data, entity, entityType });
      const requiredControls = [...html.matchAll(/<(?:input|select|textarea)\b[^>]*required=""[^>]*>/g)];
      for (const [control] of requiredControls) assert.match(labelForControl(html, control), /class="sr-only"> \(required\)/, control);
      assert.match(html, /\* Required\. Everything else is optional\./);
    }
  }
});

test("assignment and manager maintenance use searchable exact-identity choices without changing filters or correction defaults", async () => {
  const forms = await load("app/organization/structure-administration-panel.tsx");
  const unit = { id: "unit-a", name: "Fictional Services" };
  const candidate = (id, title, status = "active") => ({ id, title, status, unit, assignments: [] });
  const manager = candidate("manager-a", "Services Director");
  const otherManager = candidate("manager-b", "Services Director");
  const position = { ...candidate("position-a", "Coordinator"), revision: "position-revision" };
  const person = (id, name, status = "active") => ({ id, name, status, assignments: [] });
  const testData = { ...data,
    positions: [position, manager, otherManager, candidate("inactive-position", "Inactive manager", "inactive")],
    people: [person("person-a", "Alex Example"), person("person-b", "Morgan Example"), person("person-inactive", "Inactive person", "inactive")],
  };
  const assignment = { id: "assignment-a", revision: "assignment-revision", person: testData.people[0] };
  const relationship = { id: "reporting-a", revision: "reporting-revision", position: manager, type: "primary" };
  for (const [name, fieldName] of [
    ["EstablishAssignmentForm", "personStableKey"],
    ["ReplaceAssignmentForm", "replacementPersonStableKey"],
    ["EstablishReportingForm", "managerPositionStableKey"],
    ["CorrectReportingForm", "managerPositionStableKey"],
    ["ReplaceReportingForm", "managerPositionStableKey"],
  ]) {
    const html = render(forms[name], { data: testData, position, assignment, relationship });
    const select = html.match(new RegExp(`<select[^>]*name="${fieldName}"[\\s\\S]*?<\\/select>`))?.[0];
    assert.ok(select, name);
    assert.match(html, /type="search"/);
    required(html, fieldName);
    assert.doesNotMatch(select, /inactive-position|person-inactive/);
    if (fieldName === "managerPositionStableKey") {
      assert.doesNotMatch(select, /value="position-a"/);
      assert.match(select, /Fictional Services/);
      if (name === "CorrectReportingForm") assert.match(select, /value="manager-a" selected=""/);
      if (name === "ReplaceReportingForm") assert.doesNotMatch(select, /value="manager-a"/);
    }
    if (name === "ReplaceAssignmentForm") assert.doesNotMatch(select, /value="person-a"/);
    assert.match(html, /name="expectedRevision"/);
    required(html, "reason");
  }
});

test("title and name edits preserve optional placement and default audit fields", async () => {
  const { EditForm } = await load("app/organization/structure-administration-panel.tsx");
  for (const [entityType, entity, name, placement] of [
    ["organization_unit", data.units[0], "name", "parentOrganizationUnitStableKey"],
    ["position", data.positions[0], "title", "organizationUnitStableKey"],
    ["person", data.people[0], "displayName", null],
  ]) {
    const html = render(EditForm, { data, entity, entityType });
    for (const field of [name, "changeKind", "effectiveDate", "reason"]) required(html, field);
    if (placement) optional(html, placement);
    assert.match(html, /value="correction" selected=""/);
    assert.match(html, /name="effectiveDate"[^>]*value="\d{4}-\d{2}-\d{2}"/);
    assert.match(html, /name="expectedRevision"/);
    assert.match(html, /A short note/);
  }
});

test("missing manager and responsibilities stay collapsed and optional after the basics are saved", async () => {
  const { StructureAdministrationPanel } = await load("app/organization/structure-administration-panel.tsx");
  const entity = { ...data.positions[0], primaryManager: null, additionalManagers: [], assignments: [], mandates: [] };
  const before = JSON.stringify(entity);
  const html = render(StructureAdministrationPanel, { changes: [], data, entity, entityType: "position" });
  for (const label of ["Add manager", "Add responsibility"]) {
    const section = html.match(new RegExp(`<details([^>]*)><summary[^>]*>${label} \\(optional\\)<\\/summary>`));
    assert.ok(section, label);
    assert.doesNotMatch(section[1], /\bopen=/, `${label} should open only when chosen`);
  }
  assert.match(html, /Reports to is not yet recorded\. Leave this for later/);
  assert.match(html, /text-\[var\(--info\)\][^>]*role="alert"><div>Responsibilities not yet recorded/);
  required(html, "managerPositionStableKey");
  assert.equal(JSON.stringify(entity), before, "optional setup must not infer relationships");
});

test("new Units, Positions, and People only require their identity and history fields", async () => {
  const { StructureCreateForm } = await load("app/studio/organization/structure-create-form.tsx");
  for (const [entityType, name, placement] of [
    ["organization_unit", "name", "parentOrganizationUnitStableKey"],
    ["position", "title", "organizationUnitStableKey"],
    ["person", "displayName", null],
  ]) {
    const html = render(StructureCreateForm, { data, entityType });
    for (const field of [name, "changeKind", "effectiveDate", "reason"]) required(html, field);
    if (placement) optional(html, placement);
    assert.match(html, /\* Required\. Everything else is optional\./);
  }
});

test("structure mandate and coverage markers follow conditional validation", async () => {
  const position = data.positions.find(item => item.mandates.length > 0);
  for (const type of ["primary", "shared"]) {
    const { EstablishRoleMandateForm } = await load("app/organization/structure-administration-panel.tsx", ["create-new", type]);
    const html = render(EstablishRoleMandateForm, { data, position });
    required(html, "newRoleName");
    optional(html, "newRoleDescription");
    if (type === "shared") required(html, "scope");
    else optional(html, "scope");
  }
  for (const type of ["permanent", "interim", "acting", "delegated", "backup"]) {
    const { EstablishRoleCoverageForm } = await load("app/organization/structure-administration-panel.tsx", [type]);
    const html = render(EstablishRoleCoverageForm, { data, position, mandate: position.mandates[0] });
    if (type === "permanent") optional(html, "coverageReason");
    else required(html, "coverageReason");
  }
});

test("plain-language panel keeps edit and history visible while explanatory help is closed", async () => {
  const { StructureAdministrationPanel } = await load("app/organization/structure-administration-panel.tsx");
  const entity = data.positions.find(item => item.assignments.length > 0 && item.primaryManager);
  const html = render(StructureAdministrationPanel, { changes: [], data, entity, entityType: "position" });
  for (const label of ["Edit details", "People in this position", "Reports to", "Change history", "Saved changes keep their history."]) {
    assert.ok(html.includes(label), label);
  }
  assert.match(labelFor(html, "title"), /Job title/);
  assert.doesNotMatch(html, /Maintain the current structural record|Assignment maintenance|Reporting-relationship maintenance/);
  for (const summary of ["How changes are recorded", "About assignments and responsibilities", "About reporting lines"]) {
    const help = html.match(new RegExp(`<details([^>]*)><summary[^>]*>${summary}<\\/summary>([\\s\\S]*?)<\\/details>`));
    assert.ok(help, summary);
    assert.doesNotMatch(help[1], /\bopen=/);
    assert.doesNotMatch(help[2], /<(?:form|input|select|textarea)\b/, "help must not hide edit or required audit controls");
  }
  assert.match(html, /<details open=""><summary[^>]*>Edit title or Unit/);
  assert.match(html, /The Person, Position, and Operational Roles remain separate/);
  assert.match(html, /This does not assign Process ownership/);
  assert.match(html, /No saved changes have been recorded for this item/);
});

test("simpler assignment and manager actions preserve exact identities, actions, dates, and pending guards", async () => {
  const position = data.positions.find(item => item.assignments.length > 0 && item.primaryManager);
  const assignment = position.assignments[0];
  const relationship = position.primaryManager;
  const rows = [
    ["EstablishAssignmentForm", "establishPositionAssignmentAction", "Add person to this position", null, position.revision],
    ["ReplaceAssignmentForm", "replacePositionAssignmentAction", "Replace person", "assignmentRecordKey", assignment.revision],
    ["EndAssignmentForm", "endPositionAssignmentAction", "End person’s assignment", "assignmentRecordKey", assignment.revision],
    ["EstablishReportingForm", "establishPositionReportingRelationshipAction", "Save manager", null, position.revision],
    ["ReplaceReportingForm", "replacePositionReportingRelationshipAction", "Change manager", "reportingRecordKey", relationship.revision],
    ["CorrectReportingForm", "correctPositionReportingRelationshipAction", "Save reporting correction", "reportingRecordKey", relationship.revision],
    ["EndReportingForm", "endPositionReportingRelationshipAction", "End reporting line", "reportingRecordKey", relationship.revision],
  ];
  for (const pending of [false, true]) {
    for (const [formName, actionName, buttonLabel, recordField, revision] of rows) {
      const forms = await load("app/organization/structure-administration-panel.tsx", [], pending);
      const props = { data, position, assignment, relationship };
      assert.equal(forms[formName](props).props.action, actions[actionName], formName);
      const html = render(forms[formName], props);
      const hidden = name => [...html.matchAll(/<input\b[^>]*>/g)].map(match => match[0]).find(control => control.includes(`name="${name}"`));
      for (const [name, value] of [
        ["positionStableKey", position.id],
        ["expectedRevision", revision],
        ...(recordField ? [[recordField, recordField === "assignmentRecordKey" ? assignment.id : relationship.id]] : []),
      ]) {
        const control = hidden(name);
        assert.ok(control, `${formName}: ${name}`);
        assert.ok(control.includes('type="hidden"'));
        assert.ok(control.includes(`value="${value}"`));
      }
      required(html, "effectiveDate");
      required(html, "reason");
      if (pending) assert.match(html, /<button[^>]*disabled=""[^>]*type="submit"/);
      else assert.ok(html.includes(buttonLabel), buttonLabel);
    }
  }
});

test("replacement and end forms keep their consequences next to the save action", async () => {
  const forms = await load("app/organization/structure-administration-panel.tsx");
  const position = data.positions.find(item => item.assignments.length > 0 && item.primaryManager);
  const props = { data, position, assignment: position.assignments[0], relationship: position.primaryManager };
  for (const [name, consequence] of [
    ["ReplaceAssignmentForm", /ends .*?assignment and starts the selected person’s assignment/],
    ["EndAssignmentForm", /assignment history stay in Lotura/],
    ["ReplaceReportingForm", /ends the current primary reporting line and starts the new one/],
    ["EndReportingForm", /no replacement manager is selected/],
  ]) {
    const html = render(forms[name], props);
    assert.match(html, consequence);
    assert.doesNotMatch(html, /<details/, "consequence must stay visible when action form is open");
    assert.match(html, /effective date/);
  }
});
