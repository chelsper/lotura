import { DISCOVERY_MAPPING_ACTIONS } from "./discovery-mapping-model.mjs";

export const DISCOVERY_PROCESS_PROPOSAL_PROMPT_POLICY_VERSION =
  "lad-068-alpha-v1";

const ACTIONS = new Set(DISCOVERY_MAPPING_ACTIONS);
const DEPENDENCY_DIRECTIONS = new Set(["upstream", "downstream"]);
const DEPENDENCY_TYPES = new Set([
  "requires",
  "receives_from",
  "provides_to",
  "triggers",
]);

function text(value, maximum, nullable = false) {
  if (value == null && nullable) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) return undefined;
  return normalized;
}

function textArray(value, maximumItems = 20, maximumLength = 1200) {
  if (!Array.isArray(value) || value.length > maximumItems) return undefined;
  const normalized = value.map((item) => text(item, maximumLength));
  return normalized.every(Boolean) ? normalized : undefined;
}

function nullableUuid(value, allowed) {
  if (value == null) return null;
  return typeof value === "string" && allowed.has(value) ? value : undefined;
}

function optionalText(value, maximum) {
  return value == null ? null : text(value, maximum);
}

function validChangeShape(change) {
  const has = (name) => change[name] !== null;
  switch (change.action) {
    case "update_process_purpose":
      return has("proposedPurpose");
    case "change_process_owner":
      return true;
    case "add_process_step":
      return has("proposedStepTitle")
        && has("proposedStepInstructions")
        && Number.isSafeInteger(change.proposedStepPosition)
        && change.proposedStepPosition >= 1;
    case "revise_process_step":
      return has("processStepId")
        && has("proposedStepTitle")
        && has("proposedStepInstructions");
    case "change_step_responsibility":
      return has("processStepId");
    case "link_existing_system":
      return has("systemId") && has("systemUsage");
    case "add_process_exception":
      return has("exceptionName")
        && has("exceptionCondition")
        && has("exceptionResponse");
    case "revise_process_exception":
      return has("exceptionId")
        && has("exceptionName")
        && has("exceptionCondition")
        && has("exceptionResponse");
    case "add_process_dependency":
      return has("relatedProcessId")
        && DEPENDENCY_DIRECTIONS.has(change.dependencyDirection)
        && DEPENDENCY_TYPES.has(change.dependencyType);
    case "preserve_unresolved":
      return has("unresolvedQuestion");
    default:
      return false;
  }
}

export function validateDiscoveryProcessProposalDraft(value, context = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const summary = text(value.summary, 6000);
  const clear = textArray(value.clear, 20, 1200);
  const needsValidation = textArray(value.needsValidation, 20, 1200);
  const conflicts = textArray(value.conflicts, 20, 1200);
  if (!summary || !clear || !needsValidation || !conflicts) return null;

  const process = value.process;
  if (!process || typeof process !== "object" || Array.isArray(process)) {
    return null;
  }
  const participants = textArray(process.participants, 30, 500);
  const handoffs = textArray(process.handoffs, 30, 1200);
  const exceptions = textArray(process.exceptions, 30, 1200);
  const dependencies = textArray(process.dependencies, 30, 1200);
  if (!participants || !handoffs || !exceptions || !dependencies) return null;
  if (!Array.isArray(process.steps) || process.steps.length > 40) return null;
  const steps = process.steps.map((step) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) return null;
    const sequence = step.sequence;
    const title = text(step.title, 255);
    const description = text(step.description, 2000);
    const responsibleRole = optionalText(step.responsibleRole, 500);
    const systems = textArray(step.systems, 12, 500);
    if (
      !Number.isSafeInteger(sequence)
      || sequence < 1
      || !title
      || !description
      || responsibleRole === undefined
      || !systems
    ) return null;
    return { description, responsibleRole, sequence, systems, title };
  });
  if (steps.some((step) => step === null)) return null;

  const normalizedProcess = {
    dependencies,
    endBoundary: optionalText(process.endBoundary, 2000),
    exceptions,
    handoffs,
    ownerRole: optionalText(process.ownerRole, 500),
    participants,
    purpose: optionalText(process.purpose, 2000),
    steps,
    trigger: optionalText(process.trigger, 2000),
  };
  if (Object.values(normalizedProcess).some((item) => item === undefined)) {
    return null;
  }

  if (!Array.isArray(value.changes) || value.changes.length > 20) return null;
  const allowedObservationIds = new Set(context.observationIds ?? []);
  const allowedStepIds = new Set(context.stepIds ?? []);
  const allowedRoleIds = new Set(context.roleIds ?? []);
  const allowedSystemIds = new Set(context.systemIds ?? []);
  const allowedExceptionIds = new Set(context.exceptionIds ?? []);
  const allowedProcessIds = new Set(context.processIds ?? []);
  const changes = value.changes.map((change) => {
    if (!change || typeof change !== "object" || Array.isArray(change)) {
      return null;
    }
    if (!ACTIONS.has(change.action)) return null;
    const title = text(change.title, 255);
    const rationale = text(change.rationale, 2000);
    if (!title || !rationale) return null;
    if (
      !Array.isArray(change.sourceObservationIds)
      || change.sourceObservationIds.length < 1
      || change.sourceObservationIds.length > 50
    ) return null;
    const sourceObservationIds = [...new Set(change.sourceObservationIds)];
    if (
      sourceObservationIds.some(
        (id) => typeof id !== "string" || !allowedObservationIds.has(id),
      )
    ) return null;

    const normalized = {
      action: change.action,
      dependencyDescription: optionalText(change.dependencyDescription, 2000),
      dependencyDirection: change.dependencyDirection,
      dependencyType: change.dependencyType,
      exceptionCondition: optionalText(change.exceptionCondition, 5000),
      exceptionId: nullableUuid(change.exceptionId, allowedExceptionIds),
      exceptionName: optionalText(change.exceptionName, 255),
      exceptionResponse: optionalText(change.exceptionResponse, 5000),
      ownerRoleId: nullableUuid(change.ownerRoleId, allowedRoleIds),
      processStepId: nullableUuid(change.processStepId, allowedStepIds),
      proposedPurpose: optionalText(change.proposedPurpose, 10000),
      proposedStepInstructions: optionalText(
        change.proposedStepInstructions,
        10000,
      ),
      proposedStepPosition: change.proposedStepPosition,
      proposedStepTitle: optionalText(change.proposedStepTitle, 255),
      rationale,
      relatedProcessId: nullableUuid(change.relatedProcessId, allowedProcessIds),
      responsibleRoleId: nullableUuid(change.responsibleRoleId, allowedRoleIds),
      sourceObservationIds,
      systemId: nullableUuid(change.systemId, allowedSystemIds),
      systemUsage: optionalText(change.systemUsage, 2000),
      title,
      unresolvedQuestion: optionalText(change.unresolvedQuestion, 2000),
    };
    if (
      Object.entries(normalized).some(
        ([key, item]) => key !== "proposedStepPosition" && item === undefined,
      )
      || (
        normalized.proposedStepPosition !== null
        && (!Number.isSafeInteger(normalized.proposedStepPosition)
          || normalized.proposedStepPosition < 1
          || normalized.proposedStepPosition > 1000)
      )
      || (
        normalized.dependencyDirection !== null
        && !DEPENDENCY_DIRECTIONS.has(normalized.dependencyDirection)
      )
      || (
        normalized.dependencyType !== null
        && !DEPENDENCY_TYPES.has(normalized.dependencyType)
      )
      || !validChangeShape(normalized)
    ) return null;
    return normalized;
  });
  if (changes.some((change) => change === null)) return null;

  return {
    changes,
    clear,
    conflicts,
    needsValidation,
    process: normalizedProcess,
    summary,
  };
}
