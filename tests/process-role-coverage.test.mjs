import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getCanonicalRoleCoverage } from "../lib/process-role-coverage.mjs";

const AS_OF = "2026-08-11T16:36:00.000Z";

function seed() {
  return {
    roles: [{ key: "role:1" }, { key: "role:2" }],
    people: [
      { key: "person:1", displayName: "Alex Active", status: "active" },
      { key: "person:2", displayName: "Bailey Backup", status: "active" },
      { key: "person:3", displayName: "Casey Inactive", status: "inactive" },
      { key: "person:4", displayName: "Drew Future", status: "active" },
    ],
    roleMandates: [
      {
        key: "mandate:1",
        roleKey: "role:1",
        mandateType: "primary",
        status: "active",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
      },
      {
        key: "mandate:2",
        roleKey: "role:1",
        mandateType: "shared",
        scope: "Peak periods",
        status: "active",
        effectiveFrom: "2026-07-01T00:00:00.000Z",
      },
      {
        key: "mandate:3",
        roleKey: "role:2",
        mandateType: "primary",
        status: "ended",
        effectiveFrom: "2025-01-01T00:00:00.000Z",
        effectiveUntil: "2026-06-01T00:00:00.000Z",
      },
    ],
    roleCoverages: [
      {
        key: "coverage:1",
        roleMandateKey: "mandate:1",
        personKey: "person:1",
        coverageType: "permanent",
        status: "active",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
      },
      {
        key: "coverage:2",
        roleMandateKey: "mandate:2",
        personKey: "person:2",
        coverageType: "backup",
        status: "active",
        effectiveFrom: "2026-07-01T00:00:00.000Z",
      },
      {
        key: "coverage:3",
        roleMandateKey: "mandate:1",
        personKey: "person:3",
        coverageType: "acting",
        status: "active",
        effectiveFrom: "2026-07-01T00:00:00.000Z",
      },
      {
        key: "coverage:4",
        roleMandateKey: "mandate:1",
        personKey: "person:4",
        coverageType: "delegated",
        status: "scheduled",
        effectiveFrom: "2026-09-01T00:00:00.000Z",
      },
      {
        key: "coverage:5",
        roleMandateKey: "mandate:3",
        personKey: "person:1",
        coverageType: "permanent",
        status: "ended",
        effectiveFrom: "2025-01-01T00:00:00.000Z",
        effectiveUntil: "2026-06-01T00:00:00.000Z",
      },
    ],
  };
}

test("current Process coverage comes from effective RoleMandates and RoleCoverages", () => {
  const coverage = getCanonicalRoleCoverage(seed(), AS_OF);

  assert.ok(coverage);
  assert.deepEqual(coverage.get("role:1"), [
    {
      name: "Alex Active",
      coverageType: "permanent",
      mandateType: "primary",
      scope: null,
    },
    {
      name: "Bailey Backup",
      coverageType: "backup",
      mandateType: "shared",
      scope: "Peak periods",
    },
  ]);
  assert.equal(coverage.has("role:2"), false);
});

test("canonical empty coverage is authoritative and distinct from unavailable coverage", () => {
  const empty = seed();
  empty.roleCoverages = [];

  const coverage = getCanonicalRoleCoverage(empty, AS_OF);
  assert.ok(coverage);
  assert.equal(coverage.size, 0);

  assert.equal(
    getCanonicalRoleCoverage({ roles: empty.roles }, AS_OF),
    null,
  );
});

test("partial canonical coverage input fails closed", () => {
  assert.throws(
    () =>
      getCanonicalRoleCoverage(
        {
          roles: [{ key: "role:1" }],
          people: [],
          roleMandates: [],
        },
        AS_OF,
      ),
    /requires people, Role Mandates, and Role Coverages together/,
  );
});

test("cross-reference and timestamp errors fail closed", () => {
  const missingPerson = seed();
  missingPerson.roleCoverages[0].personKey = "person:missing";
  assert.throws(
    () => getCanonicalRoleCoverage(missingPerson, AS_OF),
    /Role Coverage person 'person:missing' is missing/,
  );

  assert.throws(
    () => getCanonicalRoleCoverage(seed(), "not-a-timestamp"),
    /Invalid as-of timestamp/,
  );
});

test("Process Detail renders canonical Role Coverage without changing FLOW", async () => {
  const [projection, detail, flow] = await Promise.all([
    readFile(new URL("../lib/process-explorer-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/process-detail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/flow-analysis.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(projection, /getCanonicalRoleCoverage\(seed, asOf\)/);
  assert.match(detail, /process\.ownerRole\?\.currentCoverage/);
  assert.match(detail, /Current Role coverage/);
  assert.doesNotMatch(detail, /currentAssignee/);
  assert.match(flow, /seed\.roleAssignments/);
  assert.doesNotMatch(flow, /seed\.roleCoverages|seed\.roleMandates/);
});
