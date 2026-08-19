"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addProcessFamilyRelationship,
  addProcessFamilyMembership,
  createProcessFamily,
  deactivateProcessFamily,
  endProcessFamilyRelationship,
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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function creationContinuation(formData: FormData, createdStableKey: string) {
  const sourceFamilyStableKey = text(formData, "sourceFamilyStableKey");
  const relationshipIntent = text(formData, "relationshipIntent");
  if (
    !uuidPattern.test(sourceFamilyStableKey) ||
    !uuidPattern.test(createdStableKey) ||
    (relationshipIntent !== "broader" && relationshipIntent !== "narrower")
  ) {
    return `/studio/process-families/${createdStableKey}`;
  }

  const narrowerFamilyStableKey =
    relationshipIntent === "broader" ? sourceFamilyStableKey : createdStableKey;
  const broaderFamilyStableKey =
    relationshipIntent === "broader" ? createdStableKey : sourceFamilyStableKey;
  const query = new URLSearchParams({ broaderFamily: broaderFamilyStableKey });
  return `/studio/process-families/${narrowerFamilyStableKey}?${query.toString()}#family-grouping-form`;
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
  redirect(creationContinuation(formData, result.stableKey!));
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

export async function addProcessFamilyRelationshipAction(
  _previous: ProcessFamilyActionState,
  formData: FormData,
): Promise<ProcessFamilyActionState> {
  const common = metadata(formData);
  if (!common) return { status: "error", message: "Review the Family relationship details and try again." };
  const identity = familyIdentity(formData);
  const result = await addProcessFamilyRelationship({
    ...common,
    ...identity,
    broaderFamilyStableKey: text(formData, "broaderFamilyStableKey"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidateFamilies(identity.familyStableKey);
  return { status: "success", message: result.message };
}

export async function endProcessFamilyRelationshipAction(
  _previous: ProcessFamilyActionState,
  formData: FormData,
): Promise<ProcessFamilyActionState> {
  const common = metadata(formData);
  if (!common) return { status: "error", message: "Review the Family relationship details and try again." };
  const identity = familyIdentity(formData);
  const result = await endProcessFamilyRelationship({
    ...common,
    ...identity,
    expectedRelationshipRevision: text(formData, "expectedRelationshipRevision"),
    relationshipStableKey: text(formData, "relationshipStableKey"),
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
