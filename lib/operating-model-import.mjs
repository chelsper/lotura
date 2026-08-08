const KNOWLEDGE_STATE_RANK = new Map([
  ["sanitized-working-draft", 0],
  ["validated", 1],
  ["approved-for-pilot", 2],
]);
const SOURCE_TYPES = new Set([
  "interview",
  "document",
  "observation",
  "working-session",
  "other",
]);
const ACTIVE_INACTIVE = new Set(["active", "inactive"]);
const ACCESS_LEVELS = new Set(["owner", "admin", "member"]);
const ASSIGNMENT_TYPES = new Set(["permanent", "interim", "acting", "backup"]);
const ASSIGNMENT_STATUSES = new Set(["scheduled", "active", "ended", "cancelled"]);
const PROCESS_STATUSES = new Set(["draft", "active", "archived"]);
const SYSTEM_TYPES = new Set(["software", "external_service", "manual_record", "other"]);
const DEPENDENCY_TYPES = new Set(["requires", "receives_from", "provides_to", "triggers"]);

const RECORD_COLLECTIONS = Object.freeze({
  organization: "organization",
  users: "user",
  memberships: "membership",
  roles: "role",
  roleAssignments: "roleAssignment",
  systems: "system",
  processes: "process",
  processSteps: "processStep",
  exceptions: "exception",
  processSystems: "processSystem",
  processDependencies: "processDependency",
});

const ALLOWED_KEYS = Object.freeze({
  root: ["formatVersion", "manifest", "operatingModel", "preparationRegister"],
  manifest: [
    "snapshotKey",
    "organizationKey",
    "scopeLabel",
    "asOf",
    "knowledgeState",
    "sanitizationAttestation",
  ],
  sanitizationAttestation: ["humanReviewed", "reviewedByRole", "reviewedAt"],
  operatingModel: Object.keys(RECORD_COLLECTIONS),
  organization: ["key", "name"],
  user: ["key", "email", "displayName"],
  membership: ["key", "userKey", "accessLevel", "status"],
  role: ["key", "name", "description", "status"],
  roleAssignment: [
    "key",
    "roleKey",
    "membershipKey",
    "assignmentType",
    "status",
    "effectiveFrom",
    "effectiveUntil",
    "reason",
  ],
  system: [
    "key",
    "name",
    "description",
    "systemType",
    "url",
    "ownerRoleKey",
    "status",
  ],
  process: ["key", "name", "purpose", "ownerRoleKey", "status"],
  processStep: [
    "key",
    "processKey",
    "position",
    "title",
    "instructions",
    "responsibleRoleKey",
  ],
  exception: [
    "key",
    "processKey",
    "processStepKey",
    "name",
    "condition",
    "response",
    "status",
    "ownerRoleKey",
  ],
  processSystem: ["key", "processKey", "systemKey", "usage"],
  processDependency: [
    "key",
    "sourceProcessKey",
    "targetProcessKey",
    "dependencyType",
    "description",
  ],
  preparation: [
    "recordType",
    "recordKey",
    "state",
    "sourceType",
    "validatorRole",
    "validatedAt",
    "openConflicts",
  ],
});

const HUMAN_REVIEW_WARNING =
  "Deterministic validation cannot prove that arbitrary free text is safe or sanitized. Human sanitization review remains required.";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pathError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function exactObject(value, path, allowedKeys, errors) {
  if (!isObject(value)) {
    pathError(errors, path, "must be an object");
    return false;
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      pathError(
        errors,
        `${path}.${key}`,
        "is not permitted by the sanitized snapshot format",
      );
    }
  }
  return true;
}

function requiredString(value, path, errors, maximumLength = 10_000) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maximumLength ||
    /[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
  ) {
    pathError(errors, path, `must be a non-blank string of at most ${maximumLength} characters`);
    return null;
  }
  return value.trim();
}

function optionalString(value, path, errors, maximumLength = 10_000) {
  if (value === undefined) return null;
  return requiredString(value, path, errors, maximumLength);
}

function stableKey(value, path, errors) {
  const key = requiredString(value, path, errors, 120);
  if (key && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(key)) {
    pathError(errors, path, "must use lowercase kebab-case");
    return null;
  }
  return key;
}

function enumValue(value, path, allowed, errors) {
  if (!allowed.has(value)) {
    pathError(errors, path, `must be one of: ${[...allowed].join(", ")}`);
    return null;
  }
  return value;
}

function timestamp(value, path, errors, { optional = false } = {}) {
  if (optional && value === undefined) return null;
  const normalized = requiredString(value, path, errors, 64);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== normalized) {
    pathError(errors, path, "must be an ISO 8601 UTC timestamp");
    return null;
  }
  return parsed;
}

function collection(value, name, type, errors) {
  if (!Array.isArray(value)) {
    pathError(errors, `operatingModel.${name}`, "must be an array");
    return [];
  }

  const seen = new Set();
  value.forEach((record, index) => {
    const path = `operatingModel.${name}[${index}]`;
    if (!exactObject(record, path, ALLOWED_KEYS[type], errors)) return;
    const key = stableKey(record.key, `${path}.key`, errors);
    if (key && seen.has(key)) pathError(errors, `${path}.key`, "must be unique in its collection");
    if (key) seen.add(key);
  });
  return value;
}

function reference(key, available, path, label, errors, { optional = false } = {}) {
  if (optional && key === undefined) return null;
  const normalized = stableKey(key, path, errors);
  if (normalized && !available.has(normalized)) {
    pathError(errors, path, `references an unknown ${label}`);
  }
  return normalized;
}

function buildRecordReferences(operatingModel) {
  const references = [];
  for (const [collectionName, recordType] of Object.entries(RECORD_COLLECTIONS)) {
    const records = collectionName === "organization"
      ? [operatingModel.organization]
      : operatingModel[collectionName];
    for (const record of records) {
      if (isObject(record) && typeof record.key === "string") {
        references.push(`${recordType}:${record.key}`);
      }
    }
  }
  return references;
}

function validatePreparationRegister(register, operatingModel, manifestState, errors) {
  if (!Array.isArray(register)) {
    pathError(errors, "preparationRegister", "must be an array");
    return;
  }

  const expected = new Set(buildRecordReferences(operatingModel));
  const found = new Set();
  let minimumRank = Number.POSITIVE_INFINITY;

  register.forEach((entry, index) => {
    const path = `preparationRegister[${index}]`;
    if (!exactObject(entry, path, ALLOWED_KEYS.preparation, errors)) return;
    const recordType = requiredString(entry.recordType, `${path}.recordType`, errors, 40);
    const recordKey = stableKey(entry.recordKey, `${path}.recordKey`, errors);
    const referenceValue = recordType && recordKey ? `${recordType}:${recordKey}` : null;
    if (referenceValue && found.has(referenceValue)) {
      pathError(errors, path, "duplicates a preparation record");
    }
    if (referenceValue && !expected.has(referenceValue)) {
      pathError(errors, path, "references a record that is not in the operating model");
    }
    if (referenceValue) found.add(referenceValue);

    const state = enumValue(
      entry.state,
      `${path}.state`,
      new Set(KNOWLEDGE_STATE_RANK.keys()),
      errors,
    );
    if (state) minimumRank = Math.min(minimumRank, KNOWLEDGE_STATE_RANK.get(state));
    enumValue(entry.sourceType, `${path}.sourceType`, SOURCE_TYPES, errors);

    const validatorRole = optionalString(entry.validatorRole, `${path}.validatorRole`, errors, 255);
    const validatedAt = timestamp(entry.validatedAt, `${path}.validatedAt`, errors, { optional: true });
    if (state && state !== "sanitized-working-draft" && (!validatorRole || !validatedAt)) {
      pathError(errors, path, "validated and approved records require validatorRole and validatedAt");
    }

    if (!Array.isArray(entry.openConflicts)) {
      pathError(errors, `${path}.openConflicts`, "must be an array");
    } else {
      entry.openConflicts.forEach((conflict, conflictIndex) =>
        requiredString(conflict, `${path}.openConflicts[${conflictIndex}]`, errors, 1000),
      );
    }
  });

  for (const referenceValue of expected) {
    if (!found.has(referenceValue)) {
      pathError(errors, "preparationRegister", `is missing ${referenceValue}`);
    }
  }

  const manifestRank = KNOWLEDGE_STATE_RANK.get(manifestState);
  if (Number.isFinite(minimumRank) && manifestRank !== minimumRank) {
    pathError(
      errors,
      "manifest.knowledgeState",
      "must equal the least-mature state represented in preparationRegister",
    );
  }
}

function validateOperatingModel(model, errors) {
  if (!exactObject(model, "operatingModel", ALLOWED_KEYS.operatingModel, errors)) return null;
  if (!exactObject(model.organization, "operatingModel.organization", ALLOWED_KEYS.organization, errors)) {
    return null;
  }

  stableKey(model.organization.key, "operatingModel.organization.key", errors);
  requiredString(model.organization.name, "operatingModel.organization.name", errors, 255);

  const users = collection(model.users, "users", "user", errors);
  const memberships = collection(model.memberships, "memberships", "membership", errors);
  const roles = collection(model.roles, "roles", "role", errors);
  const assignments = collection(model.roleAssignments, "roleAssignments", "roleAssignment", errors);
  const systems = collection(model.systems, "systems", "system", errors);
  const processes = collection(model.processes, "processes", "process", errors);
  const steps = collection(model.processSteps, "processSteps", "processStep", errors);
  const exceptions = collection(model.exceptions, "exceptions", "exception", errors);
  const processSystems = collection(model.processSystems, "processSystems", "processSystem", errors);
  const dependencies = collection(model.processDependencies, "processDependencies", "processDependency", errors);

  const keys = (items) => new Set(items.map((item) => item?.key).filter((key) => typeof key === "string"));
  const userKeys = keys(users);
  const membershipKeys = keys(memberships);
  const roleKeys = keys(roles);
  const systemKeys = keys(systems);
  const processKeys = keys(processes);
  const stepKeys = keys(steps);

  users.forEach((item, index) => {
    const path = `operatingModel.users[${index}]`;
    const email = requiredString(item.email, `${path}.email`, errors, 320);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      pathError(errors, `${path}.email`, "must be a syntactically valid email address");
    }
    requiredString(item.displayName, `${path}.displayName`, errors, 255);
  });

  memberships.forEach((item, index) => {
    const path = `operatingModel.memberships[${index}]`;
    reference(item.userKey, userKeys, `${path}.userKey`, "user", errors);
    enumValue(item.accessLevel, `${path}.accessLevel`, ACCESS_LEVELS, errors);
    enumValue(item.status, `${path}.status`, ACTIVE_INACTIVE, errors);
  });

  roles.forEach((item, index) => {
    const path = `operatingModel.roles[${index}]`;
    requiredString(item.name, `${path}.name`, errors, 255);
    optionalString(item.description, `${path}.description`, errors);
    enumValue(item.status, `${path}.status`, ACTIVE_INACTIVE, errors);
  });

  const activePrimary = new Set();
  assignments.forEach((item, index) => {
    const path = `operatingModel.roleAssignments[${index}]`;
    const roleKey = reference(item.roleKey, roleKeys, `${path}.roleKey`, "role", errors);
    reference(item.membershipKey, membershipKeys, `${path}.membershipKey`, "membership", errors);
    const assignmentType = enumValue(item.assignmentType, `${path}.assignmentType`, ASSIGNMENT_TYPES, errors);
    const status = enumValue(item.status, `${path}.status`, ASSIGNMENT_STATUSES, errors);
    const effectiveFrom = timestamp(item.effectiveFrom, `${path}.effectiveFrom`, errors);
    const effectiveUntil = timestamp(item.effectiveUntil, `${path}.effectiveUntil`, errors, { optional: true });
    optionalString(item.reason, `${path}.reason`, errors);

    if (effectiveFrom && effectiveUntil && effectiveUntil <= effectiveFrom) {
      pathError(errors, `${path}.effectiveUntil`, "must be later than effectiveFrom");
    }
    if (status === "ended" && !effectiveUntil) {
      pathError(errors, `${path}.effectiveUntil`, "is required when status is ended");
    }
    if (status === "active" && assignmentType && assignmentType !== "backup" && roleKey) {
      if (activePrimary.has(roleKey)) {
        pathError(errors, path, "creates more than one active primary assignment for a role");
      }
      activePrimary.add(roleKey);
    }
  });

  systems.forEach((item, index) => {
    const path = `operatingModel.systems[${index}]`;
    requiredString(item.name, `${path}.name`, errors, 255);
    optionalString(item.description, `${path}.description`, errors);
    enumValue(item.systemType, `${path}.systemType`, SYSTEM_TYPES, errors);
    optionalString(item.url, `${path}.url`, errors, 2048);
    reference(item.ownerRoleKey, roleKeys, `${path}.ownerRoleKey`, "role", errors, { optional: true });
    enumValue(item.status, `${path}.status`, ACTIVE_INACTIVE, errors);
  });

  processes.forEach((item, index) => {
    const path = `operatingModel.processes[${index}]`;
    requiredString(item.name, `${path}.name`, errors, 255);
    optionalString(item.purpose, `${path}.purpose`, errors);
    const status = enumValue(item.status, `${path}.status`, PROCESS_STATUSES, errors);
    const owner = reference(item.ownerRoleKey, roleKeys, `${path}.ownerRoleKey`, "role", errors, { optional: true });
    if (status && status !== "draft" && !owner) {
      pathError(errors, `${path}.ownerRoleKey`, "is required for active and archived processes");
    }
  });

  const positions = new Set();
  const stepProcess = new Map();
  steps.forEach((item, index) => {
    const path = `operatingModel.processSteps[${index}]`;
    const processKey = reference(item.processKey, processKeys, `${path}.processKey`, "process", errors);
    if (!Number.isInteger(item.position) || item.position < 1) {
      pathError(errors, `${path}.position`, "must be a positive integer");
    }
    const positionKey = `${processKey}:${item.position}`;
    if (positions.has(positionKey)) pathError(errors, `${path}.position`, "duplicates a position in its process");
    positions.add(positionKey);
    requiredString(item.title, `${path}.title`, errors, 255);
    requiredString(item.instructions, `${path}.instructions`, errors);
    reference(item.responsibleRoleKey, roleKeys, `${path}.responsibleRoleKey`, "role", errors, { optional: true });
    if (typeof item.key === "string" && processKey) stepProcess.set(item.key, processKey);
  });

  exceptions.forEach((item, index) => {
    const path = `operatingModel.exceptions[${index}]`;
    const processKey = reference(item.processKey, processKeys, `${path}.processKey`, "process", errors);
    const stepKey = reference(item.processStepKey, stepKeys, `${path}.processStepKey`, "process step", errors, { optional: true });
    if (stepKey && processKey && stepProcess.get(stepKey) !== processKey) {
      pathError(errors, `${path}.processStepKey`, "must belong to the exception's process");
    }
    requiredString(item.name, `${path}.name`, errors, 255);
    requiredString(item.condition, `${path}.condition`, errors);
    requiredString(item.response, `${path}.response`, errors);
    enumValue(item.status, `${path}.status`, ACTIVE_INACTIVE, errors);
    reference(item.ownerRoleKey, roleKeys, `${path}.ownerRoleKey`, "role", errors, { optional: true });
  });

  const processSystemPairs = new Set();
  processSystems.forEach((item, index) => {
    const path = `operatingModel.processSystems[${index}]`;
    const processKey = reference(item.processKey, processKeys, `${path}.processKey`, "process", errors);
    const systemKey = reference(item.systemKey, systemKeys, `${path}.systemKey`, "system", errors);
    requiredString(item.usage, `${path}.usage`, errors);
    const pair = `${processKey}:${systemKey}`;
    if (processSystemPairs.has(pair)) pathError(errors, path, "duplicates a process-system link");
    processSystemPairs.add(pair);
  });

  const dependencyTriples = new Set();
  dependencies.forEach((item, index) => {
    const path = `operatingModel.processDependencies[${index}]`;
    const source = reference(item.sourceProcessKey, processKeys, `${path}.sourceProcessKey`, "process", errors);
    const target = reference(item.targetProcessKey, processKeys, `${path}.targetProcessKey`, "process", errors);
    const type = enumValue(item.dependencyType, `${path}.dependencyType`, DEPENDENCY_TYPES, errors);
    optionalString(item.description, `${path}.description`, errors);
    if (source && target && source === target) {
      pathError(errors, path, "cannot reference the same process as source and target");
    }
    const triple = `${source}:${target}:${type}`;
    if (dependencyTriples.has(triple)) pathError(errors, path, "duplicates a dependency of the same type");
    dependencyTriples.add(triple);
  });

  return model;
}

export function validateOperatingModelImport(document) {
  const errors = [];
  const warnings = [HUMAN_REVIEW_WARNING];

  if (!exactObject(document, "document", ALLOWED_KEYS.root, errors)) {
    return { errors, valid: false, warnings, summary: null };
  }
  if (document.formatVersion !== "1.0") {
    pathError(errors, "formatVersion", "must be exactly 1.0");
  }

  const manifestValid = exactObject(document.manifest, "manifest", ALLOWED_KEYS.manifest, errors);
  let manifestState = null;
  if (manifestValid) {
    stableKey(document.manifest.snapshotKey, "manifest.snapshotKey", errors);
    const organizationKey = stableKey(document.manifest.organizationKey, "manifest.organizationKey", errors);
    requiredString(document.manifest.scopeLabel, "manifest.scopeLabel", errors, 160);
    timestamp(document.manifest.asOf, "manifest.asOf", errors);
    manifestState = enumValue(
      document.manifest.knowledgeState,
      "manifest.knowledgeState",
      new Set(KNOWLEDGE_STATE_RANK.keys()),
      errors,
    );

    const attestation = document.manifest.sanitizationAttestation;
    if (exactObject(attestation, "manifest.sanitizationAttestation", ALLOWED_KEYS.sanitizationAttestation, errors)) {
      if (attestation.humanReviewed !== true) {
        pathError(errors, "manifest.sanitizationAttestation.humanReviewed", "must be true before validation can pass");
      }
      requiredString(attestation.reviewedByRole, "manifest.sanitizationAttestation.reviewedByRole", errors, 255);
      timestamp(attestation.reviewedAt, "manifest.sanitizationAttestation.reviewedAt", errors);
    }

    if (
      organizationKey &&
      document.operatingModel?.organization?.key !== organizationKey
    ) {
      pathError(errors, "manifest.organizationKey", "must match operatingModel.organization.key");
    }
  }

  const model = validateOperatingModel(document.operatingModel, errors);
  if (model && manifestState) {
    validatePreparationRegister(
      document.preparationRegister,
      model,
      manifestState,
      errors,
    );
  }

  const counts = model
    ? Object.fromEntries(
        Object.keys(RECORD_COLLECTIONS).map((name) => [
          name,
          name === "organization" ? 1 : model[name].length,
        ]),
      )
    : null;

  return {
    errors,
    valid: errors.length === 0,
    warnings,
    summary: counts && manifestState
      ? { counts, knowledgeState: manifestState }
      : null,
  };
}

export { HUMAN_REVIEW_WARNING };
