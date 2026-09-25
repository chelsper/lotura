import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../lib/flow-review-actions.ts", import.meta.url), "utf8");
const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  module: loaded,
  exports: loaded.exports,
  require(id) { throw new Error(`Unexpected runtime dependency: ${id}`); },
});
const { buildFlowReviewActions } = loaded.exports;
const clean = value => JSON.parse(JSON.stringify(value));

const process = { id: "fictional-printing / intake", name: "Fictional Printing" };
const otherProcess = { id: "fictional-review", name: "Fictional Review" };
const role = { id: "fictional-coordinator", name: "Coordinator", stableKey: "11111111-1111-4111-8111-111111111111" };
const system = { id: "fictional-queue", name: "Print Queue", stableKey: "22222222-2222-4222-8222-222222222222" };
const data = { processes: [process, otherProcess], roles: [role], systems: [system] };
const allCapabilities = { canAuthorProcesses: true, canManageResponsibilities: true, canDiscover: true };
const noCapabilities = { canAuthorProcesses: false, canManageResponsibilities: false, canDiscover: false };

function finding(id, overrides = {}) {
  return {
    id, evidence: "Review recommended", title: "Fictional review item",
    summary: "A documented relationship needs review.", facts: [],
    howDetermined: "Derived from the fictional model.", limitation: null,
    processIds: [], roleIds: [], systemIds: [], ...overrides,
  };
}

function review(item, options = {}) {
  return clean(buildFlowReviewActions({ findings: [item], data, ...allCapabilities, ...options }))[item.id];
}

test("FLOW ownership and responsibility findings lead to the appropriate existing Process editor section", () => {
  for (const [id, label, anchor] of [
    ["ownership-process-fictional-printing", "Review Process owner", "ownership"],
    ["ownership-retired-process-fictional-printing", "Review Process owner", "ownership"],
    ["ownership-exception-fictional-priority-change", "Review Exception owner", "exceptions"],
    ["responsibility-fictional-printing", "Review Step responsibilities", "steps"],
  ]) {
    const result = review(finding(id, { processIds: [process.id] }));
    assert.ok(result.actions.some(action => action.label === label && action.href === `/studio/processes/${encodeURIComponent(process.id)}#${anchor}`), id);
    assert.ok(result.actions.some(action => action.label === "Explore in Discovery" && action.href === `/studio/discovery?process=${encodeURIComponent(process.id)}`), id);
  }
});

test("FLOW System review uses the same-tenant stable System identity, not its key or a related Role", () => {
  const item = finding("ownership-system-fictional-queue", { systemIds: [system.id], roleIds: [role.id] });
  const result = review(item);
  assert.ok(result.actions.some(action => action.label === "Review System owner" && action.href === `/studio/technology/systems/${system.stableKey}`));
  assert.equal(result.actions.some(action => action.href.includes(`/systems/${system.id}`)), false);
  assert.equal(result.actions.some(action => action.href.includes("/responsibilities/")), false);
});

test("FLOW Role coverage links use stable Role identity and retain the legacy-assignment caveat", () => {
  for (const prefix of ["vacant", "temporary"]) {
    const item = finding(`${prefix}-${role.id}`, { roleIds: [role.id], processIds: [process.id] });
    const result = review(item);
    assert.ok(result.actions.some(action => action.label === "Review Role coverage" && action.href === `/studio/responsibilities/roles/${role.stableKey}#coverage`));
    assert.match(result.note, /older assignment records/i);
    assert.match(result.note, /(?:may not|does not|won.t|will not).*clear/i);
    assert.equal(result.actions.some(action => action.href.includes(`/roles/${role.id}`)), false);
    assert.equal(result.actions.some(action => action.href.startsWith("/studio/processes/")), false, "Coverage findings must not send people to unrelated Process edits");
  }
});

test("Process authoring, Role maintenance, and Discovery capabilities gate their own links independently", () => {
  const processItem = finding("ownership-process-printing", { processIds: [process.id] });
  const systemItem = finding("ownership-system-queue", { systemIds: [system.id] });
  const roleItem = finding("vacant-coordinator", { roleIds: [role.id] });
  for (const item of [processItem, systemItem, roleItem]) {
    assert.deepEqual(review(item, noCapabilities).actions, []);
    const discoveryOnly = review(item, { ...noCapabilities, canDiscover: true }).actions;
    assert.equal(discoveryOnly.length, 1);
    assert.equal(discoveryOnly[0].label, "Explore in Discovery");
  }
  assert.equal(review(processItem, { ...noCapabilities, canAuthorProcesses: true }).actions.length, 1);
  assert.equal(review(systemItem, { ...noCapabilities, canAuthorProcesses: true }).actions.length, 1);
  assert.deepEqual(review(roleItem, { ...noCapabilities, canAuthorProcesses: true }).actions, []);
  assert.equal(review(roleItem, { ...noCapabilities, canManageResponsibilities: true }).actions.length, 1);
  assert.deepEqual(review(processItem, { ...noCapabilities, canManageResponsibilities: true }).actions, []);
  assert.deepEqual(review(systemItem, { ...noCapabilities, canManageResponsibilities: true }).actions, []);
});

test("unknown or foreign entity identities never become editor URLs or scoped Discovery context", () => {
  for (const item of [
    finding("ownership-process-foreign", { processIds: ["foreign-process"] }),
    finding("ownership-system-foreign", { systemIds: ["foreign-system"], roleIds: [role.id] }),
    finding("vacant-foreign", { roleIds: ["foreign-role"], systemIds: [system.id] }),
    finding("temporary-foreign", { roleIds: ["foreign-role"] }),
    finding("ownership-exception-foreign", { processIds: ["foreign-process"] }),
  ]) {
    const result = review(item);
    assert.deepEqual(result.actions, [{ label: "Explore in Discovery", href: "/studio/discovery" }]);
    assert.doesNotMatch(JSON.stringify(result.actions), /foreign-/);
  }
});

test("missing stable identities never fall back to friendly keys or invented Role/System editors", () => {
  const withoutStableKeys = { ...data, roles: [{ ...role, stableKey: null }], systems: [{ ...system, stableKey: null }] };
  for (const item of [
    finding("vacant-coordinator", { roleIds: [role.id] }),
    finding("ownership-system-queue", { systemIds: [system.id] }),
  ]) {
    assert.deepEqual(review(item, { data: withoutStableKeys, canDiscover: false }).actions, []);
  }
});

test("Discovery only carries a verified Process and unknown finding types do not gain arbitrary editors", () => {
  const unknown = finding("future-finding-type", { processIds: [process.id], roleIds: [role.id], systemIds: [system.id] });
  assert.deepEqual(review(unknown).actions, [{ label: "Explore in Discovery", href: `/studio/discovery?process=${encodeURIComponent(process.id)}` }]);
  assert.deepEqual(review(finding("future-unscoped-finding")).actions, [{ label: "Explore in Discovery", href: "/studio/discovery" }]);
});

test("all affected Process links are resolved from the same-tenant projection without inventing names", () => {
  const item = finding("vacant-coordinator", { processIds: [process.id, "foreign-process", otherProcess.id], roleIds: [role.id] });
  const result = review(item);
  assert.deepEqual(result.processLinks, [
    { name: process.name, href: `/explorer/${encodeURIComponent(process.id)}` },
    { name: otherProcess.name, href: `/explorer/${encodeURIComponent(otherProcess.id)}` },
  ]);
  assert.deepEqual(review(item, noCapabilities).processLinks, result.processLinks, "Read-only Process exploration does not grant Studio authoring");
  assert.doesNotMatch(JSON.stringify(result.processLinks), /foreign-process/);
});

test("unstaffed Step findings explain the old assignment basis without labelling every responsibility gap legacy", () => {
  const item = finding("responsibility-printing", { processIds: [process.id], facts: [{ label: "Unstaffed", value: 2 }] });
  assert.match(review(item).note, /older assignment records/i);
  assert.match(review(item).note, /(?:may not|does not|won.t|will not).*clear/i);
  assert.equal(review({ ...item, facts: [{ label: "Unstaffed", value: 0 }, { label: "Unclear", value: 1 }] }).note, null);
  assert.equal(review({ ...item, facts: [{ label: "Retired", value: 1 }] }).note, null);
});

test("building review navigation does not mutate findings, evidence, or the operating-model projection", () => {
  const items = [finding("ownership-process-printing", { processIds: [process.id] }), finding("vacant-coordinator", { roleIds: [role.id] })];
  const before = JSON.stringify({ items, data });
  const result = buildFlowReviewActions({ findings: items, data, ...allCapabilities });
  assert.equal(JSON.stringify({ items, data }), before);
  assert.deepEqual(Object.keys(result), items.map(item => item.id));
  assert.doesNotMatch(JSON.stringify(result), /mark.?resolved|approve|apply.?proposal/i);
});
