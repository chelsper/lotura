"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addProcessFamilyMembership,
  createProcessFamily,
  deactivateProcessFamily,
  endProcessFamilyMembership,
  updateProcessFamily,
} from "@/lib/process-family-administration";
import type { OperatingModelChangeKind } from "@/lib/operating-model-administration";

import type { ProcessFamilyActionState } from "./action-state";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function metadata(formData: FormData) {
  const rawKind = text(formData, "changeKind");
  const changeKind: OperatingModelChangeKind | null =
    rawKind === "correction" || rawKind === "organizational_change"
      ? rawKind
      : null;
  const date = text(formData, "effectiveDate");
  if (!changeKind || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) return null;
  const effectiveAt = date === today ? new Date() : new Date(`${date}T23:59:59.999Z`);
  if (!Number.isFinite(effectiveAt.getTime())) return null;
  return { changeKind, effectiveAt, reason: text(formData, "reason") };
}

function familyIdentity(formData: FormData) {
  return {
    expectedFamilyRevision: text(formData, "expectedFamilyRevision"),
    familyStableKey: text(formData, "familyStableKey"),
  };
}

function revalidateFamilies(stableKey?: string) {
  revalidatePath("/studio");
  revalidatePath("/studio/processes");
  revalidatePath("/studio/process-families");
  if (stableKey) revalidatePath(`/studio/process-families/${stableKey}`);
}

export async function createProcessFamilyAction(
  _previous: ProcessFamilyActionState,
  formData: FormData,
): Promise<ProcessFamilyActionState> {
  const common = metadata(formData);
  if (!common) return { status: "error", message: "Review the Family details and try again." };
  const result = await createProcessFamily({
    ...common,
    description: text(formData, "description") || null,
    name: text(formData, "name"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidateFamilies(result.stableKey);
  redirect(`/studio/process-families/${result.stableKey}`);
}

export async function updateProcessFamilyAction(
  _previous: ProcessFamilyActionState,
  formData: FormData,
): Promise<ProcessFamilyActionState> {
  const common = metadata(formData);
  if (!common) return { status: "error", message: "Review the Family details and try again." };
  const identity = familyIdentity(formData);
  const result = await updateProcessFamily({
    ...common,
    ...identity,
    description: text(formData, "description") || null,
    name: text(formData, "name"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidateFamilies(identity.familyStableKey);
  return { status: "success", message: result.message };
}

export async function addProcessFamilyMembershipAction(
  _previous: ProcessFamilyActionState,
  formData: FormData,
): Promise<ProcessFamilyActionState> {
  const common = metadata(formData);
  if (!common) return { status: "error", message: "Review the membership details and try again." };
  const identity = familyIdentity(formData);
  const result = await addProcessFamilyMembership({
    ...common,
    ...identity,
    processStableKey: text(formData, "processStableKey"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidateFamilies(identity.familyStableKey);
  return { status: "success", message: result.message };
}

export async function endProcessFamilyMembershipAction(
  _previous: ProcessFamilyActionState,
  formData: FormData,
): Promise<ProcessFamilyActionState> {
  const common = metadata(formData);
  if (!common) return { status: "error", message: "Review the membership details and try again." };
  const identity = familyIdentity(formData);
  const result = await endProcessFamilyMembership({
    ...common,
    ...identity,
    expectedMembershipRevision: text(formData, "expectedMembershipRevision"),
    membershipStableKey: text(formData, "membershipStableKey"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidateFamilies(identity.familyStableKey);
  return { status: "success", message: result.message };
}

export async function deactivateProcessFamilyAction(
  _previous: ProcessFamilyActionState,
  formData: FormData,
): Promise<ProcessFamilyActionState> {
  const common = metadata(formData);
  if (!common) return { status: "error", message: "Review the deactivation details and try again." };
  const identity = familyIdentity(formData);
  const result = await deactivateProcessFamily({ ...common, ...identity });
  if (!result.ok) return { status: "error", message: result.message };
  revalidateFamilies(identity.familyStableKey);
  return { status: "success", message: result.message };
}
