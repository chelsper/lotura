import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  HUMAN_REVIEW_WARNING,
  validateOperatingModelImport,
} from "../lib/operating-model-import.mjs";

const root = new URL("../", import.meta.url);
const fixture = JSON.parse(
  await readFile(
    new URL("fixtures/fictional-operating-model-import.json", import.meta.url),
    "utf8",
  ),
);

test("fictional snapshot passes structural validation without a sanitization claim", () => {
  const result = validateOperatingModelImport(fixture);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.summary.knowledgeState, "sanitized-working-draft");
  assert.equal(result.summary.counts.processes, 2);
  assert.deepEqual(result.warnings, [HUMAN_REVIEW_WARNING]);
  assert.match(result.warnings[0], /cannot prove.*free text.*sanitized/i);
});

test("unknown or prohibited structures and missing attestations are rejected", () => {
  const unknownField = structuredClone(fixture);
  unknownField.operatingModel.processes[0].donorRecords = [];
  let result = validateOperatingModelImport(unknownField);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /donorRecords.*not permitted/);

  const unattested = structuredClone(fixture);
  unattested.manifest.sanitizationAttestation.humanReviewed = false;
  result = validateOperatingModelImport(unattested);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /humanReviewed.*must be true/);
});

test("broken references and database constraint divergences are rejected", () => {
  const brokenReference = structuredClone(fixture);
  brokenReference.operatingModel.processSteps[0].processKey = "missing-process";
  assert.match(
    validateOperatingModelImport(brokenReference).errors.join("\n"),
    /unknown process/,
  );

  const duplicatePrimary = structuredClone(fixture);
  duplicatePrimary.operatingModel.roleAssignments.push({
    ...duplicatePrimary.operatingModel.roleAssignments[0],
    key: "garden-coordinator-second-primary",
  });
  duplicatePrimary.preparationRegister.push({
    recordType: "roleAssignment",
    recordKey: "garden-coordinator-second-primary",
    state: "sanitized-working-draft",
    sourceType: "working-session",
    openConflicts: [],
  });
  assert.match(
    validateOperatingModelImport(duplicatePrimary).errors.join("\n"),
    /more than one active primary assignment/,
  );

  const selfReference = structuredClone(fixture);
  selfReference.operatingModel.processDependencies[0].targetProcessKey =
    "plan-weekly-work";
  assert.match(
    validateOperatingModelImport(selfReference).errors.join("\n"),
    /same process as source and target/,
  );
});

test("snapshot state cannot overstate the least-mature included record", () => {
  const overstated = structuredClone(fixture);
  overstated.manifest.knowledgeState = "approved-for-pilot";
  const result = validateOperatingModelImport(overstated);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /least-mature state/);
});

test("validation-only code has no database, network, or write capability", async () => {
  const source = await Promise.all([
    readFile(new URL("lib/operating-model-import.mjs", root), "utf8"),
    readFile(new URL("scripts/validate-operating-model-import.mjs", root), "utf8"),
  ]).then((files) => files.join("\n"));

  assert.doesNotMatch(source, /DATABASE_URL|drizzle|@neondatabase|from ["'][^"']*db|fetch\s*\(/i);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/);
  assert.match(source, /readFile/);
  assert.match(source, /HUMAN REVIEW STILL REQUIRED/);
});
