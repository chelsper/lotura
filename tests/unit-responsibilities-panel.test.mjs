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
const source = await readFile(new URL("../app/studio/unit-responsibilities-panel.tsx", import.meta.url), "utf8");
const code = compile(source);
const pickerOptions = { exports: {} };
vm.runInNewContext(compile(await readFile(new URL("../lib/structure-picker-options.ts", import.meta.url), "utf8")), {
  module: pickerOptions, exports: pickerOptions.exports,
});
const searchableSelectCode = compile(await readFile(new URL("../app/ui/searchable-select.tsx", import.meta.url), "utf8"));

const unit = { id: "unit-a", name: "Fictional Services" };
const role = (id, name, status = "active", description = null) => ({
  id, stableKey: `stable-${id}`, name, status, description, revision: `revision-${id}`, processes: [], systems: [],
});
const linkedRole = role("role:1", "Request review", "active", "Review incoming requests.");
const availableRole = role("role:2", "Queue coordination", "active", "Coordinate the daily queue.");
const secondAvailableRole = role("role:3", "Queue coordination", "active", "Coordinate the daily queue.");
const inactiveRole = role("role:4", "Retired responsibility", "inactive");
const mandate = {
  id: "mandate-a", type: "shared", typeLabel: "Shared responsibility", scope: "Printing requests only",
  reason: "Fictional source", revision: "mandate-revision", role: linkedRole,
  effectiveFrom: "2026-01-01", effectiveUntil: null, processes: [], systems: [],
  coverage: [{ id: "coverage-a", type: "backup", typeLabel: "Backup", person: { id: "person-coverage", name: "Casey Coverage" } }],
};
const position = {
  id: "position-a", revision: "position-revision", title: "Services Coordinator", status: "active", unit,
  assignments: [{ id: "assignment-a", type: "incumbent", person: { id: "person-occupant", name: "Alex Occupant" } }],
  primaryManager: null, mandates: [mandate], processes: [], systems: [],
};
const data = { operationalRoles: [linkedRole, availableRole, secondAvailableRole, inactiveRole], positions: [position], people: [] };

function nodes(element, predicate) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap((item) => nodes(item, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
}
const field = (tree, name) => nodes(tree, (node) => node.props?.name === name)[0];
const form = (tree) => nodes(tree, (node) => node.type === "form")[0];
const plain = (value) => JSON.parse(JSON.stringify(value));
const CoverageFormStub = () => null;

function harness(overrides = {}) {
  const states = [];
  let cursor = 0;
  const calls = [];
  const events = [];
  const confirmations = [];
  let confirmationResult = true;
  let implementation = async () => ({ status: "success", message: "Responsibility linked. History saved." });
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
    window: { confirm(message) { confirmations.push(message); return confirmationResult; } },
    FormData: class TestFormData {
      constructor(target) { this.values = { ...target.values }; }
      get(key) { return this.values[key] ?? null; }
      set(key, value) { this.values[key] = value; }
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
        establishRoleMandateAction: async (previous, formData) => {
          calls.push({ name: "establishRoleMandateAction", previous, formData });
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
      if (id === "./unit-responsibility-coverage-form") return { UnitResponsibilityCoverageForm: CoverageFormStub };
      return require(id);
    },
  });
  const props = {
    position, data, onSaved: (message) => events.push(["saved", message]),
    onSaveUnconfirmed: () => events.push(["unconfirmed"]),
    onPendingChange: (value) => events.push(["pending", value]), onDirty: (value = true) => events.push(value ? ["dirty"] : ["clean"]), ...overrides,
  };
  const render = () => { cursor = 0; return loaded.exports.UnitResponsibilitiesPanel(props); };
  function change(name, value) {
    const tree = render();
    const target = { name, value };
    field(tree, name).props.onChange?.({ target });
    form(tree)?.props.onChange?.({ target });
  }
  return {
    render, calls, events, props, change, confirmations,
    confirm: (value) => { confirmationResult = value; },
    html: () => renderToStaticMarkup(render()),
    implement: (next) => { implementation = next; },
    submit: async (overrides = {}) => {
      const tree = render();
      const target = form(tree);
      if (!target) return;
      const values = { changeKind: "organizational_change", reason: "Fictional reviewed responsibility", effectiveDate: "2026-09-27" };
      for (const node of nodes(tree, (item) => Boolean(item.props?.name))) {
        values[node.props.name] = node.props.value ?? node.props.defaultValue ?? "";
      }
      return target.props.onSubmit({ preventDefault() {}, currentTarget: { values: { ...values, ...overrides } } });
    },
  };
}

function choose(panel, roleKey = availableRole.id, mandateType = "primary") {
  panel.change("roleKey", roleKey);
  panel.change("mandateType", mandateType);
}

test("current responsibilities show only recorded mandates and explicit coverage, never inferred occupancy", () => {
  const panel = harness();
  const before = JSON.stringify({ data, position });
  const html = panel.html();
  assert.match(html, /Request review/);
  assert.match(html, /Printing requests only/);
  assert.match(html, /Shared responsibility/);
  assert.match(html, /Casey Coverage/);
  assert.match(html, /Backup/i);
  assert.doesNotMatch(html, /Alex Occupant/);
  assert.equal(panel.calls.length, 0);
  assert.equal(JSON.stringify({ data, position }), before);
});

test("empty mandates and missing coverage stay explicitly unrecorded", () => {
  const none = harness({ position: { ...position, mandates: [] } });
  assert.match(none.html(), /not (?:yet )?recorded|No current responsibilities/i);
  assert.doesNotMatch(none.html(), /Casey Coverage|Alex Occupant/);
  const noCoverage = harness({ position: { ...position, mandates: [{ ...mandate, coverage: [] }] } });
  assert.match(noCoverage.html(), /Who carries this out: not yet recorded/);
  assert.equal(none.calls.length + noCoverage.calls.length, 0);
});

const coverageEditor = (panel) => nodes(panel.render(), (node) => node.type === CoverageFormStub)[0];
const openCoverage = (panel) => nodes(panel.render(), (node) => node.props?.["aria-label"] === `Who does this work? ${linkedRole.name}`)[0].props.onClick();

test("coverage opens the exact current mandate with no inferred person or write", () => {
  const panel = harness();
  openCoverage(panel);
  const editor = coverageEditor(panel);
  assert.equal(editor.props.mandate, mandate);
  assert.equal(editor.props.position, position);
  assert.equal(editor.props.data, data);
  assert.equal(form(panel.render()), undefined, "never show two editable forms at once");
  assert.equal(panel.calls.length, 0);
  assert.equal(editor.props.personStableKey, undefined);
});

test("a summary entry opens only the exact eligible mandate with blank Person and no write", () => {
  const panel = harness({ initialCoverageMandateId: mandate.id });
  assert.equal(coverageEditor(panel).props.position, position);
  assert.equal(coverageEditor(panel).props.mandate, mandate);
  assert.equal(coverageEditor(panel).props.personStableKey, undefined);
  assert.equal(panel.calls.length, 0);
  coverageEditor(panel).props.onCancel();
  assert.equal(coverageEditor(panel), undefined);
  assert.ok(form(panel.render()));
});

test("invalid or unavailable summary targets fall back to the responsibility list", () => {
  for (const patch of [
    { initialCoverageMandateId: "another-position-mandate" },
    { position: { ...position, status: "inactive" } },
    { position: { ...position, revision: "" } },
    { position: { ...position, mandates: [{ ...mandate, revision: "" }] } },
    { position: { ...position, mandates: [{ ...mandate, role: { ...linkedRole, status: "inactive" } }] } },
  ]) {
    const panel = harness({ initialCoverageMandateId: mandate.id, ...patch });
    assert.equal(coverageEditor(panel), undefined);
    assert.equal(panel.calls.length, 0);
  }
});

test("coverage unconfirmed saves propagate to the roster and freeze inner navigation", () => {
  const panel = harness();
  openCoverage(panel);
  coverageEditor(panel).props.onSaveUnconfirmed();
  coverageEditor(panel).props.onPendingChange(false);
  coverageEditor(panel).props.onCancel();
  assert.ok(coverageEditor(panel));
  assert.equal(panel.events.filter(([name]) => name === "unconfirmed").length, 1);
  assert.equal(panel.calls.length, 0);
});

test("switching from a link draft to coverage asks before discarding and clears the outer dirty flag", () => {
  const panel = harness();
  choose(panel);
  panel.confirm(false);
  openCoverage(panel);
  assert.equal(coverageEditor(panel), undefined);
  assert.equal(field(panel.render(), "roleKey").props.value, availableRole.id);
  panel.confirm(true);
  openCoverage(panel);
  assert.ok(coverageEditor(panel));
  assert.deepEqual(panel.events.at(-1), ["clean"]);
  coverageEditor(panel).props.onCancel();
  assert.equal(field(panel.render(), "roleKey").props.value, "");
  assert.equal(field(panel.render(), "mandateType").props.value, "");
  assert.equal(panel.calls.length, 0);
});

test("coverage dirty and pending state protect Back, and success returns through the existing save path", () => {
  const panel = harness();
  openCoverage(panel);
  coverageEditor(panel).props.onDirty();
  panel.confirm(false);
  coverageEditor(panel).props.onCancel();
  assert.ok(coverageEditor(panel));
  assert.deepEqual(panel.events.at(-1), ["dirty"]);
  panel.confirm(true);
  coverageEditor(panel).props.onPendingChange(true);
  coverageEditor(panel).props.onCancel();
  assert.ok(coverageEditor(panel));
  coverageEditor(panel).props.onPendingChange(false);
  coverageEditor(panel).props.onSaved("Person added.");
  assert.deepEqual(panel.events.at(-1), ["saved", "Person added."]);
  coverageEditor(panel).props.onCancel();
  assert.equal(coverageEditor(panel), undefined);
  assert.deepEqual(panel.events.at(-1), ["clean"]);
});

test("picker offers active unlinked responsibilities with explicit blank selection and unique namesake labels", () => {
  const panel = harness();
  const picker = field(panel.render(), "roleKey");
  assert.equal(picker.props.value, "");
  assert.equal(picker.props.required, true);
  assert.deepEqual(Array.from(picker.props.options, (option) => option.value), [availableRole.id, secondAvailableRole.id]);
  assert.notEqual(picker.props.options[0].label, picker.props.options[1].label);
  assert.match(panel.html(), /type="search"/);
  assert.equal(field(panel.render(), "mandateType").props.value, "");
  assert.equal(field(panel.render(), "mandateType").props.required, true);
  assert.equal(field(panel.render(), "newRoleName"), undefined);
  assert.doesNotMatch(panel.html(), /value="create-new"/);
});

test("linking preserves exact Position and legacy Role identity plus existing history metadata", async () => {
  const panel = harness();
  choose(panel);
  const tree = panel.render();
  assert.equal(field(tree, "positionStableKey").props.value, position.id);
  assert.equal(field(tree, "expectedRevision").props.value, position.revision);
  const metadata = nodes(tree, (node) => node.props?.fixedKind)[0];
  assert.equal(metadata.props.fixedKind, "organizational_change");
  await panel.submit();
  assert.equal(panel.calls.length, 1);
  assert.equal(panel.calls[0].name, "establishRoleMandateAction");
  const payload = panel.calls[0].formData;
  assert.equal(payload.get("roleKey"), availableRole.id);
  assert.equal(payload.get("positionStableKey"), position.id);
  assert.equal(payload.get("expectedRevision"), position.revision);
  assert.equal(payload.get("mandateType"), "primary");
  assert.equal(payload.get("changeKind"), "organizational_change");
  assert.equal(payload.get("reason"), "Fictional reviewed responsibility");
  assert.equal(payload.get("effectiveDate"), "2026-09-27");
  for (const unrelated of ["personStableKey", "managerPositionStableKey", "ownerRoleId", "assignmentRecordKey", "newRoleName"]) {
    assert.equal(payload.get(unrelated), null);
  }
});

test("shared responsibility requires scope while primary permits optional narrower scope", async () => {
  const panel = harness();
  choose(panel, availableRole.id, "shared");
  assert.equal(field(panel.render(), "scope").props.required, true);
  await panel.submit({ scope: "" });
  await panel.submit({ scope: "   " });
  assert.equal(panel.calls.length, 0);
  await panel.submit({ scope: "After-hours printing requests" });
  assert.equal(panel.calls.length, 1);
  assert.equal(panel.calls[0].formData.get("scope"), "After-hours printing requests");
  const primary = harness();
  choose(primary);
  assert.notEqual(field(primary.render(), "scope").props.required, true);
  await primary.submit({ scope: "" });
  assert.equal(primary.calls.length, 1);
});

test("current holders are visible and primary accountability cannot be silently replaced", async () => {
  const otherPosition = {
    ...position, id: "position-other", title: "Evening Coordinator", unit: { id: "unit-other", name: "Fictional Library" },
    mandates: [{ ...mandate, id: "mandate-primary", type: "primary", typeLabel: "Primary accountability", role: availableRole, scope: null }],
  };
  const panel = harness({ data: { ...data, positions: [position, otherPosition] } });
  panel.change("roleKey", availableRole.id);
  const html = panel.html();
  assert.match(html, /Coordinate the daily queue/);
  assert.match(html, /Evening Coordinator/);
  assert.match(html, /Fictional Library/);
  assert.match(html, /existing link stays unchanged/);
  const primaryChoice = nodes(panel.render(), (node) => node.type === "option" && node.props.value === "primary")[0];
  assert.equal(primaryChoice.props.disabled, true);
  panel.change("mandateType", "primary");
  await panel.submit();
  assert.equal(panel.calls.length, 0);
  panel.change("mandateType", "shared");
  await panel.submit({ scope: "Daytime requests only" });
  assert.equal(panel.calls.length, 1);
  assert.equal(panel.calls[0].formData.get("positionStableKey"), position.id);
  assert.equal(panel.calls[0].formData.get("mandateRecordKey"), null);
});

test("changing responsibility asks before resetting its type and scope, and cancellation retains choices", () => {
  const panel = harness();
  choose(panel, availableRole.id, "shared");
  const scopeKey = field(panel.render(), "scope").key;
  panel.confirm(false);
  panel.change("roleKey", secondAvailableRole.id);
  assert.equal(panel.confirmations.length, 1);
  assert.match(panel.confirmations[0], /type and scope will reset/);
  assert.equal(field(panel.render(), "roleKey").props.value, availableRole.id);
  assert.equal(field(panel.render(), "mandateType").props.value, "shared");
  assert.equal(field(panel.render(), "scope").key, scopeKey);
  panel.confirm(true);
  panel.change("roleKey", secondAvailableRole.id);
  assert.equal(panel.confirmations.length, 2);
  assert.equal(field(panel.render(), "roleKey").props.value, secondAvailableRole.id);
  assert.equal(field(panel.render(), "mandateType").props.value, "");
  assert.notEqual(field(panel.render(), "scope").key, scopeKey);
  assert.equal(nodes(panel.render(), (node) => node.props?.fixedKind)[0].key, null);
  assert.equal(panel.calls.length, 0);
});

test("submitted choices that differ from the explicit Role or mandate choice never dispatch", async () => {
  const panel = harness();
  choose(panel);
  await panel.submit({ roleKey: secondAvailableRole.id });
  await panel.submit({ mandateType: "shared", scope: "Unexpected override" });
  assert.equal(panel.calls.length, 0);
  assert.equal(field(panel.render(), "roleKey").props.value, availableRole.id);
});

test("missing choices, forged inactive or linked selections, and unsupported mandate types never dispatch", async () => {
  const blank = harness();
  await blank.submit();
  assert.equal(blank.calls.length, 0);
  blank.change("roleKey", availableRole.id);
  await blank.submit();
  assert.equal(blank.calls.length, 0);
  for (const roleKey of [linkedRole.id, inactiveRole.id, "role:999", "create-new"]) {
    const panel = harness();
    choose(panel, roleKey);
    await panel.submit();
    assert.equal(panel.calls.length, 0, roleKey);
  }
  const unsupported = harness();
  choose(unsupported, availableRole.id, "invented");
  await unsupported.submit();
  assert.equal(unsupported.calls.length, 0);
});

test("inactive and revisionless Positions or exhausted catalog never dispatch a write", async () => {
  for (const patch of [{ status: "inactive" }, { revision: "" }]) {
    const panel = harness({ position: { ...position, ...patch } });
    if (field(panel.render(), "roleKey")) choose(panel);
    await panel.submit();
    assert.equal(panel.calls.length, 0);
    const fieldsets = nodes(panel.render(), (node) => node.type === "fieldset");
    assert.ok(!fieldsets.length || fieldsets.every((node) => node.props.disabled));
  }
  const panel = harness({ data: { ...data, operationalRoles: [linkedRole, inactiveRole] } });
  await panel.submit();
  assert.equal(panel.calls.length, 0);
  assert.match(panel.html(), /(?:No|All)[^<]*(?:responsibilit|available|linked)/i);
});

test("choices and metadata notify dirty state without creating a link", () => {
  const panel = harness();
  choose(panel);
  const tree = panel.render();
  form(tree).props.onChange({ target: { name: "reason", value: "Human reviewed" } });
  assert.ok(panel.events.filter(([name]) => name === "dirty").length >= 3);
  assert.equal(panel.calls.length, 0);
});

test("pending saves disable controls and guard double-clicks; successful links notify once", async () => {
  const panel = harness();
  choose(panel);
  panel.events.length = 0;
  let release;
  panel.implement(() => new Promise((resolve) => { release = resolve; }));
  const saving = panel.submit();
  assert.deepEqual(panel.events, [["pending", true]]);
  assert.equal(nodes(panel.render(), (node) => node.type === "fieldset")[0].props.disabled, true);
  await panel.submit();
  assert.equal(panel.calls.length, 1);
  release({ status: "success", message: "Responsibility linked. History saved." });
  await saving;
  assert.deepEqual(panel.events, [["pending", true], ["pending", false], ["saved", "Responsibility linked. The change is saved in history."]]);
  await panel.submit();
  assert.equal(panel.calls.length, 1);
});

test("validation errors preserve explicit choices and allow correction, without signaling success", async () => {
  const panel = harness();
  choose(panel, secondAvailableRole.id, "shared");
  panel.implement(async () => ({ status: "error", message: "This record changed. Refresh before saving." }));
  await panel.submit({ scope: "Evening requests" });
  const tree = panel.render();
  assert.match(panel.html(), /This record changed/);
  assert.equal(field(tree, "roleKey").props.value, secondAvailableRole.id);
  assert.equal(field(tree, "mandateType").props.value, "shared");
  assert.equal(nodes(tree, (node) => node.type === "fieldset")[0].props.disabled, false);
  assert.equal(panel.calls[0].formData.get("scope"), "Evening requests");
  assert.ok(!panel.events.some(([name]) => name === "saved"));
});

test("unconfirmed saves preserve entries, hide backend details, and refuse automatic retries", async () => {
  const panel = harness();
  choose(panel);
  panel.implement(async () => { throw new Error("private connection credential detail"); });
  await panel.submit();
  const html = panel.html();
  assert.match(html, /couldn&#x27;t confirm|could not confirm/i);
  assert.match(html, /refresh/i);
  assert.doesNotMatch(html, /private connection credential detail/);
  assert.equal(field(panel.render(), "roleKey").props.value, availableRole.id);
  assert.equal(nodes(panel.render(), (node) => node.type === "fieldset")[0].props.disabled, true);
  await panel.submit();
  assert.equal(panel.calls.length, 1);
  assert.deepEqual(panel.events.at(-1), ["pending", false]);
  assert.equal(panel.events.filter(([name]) => name === "unconfirmed").length, 1);
  assert.ok(!panel.events.some(([name]) => name === "saved"));
});

test("responsibility options never collapse stable identity or mutate catalog objects", () => {
  const before = JSON.stringify(data.operationalRoles);
  const options = pickerOptions.exports.rolePickerOptions([availableRole, secondAvailableRole]);
  assert.deepEqual(plain(options.map((option) => option.value)), [availableRole.id, secondAvailableRole.id]);
  assert.notEqual(options[0].label, options[1].label);
  assert.equal(JSON.stringify(data.operationalRoles), before);
});
