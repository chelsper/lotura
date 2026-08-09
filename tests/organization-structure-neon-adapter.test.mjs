import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the Organization Structure adapter is server-only, scoped, and read-only", async () => {
  const source = await read("lib/organization-structure-neon.ts");

  assert.match(source, /^import "server-only";/);
  assert.match(source, /transaction_timestamp\(\)/);
  assert.match(source, /db\.batch\(/);
  for (const table of [
    "organizationStructureImport",
    "person",
    "organizationUnit",
    "position",
    "positionAssignment",
    "positionReportingRelationship",
    "roleMandate",
    "roleCoverage",
    "role",
    "processTable",
    "processStep",
    "exceptionTable",
    "systemTable",
    "processSystem",
  ]) {
    assert.match(
      source,
      new RegExp(`${table.replaceAll(".", "\\.")}\\.organizationId, organizationId`),
    );
  }
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(|\btruncate\b/i);
  assert.doesNotMatch(source, /DATABASE_URL_UNPOOLED/);
});

test("existing Explorer and FLOW loaders do not import the new structure adapter", async () => {
  const [workspace, explorerSource, explorerAdapter, flow] = await Promise.all([
    read("lib/workspace-experience.ts"),
    read("lib/process-explorer-source.ts"),
    read("lib/process-explorer-neon.ts"),
    read("lib/flow-analysis.mjs"),
  ]);
  for (const source of [workspace, explorerSource, explorerAdapter, flow]) {
    assert.doesNotMatch(source, /organization-structure-neon/);
  }
});

test("no Organization Structure source file exposes a mutation path", async () => {
  const sources = await Promise.all(
    [
      "lib/organization-structure-source.ts",
      "lib/organization-structure-experience.ts",
      "lib/organization-structure-neon.ts",
    ].map(read),
  );
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /use server|server action/i);
  assert.doesNotMatch(combined, /\.insert\(|\.update\(|\.delete\(|\btruncate\b/i);
  assert.doesNotMatch(combined, /DATABASE_URL_UNPOOLED/);
});
