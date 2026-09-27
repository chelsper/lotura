import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = await readFile(new URL("../app/ui/searchable-select.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const options = [
  { value: "person-alex", label: "Alex Example — Coordinator (Fictional Services)" },
  { value: "person-jose", label: "José Example — Director (Fictional Library)" },
  { value: "person-morgan", label: "Morgan Example — Coordinator (Fictional Library)" },
];
const Input = props => React.createElement("input", props);
const RequiredMark = () => React.createElement("span", null, " *");

function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
const find = (tree, predicate) => elements(tree).find(predicate);
const select = tree => find(tree, node => node.type === "select");
const search = tree => find(tree, node => node.type === Input);
const choices = tree => elements(select(tree)).filter(node => node.type === "option" && node.props.value);
const values = tree => choices(tree).map(node => node.props.value);
const textContent = node => node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(textContent).join("") : typeof node === "object" ? textContent(node.props?.children) : String(node);

function harness(overrides = {}) {
  let props = { label: "Person", name: "personStableKey", options, placeholder: "Choose a person", ...overrides };
  const hooks = [];
  const pendingEffects = [];
  const deferredTimers = [];
  const listeners = new Map();
  const registrations = [];
  let cursor = 0;
  const form = {
    addEventListener(type, callback) { listeners.set(type, callback); registrations.push(["add", type]); },
    removeEventListener(type, callback) { if (listeners.get(type) === callback) listeners.delete(type); registrations.push(["remove", type]); },
  };
  const nativeSelect = { form, value: "" };
  const flushTimers = () => { for (const callback of deferredTimers.splice(0)) callback(); };
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    setTimeout(callback, delay) { assert.equal(delay, 0); deferredTimers.push(callback); return deferredTimers.length; },
    require(id) {
      if (id === "react") return {
        ...React,
        useId: () => "searchable-person",
        useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
        useState(initial) {
          const index = cursor++;
          if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
          return [hooks[index], next => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; }];
        },
        useEffect(effect, dependencies) {
          const index = cursor++;
          if (hooks[index] && dependencies.every((value, i) => Object.is(value, hooks[index].dependencies[i]))) return;
          pendingEffects.push(() => {
            hooks[index]?.cleanup?.();
            hooks[index] = { dependencies, cleanup: effect() };
          });
        },
      };
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "./primitives") return { Input, RequiredMark };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  function render(next = {}) {
    props = { ...props, ...next };
    cursor = 0;
    const tree = loaded.exports.SearchableSelect(props);
    nativeSelect.value = select(tree).props.value;
    select(tree).props.ref.current = nativeSelect;
    for (const effect of pendingEffects.splice(0)) effect();
    return tree;
  }
  return {
    render, registrations, nativeSelect, flushTimers,
    reset({ canceled = false, nativeValue = "", flush = true } = {}) {
      assert.ok(listeners.has("reset"));
      const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      listeners.get("reset")(event);
      // Another form listener can cancel reset after this component's listener.
      if (canceled) event.preventDefault();
      // Browser default behavior completes before deferred zero-delay timers.
      if (!event.defaultPrevented) nativeSelect.value = nativeValue;
      if (flush) flushTimers();
      return event;
    },
    unmount() { for (const hook of hooks) hook?.cleanup?.(); },
    listenerCount: () => listeners.size,
    query(query) {
      let stopped = false;
      search(render()).props.onChange({ target: { value: query }, stopPropagation() { stopped = true; } });
      assert.equal(stopped, true, "Search typing must not trigger a parent form's change handler");
      return render();
    },
    choose(value) { select(render()).props.onChange({ target: { value } }); return render(); },
  };
}

test("search matches name, job title and Unit words without case, accent or order sensitivity", () => {
  const h = harness();
  for (const [query, expected] of [
    ["alex", ["person-alex"]],
    ["coordinator", ["person-alex", "person-morgan"]],
    ["library", ["person-jose", "person-morgan"]],
    ["LIBRARY JOSE", ["person-jose"]],
    ["director — josé", ["person-jose"]],
    ["fictional coordinator library", ["person-morgan"]],
    ["  ", options.map(option => option.value)],
  ]) assert.deepEqual(values(h.query(query)), expected, query);
});

test("filtering never chooses the first match, emits a selection change, or creates a submitted search field", () => {
  const changes = [];
  const h = harness({ onChange: event => changes.push(event.target.value) });
  for (const query of ["alex", "unknown person", "library", ""]) {
    const tree = h.query(query);
    assert.equal(select(tree).props.value, "");
    assert.equal(search(tree).props.name, undefined);
    assert.equal(search(tree).props.required, undefined);
    assert.deepEqual(changes, []);
  }
  h.choose("person-jose");
  assert.deepEqual(changes, ["person-jose"]);
  assert.equal(select(h.render()).props.value, "person-jose");
});

test("a filtered-out selection stays explicit and unchanged until the participant chooses another", () => {
  const h = harness({ defaultValue: "person-alex" });
  const tree = h.query("library");
  assert.equal(select(tree).props.value, "person-alex");
  assert.deepEqual(values(tree), ["person-alex", "person-jose", "person-morgan"]);
  assert.match(textContent(choices(tree)[0]), /current selection/);
  assert.match(textContent(tree), /Your current selection is unchanged/);
  assert.equal(values(h.query("alex")).filter(value => value === "person-alex").length, 1);
  assert.equal(select(h.choose("person-morgan")).props.value, "person-morgan");
});

test("no matches and empty lists retain a blank placeholder rather than arbitrary submitted identities", () => {
  const emptyContent = React.createElement("button", { type: "button" }, "Create someone new");
  const h = harness({ emptyContent });
  assert.equal(find(h.render(), node => node === emptyContent), undefined);
  const unmatched = h.query("not recorded");
  assert.equal(select(unmatched).props.value, "");
  assert.deepEqual(values(unmatched), []);
  assert.equal(find(unmatched, node => node === emptyContent), emptyContent);
  assert.match(textContent(unmatched), /No matches/);
  const empty = harness({ options: [], emptyContent }).render();
  assert.equal(select(empty).props.value, "");
  assert.deepEqual(values(empty), []);
  assert.match(renderToStaticMarkup(empty), /<option value="" selected="">Choose a person<\/option>/);
});

test("native select identity, validation, disabled and accessible label semantics are preserved", () => {
  const tree = harness({ id: "person-choice", form: "assignment-form", required: true, disabled: true, "aria-describedby": "assignment-help" }).render();
  const field = select(tree);
  assert.equal(field.props.name, "personStableKey");
  assert.equal(field.props.form, "assignment-form");
  assert.equal(field.props.required, true);
  assert.equal(field.props.disabled, true);
  assert.equal(search(tree).props.disabled, true);
  assert.equal(search(tree).props["aria-controls"], "person-choice");
  assert.equal(search(tree).props["aria-label"], "Search Person");
  assert.equal(field.props["aria-describedby"], "person-choice-matches assignment-help");
  const label = find(tree, node => node.type === "label");
  assert.equal(label.props.htmlFor, "person-choice");
  assert.ok(find(label, node => node.type === RequiredMark));
  const html = renderToStaticMarkup(tree);
  assert.match(html, /<select[^>]*name="personStableKey"[^>]*required=""/);
  assert.doesNotMatch(html, /role="(?:combobox|listbox)"/);
});

test("Enter while searching does not submit the surrounding form and composition is left alone", () => {
  const input = search(harness().render());
  let prevented = 0;
  const key = (key, isComposing = false) => input.props.onKeyDown({ key, nativeEvent: { isComposing }, preventDefault() { prevented += 1; } });
  key("Enter");
  assert.equal(prevented, 1);
  key("ArrowDown");
  key("Enter", true);
  assert.equal(prevented, 1);
});

test("native form reset restores the original selection and clears filtering without a selection callback", () => {
  const changes = [];
  const h = harness({ defaultValue: "person-alex", onChange: event => changes.push(event.target.value) });
  h.choose("person-jose");
  h.query("coordinator");
  h.reset();
  const tree = h.render();
  assert.equal(search(tree).props.value, "");
  assert.equal(select(tree).props.value, "person-alex");
  assert.deepEqual(values(tree), options.map(option => option.value));
  assert.deepEqual(changes, ["person-jose"]);
  assert.deepEqual(h.registrations, [["add", "reset"]]);
  h.unmount();
  assert.equal(h.listenerCount(), 0);
  assert.deepEqual(h.registrations.at(-1), ["remove", "reset"]);
});

test("reset restores the native select after browser reset even when React state and default have not changed", () => {
  for (const defaultValue of ["person-alex", ""]) {
    const changes = [];
    const h = harness({ defaultValue, onChange: event => changes.push(event.target.value) });
    h.render();
    assert.equal(h.nativeSelect.value, defaultValue);
    const nativeValue = defaultValue ? "" : "person-alex";
    h.reset({ nativeValue, flush: false });
    assert.equal(h.nativeSelect.value, nativeValue, "Native reset runs before the queued correction");
    h.flushTimers();
    assert.equal(h.nativeSelect.value, defaultValue, "DOM value must recover without depending on a React re-render");
    assert.deepEqual(changes, []);
    assert.equal(select(h.render()).props.value, defaultValue);
  }
});

test("a canceled native reset preserves the search, current selection and DOM value", () => {
  const changes = [];
  const h = harness({ defaultValue: "person-alex", onChange: event => changes.push(event.target.value) });
  h.choose("person-jose");
  h.query("library");
  const event = h.reset({ canceled: true, flush: false });
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.nativeSelect.value, "person-jose");
  h.flushTimers();
  assert.equal(h.nativeSelect.value, "person-jose");
  const tree = h.render();
  assert.equal(select(tree).props.value, "person-jose");
  assert.equal(search(tree).props.value, "library");
  assert.deepEqual(changes, ["person-jose"]);
});

test("reset checks the current option identities before restoring a removed default", () => {
  const h = harness({ defaultValue: "person-alex" });
  h.render();
  h.render({ options: options.slice(1) });
  h.reset({ nativeValue: "person-jose" });
  assert.equal(h.nativeSelect.value, "");
  assert.equal(select(h.render()).props.value, "");
});

test("controlled selections remain owned by the parent through rejected changes, cancellation and resets", () => {
  const changes = [];
  const h = harness({ value: "person-alex", onChange: event => changes.push(event.target.value) });
  assert.equal(select(h.choose("person-jose")).props.value, "person-alex", "Unaccepted selection cannot override controlled identity");
  assert.deepEqual(changes, ["person-jose"]);
  assert.equal(select(h.render({ value: "person-jose" })).props.value, "person-jose");
  h.query("alex");
  h.reset();
  assert.equal(search(h.render()).props.value, "");
  assert.equal(select(h.render()).props.value, "person-jose");
  assert.equal(select(h.render({ value: "" })).props.value, "", "Parent cancellation clears the selected identity");
});

test("unknown or removed selected identities render blank and cannot appear as arbitrary options", () => {
  for (const selection of [{ defaultValue: "foreign-person" }, { value: "foreign-person" }]) {
    const tree = harness(selection).render();
    assert.equal(select(tree).props.value, "");
    assert.equal(values(tree).includes("foreign-person"), false);
  }
  const h = harness({ defaultValue: "person-alex" });
  assert.equal(select(h.render()).props.value, "person-alex");
  const removed = h.render({ options: options.slice(1) });
  assert.equal(select(removed).props.value, "");
  assert.equal(values(removed).includes("person-alex"), false);
});
