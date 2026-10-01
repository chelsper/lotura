import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = await readFile(new URL("../app/studio/structure-editing-disclosure.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function compile(react = React, environment = {}) {
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, ...environment,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime") return jsxRuntime;
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return loaded.exports.StructureEditingDisclosure;
}

test("editing starts collapsed without unmounting its unchanged forms and history", () => {
  const Component = compile();
  const children = React.createElement("form", { action: "/unchanged-action" }, React.createElement("input", { name: "expectedRevision", defaultValue: "recorded-revision" }), "Existing history");
  const html = renderToStaticMarkup(React.createElement(Component, { label: "Edit job details and view history", editAnchor: "edit-position" }, children));
  assert.match(html, /<details[^>]*>/);
  assert.doesNotMatch(html, /<details[^>]*\bopen=/);
  assert.match(html, /<summary[^>]*>Edit job details and view history<\/summary>/);
  assert.match(html, /<form action="\/unchanged-action"/);
  assert.match(html, /name="expectedRevision" value="recorded-revision"/);
  assert.match(html, /Existing history/);
  assert.doesNotMatch(source, /useState|useActionState|fetch\(|\.submit\(|router/);
});

function harness(hash, { inside = true, innerSummary = true } = {}) {
  const effects = [], listeners = new Map(), frames = new Map();
  let nextFrame = 1, scrolls = 0, innerFocus = 0, outerFocus = 0;
  const target = { scrollIntoView: () => scrolls++, querySelector: () => innerSummary ? { focus: () => innerFocus++ } : null };
  const details = { open: false, contains: current => inside && current === target, querySelector: () => ({ focus: () => outerFocus++ }) };
  const browser = {
    location: { hash },
    requestAnimationFrame: callback => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
  };
  const Component = compile({ ...React, useRef: () => ({ current: details }), useEffect: callback => effects.push(callback) }, {
    window: browser, document: { getElementById: id => ["edit-position", "structure-administration"].includes(id) ? target : null },
  });
  const tree = Component({ editAnchor: "edit-position", label: "Edit job details and view history", children: "mounted forms" });
  const cleanup = effects[0]();
  return {
    tree, details, listeners, frames, cleanup,
    changeHash(value) { browser.location.hash = value; listeners.get("hashchange")?.(); },
    flushFrames() { for (const [id, callback] of frames) { frames.delete(id); callback(); } },
    get scrolls() { return scrolls; }, get innerFocus() { return innerFocus; }, get outerFocus() { return outerFocus; },
  };
}

test("an initial explicit edit deep link opens the disclosure and focuses its unchanged editor", () => {
  const h = harness("#edit-position");
  assert.equal(h.details.open, true);
  h.flushFrames();
  assert.equal(h.scrolls, 1);
  assert.equal(h.innerFocus, 1);
  assert.equal(h.outerFocus, 0);
  assert.equal(h.tree.props.children[1], "mounted forms");
  h.details.open = false;
  assert.equal(h.tree.props.children[1], "mounted forms", "native closing retains the form subtree and its drafts");
  h.cleanup();
  assert.equal(h.listeners.size, 0);
});

test("normal overview links stay collapsed; later edit hashes open with scoped target checks", () => {
  const h = harness("");
  assert.equal(h.details.open, false);
  h.changeHash("#unrelated");
  assert.equal(h.details.open, false);
  h.changeHash("#edit-position");
  assert.equal(h.details.open, true);
  h.flushFrames();
  assert.equal(h.innerFocus, 1);
  h.cleanup();
  const outside = harness("#edit-position", { inside: false });
  assert.equal(outside.details.open, false);
  assert.equal(outside.frames.size, 0);
  outside.cleanup();
});

test("the shared administration anchor also opens and cleanup cancels pending focus", () => {
  const h = harness("#structure-administration", { innerSummary: false });
  assert.equal(h.details.open, true);
  h.flushFrames();
  assert.equal(h.outerFocus, 1);
  h.changeHash("#edit-position");
  assert.equal(h.frames.size, 1);
  h.cleanup();
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
});
