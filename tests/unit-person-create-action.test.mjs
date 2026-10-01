import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const unitId = "22345678-1234-4123-8123-123456789abc";
const personId = "32345678-1234-4123-8123-123456789abc";
const otherUnitId = "42345678-1234-4123-8123-123456789abc";
const source = await readFile(new URL("../app/studio/unit-person-create-action.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const previous = { status: "idle", message: "" };
class FixedDate extends Date {
  constructor(value) { super(value === undefined ? "2026-10-01T15:00:00.000Z" : value); }
}

function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    displayName: "Fictional Alex", organizationUnitStableKey: unitId,
    changeKind: "organizational_change", effectiveDate: "2026-09-30", reason: "Documenting our current team.",
    ...overrides,
  })) if (value !== undefined) data.set(key, value);
  return data;
}

function harness({
  experience = { enabled: true, data: { units: [{ id: unitId, status: "active", name: "Fictional Campus Services" }] } },
  result = { ok: true, stableKey: personId, message: "Internal mutation result" },
  loaderError, mutationError, revalidationError,
} = {}) {
  const loaded = { exports: {} };
  const calls = [], revalidated = [], events = [];
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, Date: FixedDate,
    require(id) {
      if (id === "next/cache") return { revalidatePath(path) {
        events.push("revalidate"); revalidated.push(path);
        if (revalidationError) throw revalidationError;
      } };
      if (id === "@/lib/organization-structure-experience") return { async loadWorkspaceStudioExperience() {
        events.push("authorize");
        if (loaderError) throw loaderError;
        return experience;
      } };
      if (id === "@/lib/organization-structure-administration") return { async createPerson(input) {
        events.push("create"); calls.push(input);
        if (mutationError) throw mutationError;
        return result;
      } };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return { calls, events, revalidated, exports: loaded.exports,
    run: (data = form()) => loaded.exports.createUnitPersonAction(previous, data) };
}

test("the Person action exposes only an async server function and does nothing during import", () => {
  const h = harness();
  assert.deepEqual(Object.keys(h.exports), ["createUnitPersonAction"]);
  assert.equal(h.exports.createUnitPersonAction.constructor.name, "AsyncFunction");
  assert.deepEqual(h.events, []);
  assert.match(source, /^"use server"/);
});

test("an authorized Unit context creates only a Person, without a Unit assignment, login, or inferred responsibilities", async () => {
  const h = harness();
  const result = await h.run(form({ displayName: "  Fictional Alex  ", reason: "  Documenting our current team.  ",
    organizationId: "999", actorIdentifier: "caller", personStableKey: personId,
    positionStableKey: otherUnitId, assignmentType: "incumbent", roleKey: "role:99", login: "true",
    managerPositionStableKey: otherUnitId, processOwner: "true", returnTo: "https://example.invalid" }));
  assert.equal(result.status, "success");
  assert.equal(result.stableKey, personId);
  assert.equal(result.message, "Person saved. You can choose their job title now or later.");
  assert.equal(result.saveUnconfirmed, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls)), [{
    displayName: "Fictional Alex", changeKind: "organizational_change",
    effectiveAt: "2026-09-30T23:59:59.999Z", reason: "Documenting our current team.",
    acknowledgePossibleDuplicate: false,
  }]);
  assert.deepEqual(h.events.slice(0, 2), ["authorize", "create"]);
  assert.deepEqual(h.revalidated, ["/context", "/organization", "/studio", "/studio/organization", `/studio/organization/units/${unitId}`]);
});

test("today uses the current instant and possible-duplicate confirmation remains explicit", async () => {
  const h = harness();
  await h.run(form({ effectiveDate: "2026-10-01", changeKind: "correction", acknowledgePossibleDuplicate: "confirmed" }));
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].effectiveAt.toISOString(), "2026-10-01T15:00:00.000Z");
  assert.equal(h.calls[0].changeKind, "correction");
  assert.equal(h.calls[0].acknowledgePossibleDuplicate, true);
});

test("the existing displayName field is required; invalid metadata or alias fields never create a Person", async () => {
  for (const values of [
    { displayName: " " }, { displayName: "x".repeat(256) }, { displayName: undefined, name: "Alias is not accepted" },
    { reason: " " }, { reason: "x".repeat(2001) },
    { organizationUnitStableKey: "" }, { organizationUnitStableKey: "not-a-stable-key" },
    { changeKind: "approved" }, { changeKind: undefined }, { effectiveDate: undefined },
    { acknowledgePossibleDuplicate: "true" },
  ]) {
    const h = harness(), result = await h.run(form(values));
    assert.equal(result.status, "error", JSON.stringify(values));
    assert.equal(result.saveUnconfirmed, undefined);
    assert.deepEqual(h.calls, []);
    assert.deepEqual(h.revalidated, []);
  }
});

test("duplicate scalar fields, repeated acknowledgments and file-valued fields are rejected", async () => {
  for (const field of ["displayName", "organizationUnitStableKey", "changeKind", "reason", "effectiveDate", "acknowledgePossibleDuplicate"]) {
    const h = harness(), data = form({ acknowledgePossibleDuplicate: "confirmed" });
    data.append(field, data.get(field));
    assert.equal((await h.run(data)).status, "error", field);
    assert.equal(h.calls.length, 0);
  }
  for (const field of ["displayName", "organizationUnitStableKey", "reason", "acknowledgePossibleDuplicate"]) {
    const h = harness(), data = form();
    data.set(field, new Blob(["not plain text"]), "fictional.txt");
    assert.equal((await h.run(data)).status, "error", field);
    assert.equal(h.calls.length, 0);
  }
});

test("invalid calendar dates and future dates cannot normalize silently", async () => {
  for (const effectiveDate of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-09-00", "2026-1-01", "yesterday", "2026-10-02", "2026-09-30T12:00:00Z"]) {
    const h = harness();
    assert.equal((await h.run(form({ effectiveDate }))).status, "error", effectiveDate);
    assert.deepEqual(h.calls, []);
  }
  const h = harness();
  assert.equal((await h.run(form({ effectiveDate: "2024-02-29" }))).status, "success");
  assert.equal(h.calls[0].effectiveAt.toISOString(), "2024-02-29T23:59:59.999Z");
});

test("disabled Studio, foreign, inactive or absent Unit context blocks creation despite valid metadata", async () => {
  for (const experience of [
    { enabled: false },
    { enabled: true, data: { units: [] } },
    { enabled: true, data: { units: [{ id: unitId, status: "inactive" }] } },
    { enabled: true, data: { units: [{ id: otherUnitId, status: "active", name: "Same Unit name" }] } },
  ]) {
    const h = harness({ experience }), result = await h.run();
    assert.equal(result.status, "error");
    assert.equal(result.saveUnconfirmed, undefined);
    assert.deepEqual(h.events, ["authorize"]);
    assert.deepEqual(h.calls, []);
  }
});

test("authorization failure exposes no internals and never claims a save was attempted", async () => {
  const h = harness({ loaderError: new Error("private connection secret") }), result = await h.run();
  assert.equal(result.status, "error");
  assert.equal(result.saveUnconfirmed, undefined);
  assert.doesNotMatch(result.message, /private|secret|connection/);
  assert.equal(h.calls.length, 0);
  assert.equal(h.revalidated.length, 0);
});

test("ordinary mutation validation failures remain correctable without cache changes", async () => {
  for (const code of ["blocked", "conflict", "invalid", "not_found"]) {
    const h = harness({ result: { ok: false, code, message: "Review the existing person first." } }), result = await h.run();
    assert.equal(result.status, "error");
    assert.equal(result.message, "Review the existing person first.");
    assert.equal(result.saveUnconfirmed, undefined);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.revalidated, []);
  }
});

test("unavailable or thrown mutations require a refresh before retry without leaking exception details", async () => {
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

test("success without a valid Person stable key is unconfirmed, not a reason for a blind retry", async () => {
  for (const stableKey of [undefined, "", "/another-route", "not-a-uuid"]) {
    const h = harness({ result: { ok: true, stableKey } }), result = await h.run();
    assert.equal(result.status, "error");
    assert.equal(result.saveUnconfirmed, true);
    assert.equal(result.stableKey, undefined);
    assert.deepEqual(h.revalidated, []);
    assert.equal(h.calls.length, 1);
  }
});

test("post-commit revalidation failure freezes retry and never redirects or repeats creation", async () => {
  const h = harness({ revalidationError: new Error("internal cache secret") }), result = await h.run();
  assert.equal(result.status, "error");
  assert.equal(result.saveUnconfirmed, true);
  assert.doesNotMatch(result.message, /internal|cache|secret/);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.revalidated, ["/context"]);
  assert.doesNotMatch(source, /redirect\(|fetch\(|neon\(|process\.env|establishPositionAssignment|createPosition|createUser/);
});
