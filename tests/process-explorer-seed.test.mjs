import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const seed = JSON.parse(
  await readFile(
    new URL("../db/seeds/process-explorer.json", import.meta.url),
    "utf8",
  ),
);

function keys(items) {
  return new Set(items.map((item) => item.key));
}

const userKeys = keys(seed.users);
const membershipKeys = keys(seed.memberships);
const roleKeys = keys(seed.roles);
const systemKeys = keys(seed.systems);
const processKeys = keys(seed.processes);
const stepKeys = keys(seed.processSteps);

test("the fixture describes one complete fictional operating model", () => {
  assert.equal(seed.organization.name, "Northstar Service Collective");
  assert.equal(seed.processes.length, 6);
  assert.equal(seed.roles.length, 7);
  assert.equal(seed.systems.length, 6);
  assert.ok(seed.exceptions.length >= 6);
  assert.ok(seed.processDependencies.length >= 5);
  assert.ok(seed.users.every((user) => user.email.endsWith("@example.test")));
});

test("every relationship points to an entity in the same fixture", () => {
  for (const membership of seed.memberships) {
    assert.ok(userKeys.has(membership.userKey));
  }

  for (const assignment of seed.roleAssignments) {
    assert.ok(roleKeys.has(assignment.roleKey));
    assert.ok(membershipKeys.has(assignment.membershipKey));
  }

  for (const system of seed.systems) {
    if (system.ownerRoleKey) assert.ok(roleKeys.has(system.ownerRoleKey));
  }

  for (const process of seed.processes) {
    if (process.ownerRoleKey) assert.ok(roleKeys.has(process.ownerRoleKey));
  }

  for (const step of seed.processSteps) {
    assert.ok(processKeys.has(step.processKey));
    if (step.responsibleRoleKey) {
      assert.ok(roleKeys.has(step.responsibleRoleKey));
    }
  }

  for (const processException of seed.exceptions) {
    assert.ok(processKeys.has(processException.processKey));
    if (processException.processStepKey) {
      assert.ok(stepKeys.has(processException.processStepKey));
      const step = seed.processSteps.find(
        (item) => item.key === processException.processStepKey,
      );
      assert.equal(step.processKey, processException.processKey);
    }
    if (processException.ownerRoleKey) {
      assert.ok(roleKeys.has(processException.ownerRoleKey));
    }
  }

  for (const processSystem of seed.processSystems) {
    assert.ok(processKeys.has(processSystem.processKey));
    assert.ok(systemKeys.has(processSystem.systemKey));
  }
});

test("the fixture respects Version 0.1 ownership and assignment constraints", () => {
  for (const process of seed.processes) {
    if (process.status !== "draft") assert.ok(process.ownerRoleKey);
  }

  for (const role of seed.roles) {
    const activePrimaryAssignments = seed.roleAssignments.filter(
      (assignment) =>
        assignment.roleKey === role.key &&
        assignment.status === "active" &&
        assignment.assignmentType !== "backup",
    );
    assert.ok(activePrimaryAssignments.length <= 1);
  }
});

test("steps have positive, unique positions within each process", () => {
  const positions = new Set();

  for (const step of seed.processSteps) {
    assert.ok(step.position >= 1);
    const key = `${step.processKey}:${step.position}`;
    assert.ok(!positions.has(key));
    positions.add(key);
  }
});

test("dependencies are unique, connected, and never self-referencing", () => {
  const dependencies = new Set();

  for (const dependency of seed.processDependencies) {
    assert.ok(processKeys.has(dependency.sourceProcessKey));
    assert.ok(processKeys.has(dependency.targetProcessKey));
    assert.notEqual(
      dependency.sourceProcessKey,
      dependency.targetProcessKey,
    );

    const key = `${dependency.sourceProcessKey}:${dependency.targetProcessKey}:${dependency.dependencyType}`;
    assert.ok(!dependencies.has(key));
    dependencies.add(key);
  }
});
