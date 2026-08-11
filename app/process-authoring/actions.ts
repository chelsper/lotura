"use server";

import { revalidatePath } from "next/cache";

import {
  changeProcessOwner,
  type OperatingModelChangeKind,
  updateProcessDefinition,
} from "@/lib/operating-model-administration";

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
