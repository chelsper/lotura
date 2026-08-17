import { createHash } from "node:crypto";

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalValue(item)]),
  );
}

function compareStableKey(left, right) {
  return left.stableKey.localeCompare(right.stableKey);
}

export function buildProcessVersionSnapshot(input) {
  return {
    dependencies: [...input.dependencies]
      .map((item) => ({
        dependencyType: item.dependencyType,
        description: item.description ?? null,
        direction: item.direction,
        sourceProcess: {
          name: item.sourceProcessName,
          stableKey: item.sourceProcessStableKey,
        },
        stableKey: item.stableKey,
        targetProcess: {
          name: item.targetProcessName,
          stableKey: item.targetProcessStableKey,
        },
      }))
      .sort(
        (left, right) =>
          left.sourceProcess.stableKey.localeCompare(
            right.sourceProcess.stableKey,
          ) ||
          left.targetProcess.stableKey.localeCompare(
            right.targetProcess.stableKey,
          ) ||
          left.dependencyType.localeCompare(right.dependencyType) ||
          left.stableKey.localeCompare(right.stableKey),
      ),
    exceptions: [...input.exceptions]
      .map((item) => ({
        condition: item.condition,
        name: item.name,
        ownerRole: item.ownerRoleStableKey
          ? {
              name: item.ownerRoleName,
              stableKey: item.ownerRoleStableKey,
            }
          : null,
        processStepStableKey: item.processStepStableKey ?? null,
        processStepTitle: item.processStepTitle ?? null,
        response: item.response,
        stableKey: item.stableKey,
        status: item.status,
      }))
      .sort(compareStableKey),
    formatVersion: 1,
    process: {
      name: input.process.name,
      ownerRole: input.process.ownerRoleStableKey
        ? {
            name: input.process.ownerRoleName,
            stableKey: input.process.ownerRoleStableKey,
          }
        : null,
      purpose: input.process.purpose ?? null,
      stableKey: input.process.stableKey,
      status: input.process.status,
    },
    steps: [...input.steps]
      .map((item) => ({
        instructions: item.instructions,
        position: item.position,
        responsibleRole: item.responsibleRoleStableKey
          ? {
              name: item.responsibleRoleName,
              stableKey: item.responsibleRoleStableKey,
            }
          : null,
        stableKey: item.stableKey,
        title: item.title,
      }))
      .sort(
        (left, right) =>
          left.position - right.position ||
          left.stableKey.localeCompare(right.stableKey),
      ),
    systems: [...input.systems]
      .map((item) => ({
        description: item.description ?? null,
        name: item.name,
        stableKey: item.stableKey,
        status: item.status,
        type: item.type,
        usage: item.usage,
      }))
      .sort(compareStableKey),
  };
}

export function fingerprintProcessVersionSnapshot(snapshot) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(snapshot)))
    .digest("hex");
}
