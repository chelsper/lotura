import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Process Detail exposes Maintain Process only through enabled server policy", async () => {
  const [detail, route] = await Promise.all([
    read("app/process-detail.tsx"),
    read("app/explorer/[processId]/page.tsx"),
  ]);
  assert.match(detail, /authoringEnabled \?/);
  assert.match(detail, /Maintain Process/);
  assert.match(route, /authoring\.enabled/);
});

test("Slice A maintains definition and explicit Owner Role only", async () => {
  const workspace = await read("app/process-authoring/process-authoring-workspace.tsx");
  assert.match(workspace, /Name and purpose/);
  assert.match(workspace, /Owner Operational Role/);
  assert.match(workspace, /Working draft/);
  assert.match(workspace, /Steps, responsible Roles, Systems, Exceptions, and Process dependencies remain visible/);
  assert.match(workspace, /authoring controls are intentionally deferred/);
  assert.doesNotMatch(workspace, /addStep|updateStep|linkSystem|addException|addDependency/);
});

test("governance and history use honest non-approval language", async () => {
  const workspace = await read("app/process-authoring/process-authoring-workspace.tsx");
  assert.match(workspace, /Not assigned/);
  assert.match(workspace, /Not configured/);
  assert.match(workspace, /Needs validation/);
  assert.match(workspace, /do not establish Process ownership/);
  assert.match(workspace, /not (?:approved )?Process version history/);
});

test("Process stable keys do not replace existing canonical route IDs", async () => {
  const [detail, maintain, routeCodec] = await Promise.all([
    read("app/process-detail.tsx"),
    read("app/explorer/[processId]/maintain/page.tsx"),
    read("lib/process-route.mjs"),
  ]);
  assert.match(detail, /encodeURIComponent\(process\.id\)/);
  assert.match(maintain, /decodeProcessRouteId/);
  assert.doesNotMatch(routeCodec, /stableKey/);
});
