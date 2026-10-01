import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/studio/discovery/discovery-analyst-interview.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const process = {
  purpose: "Fictional printing", trigger: "A request arrives", endBoundary: "Collection",
  participants: ["Fictional service team"], ownerRole: "Possible queue coordinator",
  steps: ["Review the request", "Prepare the print run"], systems: ["Fictional request tracker"],
  handoffs: ["Service team passes output to collection staff"], alternatePaths: [], approvals: [], dependencies: [], exceptions: [],
};
const turn = {
  providerKey: "openai", suggestion: { id: "suggestion-a", answered: false, text: "Who checks priority changes?", rationale: "Check an unresolved handoff." },
  snapshot: { process, narrative: "The fictional team reviews printing requests.", acknowledgement: "Thank you.",
    clear: ["Requests arrive in the tracker"], conflicts: [], needsValidation: [], participantsNeeded: [],
    suggestedEpistemicState: "known" },
};
function nodes(element, predicate) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap((item) => nodes(item, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
}
function box(tag) {
  return function Primitive({ children, tone, variant, size, dot, ...props }) { void tone; void variant; void size; void dot; return React.createElement(tag, props, children); };
}

function harness(overrides = {}, pending = false) {
  const states = [];
  let cursor = 0;
  const calls = [];
  const actions = new Proxy({}, { get(target, name) { return target[name] ??= (...args) => { calls.push([name, args]); throw new Error("Reviewing saved understanding must not call an action"); }; } });
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    require(id) {
      if (id === "react") return { ...React,
        useActionState: (action, initial) => [initial, action, pending], useEffect: () => {},
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
          return [states[index], next => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
        },
      };
      if (id === "react-dom") return { useFormStatus: () => ({ pending: false }) };
      if (id.endsWith("/primitives")) return { Alert: box("aside"), Badge: box("span"), Button: box("button"), Card: box("section"), FieldLabel: box("span"), Select: box("select") };
      if (id === "./action-state") return { initialDiscoveryActionState: { status: "idle", message: "" } };
      if (id === "./actions") return actions;
      return require(id);
    },
  });
  const props = { turn, sessionId: "session-a", revision: 7, observations: [], ...overrides };
  const render = () => { cursor = 0; return loaded.exports.DiscoveryAnalystInterview(props); };
  function choose(label) { nodes(render(), node => node.props?.children === label && node.props?.onClick)[0].props.onClick(); }
  function details() {
    const component = nodes(render(), node => node.type?.name === "PeopleAndWorkMentioned")[0];
    return component ? component.type(component.props) : null;
  }
  function correctionWrapper() { return nodes(render(), node => node.type === "div" && node.key === `${props.sessionId}:${props.turn?.suggestion.id}`)[0]; }
  return { props, render, choose, details, correctionWrapper, actions, calls, html: () => renderToStaticMarkup(render()) };
}

test("reviewing understanding reveals only saved mentions in collapsed help without requesting AI or assigning relationships", () => {
  const before = JSON.stringify(turn);
  const view = harness();
  assert.equal(view.details(), null);
  view.choose("Review understanding");
  const details = view.details();
  assert.equal(details.type, "details");
  assert.notEqual(details.props.open, true);
  const html = renderToStaticMarkup(details);
  for (const content of ["People and work mentioned", "People and participants", "Possible owner responsibility", "Steps mentioned", "Systems mentioned", "Handoffs mentioned", ...process.participants, process.ownerRole, ...process.steps, ...process.systems, ...process.handoffs]) assert.ok(html.includes(content), content);
  assert.match(html, /Working interpretation/);
  assert.match(html, /not confirmed relationships or assignments/);
  assert.equal(nodes(details, node => node.type === "form" || node.props?.onClick || node.props?.action).length, 0);
  assert.equal(view.calls.length, 0);
  assert.equal(JSON.stringify(turn), before);
});

test("empty saved groups are omitted rather than filled with inferred participants or responsibilities", () => {
  const empty = { ...process, participants: [], ownerRole: null, steps: [], systems: [], handoffs: [] };
  const none = harness({ turn: { ...turn, snapshot: { ...turn.snapshot, process: empty } } });
  none.choose("Review understanding");
  assert.equal(none.details(), null);
  const partial = harness({ turn: { ...turn, snapshot: { ...turn.snapshot, process: { ...empty, systems: ["Fictional tracker"] } } } });
  partial.choose("Review understanding");
  const html = renderToStaticMarkup(partial.details());
  assert.match(html, /Systems mentioned/);
  assert.doesNotMatch(html, /People and participants|Possible owner responsibility|Steps mentioned|Handoffs mentioned/);
  assert.equal(none.calls.length + partial.calls.length, 0);
});

test("fallback context stays distinguishable from AI synthesis and saved text is escaped", () => {
  const view = harness({ turn: { ...turn, providerKey: "deterministic-analyst-fallback", snapshot: { ...turn.snapshot, process: { ...process, participants: ['<script>alert("fictional")</script>'] } } } });
  view.choose("Review understanding");
  const html = view.html();
  assert.match(html, /Saved interview context/);
  assert.match(html, /not a new AI synthesis/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.equal(view.calls.length, 0);
});

for (const sessionKind of ["process", "inquiry"]) test(`${sessionKind}: correction reuses the existing scoped action and is accessible from understanding and validation`, () => {
  const view = harness({ sessionKind, ...(sessionKind === "inquiry" ? { inquiryId: "inquiry-a" } : {}) });
  assert.equal(view.correctionWrapper().props.hidden, true);
  view.choose("Review understanding");
  const wrapper = view.correctionWrapper();
  assert.equal(wrapper.props.hidden, false);
  const forms = nodes(wrapper, node => node.type === "form");
  assert.equal(forms.length, 1);
  assert.strictEqual(forms[0].props.action, view.actions[sessionKind === "inquiry" ? "correctInquiryDiscoveryAnalystAction" : "correctDiscoveryAnalystAction"]);
  const html = renderToStaticMarkup(wrapper);
  assert.match(html, /name="sessionId"[^>]*value="session-a"/);
  assert.match(html, /name="expectedRevision"[^>]*value="7"/);
  if (sessionKind === "inquiry") assert.match(html, /name="inquiryId"[^>]*value="inquiry-a"/);
  else assert.doesNotMatch(html, /name="inquiryId"/);
  assert.match(html, /name="epistemicState"/);
  assert.match(html, /name="responseText"[^>]*required=""/);
  assert.match(html, /Your correction is saved as evidence; it does not change the documented work/);
  const details = nodes(wrapper, node => node.type === "details")[0];
  assert.notEqual(details.props.open, true);
  const validationButton = nodes(view.render(), node => node.props?.onClick && typeof node.props.children !== "string" && node.type?.name === "ReviewButton").find(node => renderToStaticMarkup(node).includes("Validation items"));
  assert.ok(validationButton);
  validationButton.props.onClick();
  assert.equal(view.correctionWrapper().props.hidden, false);
  assert.equal(view.correctionWrapper().key, wrapper.key);
  assert.equal(view.calls.length, 0);
});

test("the correction form remains mounted across review tabs, and only a new turn changes its key", () => {
  const view = harness();
  view.choose("Review understanding");
  const before = view.correctionWrapper();
  const textarea = nodes(before, node => node.type === "textarea")[0];
  assert.equal(textarea.props.value, undefined, "the unsent correction is uncontrolled, not overwritten on review toggles");
  view.choose("Review understanding");
  const hidden = view.correctionWrapper();
  assert.equal(hidden.key, before.key);
  assert.equal(hidden.props.hidden, true);
  assert.equal(nodes(hidden, node => node.type === "textarea").length, 1);
  view.choose("Review understanding");
  assert.equal(view.correctionWrapper().key, before.key);
  view.props.turn = { ...turn, suggestion: { ...turn.suggestion, id: "suggestion-b" } };
  assert.notEqual(view.correctionWrapper().key, before.key);
  assert.equal(view.calls.length, 0);
});

test("pending AI work keeps correction disabled and no-turn review invents no mentions or correction action", () => {
  const busy = harness({}, true);
  busy.choose("Review understanding");
  const submit = nodes(busy.correctionWrapper(), node => node.props?.type === "submit")[0];
  assert.equal(submit.props.disabled, true);
  const none = harness({ turn: null });
  none.choose("Review understanding");
  assert.equal(none.details(), null);
  assert.equal(none.correctionWrapper(), undefined);
  assert.equal(busy.calls.length + none.calls.length, 0);
});
