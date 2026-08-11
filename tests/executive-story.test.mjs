import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { decodeProcessRouteId } from "../lib/process-route.mjs";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the first-five-minute journey has one deliberate route sequence", async () => {
  const [home, overview, detail, explorer, flow] = await Promise.all([
    read("app/home-orientation.tsx"),
    read("app/organization-overview.tsx"),
    read("app/process-detail.tsx"),
    read("app/process-explorer.tsx"),
    read("app/flow-analysis.tsx"),
  ]);

  assert.match(home, /href="\/overview"/);
  assert.match(overview, /href=\{`\/explorer\/\$\{encodeURIComponent\(recommendedProcess\.id\)\}`\}/);
  assert.match(detail, /href="\/explorer"/);
  assert.match(explorer, /href=\{processHref\(process\.id\)\}/);
  assert.match(flow, /title="Items to review"/);
  assert.match(flow, /title="Explore a what-if"/);
});

test("Organization Overview defines the operating model before using it as shorthand", async () => {
  const overview = await read("app/organization-overview.tsx");

  assert.match(
    overview,
    /An operating model is the connected picture of how work gets\s+done: what work exists, who owns it, what supports it, and what\s+it affects\./,
  );
  for (const concept of [
    "Processes",
    "Roles and people",
    "Systems",
    "Exceptions",
    "Dependencies",
  ]) {
    assert.match(overview, new RegExp(concept));
  }
  assert.match(overview, /Receive a service request/);
});

test("Process Detail resolves canonical IDs and fails closed for unknown IDs", async () => {
  const page = await read("app/explorer/[processId]/page.tsx");

  assert.match(page, /params: Promise<\{ processId: string \}>/);
  assert.match(page, /decodeProcessRouteId\(processId\)/);
  assert.match(
    page,
    /data\.processes\.find\(\(item\) => item\.id === decodedProcessId\)/,
  );
  assert.match(page, /if \(!process\) \{\s+notFound\(\);\s+\}/);
});

test("Process Detail decodes URL-safe Neon identifiers and rejects malformed paths", () => {
  assert.equal(decodeProcessRouteId("process%3A1"), "process:1");
  assert.equal(decodeProcessRouteId("process:1"), "process:1");
  assert.equal(decodeProcessRouteId("process%ZZ1"), null);
});

test("legacy Explorer query links remain accepted while rendered links are canonical", async () => {
  const [page, explorer, detail, flow] = await Promise.all([
    read("app/explorer/page.tsx"),
    read("app/process-explorer.tsx"),
    read("app/process-detail.tsx"),
    read("app/flow-analysis.tsx"),
  ]);

  assert.match(page, /searchParams: Promise/);
  assert.match(page, /query\.process/);
  assert.match(page, /initialProcessId=\{initialProcessId\}/);
  assert.doesNotMatch(explorer, /href=.*\?process=/);
  assert.doesNotMatch(detail, /href=.*\?process=/);
  assert.doesNotMatch(flow, /href=.*\?process=/);
});

test("FLOW presents findings, What-if, concentrations, then methodology", async () => {
  const flow = await read("app/flow-analysis.tsx");
  const positions = [
    flow.indexOf('title="Items to review"'),
    flow.indexOf('title="Explore a what-if"'),
    flow.indexOf('title="Concentrations"'),
    flow.indexOf('title="How FLOW reads the operating model"'),
  ];

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.match(flow, /Exploring this scenario changes and approves nothing\./);
  assert.match(flow, /does not prove operational failure/);
});

test("the Executive Story surfaces remain presentation-only", async () => {
  const files = await Promise.all(
    [
      "app/home-orientation.tsx",
      "app/organization-overview.tsx",
      "app/process-explorer.tsx",
      "app/process-detail.tsx",
      "app/flow-analysis.tsx",
    ].map(read),
  );
  const combined = files.join("\n");

  assert.doesNotMatch(combined, /\b(?:insert|update|delete)\s*\(/i);
  assert.doesNotMatch(combined, /method=\{?["']post/i);
  assert.doesNotMatch(combined, /server action|use server/i);
});
