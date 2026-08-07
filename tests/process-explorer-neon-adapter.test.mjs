import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildFlowAnalysis } from "../lib/flow-analysis.mjs";
import { mapNeonOperatingModel } from "../lib/process-explorer-neon-data.mjs";

function operatingModelRows() {
  return {
    asOf: "2026-08-07 12:01:02.345+00",
    organizations: [{ id: 17, name: "Fictional Operations Group" }],
    users: [
      { id: 1, email: "alex@example.test", displayName: "Alex Example" },
    ],
    memberships: [
      { id: 2, userId: 1, accessLevel: "owner", status: "active" },
    ],
    roles: [
      {
        id: 3,
        name: "Service Lead",
        description: "Owns service work.",
        status: "active",
      },
    ],
    roleAssignments: [
      {
        id: 4,
        roleId: 3,
        membershipId: 2,
        assignmentType: "permanent",
        status: "active",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveUntil: null,
        reason: null,
      },
    ],
    systems: [
      {
        id: 5,
        name: "Case Desk",
        description: null,
        systemType: "software",
        url: "https://example.test/case-desk",
        ownerRoleId: 3,
        status: "active",
      },
    ],
    processes: [
      {
        id: 6,
        name: "Review request",
        purpose: "Review a fictional request.",
        ownerRoleId: 3,
        status: "active",
      },
      {
        id: 7,
        name: "Complete request",
        purpose: null,
        ownerRoleId: 3,
        status: "active",
      },
    ],
    processSteps: [
      {
        id: 8,
        processId: 6,
        position: 1,
        title: "Inspect",
        instructions: "Inspect the fictional request.",
        responsibleRoleId: null,
      },
    ],
    exceptions: [
      {
        id: 9,
        processId: 6,
        processStepId: 8,
        name: "Missing details",
        condition: "Details are missing.",
        response: "Request fictional clarification.",
        status: "active",
        ownerRoleId: 3,
      },
    ],
    processSystems: [{ processId: 6, systemId: 5, usage: "Read cases." }],
    processDependencies: [
      {
        id: 10,
        sourceProcessId: 6,
        targetProcessId: 7,
        dependencyType: "triggers",
        description: "A completed review triggers completion.",
      },
    ],
  };
}

test("Neon rows map every Version 0.1 entity and relationship into the pure input", () => {
  const loaded = mapNeonOperatingModel(operatingModelRows());

  assert.equal(loaded.asOf, "2026-08-07T12:01:02.345Z");
  assert.equal(loaded.seed.organization.name, "Fictional Operations Group");
  assert.deepEqual(loaded.seed.users[0], {
    key: "user:1",
    email: "alex@example.test",
    displayName: "Alex Example",
  });
  assert.equal(loaded.seed.memberships[0].userKey, "user:1");
  assert.equal(loaded.seed.roleAssignments[0].roleKey, "role:3");
  assert.equal(
    loaded.seed.roleAssignments[0].membershipKey,
    "membership:2",
  );
  assert.equal(loaded.seed.systems[0].ownerRoleKey, "role:3");
  assert.equal(loaded.seed.processes[0].ownerRoleKey, "role:3");
  assert.equal(loaded.seed.processSteps[0].processKey, "process:6");
  assert.equal(loaded.seed.exceptions[0].processStepKey, "step:8");
  assert.deepEqual(loaded.seed.processSystems[0], {
    processKey: "process:6",
    systemKey: "system:5",
    usage: "Read cases.",
  });
  assert.equal(
    loaded.seed.processDependencies[0].targetProcessKey,
    "process:7",
  );

  const analysis = buildFlowAnalysis(loaded.seed, loaded.asOf);
  assert.equal(analysis.organization.name, "Fictional Operations Group");
  assert.equal(analysis.asOf, "2026-08-07T12:01:02.345Z");
  assert.equal(analysis.roleCoverage[0].primary.personName, "Alex Example");
});

test("the mapper rejects missing organizations and invalid snapshot timestamps", () => {
  const missingOrganization = operatingModelRows();
  missingOrganization.organizations = [];
  assert.throws(
    () => mapNeonOperatingModel(missingOrganization),
    /organization was not found/,
  );

  const invalidTimestamp = operatingModelRows();
  invalidTimestamp.asOf = "not-a-time";
  assert.throws(
    () => mapNeonOperatingModel(invalidTimestamp),
    /Invalid as-of timestamp/,
  );
});

test("the runtime adapter is organization-scoped and contains only read queries", async () => {
  const adapter = await readFile(
    new URL("../lib/process-explorer-neon.ts", import.meta.url),
    "utf8",
  );
  const databaseClient = await readFile(
    new URL("../db/index.ts", import.meta.url),
    "utf8",
  );

  for (const scope of [
    "organization.id, organizationId",
    "membership.organizationId, organizationId",
    "role.organizationId, organizationId",
    "roleAssignment.organizationId, organizationId",
    "systemTable.organizationId, organizationId",
    "processTable.organizationId, organizationId",
    "processStep.organizationId, organizationId",
    "exceptionTable.organizationId, organizationId",
    "processSystem.organizationId, organizationId",
    "processDependency.organizationId, organizationId",
  ]) {
    assert.match(adapter, new RegExp(scope.replaceAll(".", "\\.")));
  }

  assert.doesNotMatch(adapter, /\.insert\(|\.update\(|\.delete\(|\btruncate\b/i);
  assert.match(adapter, /transaction_timestamp\(\)/);
  assert.match(adapter, /db\.batch\(/);
  assert.match(databaseClient, /isolationLevel: "RepeatableRead"/);
  assert.match(databaseClient, /readOnly: true/);
  assert.doesNotMatch(databaseClient, /DATABASE_URL_UNPOOLED/);
});
