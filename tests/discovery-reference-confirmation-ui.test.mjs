import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/studio/discovery/discovery-reference-confirmation-table.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const candidate = (kind, index, decision = null) => ({
  kind, kindLabel: kind === "operational_role" ? "Operational Role" : kind === "person_capacity" ? "Person in a capacity" : kind,
  mentionSequence: index + 1, observationSequence: 3, mentionText: `Fictional mention ${index}`,
  sourceFingerprint: `fingerprint-${index}`, sourceObservationId: `observation-${index}`,
  suggestedTargetKey: `${kind}:identity-${index}`,
  options: [{ key: `${kind}:identity-${index}`, label: `Fictional match ${index}`, context: `Recorded context ${index}` },
    { key: `${kind}:other-${index}`, label: `Other fictional match ${index}`, context: `Other recorded context ${index}` }], decision,
});
const unit = candidate("organization_unit", 0);
const role = candidate("operational_role", 1);
const person = {
  ...candidate("person_capacity", 2, { id: "decision-person", disposition: "confirmed", selectedTargetKey: "person_capacity:person-a:position-a:role-a" }),
  suggestedTargetKey: "person_capacity:person-a:position-a:role-a",
  options: [{ key: "person_capacity:person-a:position-a:role-a", label: "Fictional Alex — Coordinator — Queue review", context: "Recorded person, Position and responsibility" }],
};
const policy = { ...candidate("policy", 3), options: [], suggestedTargetKey: null };
const family = candidate("process_family", 4, { id: "decision-family", disposition: "unresolved", selectedTargetKey: null });

function nodes(element, predicate) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap((item) => nodes(item, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
}
const field = (tree, name) => nodes(tree, (node) => node.props?.name === name)[0];
const select = (tree, label) => nodes(tree, (node) => node.props?.["aria-label"] === label)[0];
const row = (tree, fingerprint) => nodes(tree, (node) => node.type === "tr" && node.key === fingerprint)[0];
function box(tag) {
  return function Primitive({ children, tone, variant, ...props }) { void tone; void variant; return React.createElement(tag, props, children); };
}

function harness({ candidates = [unit, role, person, policy, family], pending = false, actionState = { status: "idle", message: "" } } = {}) {
  let stored;
  const calls = [];
  const action = (...args) => { calls.push(args); throw new Error("Rendering must not save reference decisions"); };
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    require(id) {
      if (id === "react") return {
        ...React, useActionState: () => [actionState, action, pending], useMemo: callback => callback(),
        useState(initial) { stored ??= typeof initial === "function" ? initial() : initial; return [stored, next => { stored = typeof next === "function" ? next(stored) : next; }]; },
      };
      if (id.endsWith("/primitives")) return { Alert: box("aside"), Badge: box("span"), Button: box("button"), Card: box("section"), Select: box("select") };
      if (id === "./action-state") return { initialDiscoveryActionState: { status: "idle", message: "" } };
      if (id === "./actions") return { saveInquiryReferenceConfirmationsAction: action };
      return require(id);
    },
  });
  const props = { candidates, inquiryId: "inquiry-a", sessionId: "session-a", runId: "run-a" };
  const render = () => loaded.exports.DiscoveryReferenceConfirmationTable(props);
  return { render, calls, action, html: () => renderToStaticMarkup(render()) };
}

test("confirmation keeps typed evidence keys, exact identities, and count semantics unchanged", () => {
  const view = harness();
  const tree = view.render();
  assert.equal(field(tree, "inquiryId").props.value, "inquiry-a");
  assert.equal(field(tree, "sessionId").props.value, "session-a");
  assert.equal(field(tree, "decisionCount").props.value, 3);
  for (const [index, expected] of [unit, role, policy].entries()) {
    for (const [name, value] of Object.entries({
      kind: expected.kind, mentionSequence: expected.mentionSequence, mentionText: expected.mentionText,
      runId: "run-a", sourceFingerprint: expected.sourceFingerprint, sourceObservationId: expected.sourceObservationId,
      targetKey: expected.suggestedTargetKey ?? "", disposition: expected.suggestedTargetKey ? "confirmed" : "unresolved",
    })) assert.equal(field(tree, `decision.${index}.${name}`).props.value, value);
  }
  assert.strictEqual(nodes(tree, node => node.type === "form")[0].props.action, view.action);
  assert.equal(view.calls.length, 0);
});

test("an initial suggested match is not represented as a saved human decision", () => {
  const view = harness();
  const suggestedHtml = renderToStaticMarkup(row(view.render(), role.sourceFingerprint));
  assert.match(suggestedHtml, /not saved|unsaved|save to confirm/i);
  assert.doesNotMatch(suggestedHtml, /Reference decisions saved/);
  assert.match(view.html(), /Save 3 decisions/);
  assert.equal(view.calls.length, 0);
});

test("editing a saved decision appends it to the outgoing correction batch without changing its evidence identity", () => {
  const view = harness();
  assert.equal(field(view.render(), "decisionCount").props.value, 3);
  select(view.render(), `Decision for ${person.mentionText}`).props.onChange({ target: { value: "unresolved" } });
  const tree = view.render();
  assert.equal(field(tree, "decisionCount").props.value, 4);
  assert.equal(field(tree, "decision.2.kind").props.value, "person_capacity");
  assert.equal(field(tree, "decision.2.disposition").props.value, "unresolved");
  assert.equal(field(tree, "decision.2.targetKey").props.value, "");
  assert.equal(field(tree, "decision.2.sourceFingerprint").props.value, person.sourceFingerprint);
  assert.equal(field(tree, "decision.2.sourceObservationId").props.value, person.sourceObservationId);
  const changedRow = renderToStaticMarkup(row(tree, person.sourceFingerprint));
  assert.match(changedRow, /not saved|unsaved|save to confirm/i);
  assert.match(changedRow, /prior|previous|correction|history/i);
  assert.equal(view.calls.length, 0);
});

test("changing a match preserves the exact typed target while rejecting or leaving unresolved clears it", () => {
  const view = harness({ candidates: [role] });
  select(view.render(), `Match for ${role.mentionText}`).props.onChange({ target: { value: role.options[1].key } });
  assert.equal(field(view.render(), "decision.0.targetKey").props.value, role.options[1].key);
  assert.equal(field(view.render(), "decision.0.kind").props.value, "operational_role");
  select(view.render(), `Decision for ${role.mentionText}`).props.onChange({ target: { value: "rejected" } });
  assert.equal(field(view.render(), "decision.0.targetKey").props.value, "");
  assert.equal(field(view.render(), "decision.0.disposition").props.value, "rejected");
  assert.equal(select(view.render(), `Match for ${role.mentionText}`).props.disabled, true);
  assert.equal(view.calls.length, 0);
});

test("person confirmation retains separate Person, Position and responsibility identities rather than reducing them to a name", () => {
  const unsaved = { ...person, decision: null };
  const view = harness({ candidates: [unsaved] });
  assert.equal(field(view.render(), "decision.0.kind").props.value, "person_capacity");
  assert.equal(field(view.render(), "decision.0.targetKey").props.value, "person_capacity:person-a:position-a:role-a");
  assert.match(view.html(), /person/i);
  assert.match(view.html(), /capacity|job title|Position/i);
  assert.equal(view.calls.length, 0);
});

test("unmatched policy wording remains unresolved without a fabricated typed identity", () => {
  const view = harness({ candidates: [policy] });
  const tree = view.render();
  assert.equal(select(tree, `Match for ${policy.mentionText}`), undefined);
  const decisions = select(tree, `Decision for ${policy.mentionText}`);
  assert.deepEqual(nodes(decisions, node => node.type === "option").map(node => node.props.value), ["unresolved", "rejected"]);
  assert.equal(field(tree, "decision.0.targetKey").props.value, "");
  assert.match(view.html(), /Keep unresolved/);
  assert.match(view.html(), /Keep it unresolved and continue the interview/);
});

test("saved-only and pending tables cannot submit another decision batch, while errors stay visible", () => {
  const saved = harness({ candidates: [person, family] });
  assert.equal(field(saved.render(), "decisionCount").props.value, 0);
  assert.equal(nodes(saved.render(), node => node.props?.type === "submit")[0].props.disabled, true);
  assert.match(saved.html(), /saved/i);
  const pending = harness({ pending: true });
  assert.equal(nodes(pending.render(), node => node.props?.type === "submit")[0].props.disabled, true);
  const error = harness({ actionState: { status: "error", message: "Fictional save failed safely." } });
  assert.match(error.html(), /Fictional save failed safely/);
  assert.equal(saved.calls.length + pending.calls.length + error.calls.length, 0);
});

test("saved confirmed, rejected and unresolved decisions remain distinct from unsaved suggestions", () => {
  const rejected = { ...role, decision: { id: "decision-role", disposition: "rejected", selectedTargetKey: null } };
  const view = harness({ candidates: [person, rejected, family] });
  for (const [reference, status] of [[person, "Match saved for review"], [rejected, "Rejection saved"], [family, "Saved as unresolved"]]) {
    const html = renderToStaticMarkup(row(view.render(), reference.sourceFingerprint));
    assert.ok(html.includes(status));
    assert.doesNotMatch(html, /not saved yet/);
  }
  assert.equal(field(view.render(), "decisionCount").props.value, 0);
  assert.equal(view.calls.length, 0);
});

test("plain-language reference explanations preserve all canonical kind values", () => {
  const types = [
    ["organization_unit", "Organization Unit"], ["operational_role", "Responsibility"],
    ["person_capacity", "Person and their work"], ["system", "System"],
    ["process", "Process"], ["process_family", "Process family"],
    ["policy", "Policy or governing document"], ["other", "Other reference"],
  ];
  const candidates = types.map(([kind], index) => candidate(kind, index));
  const view = harness({ candidates });
  const tree = view.render();
  assert.equal(field(tree, "decisionCount").props.value, types.length);
  for (const [index, [kind, label]] of types.entries()) {
    assert.equal(field(tree, `decision.${index}.kind`).props.value, kind);
    assert.equal(field(tree, `decision.${index}.targetKey`).props.value, candidates[index].suggestedTargetKey);
    assert.ok(renderToStaticMarkup(row(tree, candidates[index].sourceFingerprint)).includes(label));
  }
  assert.match(view.html(), /not an employee’s job title/);
  assert.match(view.html(), /not their steps/);
  assert.match(view.html(), /not a parent process/);
  assert.equal(view.calls.length, 0);
});

test("no candidates renders nothing and reference rendering does not mutate source evidence", () => {
  const empty = harness({ candidates: [] });
  assert.equal(empty.render(), null);
  const before = JSON.stringify([unit, role, person, policy, family]);
  harness().html();
  assert.equal(JSON.stringify([unit, role, person, policy, family]), before);
});
