import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const unit = { id: "fictional-unit", name: "Fictional Services", status: "active" };
const otherUnit = { id: "same-name-unit", name: unit.name, status: "active" };
const inactiveUnit = { id: "inactive-unit", name: "Inactive Services", status: "inactive" };
const person = { id: "fictional-person", name: "Fictional Person", status: "active", assignments: [] };
const data = { units: [unit, otherUnit, inactiveUnit], people: [person, { ...person, id: "inactive-person", status: "inactive" }], positions: [] };
const Box = ({ children }) => React.createElement("div", null, children);
const primitives = {
  Alert: Box, Card: Box,
  Input: props => React.createElement("input", props),
  Select: props => React.createElement("select", props),
  Button: ({ variant, ...props }) => { void variant; return React.createElement("button", props); },
  RequiredMark: () => React.createElement("span", null, " (required)"),
};
const neverCall = () => { throw new Error("Rendering must not mutate data"); };
const actions = new Proxy({}, { get: () => neverCall });
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

async function load(path, stubs = {}, actionState = { status: "idle", message: "" }, expose = "", runtime = {}) {
  const loaded = { exports: {} };
  const { outputText } = ts.transpileModule(await read(path) + expose, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, { module: loaded, exports: loaded.exports, URLSearchParams, FormData, ...runtime, require(id) {
    if (id in stubs) return stubs[id];
    if (id === "react") return { ...React, useActionState: action => [actionState, action, false] };
    if (id === "next/link") return { default: ({ children, prefetch, ...props }) => { void prefetch; return React.createElement("a", props, children); } };
    if (id === "next/navigation") return { useRouter: () => ({ refresh: neverCall }) };
    if (id.endsWith("ui/primitives")) return primitives;
    if (id.endsWith("/actions")) return actions;
    if (id.endsWith("/action-state")) return { initialStructureActionState: { status: "idle", message: "" } };
    return require(id);
  } });
  return loaded.exports;
}

async function pageHarness(kind) {
  const seen = {};
  const experience = { enabled: true, data, asOf: "2026-09-25", configuration: {}, source: "fictional" };
  const { default: page } = await load(`app/studio/organization/${kind}/new/page.tsx`, {
    "next/server": { connection: async () => {} },
    "next/navigation": { notFound: () => { throw new Error("NOT_FOUND"); } },
    "@/lib/organization-structure-experience": { loadWorkspaceStudioExperience: async () => experience },
    "../../../studio-create-page": { StudioCreatePage: props => { seen.props = props; return null; } },
    "../../../../workspace-shell": { WorkspaceShell: Box },
  });
  return { experience, seen, async render(query = {}) { return renderToStaticMarkup(await page({ searchParams: Promise.resolve(query) })); } };
}

test("all scoped create routes validate active exact Unit identity and Studio access", async () => {
  for (const [kind, key] of [["positions", "unit"], ["people", "unit"], ["units", "parent"]]) {
    const h = await pageHarness(kind);
    await h.render({ [key]: unit.id });
    assert.equal(h.seen.props.initialUnitStableKey, unit.id);
    for (const value of ["", "foreign-unit", unit.name, inactiveUnit.id, [unit.id], [unit.id, otherUnit.id]]) {
      await assert.rejects(() => h.render({ [key]: value }), /NOT_FOUND/);
    }
    await h.render();
    assert.equal(h.seen.props.initialUnitStableKey, undefined);
    h.experience.enabled = false;
    await assert.rejects(() => h.render({ [key]: unit.id }), /NOT_FOUND/);
  }
});

test("saved Person continuation only exposes active tenant Person with valid Unit context", async () => {
  const h = await pageHarness("people");
  await h.render({ unit: unit.id, person: person.id });
  assert.equal(h.seen.props.savedPerson, person);
  for (const query of [
    { person: person.id }, { unit: unit.id, person: "foreign-person" },
    { unit: unit.id, person: "inactive-person" }, { unit: unit.id, person: [person.id] },
    { unit: "foreign-unit", person: person.id },
  ]) await assert.rejects(() => h.render(query), /NOT_FOUND/);
});

test("scoped create forms fix placement, preserve identity input, and label required audit fields", async () => {
  const { StructureCreateForm } = await load("app/studio/organization/structure-create-form.tsx");
  for (const [entityType, field, placement] of [
    ["organization_unit", "name", "parentOrganizationUnitStableKey"],
    ["position", "title", "organizationUnitStableKey"],
    ["person", "displayName", null],
  ]) {
    const html = render(StructureCreateForm, { data, entityType, initialUnitStableKey: unit.id });
    assert.match(html, new RegExp(`<input(?=[^>]*name="${field}")(?=[^>]*required="")[^>]*>`));
    assert.match(html, /name="returnToUnitStableKey"[^>]*value="fictional-unit"/);
    if (placement) {
      assert.match(html, new RegExp(`<input(?=[^>]*name="${placement}")(?=[^>]*type="hidden")(?=[^>]*value="fictional-unit")[^>]*>`));
      assert.doesNotMatch(html, new RegExp(`<select[^>]*name="${placement}"`));
    }
    for (const name of ["changeKind", "effectiveDate", "reason"]) {
      assert.match(html, new RegExp(`<label[^>]*>[\\s\\S]*?\\(required\\)[\\s\\S]*?name="${name}"`));
    }
    assert.doesNotMatch(html, /name="(?:personStableKey|roleStableKey|ownerRoleStableKey)"/);
  }
});

test("create page keeps the Unit breadcrumb and cancel target; saved Person cannot be created again", async () => {
  let creation = 0, placement = 0;
  const { StudioCreatePage } = await load("app/studio/studio-create-page.tsx", {
    "./organization/structure-create-form": { StructureCreateForm: () => { creation++; return React.createElement("div", { "data-create": true }); } },
    "./organization/unit-person-placement": { UnitPersonPlacement: props => { placement++; assert.equal(props.person, person); assert.equal(props.unit, unit); return React.createElement("div", { "data-placement": true }); } },
  });
  const created = render(StudioCreatePage, { data, entityType: "position", initialUnitStableKey: unit.id });
  assert.match(created, /Add job title/);
  assert.match(created, /href="\/studio\/organization\/units\/fictional-unit"/);
  assert.match(created, /Cancel and return to/);
  const saved = render(StudioCreatePage, { data, entityType: "person", initialUnitStableKey: unit.id, savedPerson: person });
  assert.match(saved, /Fictional Person is saved/);
  assert.match(saved, /Their record is already saved/);
  assert.equal(creation, 1);
  assert.equal(placement, 1);
  assert.doesNotMatch(saved, /data-create/);
});

async function actionHarness() {
  const seen = { mutations: [], revalidations: [], contextLoads: 0 };
  const experience = { enabled: true, data };
  let result = { ok: true, stableKey: "new-record", message: "Saved" };
  const administration = new Proxy({}, { get: (_target, name) => async input => { seen.mutations.push({ name, input }); return result; } });
  const exports = await load("app/organization/actions.ts", {
    "next/cache": { revalidatePath: path => seen.revalidations.push(path) },
    "next/navigation": { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    "@/lib/organization-structure-administration": administration,
    "@/lib/organization-structure-experience": { loadWorkspaceStudioExperience: async () => { seen.contextLoads++; return experience; } },
  });
  return { seen, experience, exports, setResult(next) { result = next; } };
}
function form(values = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({ changeKind: "organizational_change", effectiveDate: "2026-09-01", reason: "Fictional setup", ...values })) result.set(key, value);
  return result;
}
const previous = { status: "idle", message: "" };
const creates = [
  ["createOrganizationUnitAction", "createOrganizationUnit", "parentOrganizationUnitStableKey", "units"],
  ["createPositionAction", "createPosition", "organizationUnitStableKey", "positions"],
  ["createPersonAction", "createPerson", null, "people"],
];

test("scoped create actions reject unavailable, inactive, non-identity and unauthorized Unit context before mutation", async () => {
  for (const [action, , placement] of creates) {
    for (const invalid of ["foreign-unit", inactiveUnit.id, unit.name, "https://example.invalid/", "//example.invalid/"]) {
      const h = await actionHarness();
      const state = await h.exports[action](previous, form({ returnToUnitStableKey: invalid, ...(placement ? { [placement]: invalid } : {}) }));
      assert.equal(state.status, "error");
      assert.equal(h.seen.mutations.length, 0);
      assert.equal(h.seen.revalidations.length, 0);
    }
    const h = await actionHarness();
    h.experience.enabled = false;
    const state = await h.exports[action](previous, form({ returnToUnitStableKey: unit.id, ...(placement ? { [placement]: unit.id } : {}) }));
    assert.equal(state.status, "error");
    assert.equal(h.seen.mutations.length, 0);
  }
});

test("scoped Position and child Unit saves require their actual placement to match the Unit context", async () => {
  for (const [action, , placement] of creates.filter(item => item[2])) {
    const h = await actionHarness();
    for (const mismatch of [otherUnit.id, "", "foreign-unit"]) {
      const state = await h.exports[action](previous, form({ returnToUnitStableKey: unit.id, [placement]: mismatch }));
      assert.equal(state.status, "error");
    }
    assert.equal(h.seen.mutations.length, 0);
  }
});

test("scoped creates use existing audited operations once and return only to internal contextual routes", async () => {
  for (const [action, operation, placement, segment] of creates) {
    const h = await actionHarness();
    const payload = form({ returnToUnitStableKey: unit.id, ...(placement ? { [placement]: unit.id } : {}), title: "Coordinator", name: "Team", displayName: "Fictional Person" });
    const target = segment === "people"
      ? `/studio/organization/people/new?unit=${unit.id}&person=new-record`
      : `/studio/organization/units/${unit.id}${segment === "positions" ? "#unit-people-job-titles" : ""}`;
    await assert.rejects(() => h.exports[action](previous, payload), { message: `REDIRECT:${target}` });
    assert.equal(h.seen.mutations.length, 1);
    assert.equal(h.seen.mutations[0].name, operation);
    if (placement) assert.equal(h.seen.mutations[0].input[placement], unit.id);
    assert.equal(h.seen.mutations[0].input.reason, "Fictional setup");
    assert.equal(h.seen.mutations[0].input.returnToUnitStableKey, undefined);
    assert.equal(h.seen.contextLoads, 1);
  }
});

test("global create paths retain existing single-operation behavior and safe validation failures never redirect", async () => {
  for (const [action, operation, , segment] of creates) {
    const h = await actionHarness();
    await assert.rejects(() => h.exports[action](previous, form()), { message: `REDIRECT:/studio/organization/${segment}/new-record` });
    assert.equal(h.seen.mutations[0].name, operation);
    assert.equal(h.seen.contextLoads, 0);
    const failed = await actionHarness();
    failed.setResult({ ok: false, message: "Review possible duplicate" });
    const state = await failed.exports[action](previous, form());
    assert.equal(state.status, "error");
    assert.equal(state.message, "Review possible duplicate");
    assert.equal(failed.seen.revalidations.length, 0);
  }
});

test("saved Person placement lists only active direct Unit titles without inferring assignments", async () => {
  const { UnitPersonPlacement } = await load("app/studio/organization/unit-person-placement.tsx", {
    "../../organization/structure-administration-panel": { ChangeMetadataFields: Box },
  });
  const local = { id: "local-position", title: "Coordinator", status: "active", unit, assignments: [], revision: "revision" };
  const positions = [local,
    { ...local, id: "inactive-position", title: "Inactive title", status: "inactive" },
    { ...local, id: "outside-position", title: "Outside title", unit: otherUnit },
    { ...local, id: "child-position", title: "Child title", unit: { id: "child-unit", parent: unit } },
    { ...local, id: "already-held", title: "Already held title", assignments: [{ person }] },
  ];
  const html = render(UnitPersonPlacement, { data: { ...data, positions }, person, unit });
  assert.match(html, /value="local-position"/);
  assert.match(html, /no assignment in this Unit yet/);
  assert.match(html, /\(optional\)/);
  assert.doesNotMatch(html, /Inactive title|Outside title|Child title|Already held title|name="personStableKey"|Save assignment/);
  assert.match(html, /href="\/studio\/organization\/people\/fictional-person"/);
  const empty = render(UnitPersonPlacement, { data, person, unit });
  assert.match(empty, /positions\/new\?unit=fictional-unit/);
});

test("optional assignment keeps exact Person, Position and revision; occupied titles require an explicit coverage choice", async () => {
  const { AssignmentForm } = await load("app/studio/organization/unit-person-placement.tsx", {
    "../../organization/structure-administration-panel": { ChangeMetadataFields: Box },
  }, previous, "\nexport { AssignmentForm };\n");
  const position = { id: "local-position", title: "Coordinator", revision: "fictional-revision", assignments: [] };
  const html = render(AssignmentForm, { person, position, onPendingChange: neverCall });
  for (const [name, value] of [["personStableKey", person.id], ["positionStableKey", position.id], ["expectedRevision", position.revision]]) {
    assert.match(html, new RegExp(`<input(?=[^>]*name="${name}")(?=[^>]*value="${value}")[^>]*>`));
  }
  assert.match(html, /value="incumbent" selected=""/);
  const occupied = render(AssignmentForm, { person, position: { ...position, assignments: [{ type: "incumbent" }] }, onPendingChange: neverCall });
  assert.match(occupied, /Adding an assignment does not replace them/);
  assert.doesNotMatch(occupied, /value="incumbent"/);
  assert.match(occupied, /value="" selected=""/);
  const unknownRevision = render(AssignmentForm, { person, position: { ...position, revision: undefined }, onPendingChange: neverCall });
  assert.match(unknownRevision, /<fieldset[^>]*disabled=""/);
});

test("optional assignment success prevents repeats and failure explains that the Person remains saved", async () => {
  for (const state of [{ status: "success", message: "Saved" }, { status: "error", message: "Revision changed. Please reload." }]) {
    const { AssignmentForm } = await load("app/studio/organization/unit-person-placement.tsx", {
      react: { ...React, useState: initial => [initial && typeof initial === "object" && "status" in initial ? state : initial, neverCall] },
      "../../organization/structure-administration-panel": { ChangeMetadataFields: Box },
    }, state, "\nexport { AssignmentForm };\n");
    const html = render(AssignmentForm, { person, position: { id: "local-position", revision: "fictional-revision", assignments: [] }, onPendingChange: neverCall });
    assert.match(html, /aria-live="polite"/);
    if (state.status === "success") {
      assert.match(html, /<fieldset[^>]*disabled=""/);
      assert.match(html, /Job title assigned/);
    } else {
      assert.doesNotMatch(html, /<fieldset[^>]*disabled=""/);
      assert.match(html, /The Person record is still saved/);
      assert.match(html, /Revision changed/);
    }
  }
});

test("optional assignment invokes only the existing assignment action and exposes a bounded pending lifecycle", async () => {
  for (const throws of [false, true]) {
    const events = [], mutations = [];
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let stateIndex = 0;
    const { AssignmentForm } = await load("app/studio/organization/unit-person-placement.tsx", {
      react: { ...React, useRef: initial => ({ current: initial }), useState: initial => { const names = ["unconfirmed", "state", "localPending"]; const name = names[stateIndex++]; return [initial, value => events.push([name, value])]; } },
      "../../organization/structure-administration-panel": { ChangeMetadataFields: Box },
      "../../organization/actions": { establishPositionAssignmentAction: async (_prior, payload) => { mutations.push(payload); await gate; if (throws) throw new Error("Transport failed"); return { status: "success", message: "Saved" }; } },
    }, previous, "\nexport { AssignmentForm };\n", { FormData: class { constructor(input) { return input; } } });
    const element = AssignmentForm({ person, position: { id: "local-position", revision: "revision", assignments: [] }, onPendingChange: value => events.push(["pending", value]), onSaved: () => events.push(["saved", true]) });
    assert.equal(mutations.length, 0);
    const payload = form({ personStableKey: person.id, positionStableKey: "local-position", expectedRevision: "revision", assignmentType: "backup" });
    const event = { preventDefault() {}, currentTarget: payload };
    const submitting = element.props.onSubmit(event);
    await element.props.onSubmit(event);
    assert.deepEqual(mutations, [payload]);
    release();
    await submitting;
    assert.deepEqual(events[1], ["pending", true]);
    assert.deepEqual(events.at(-1), ["pending", false]);
    const state = events.find(([name]) => name === "state")?.[1];
    if (throws) {
      assert.equal(state.status, "error");
      assert.match(state.message, /Refresh this page before trying again/);
      assert.deepEqual(events[2], ["unconfirmed", true]);
      assert.equal(events.some(([name]) => name === "saved"), false);
    } else {
      assert.equal(state.status, "success");
      assert.ok(events.some(([name]) => name === "saved"));
    }
  }
});
