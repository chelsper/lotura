import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeDependencyGraph,
  analyzeProcessChangeImpact,
  analyzeStepResponsibilities,
  analyzeSystemImpact,
  buildFlowAnalysis,
  getRoleCoverage,
} from "../lib/flow-analysis.mjs";

const AS_OF = "2026-08-07T12:00:00.000Z";

function makeSeed() {
  return {
    organization: { name: "Fictional Flow Cooperative" },
    users: [
      { key: "person-one", email: "one@example.test", displayName: "Person One" },
      { key: "person-two", email: "two@example.test", displayName: "Person Two" },
    ],
    memberships: [
      { key: "member-one", userKey: "person-one", accessLevel: "member", status: "active" },
      { key: "member-two", userKey: "person-two", accessLevel: "member", status: "active" },
    ],
    roles: [
      { key: "owner-role", name: "Owner Role", status: "active" },
      { key: "other-role", name: "Other Role", status: "active" },
      { key: "system-role", name: "System Role", status: "active" },
    ],
    roleAssignments: [
      {
        roleKey: "owner-role",
        membershipKey: "member-one",
        assignmentType: "permanent",
        status: "active",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
      },
      {
        roleKey: "owner-role",
        membershipKey: "member-two",
        assignmentType: "backup",
        status: "active",
        effectiveFrom: "2026-02-01T00:00:00.000Z",
      },
      {
        roleKey: "other-role",
        membershipKey: "member-two",
        assignmentType: "permanent",
        status: "active",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
      },
      {
        roleKey: "system-role",
        membershipKey: "member-one",
        assignmentType: "permanent",
        status: "active",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
      },
    ],
    systems: [
      {
        key: "direct-system",
        name: "Direct System",
        systemType: "software",
        ownerRoleKey: "system-role",
        status: "active",
      },
      {
        key: "context-system",
        name: "Context System",
        systemType: "software",
        ownerRoleKey: "owner-role",
        status: "active",
      },
    ],
    processes: [
      { key: "process-a", name: "Process A", ownerRoleKey: "owner-role", status: "active" },
      { key: "process-b", name: "Process B", ownerRoleKey: "other-role", status: "active" },
      { key: "process-c", name: "Process C", ownerRoleKey: "other-role", status: "active" },
    ],
    processSteps: [
      {
        key: "step-inherited",
        processKey: "process-a",
        position: 1,
        title: "Inherited step",
        instructions: "Follow the inherited responsibility.",
      },
      {
        key: "step-explicit",
        processKey: "process-a",
        position: 2,
        title: "Explicit step",
        instructions: "Follow the explicit responsibility.",
        responsibleRoleKey: "other-role",
      },
    ],
    exceptions: [
      {
        key: "exception-a",
        processKey: "process-a",
        name: "Exception A",
        condition: "A fictional condition occurs.",
        response: "Use a fictional response.",
        status: "active",
        ownerRoleKey: "owner-role",
      },
    ],
    processSystems: [
      { processKey: "process-a", systemKey: "direct-system", usage: "Directly supports Process A." },
    ],
    processDependencies: [
      { sourceProcessKey: "process-a", targetProcessKey: "process-b", dependencyType: "triggers" },
      { sourceProcessKey: "process-b", targetProcessKey: "process-c", dependencyType: "provides_to" },
    ],
  };
}

test("current assignment handling respects dates and active membership", () => {
  const seed = makeSeed();
  let coverage = getRoleCoverage(seed, AS_OF);
  assert.equal(coverage.find((item) => item.roleId === "owner-role").primary.personName, "Person One");

  seed.roleAssignments[0].effectiveFrom = "2026-09-01T00:00:00.000Z";
  coverage = getRoleCoverage(seed, AS_OF);
  assert.equal(coverage.find((item) => item.roleId === "owner-role").primary, null);

  seed.roleAssignments[0].effectiveFrom = "2026-01-01T00:00:00.000Z";
  seed.roleAssignments[0].effectiveUntil = AS_OF;
  coverage = getRoleCoverage(seed, AS_OF);
  assert.equal(coverage.find((item) => item.roleId === "owner-role").primary, null);

  delete seed.roleAssignments[0].effectiveUntil;
  seed.memberships[0].status = "inactive";
  coverage = getRoleCoverage(seed, AS_OF);
  assert.equal(coverage.find((item) => item.roleId === "owner-role").primary, null);
});

test("missing step responsibility inherits the process owner", () => {
  const responsibilities = analyzeStepResponsibilities(makeSeed(), AS_OF);
  const inherited = responsibilities.find((item) => item.stepId === "step-inherited");
  const explicit = responsibilities.find((item) => item.stepId === "step-explicit");

  assert.equal(inherited.classification, "inherited");
  assert.equal(inherited.roleId, "owner-role");
  assert.equal(inherited.basis, "inherited");
  assert.equal(explicit.classification, "explicit");
  assert.equal(explicit.roleId, "other-role");
});

test("vacancy detection includes inherited responsibility and backup evidence", () => {
  const seed = makeSeed();
  seed.roleAssignments[0].status = "ended";
  seed.roleAssignments[0].effectiveUntil = "2026-07-01T00:00:00.000Z";

  const analysis = buildFlowAnalysis(seed, AS_OF);
  const vacancy = analysis.currentGaps.find((item) => item.id === "vacant-owner-role");
  const inherited = analysis.responsibilities.find((item) => item.stepId === "step-inherited");

  assert.ok(vacancy);
  assert.equal(vacancy.facts.find((item) => item.label === "Active backups").value, "1");
  assert.equal(inherited.classification, "unstaffed");
});

test("temporary coverage is current only inside its effective window", () => {
  const seed = makeSeed();
  seed.roleAssignments[0].assignmentType = "acting";
  seed.roleAssignments[0].reason = "Fictional temporary cover.";

  let analysis = buildFlowAnalysis(seed, AS_OF);
  assert.ok(analysis.currentGaps.some((item) => item.id === "temporary-owner-role"));

  seed.roleAssignments[0].effectiveUntil = "2026-08-01T00:00:00.000Z";
  analysis = buildFlowAnalysis(seed, AS_OF);
  assert.ok(!analysis.currentGaps.some((item) => item.id === "temporary-owner-role"));
  assert.ok(analysis.currentGaps.some((item) => item.id === "vacant-owner-role"));
});

test("dependency cycles are collapsed before depth is calculated", () => {
  const seed = makeSeed();
  seed.processDependencies.push({
    sourceProcessKey: "process-c",
    targetProcessKey: "process-a",
    dependencyType: "requires",
  });

  const graph = analyzeDependencyGraph(seed);
  for (const process of graph) {
    assert.deepEqual(process.cycleProcessIds, ["process-a", "process-b", "process-c"]);
    assert.equal(process.upstreamDepth, 0);
    assert.equal(process.downstreamDepth, 0);
  }
});

test("system impact separates direct from propagated process impact", () => {
  const impacts = analyzeSystemImpact(makeSeed());
  const directSystem = impacts.find((item) => item.systemId === "direct-system");

  assert.deepEqual(directSystem.directProcessIds, ["process-a"]);
  assert.deepEqual(directSystem.potentialIndirectIds, ["process-b", "process-c"]);
});

test("process-change review uses linked systems and keeps role-owned systems contextual", () => {
  const impacts = analyzeProcessChangeImpact(makeSeed());
  const process = impacts.find((item) => item.processId === "process-a");

  assert.deepEqual(process.directSystemIds, ["direct-system"]);
  assert.deepEqual(process.contextualSystemIds, ["context-system"]);
  assert.deepEqual(process.directDownstreamIds, ["process-b"]);
  assert.deepEqual(process.potentialIndirectIds, ["process-c"]);
});

test("orphan and restructuring findings expose raw responsibility references", () => {
  const analysis = buildFlowAnalysis(makeSeed(), AS_OF);
  const role = analysis.scenarios.roles.find((item) => item.roleId === "owner-role");

  assert.equal(role.vacancy.evidence, "Direct impact");
  assert.equal(role.vacancy.facts.find((item) => item.label === "Active backups").value, "1");
  assert.equal(role.restructuring.facts.find((item) => item.label === "Process owners").value, "1");
  assert.equal(role.restructuring.facts.find((item) => item.label === "Explicit step roles").value, "0");
  assert.equal(role.restructuring.facts.find((item) => item.label === "Inherited steps affected").value, "1");
  assert.equal(role.restructuring.facts.find((item) => item.label === "Exceptions owned").value, "1");
  assert.equal(role.restructuring.facts.find((item) => item.label === "Systems owned").value, "1");
  assert.equal(role.restructuring.facts.find((item) => item.label === "Role assignments").value, "2");
  assert.match(role.vacancy.howDetermined, /hypothetically removes the current primary assignment/i);
});

test("every surfaced finding includes supporting facts and an explanation", () => {
  const analysis = buildFlowAnalysis(makeSeed(), AS_OF);
  const findings = [
    ...analysis.currentGaps,
    ...analysis.concentrations.roles,
    ...analysis.concentrations.exceptions,
    ...analysis.concentrations.systems,
    ...analysis.concentrations.dependencies,
    ...analysis.scenarios.roles.flatMap((item) => [item.vacancy, item.restructuring]),
    ...analysis.scenarios.systems,
    ...analysis.scenarios.processes,
  ];

  assert.ok(findings.length > 0);
  for (const item of findings) {
    assert.ok(item.facts.length > 0, `${item.id} should expose supporting facts`);
    assert.ok(item.howDetermined.length > 0, `${item.id} should explain its rule`);
  }
});
