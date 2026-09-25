import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

import * as flow from "../lib/flow-analysis.mjs";
import * as coverage from "../lib/process-role-coverage.mjs";
import { buildDocumentedProcessSnapshot } from "../lib/discovery-proposal-model.mjs";

const source = await readFile(new URL("../lib/process-explorer-data.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, {
  module: testModule,
  exports: testModule.exports,
  require(id) {
    if (id === "@/lib/flow-analysis.mjs") return flow;
    if (id === "@/lib/process-role-coverage.mjs") return coverage;
    throw new Error(`Unexpected projection dependency: ${id}`);
  },
});
const { buildProcessExplorerData } = testModule.exports;
const fixture = JSON.parse(await readFile(new URL("../db/seeds/process-explorer.json", import.meta.url), "utf8"));
const asOf = "2026-09-25T12:00:00.000Z";

test("Systems without a stable identity remain browsable without a fabricated editor identity", () => {
  const data = buildProcessExplorerData(fixture, asOf);
  assert.equal(data.systems.length, fixture.systems.length);
  for (const system of data.systems) {
    assert.equal(system.stableKey, null);
  }
  for (const process of data.processes) {
    for (const system of process.systems) assert.equal(system.stableKey, null);
  }
});

test("System editor identities survive both catalog and Process-linked projections", () => {
  const seed = structuredClone(fixture);
  const linkedKey = seed.processSystems[0].systemKey;
  const stableKey = "869d54df-e28d-4a84-9f0a-bd9a223a065d";
  seed.systems.find((system) => system.key === linkedKey).stableKey = stableKey;
  const data = buildProcessExplorerData(seed, asOf);
  assert.equal(data.systems.find((system) => system.id === linkedKey).stableKey, stableKey);
  const linkedSystems = data.processes.flatMap((process) => process.systems).filter((system) => system.id === linkedKey);
  assert.ok(linkedSystems.length > 0);
  for (const system of linkedSystems) assert.equal(system.stableKey, stableKey);
  for (const system of data.systems.filter((system) => system.id !== linkedKey)) assert.equal(system.stableKey, null);
  assert.equal(fixture.systems.find((system) => system.key === linkedKey).stableKey, undefined);
});

test("System navigation identities do not change historical proposal snapshots or fingerprints", () => {
  const seed = structuredClone(fixture);
  seed.systems[0].stableKey = "869d54df-e28d-4a84-9f0a-bd9a223a065d";
  const baseline = buildProcessExplorerData(fixture, asOf);
  const withIdentity = buildProcessExplorerData(seed, asOf);
  assert.deepEqual(
    withIdentity.processes.map(buildDocumentedProcessSnapshot),
    baseline.processes.map(buildDocumentedProcessSnapshot),
  );
  assert.doesNotMatch(JSON.stringify(withIdentity.processes.map(buildDocumentedProcessSnapshot)), /stableKey/);
});
