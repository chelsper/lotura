import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../lib/position-work-discovery-model.mjs";

const positionId = "12345678-1234-4123-8123-123456789abc";
const requestId = "22345678-1234-4123-8123-123456789abc";
const inquiryId = "32345678-1234-4123-8123-123456789abc";
const sessionId = "42345678-1234-4123-8123-123456789abc";
const input = {
  positionId, requestId, workDescription: "The job checks print requests. Priority decisions need another participant to confirm.",
  involvement: "support", epistemicState: "needs_validation",
};
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const administrationCode = compile(await read("lib/position-work-discovery-administration.ts"));
const actionCode = compile(await read("app/studio/position-work-discovery-actions.ts"));
const plain = value => JSON.parse(JSON.stringify(value));

test("Position work validation preserves human evidence and only accepts explicit bounded choices", () => {
  const original = { ...input, workDescription: "  Check print requests.\n\nSometimes the queue is handled differently.  " };
  const before = JSON.stringify(original);
  assert.deepEqual(model.validatePositionWorkInput(original), { ...input, workDescription: "Check print requests.\n\nSometimes the queue is handled differently." });
  assert.equal(JSON.stringify(original), before);
  for (const involvement of ["perform", "oversee", "support", "backup", "mixed", "unsure"]) {
    for (const epistemicState of ["known", "assumed", "needs_validation"]) {
      assert.deepEqual(model.validatePositionWorkInput({ ...input, involvement, epistemicState }), { ...input, involvement, epistemicState });
      assert.equal(typeof model.positionWorkInvolvementLabel(involvement), "string");
    }
  }
  assert.equal(model.positionWorkInvolvementLabel("owner"), null);
  assert.equal(model.positionWorkInvolvementLabel("__proto__"), null);
  assert.equal(model.validatePositionWorkInput({ ...input, workDescription: "a".repeat(4000) }).workDescription.length, 4000);
});

test("invalid IDs, blank or overlong descriptions, invented involvement and unsupported certainty fail closed", () => {
  for (const invalid of [null, undefined, "text", {},
    ...["", "position:1", "https://example.com", null, 17].map(positionId => ({ ...input, positionId })),
    ...["", "not-a-request", null].map(requestId => ({ ...input, requestId })),
    ...["", " \n ", "ab", "a".repeat(4001), null, ["text"]].map(workDescription => ({ ...input, workDescription })),
    ...["", "owner", "primary", ["perform", "oversee"], null].map(involvement => ({ ...input, involvement })),
    ...["", "validated", "unknown", "conflicting_observation", null].map(epistemicState => ({ ...input, epistemicState })),
  ]) assert.equal(model.validatePositionWorkInput(invalid), null);
});

test("work scope contains only a bounded job and Unit snapshot, not inferred occupants or organizational relationships", () => {
  const scope = model.buildPositionWorkScope({ title: "Fictional Printing Coordinator", unitName: "Fictional Services", personName: "Should not be included", manager: "Also excluded" });
  assert.ok(scope.startsWith(`${model.POSITION_WORK_SCOPE_PREFIX}\n`));
  assert.match(scope, /Job title: Fictional Printing Coordinator/);
  assert.match(scope, /Organization Unit: Fictional Services/);
  assert.match(scope, /interview evidence, not a confirmed assignment or Process ownership/);
  assert.doesNotMatch(scope, /Should not be included|Also excluded/);
  assert.match(model.buildPositionWorkScope({ title: "Printing Coordinator", unitName: null }), /Organization Unit: Not recorded/);
  const bounded = model.buildPositionWorkScope({ title: "T".repeat(500), unitName: "U".repeat(500) });
  assert.ok(bounded.includes(`Job title: ${"T".repeat(255)}\n`));
  assert.ok(bounded.includes(`Organization Unit: ${"U".repeat(255)}\n`));
});

test("Position-specific analyst instructions apply only to this inquiry context and preserve uncertainty and human authority", () => {
  const context = { sessionKind: "inquiry", scopeStatement: model.buildPositionWorkScope({ title: "Coordinator", unitName: null }) };
  assert.equal(model.isPositionWorkDiscovery(context), true);
  const instructions = model.positionWorkAnalystInstructions(context);
  assert.match(instructions, /already described the work/);
  assert.match(instructions, /not evidence of Process ownership/);
  assert.match(instructions, /not an Operational Role/);
  assert.match(instructions, /leave unsupported fields null or empty/);
  assert.match(instructions, /human review/);
  for (const other of [null, {}, { ...context, sessionKind: "process" }, { ...context, scopeStatement: "General inquiry" }, { ...context, scopeStatement: `${model.POSITION_WORK_SCOPE_PREFIX} not the source prefix` }]) {
    assert.equal(model.isPositionWorkDiscovery(other), false);
    assert.equal(model.positionWorkAnalystInstructions(other), "");
  }
});

function experience(overrides = {}) {
  return {
    enabled: true,
    administration: { organizationId: 31, actorIdentifier: "fictional-administrator" },
    discovery: { enabled: true, organizationId: 31, actorIdentifier: "fictional-administrator", databaseUrl: "fictional-discovery-connection" },
    data: { positions: [{ id: positionId, title: "Fictional Printing Coordinator", status: "active", unit: { id: "unit-id", name: "Fictional Services" } }] },
    ...overrides,
  };
}

function administrationHarness({ current = experience(), authError, databaseError, rows = [{ inquiry_id: inquiryId, session_id: sessionId, payload_matches: true }] } = {}) {
  const events = [];
  const queries = [];
  const logs = [];
  const settings = [];
  const loaded = { exports: {} };
  vm.runInNewContext(administrationCode, {
    module: loaded, exports: loaded.exports,
    console: { error: (...args) => logs.push(plain(args)) },
    require(id) {
      if (id === "server-only") return {};
      if (id === "node:crypto") return { createHash };
      if (id === "./position-work-discovery-model.mjs") return model;
      if (id === "./organization-structure-experience") return {
        async loadWorkspaceStudioExperience() {
          events.push("authorized-current-position-read");
          if (authError) throw authError;
          return current;
        },
      };
      if (id === "@neondatabase/serverless") return {
        neon(url, options) {
          events.push("discovery-connection");
          settings.push({ url, options: plain(options) });
          return {
            async transaction(callback, options) {
              events.push("transaction");
              settings.push({ transaction: plain(options) });
              const batch = callback({ query(text, params) { const query = { text, params: plain(params) }; queries.push(query); return query; } });
              assert.equal(batch.length, 2);
              assert.strictEqual(batch[0], queries[0]);
              assert.strictEqual(batch[1], queries[1]);
              if (databaseError) throw databaseError;
              return [rows, [{ integrity_check: 1 }]];
            },
          };
        },
      };
      throw new Error(`Unexpected administration dependency: ${id}`);
    },
  });
  return { start: loaded.exports.startPositionWorkDiscovery, events, queries, logs, settings };
}

test("invalid submissions and unauthorized workspace reads cannot initialize a write connection", async () => {
  const invalid = administrationHarness();
  assert.equal((await invalid.start({ ...input, workDescription: "" })).code, "invalid");
  assert.deepEqual(invalid.events, []);
  const authError = new Error("Authentication required");
  const blocked = administrationHarness({ authError });
  await assert.rejects(blocked.start(input), error => error === authError);
  assert.deepEqual(blocked.events, ["authorized-current-position-read"]);
  assert.equal(blocked.queries.length, 0);
});

test("private Studio, Discovery, actor and tenant boundaries all fail closed before database writes", async () => {
  for (const current of [
    { enabled: false },
    experience({ discovery: { enabled: false } }),
    experience({ administration: { organizationId: 99, actorIdentifier: "fictional-administrator" } }),
    experience({ administration: { organizationId: 31, actorIdentifier: "different-actor" } }),
  ]) {
    const view = administrationHarness({ current });
    const result = await view.start(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, "unavailable");
    assert.deepEqual(view.events, ["authorized-current-position-read"]);
  }
});

test("missing or inactive Positions cannot create Discovery even when client titles or tenant IDs are supplied", async () => {
  for (const positions of [[], [{ id: positionId, title: "Inactive job", status: "inactive" }], [{ id: requestId, title: "Namesake job", status: "active" }]]) {
    const view = administrationHarness({ current: experience({ data: { positions } }) });
    const result = await view.start({ ...input, organizationId: 99, actorIdentifier: "spoofed", title: "Untrusted title" });
    assert.equal(result.code, "not_found");
    assert.equal(view.queries.length, 0);
    assert.equal(view.settings.length, 0);
  }
});

test("saving uses one serializable Discovery transaction, current server context and exact human evidence", async () => {
  const view = administrationHarness();
  const submitted = { ...input, workDescription: `  ${input.workDescription}\nThe sequence is uncertain.  `, organizationId: 99, actorIdentifier: "spoofed", title: "Untrusted title" };
  assert.deepEqual(plain(await view.start(submitted)), { ok: true, inquiryId, sessionId });
  assert.deepEqual(view.events, ["authorized-current-position-read", "discovery-connection", "transaction"]);
  assert.deepEqual(view.settings, [
    { url: "fictional-discovery-connection", options: { isolationLevel: "Serializable", readOnly: false } },
    { transaction: { isolationLevel: "Serializable", readOnly: false } },
  ]);
  const [first, advance] = view.queries;
  assert.deepEqual(first.params.slice(0, 2), [31, "fictional-administrator"]);
  assert.equal(first.params[2], `position-work:v1:${requestId}:`);
  assert.match(first.params[3], new RegExp(`^position-work:v1:${requestId}:${positionId}:[a-f0-9]{64}$`));
  assert.equal(first.params[4], "Understand the work described for Fictional Printing Coordinator");
  assert.equal(first.params[5], model.buildPositionWorkScope({ title: "Fictional Printing Coordinator", unitName: "Fictional Services" }));
  assert.equal(first.params[6], model.POSITION_WORK_DESCRIPTION_PROMPT);
  assert.equal(first.params[7], submitted.workDescription.trim());
  assert.equal(first.params[8], model.positionWorkInvolvementLabel("support"));
  assert.equal(first.params[9], "needs_validation");
  assert.deepEqual(advance.params, [31, "fictional-administrator"]);
  assert.doesNotMatch(JSON.stringify(view.queries), /spoofed|Untrusted title/);
  const targets = view.queries.flatMap(query => [...query.text.matchAll(/\b(?:insert into|update|delete from)\s+([a-z_]+)/gi)].map(match => match[1]));
  assert.deepEqual(targets, ["discovery_inquiries", "discovery_inquiry_sessions", "discovery_inquiry_routes", "discovery_inquiry_observations", "discovery_inquiries"]);
  assert.match(first.text, /\(select count\(\*\) from inserted_observations\) = 2/);
  assert.match(first.text, /answer\.topic::discovery_observation_topic/);
  assert.match(first.text, /route\.organization_id = \$1::integer/);
  assert.match(first.text, /route\.actor_identifier = \$2::varchar\(128\)/);
  assert.match(advance.text, /status = 'open' and revision = 1/);
  assert.equal(view.logs.length, 0);
});

test("a retry keeps the same request marker while a changed payload is reported as a conflict", async () => {
  const view = administrationHarness();
  await view.start(input);
  const originalMarker = view.queries[0].params[3];
  const retry = administrationHarness();
  await retry.start({ ...input, positionId: positionId.toUpperCase(), requestId: requestId.toUpperCase() });
  assert.equal(retry.queries[0].params[3], originalMarker);
  const changed = administrationHarness({ rows: [{ inquiry_id: inquiryId, session_id: sessionId, payload_matches: false }] });
  const result = await changed.start({ ...input, workDescription: "A different fictional description." });
  assert.equal(result.code, "conflict");
  assert.equal(changed.queries[0].params[2], view.queries[0].params[2]);
  assert.notEqual(changed.queries[0].params[3], originalMarker);
  assert.doesNotMatch(JSON.stringify(result), /A different fictional description/);
});

test("malformed database success or transaction failure never reports a completed save or exposes the evidence", async () => {
  for (const rows of [[], [{ inquiry_id: "not-a-uuid", session_id: sessionId, payload_matches: true }], [{ inquiry_id: inquiryId, session_id: null, payload_matches: true }], [{ inquiry_id: inquiryId, session_id: sessionId }]]) {
    const view = administrationHarness({ rows });
    assert.equal((await view.start(input)).code, "unavailable");
  }
  const failure = Object.assign(new Error(`PRIVATE ${input.workDescription}`), { code: "40001", constraint: "fictional_constraint", detail: "PRIVATE connection and evidence" });
  const view = administrationHarness({ databaseError: failure });
  const result = await view.start(input);
  assert.equal(result.code, "unavailable");
  assert.match(result.message, /same form/);
  assert.deepEqual(view.logs[0][1], { code: "40001", constraint: "fictional_constraint" });
  assert.doesNotMatch(JSON.stringify({ result, logs: view.logs }), /PRIVATE|print requests|fictional-discovery-connection|fictional-administrator/);
});

function actionHarness(result) {
  const calls = [];
  const events = [];
  const loaded = { exports: {} };
  const redirectSignal = new Error("NEXT_REDIRECT");
  vm.runInNewContext(actionCode, {
    module: loaded, exports: loaded.exports,
    require(id) {
      if (id === "next/cache") return { revalidatePath: path => events.push(["revalidate", path]) };
      if (id === "next/navigation") return { redirect: path => { events.push(["redirect", path]); throw redirectSignal; } };
      if (id === "@/lib/position-work-discovery-administration") return {
        async startPositionWorkDiscovery(input) { calls.push(plain(input)); return result; },
      };
      throw new Error(`Unexpected action dependency: ${id}`);
    },
  });
  return { action: loaded.exports.startPositionWorkDiscoveryAction, calls, events, redirectSignal };
}
const form = fields => ({ get: name => Object.hasOwn(fields, name) ? fields[name] : null });

test("the server action forwards only reviewed fields and redirects to the existing interview after a confirmed save", async () => {
  const view = actionHarness({ ok: true, inquiryId, sessionId });
  const fields = { ...input, organizationId: 99, actorIdentifier: "spoofed", processId: "process:1", providerConsent: "yes" };
  await assert.rejects(view.action({ status: "idle", message: "" }, form(fields)), error => error === view.redirectSignal);
  assert.deepEqual(view.calls, [input]);
  assert.deepEqual(view.events, [
    ["revalidate", "/studio/discovery"], ["revalidate", "/context"],
    ["redirect", `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`],
  ]);
  assert.doesNotMatch(JSON.stringify(view.events), /print requests|support|needs_validation|spoofed/);
});

test("the server action returns a safe validation result without navigation or invalidation on failure", async () => {
  const view = actionHarness({ ok: false, code: "invalid", message: "Check the starting point." });
  const result = await view.action({ status: "idle", message: "" }, form({ ...input, workDescription: new Blob(["fictional"]) }));
  assert.deepEqual(plain(result), { status: "error", message: "Check the starting point." });
  assert.equal(view.calls[0].workDescription, "");
  assert.deepEqual(view.events, []);
});
