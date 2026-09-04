import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/studio/discovery/actions.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadActions(result) {
  const calls = [];
  const paths = [];
  const refresh = async (input) => { calls.push(input); return result; };
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "next/cache") return { revalidatePath: (path) => paths.push(path) };
      if (name === "@/lib/discovery-analyst-administration") return { refreshDiscoveryAnalyst: refresh };
      if (name === "@/lib/discovery-inquiry-analyst-administration") return { refreshInquiryDiscoveryAnalyst: refresh };
      return new Proxy({}, {
        get(_, key) { throw new Error(`Unexpected dependency: ${name}.${String(key)}`); },
      });
    },
  });
  return { actions: exports, calls, paths };
}

for (const kind of ["process", "inquiry"]) {
  const actionName = kind === "process" ? "refreshDiscoveryAnalystAction" : "refreshInquiryDiscoveryAnalystAction";
  const path = kind === "process"
    ? "/studio/discovery/interviews/session-id"
    : "/studio/discovery/inquiries/inquiry-id/interviews/session-id";

  for (const focus of ["continue", "synthesize"]) {
    test(`${kind} analyst ${focus} returns errors instead of silently redirecting`, async () => {
      const message = "The interview changed. Reload before refreshing the analyst.";
      const { actions, calls, paths } = loadActions({ ok: false, message });
      const form = new FormData();
      form.set("sessionId", "session-id");
      form.set("inquiryId", "inquiry-id");
      form.set("expectedRevision", "7");
      form.set("focus", focus);
      const state = await actions[actionName]({ status: "idle", message: "" }, form);
      assert.equal(state.status, "error");
      assert.equal(state.message, message);
      assert.equal(calls.length, 1);
      assert.deepEqual({ ...calls[0] }, { expectedRevision: 7, focus, sessionId: "session-id" });
      assert.deepEqual(paths, []);
    });

    test(`${kind} analyst ${focus} refreshes the page data and returns completion feedback`, async () => {
      const message = "Lotura refreshed its working understanding.";
      const { actions, calls, paths } = loadActions({ ok: true, message });
      const form = new FormData();
      form.set("sessionId", "session-id");
      form.set("inquiryId", "inquiry-id");
      form.set("expectedRevision", "7");
      form.set("focus", focus);
      const state = await actions[actionName]({ status: "error", message: "Previous failure" }, form);
      assert.equal(state.status, "success");
      assert.equal(state.message, message);
      assert.equal(calls.length, 1);
      assert.deepEqual(paths, [path]);
    });
  }
}
