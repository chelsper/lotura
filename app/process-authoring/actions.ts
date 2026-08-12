"use server";

import { revalidatePath } from "next/cache";

import {
  changeProcessStepResponsibility,
  changeProcessOwner,
  createProcessStep,
  reorderProcessStep,
  type OperatingModelChangeKind,
  updateProcessDefinition,
  updateProcessStep,
} from "@/lib/operating-model-administration";
import {
  createException,
  deactivateException,
  linkSystemToProcess,
  unlinkSystemFromProcess,
  updateException,
  updateProcessSystemUsage,
} from "@/lib/technology-exceptions-administration";

import type { ProcessAuthoringActionState } from "./action-state";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function changeKind(formData: FormData): OperatingModelChangeKind | null {
  const value = text(formData, "changeKind");
  return ["correction", "organizational_change"].includes(value)
    ? (value as OperatingModelChangeKind)
    : null;
}

function effectiveAt(formData: FormData) {
  const value = text(formData, "effectiveDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (value > today) return null;
  const parsed = value === today ? new Date() : new Date(`${value}T23:59:59.999Z`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function commonInput(formData: FormData) {
  const parsedChangeKind = changeKind(formData);
  const parsedEffectiveAt = effectiveAt(formData);
  if (!parsedChangeKind || !parsedEffectiveAt) return null;
  return {
    changeKind: parsedChangeKind,
    effectiveAt: parsedEffectiveAt,
    expectedRevision: text(formData, "expectedRevision"),
    processKey: text(formData, "processKey"),
    processStableKey: text(formData, "processStableKey"),
    reason: text(formData, "reason"),
  };
}

function revalidateProcess(processKey: string) {
  const encoded = encodeURIComponent(processKey);
  revalidatePath("/explorer");
  revalidatePath(`/explorer/${encoded}`);
  revalidatePath(`/explorer/${encoded}/maintain`);
  revalidatePath("/studio/processes");
  revalidatePath(`/studio/processes/${encoded}`);
  revalidatePath("/studio/technology");
  revalidatePath("/organization");
}

export async function updateProcessDefinitionAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the change details and try again." };
  }

  const result = await updateProcessDefinition({
    ...common,
    name: text(formData, "name"),
    purpose: text(formData, "purpose") || null,
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}

export async function changeProcessOwnerAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the ownership change and try again." };
  }

  const result = await changeProcessOwner({
    ...common,
    ownerConfirmed: text(formData, "ownerConfirmed") === "yes",
    ownerRoleKey: text(formData, "ownerRoleKey") || null,
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}

export async function createProcessStepAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the Step details and try again." };
  }

  const result = await createProcessStep({
    ...common,
    instructions: text(formData, "instructions"),
    responsibleRoleKey: text(formData, "responsibleRoleKey") || null,
    title: text(formData, "title"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}

export async function updateProcessStepAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the Step wording and try again." };
  }

  const result = await updateProcessStep({
    ...common,
    expectedStepRevision: text(formData, "expectedStepRevision"),
    instructions: text(formData, "instructions"),
    stepStableKey: text(formData, "stepStableKey"),
    title: text(formData, "title"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}

export async function changeProcessStepResponsibilityAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the responsibility change and try again." };
  }

  const result = await changeProcessStepResponsibility({
    ...common,
    expectedStepRevision: text(formData, "expectedStepRevision"),
    responsibleRoleKey: text(formData, "responsibleRoleKey") || null,
    stepStableKey: text(formData, "stepStableKey"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}

export async function reorderProcessStepAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  const direction = text(formData, "direction");
  if (!common || !["earlier", "later"].includes(direction)) {
    return { status: "error", message: "Review the Step order change and try again." };
  }

  const result = await reorderProcessStep({
    ...common,
    direction: direction as "earlier" | "later",
    expectedStepRevision: text(formData, "expectedStepRevision"),
    stepStableKey: text(formData, "stepStableKey"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}

export async function linkProcessSystemAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the System relationship and try again." };
  }
  const result = await linkSystemToProcess({
    ...common,
    systemStableKey: text(formData, "systemStableKey"),
    usage: text(formData, "usage"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  revalidatePath(`/studio/technology/systems/${text(formData, "systemStableKey")}`);
  return { status: "success", message: result.message };
}

export async function updateProcessSystemUsageAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the System usage and try again." };
  }
  const systemStableKey = text(formData, "systemStableKey");
  const result = await updateProcessSystemUsage({
    ...common,
    systemStableKey,
    usage: text(formData, "usage"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  revalidatePath(`/studio/technology/systems/${systemStableKey}`);
  return { status: "success", message: result.message };
}

export async function unlinkProcessSystemAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the System relationship and try again." };
  }
  const systemStableKey = text(formData, "systemStableKey");
  const result = await unlinkSystemFromProcess({
    ...common,
    systemStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  revalidatePath(`/studio/technology/systems/${systemStableKey}`);
  return { status: "success", message: result.message };
}

function exceptionDefinition(formData: FormData) {
  return {
    condition: text(formData, "condition"),
    name: text(formData, "name"),
    ownerRoleKey: text(formData, "ownerRoleKey") || null,
    response: text(formData, "response"),
    stepStableKey: text(formData, "stepStableKey") || null,
  };
}

export async function createExceptionAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the Exception details and try again." };
  }
  const result = await createException({
    ...common,
    ...exceptionDefinition(formData),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}

export async function updateExceptionAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the Exception details and try again." };
  }
  const result = await updateException({
    ...common,
    ...exceptionDefinition(formData),
    exceptionStableKey: text(formData, "exceptionStableKey"),
    expectedExceptionRevision: text(formData, "expectedExceptionRevision"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}

export async function deactivateExceptionAction(
  _previousState: ProcessAuthoringActionState,
  formData: FormData,
): Promise<ProcessAuthoringActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the Exception change and try again." };
  }
  const result = await deactivateException({
    ...common,
    exceptionStableKey: text(formData, "exceptionStableKey"),
    expectedExceptionRevision: text(formData, "expectedExceptionRevision"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateProcess(common.processKey);
  return { status: "success", message: result.message };
}
