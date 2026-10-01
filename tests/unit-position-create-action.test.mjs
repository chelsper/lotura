import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const unitId = "22345678-1234-4123-8123-123456789abc";
const positionId = "32345678-1234-4123-8123-123456789abc";
const otherUnitId = "42345678-1234-4123-8123-123456789abc";
const source = await readFile(new URL("../app/studio/unit-position-create-action.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const previous = { status: "idle", message: "" };
class FixedDate extends Date {
  constructor(value) { super(value === undefined ? "2026-10-01T15:00:00.000Z" : value); }
  static now() { return new Date("2026-10-01T15:00:00.000Z").getTime(); }
}

function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    title: "Fictional Printing Coordinator", organizationUnitStableKey: unitId,
    changeKind: "organizational_change", effectiveDate: "2026-09-30", reason: "Documenting our current team.",
    ...overrides,
  })) if (value !== undefined) data.set(key, value);
  return data;
}

function harness({
  experience = { enabled: true, data: { units: [{ id: unitId, status: "active", name: "Fictional Campus Services" }] } },
  result = { ok: true, stableKey: positionId, message: "Internal mutation result" },
  loaderError, mutationError, revalidationError,
} = {}) {
  const loaded = { exports: {} };
  const calls = [], revalidated = [], events = [];
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, Date: FixedDate,
    require(id) {
      if (id === "next/cache") return { revalidatePath(path) {
        events.push("revalidate");
        revalidated.push(path);
        if (revalidationError) throw revalidationError;
      } };
      if (id === "@/lib/organization-structure-experience") return { async loadWorkspaceStudioExperience() {
        events.push("authorize");
        if (loaderError) throw loaderError;
        return experience;
      } };
      if (id === "@/lib/organization-structure-administration") return { async createPosition(input) {
        events.push("create");
        calls.push(input);
        if (mutationError) throw mutationError;
        return result;
      } };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return { calls, events, revalidated, exports: loaded.exports,
    run: (data = form()) => loaded.exports.createUnitPositionAction(previous, data) };
}

test("the action exposes only its async server function and does nothing during import", () => {
  const h = harness();
  assert.deepEqual(Object.keys(h.exports), ["createUnitPositionAction"]);
  assert.equal(h.exports.createUnitPositionAction.constructor.name, "AsyncFunction");
  assert.deepEqual(h.events, []);
  assert.match(source, /^"use server"/);
});

test("an authorized exact Unit uses only existing Position creation metadata, never caller authority or relationships", async () => {
  const h = harness();
  const result = await h.run(form({ title: "  Fictional Printing Coordinator  ", reason: "  Documenting our current team.  ",
    organizationId: "999", actorIdentifier: "caller-supplied", personStableKey: positionId,
    managerPositionStableKey: otherUnitId, roleKey: "role:99", processOwner: "true", returnTo: "https://example.invalid" }));
  assert.equal(result.status, "success");
  assert.equal(result.stableKey, positionId);
  assert.equal(result.message, "Job title added to this Unit.");
  assert.equal(result.saveUnconfirmed, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls)), [{
    title: "Fictional Printing Coordinator", organizationUnitStableKey: unitId,
    changeKind: "organizational_change", effectiveAt: "2026-09-30T23:59:59.999Z",
    reason: "Documenting our current team.", acknowledgePossibleDuplicate: false,
  }]);
  assert.deepEqual(h.events.slice(0, 2), ["authorize", "create"]);
  assert.deepEqual(h.revalidated, ["/context", "/organization", "/studio", "/studio/organization", `/studio/organization/units/${unitId}`]);
});

test("today uses the current instant and a human-confirmed duplicate remains explicit", async () => {
  const h = harness();
  await h.run(form({ effectiveDate: "2026-10-01", changeKind: "correction", acknowledgePossibleDuplicate: "confirmed" }));
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].effectiveAt.toISOString(), "2026-10-01T15:00:00.000Z");
  assert.equal(h.calls[0].changeKind, "correction");
  assert.equal(h.calls[0].acknowledgePossibleDuplicate, true);
});

test("invalid, empty, duplicated or non-text fields never reach the mutation", async () => {
  const cases = [
    { title: " " }, { title: "x".repeat(256) }, { reason: " " }, { reason: "x".repeat(2001) },
    { organizationUnitStableKey: "" }, { organizationUnitStableKey: "not-a-stable-key" },
    { changeKind: "approved" }, { changeKind: undefined }, { effectiveDate: undefined },
    { acknowledgePossibleDuplicate: "true" },
  ];
  for (const values of cases) {
    const h = harness();
    const result = await h.run(form(values));
    assert.equal(result.status, "error", JSON.stringify(values));
    assert.equal(result.saveUnconfirmed, undefined);
    assert.deepEqual(h.calls, []);
    assert.deepEqual(h.revalidated, []);
  }
  for (const field of ["title", "organizationUnitStableKey", "changeKind", "reason", "effectiveDate", "acknowledgePossibleDuplicate"]) {
    const h = harness(), data = form({ acknowledgePossibleDuplicate: "confirmed" });
    data.append(field, data.get(field));
    assert.equal((await h.run(data)).status, "error", field);
    assert.equal(h.calls.length, 0);
  }
  const h = harness(), data = form();
  data.set("title", new Blob(["not plain text"]), "fictional.txt");
  assert.equal((await h.run(data)).status, "error");
  assert.equal(h.calls.length, 0);
});

test("invalid calendar dates and future dates are rejected instead of normalized", async () => {
  for (const effectiveDate of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-09-00", "2026-1-01", "yesterday", "2026-10-02", "2026-09-30T12:00:00Z"]) {
    const h = harness();
    assert.equal((await h.run(form({ effectiveDate }))).status, "error", effectiveDate);
    assert.deepEqual(h.calls, []);
  }
  const h = harness();
  assert.equal((await h.run(form({ effectiveDate: "2024-02-29" }))).status, "success");
  assert.equal(h.calls[0].effectiveAt.toISOString(), "2024-02-29T23:59:59.999Z");
});

test("disabled Studio, foreign, inactive, or absent Units cannot be used even with valid form metadata", async () => {
  for (const experience of [
    { enabled: false },
    { enabled: true, data: { units: [] } },
    { enabled: true, data: { units: [{ id: unitId, status: "inactive" }] } },
    { enabled: true, data: { units: [{ id: otherUnitId, status: "active", name: "Same Unit name" }] } },
  ]) {
    const h = harness({ experience });
    const result = await h.run();
    assert.equal(result.status, "error");
    assert.equal(result.saveUnconfirmed, undefined);
    assert.deepEqual(h.events, ["authorize"]);
    assert.deepEqual(h.calls, []);
  }
});

test("authorization loader failure is safe and retryable without claiming an attempted save", async () => {
  const h = harness({ loaderError: new Error("private connection secret") });
  const result = await h.run();
  assert.equal(result.status, "error");
  assert.equal(result.saveUnconfirmed, undefined);
  assert.doesNotMatch(result.message, /private|secret|connection/);
  assert.equal(h.calls.length, 0);
  assert.equal(h.revalidated.length, 0);
});

test("ordinary mutation validation failures preserve their safe message and permit correction without revalidation", async () => {
  for (const code of ["blocked", "conflict", "invalid", "not_found"]) {
    const h = harness({ result: { ok: false, code, message: "Review the existing job title first." } });
    const result = await h.run();
    assert.equal(result.status, "error");
    assert.equal(result.message, "Review the existing job title first.");
    assert.equal(result.saveUnconfirmed, undefined);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.revalidated, []);
  }
});

test("mutation unavailable and thrown results require refresh before another attempt without exposing internals", async () => {
  for (const options of [
    { result: { ok: false, code: "unavailable", message: "secret backend exception" } },
    { mutationError: new Error("secret backend exception") },
  ]) {
    const h = harness(options), result = await h.run();
    assert.equal(result.status, "error");
    assert.equal(result.saveUnconfirmed, true);
    assert.match(result.message, /refresh the roster before trying again/);
    assert.doesNotMatch(result.message, /secret|backend|exception/);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.revalidated, []);
  }
});

test("success without a trustworthy stable key cannot prompt a blind retry", async () => {
  for (const stableKey of [undefined, "", "/another-route", "not-a-uuid"]) {
    const h = harness({ result: { ok: true, stableKey } });
    const result = await h.run();
    assert.equal(result.status, "error");
    assert.equal(result.saveUnconfirmed, true);
    assert.equal(result.stableKey, undefined);
    assert.deepEqual(h.revalidated, []);
    assert.equal(h.calls.length, 1);
  }
});

test("post-commit revalidation failure is treated as an unconfirmed save, never another mutation or a redirect", async () => {
  const h = harness({ revalidationError: new Error("internal cache secret") });
  const result = await h.run();
  assert.equal(result.status, "error");
  assert.equal(result.saveUnconfirmed, true);
  assert.doesNotMatch(result.message, /internal|cache|secret/);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.revalidated, ["/context"]);
  assert.doesNotMatch(source, /redirect\(|fetch\(|neon\(|process\.env/);
});
