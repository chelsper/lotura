import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/studio/position-work-discovery-form.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const position = {
  id: "12345678-1234-4123-8123-123456789abc", title: "Fictional Printing Coordinator",
  unit: { id: "22345678-1234-4123-8123-123456789abc", name: "Fictional Campus Services" },
};
const requestId = "32345678-1234-4123-8123-123456789abc";

function nodes(element, predicate) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap(item => nodes(item, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
}
const field = (tree, name) => nodes(tree, node => node.props?.name === name)[0];
function primitive(tag) {
  return function Primitive({ children, tone, variant, ...props }) {
    void tone; void variant;
    return React.createElement(tag, props, children);
  };
}

function harness(overrides = {}) {
  const states = [];
  let cursor = 0;
  let pending = false;
  let result = { status: "idle", message: "" };
  const calls = [];
  const events = [];
  let inTransition = false;
  const action = (...args) => {
    assert.equal(inTransition, true, "Dispatch must occur only within a user-triggered transition");
    events.push("dispatch");
    calls.push(args);
  };
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    FormData: class CapturedFormData {
      constructor(target) { events.push("capture"); this.values = { ...target.values }; }
      get(name) { return this.values[name] ?? null; }
      entries() { return Object.entries(this.values)[Symbol.iterator](); }
    },
    require(id) {
      if (id === "react") return {
        ...React, useId: () => "fictional-fields", useActionState: () => [result, action, pending],
        startTransition(callback) {
          events.push("transition");
          inTransition = true;
          try { callback(); } finally { inTransition = false; }
        },
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
          return [states[index], next => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
        },
      };
      if (id === "../ui/primitives") return {
        Alert: primitive("aside"), Button: primitive("button"), Card: primitive("section"),
        FieldLabel: primitive("span"), Select: primitive("select"),
        RequiredMark: () => React.createElement("span", { "aria-label": "required" }, " *"),
      };
      if (id === "./discovery/action-state") return { initialDiscoveryActionState: result };
      if (id === "./position-work-discovery-actions") return { startPositionWorkDiscoveryAction: action };
      if (id === "react/jsx-runtime") return require(id);
      throw new Error(`Unexpected form dependency: ${id}`);
    },
  });
  const props = { position, requestId, ...overrides };
  const render = () => { cursor = 0; return loaded.exports.PositionWorkDiscoveryForm(props); };
  const change = (name, value) => field(render(), name).props.onChange({ target: { value } });
  return {
    props, render, change, calls, action, events, html: () => renderToStaticMarkup(render()),
    setPending: value => { pending = value; }, setResult: value => { result = value; },
    submit(overrides = {}) {
      const tree = render();
      const values = Object.fromEntries(nodes(tree, node => Boolean(node.props?.name))
        .filter(node => node.props.type !== "radio" || node.props.checked)
        .map(node => [node.props.name, node.props.value]));
      nodes(tree, node => node.type === "form")[0].props.onSubmit({
        preventDefault() { events.push("prevent-default"); },
        currentTarget: { values: { ...values, ...overrides } },
      });
    },
  };
}

test("describing Position work requires a human starting point and explicit involvement, not a Role assignment", () => {
  const view = harness();
  const tree = view.render();
  assert.match(view.html(), /Fictional Printing Coordinator/);
  assert.match(view.html(), /Fictional Campus Services/);
  assert.equal(field(tree, "positionId").props.value, position.id);
  assert.equal(field(tree, "requestId").props.value, requestId);
  assert.equal(field(tree, "workDescription").props.value, "");
  assert.equal(field(tree, "workDescription").props.maxLength, 4000);
  assert.equal(field(tree, "workDescription").props.required, true);
  const involvement = nodes(tree, node => node.props?.name === "involvement");
  assert.deepEqual(involvement.map(node => node.props.value), ["perform", "oversee", "support", "backup", "mixed", "unsure"]);
  assert.ok(involvement.every(node => node.props.required && !node.props.checked));
  assert.equal(field(tree, "epistemicState").props.value, "needs_validation");
  assert.deepEqual(nodes(field(tree, "epistemicState"), node => node.type === "option").map(node => node.props.value), ["known", "assumed", "needs_validation"]);
  assert.match(view.html(), /does not assign responsibility or process ownership/);
  assert.equal(view.calls.length, 0);
});

test("the form preserves exact human wording, selected involvement, and separate Position/request identities", () => {
  const view = harness();
  const description = "  I help check print requests, but priority decisions need someone else to confirm.\nSome days we use a workaround.  ";
  view.change("workDescription", description);
  view.change("involvement", "support");
  view.change("epistemicState", "assumed");
  const tree = view.render();
  const outgoing = Object.fromEntries(nodes(tree, node => Boolean(node.props?.name))
    .filter(node => node.props.type !== "radio" || node.props.checked)
    .map(node => [node.props.name, node.props.value]));
  assert.deepEqual(outgoing, { positionId: position.id, requestId, workDescription: description, involvement: "support", epistemicState: "assumed" });
  const form = nodes(tree, node => node.type === "form")[0];
  assert.equal(form.props.action, undefined, "No React form action that would trigger a native reset");
  assert.equal(form.props.method, "post", "A no-JavaScript submission must not put human evidence in a GET URL");
  assert.equal(view.calls.length, 0);
});

test("the work form explains sensitive-record and noncanonical boundaries without requesting AI consent", () => {
  const view = harness();
  const html = view.html();
  assert.match(html, /Saved as interview notes\. Nothing is assigned or changed/);
  assert.match(html, /Leave out private HR, student, donor, medical, payment, and login details/);
  assert.equal(field(view.render(), "workDescription").props["aria-describedby"], "fictional-fields-privacy");
  assert.match(html, /id="fictional-fields-privacy"/);
  assert.doesNotMatch(html, /name="(?:personId|roleId|organizationId|actorIdentifier|providerConsent|nonConfidentialAuthorized|processId)"/);
  assert.equal(view.calls.length, 0);
});

test("pending save locks the entire editable fieldset and announces progress", () => {
  const view = harness();
  view.setPending(true);
  const tree = view.render();
  assert.equal(nodes(tree, node => node.type === "form")[0].props["aria-busy"], true);
  assert.equal(nodes(tree, node => node.type === "fieldset")[0].props.disabled, true);
  assert.equal(nodes(tree, node => node.props?.type === "submit")[0].props.disabled, true);
  const status = nodes(tree, node => node.props?.role === "status")[0];
  assert.equal(status.props["aria-live"], "polite");
  assert.match(renderToStaticMarkup(status), /Saving your starting point/);
  view.submit();
  assert.deepEqual(view.events, ["prevent-default"], "Pending submissions must not capture or dispatch another request");
  assert.equal(view.calls.length, 0);
});

test("a validation failure preserves the draft, involvement and certainty so the person can correct it", () => {
  const view = harness();
  view.change("workDescription", "Fictional printing work, with a shared queue.");
  view.change("involvement", "mixed");
  view.change("epistemicState", "known");
  view.setResult({ status: "error", message: "Please check the fictional starting point." });
  const tree = view.render();
  assert.equal(field(tree, "workDescription").props.value, "Fictional printing work, with a shared queue.");
  assert.equal(nodes(tree, node => node.props?.name === "involvement" && node.props.checked)[0].props.value, "mixed");
  assert.equal(field(tree, "epistemicState").props.value, "known");
  assert.match(view.html(), /Please check the fictional starting point/);
  assert.equal(view.calls.length, 0);
});

test("explicit submit prevents native reset, captures the exact form and dispatches once in a transition", () => {
  const view = harness();
  view.change("workDescription", "The fictional coordinator checks requests.");
  view.change("involvement", "support");
  view.change("epistemicState", "assumed");
  const form = nodes(view.render(), node => node.type === "form")[0];
  assert.equal(form.props.action, undefined);
  assert.equal(form.props.method, "post");
  assert.equal(view.calls.length, 0);
  view.submit();
  assert.deepEqual(view.events, ["prevent-default", "capture", "transition", "dispatch"]);
  assert.equal(view.calls.length, 1);
  assert.equal(view.calls[0].length, 1);
  assert.deepEqual(Object.fromEntries(view.calls[0][0].entries()), {
    positionId: position.id, requestId, workDescription: "The fictional coordinator checks requests.",
    involvement: "support", epistemicState: "assumed",
  });
  view.setResult({ status: "error", message: "Please check the fictional starting point." });
  assert.equal(field(view.render(), "workDescription").props.value, "The fictional coordinator checks requests.");
  assert.equal(field(view.render(), "epistemicState").props.value, "assumed");
  assert.equal(nodes(view.render(), node => node.props?.name === "involvement" && node.props.checked)[0].props.value, "support");
  assert.equal(view.calls.length, 1, "Rerendering an action error must not dispatch again");
});

test("rendering a Position without a Unit does not invent relationships or mutate domain context", () => {
  const withoutUnit = { ...position, unit: null };
  const before = JSON.stringify(withoutUnit);
  const view = harness({ position: withoutUnit });
  assert.match(view.html(), /Fictional Printing Coordinator/);
  assert.doesNotMatch(view.html(), /Fictional Campus Services/);
  assert.equal(JSON.stringify(withoutUnit), before);
  assert.equal(view.calls.length, 0);
});

const pageCode = ts.transpileModule(await readFile(new URL("../app/studio/organization/positions/[stableKey]/describe-work/page.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function pageHarness({ current = { enabled: true, discovery: { enabled: true }, data: { positions: [{ ...position, status: "active" }] } }, authError } = {}) {
  const events = [];
  let requestNumber = 0;
  const Form = props => React.createElement("div", { "data-request-id": props.requestId });
  const loaded = { exports: {} };
  vm.runInNewContext(pageCode, {
    module: loaded, exports: loaded.exports,
    require(id) {
      if (id === "node:crypto") return { randomUUID() { requestNumber += 1; return requestNumber === 1 ? requestId : "42345678-1234-4123-8123-123456789abc"; } };
      if (id === "next/link") return { default: primitive("a") };
      if (id === "next/navigation") return { notFound() { throw new Error("NEXT_NOT_FOUND"); } };
      if (id === "next/server") return { async connection() { events.push("connection"); } };
      if (id === "@/lib/organization-structure-experience") return {
        async loadWorkspaceStudioExperience() { events.push("authorized-current-position-read"); if (authError) throw authError; return current; },
      };
      if (id.endsWith("/position-work-discovery-form")) return { PositionWorkDiscoveryForm: Form };
      if (id.endsWith("/workspace-shell")) return { WorkspaceShell: ({ children }) => React.createElement("section", null, children) };
      if (id === "react/jsx-runtime") return require(id);
      throw new Error(`Unexpected describe-work page dependency: ${id}`);
    },
  });
  return { page: stableKey => loaded.exports.default({ params: Promise.resolve({ stableKey }) }), events, Form, requestCount: () => requestNumber };
}

test("opening Describe work resolves only the current private Position and creates no saved inquiry or AI request", async () => {
  const view = pageHarness();
  const tree = await view.page(position.id);
  const form = nodes(tree, node => node.type === view.Form)[0];
  assert.deepEqual(JSON.parse(JSON.stringify(form.props.position)), position);
  assert.equal(form.props.requestId, requestId);
  assert.match(renderToStaticMarkup(tree), new RegExp(`href="/studio/organization/positions/${position.id}"`));
  assert.deepEqual(view.events, ["connection", "authorized-current-position-read"]);
  const nextForm = nodes(await view.page(position.id), node => node.type === view.Form)[0];
  assert.notEqual(nextForm.props.requestId, form.props.requestId);
});

test("public, disabled Discovery, inactive or out-of-workspace Positions cannot render the form", async () => {
  for (const current of [
    { enabled: false },
    { enabled: true, discovery: { enabled: false } },
    { enabled: true, discovery: { enabled: true }, data: { positions: [] } },
    { enabled: true, discovery: { enabled: true }, data: { positions: [{ ...position, status: "inactive" }] } },
    { enabled: true, discovery: { enabled: true }, data: { positions: [{ ...position, id: requestId, status: "active" }] } },
  ]) {
    const view = pageHarness({ current });
    await assert.rejects(view.page(position.id), /NEXT_NOT_FOUND/);
    assert.equal(view.requestCount(), 0);
  }
  const authError = new Error("Authentication required");
  const unauthorized = pageHarness({ authError });
  await assert.rejects(unauthorized.page(position.id), error => error === authError);
  assert.equal(unauthorized.requestCount(), 0);
});
