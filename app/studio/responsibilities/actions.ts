"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  establishRoleMandate,
  inactivateOperationalRole,
  updateOperationalRole,
  type StructureChangeKind,
} from "@/lib/organization-structure-administration";
import type { StructureActionState } from "@/app/organization/action-state";

function textValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function metadata(formData: FormData) {
  const changeKind = textValue(formData, "changeKind");
  const effectiveDate = textValue(formData, "effectiveDate");
  if (
    !["correction", "organizational_change"].includes(changeKind) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ||
    effectiveDate > new Date().toISOString().slice(0, 10)
  ) {
    return null;
  }
  const effectiveAt =
    effectiveDate === new Date().toISOString().slice(0, 10)
      ? new Date()
      : new Date(`${effectiveDate}T23:59:59.999Z`);
  if (!Number.isFinite(effectiveAt.getTime())) return null;
  return {
    changeKind: changeKind as StructureChangeKind,
    effectiveAt,
    expectedRevision: textValue(formData, "expectedRevision"),
    reason: textValue(formData, "reason"),
  };
}

function refreshResponsibilityPaths(roleStableKey?: string) {
  revalidatePath("/organization");
  revalidatePath("/studio");
  revalidatePath("/studio/organization");
  revalidatePath("/studio/responsibilities");
  if (roleStableKey) {
    revalidatePath(
      `/studio/responsibilities/roles/${encodeURIComponent(roleStableKey)}`,
    );
  }
}

export async function createOperationalRoleWithMandateAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const parsed = metadata(formData);
  const mandateType = textValue(formData, "mandateType");
  if (!parsed || !["primary", "shared"].includes(mandateType)) {
    return { status: "error", message: "Review the Role and first mandate details." };
  }
  const result = await establishRoleMandate({
    ...parsed,
    changeKind: "organizational_change",
    mandateType: mandateType as "primary" | "shared",
    newRoleDescription: textValue(formData, "newRoleDescription") || null,
    newRoleName: textValue(formData, "newRoleName"),
    positionStableKey: textValue(formData, "positionStableKey"),
    roleKey: "create-new",
    scope: textValue(formData, "scope") || null,
  });
  if (!result.ok) return { status: "error", message: result.message };
  if (!result.stableKey) {
    return { status: "error", message: "The new Operational Role could not be opened safely." };
  }
  refreshResponsibilityPaths(result.stableKey);
  redirect(
    `/studio/responsibilities/roles/${encodeURIComponent(result.stableKey)}`,
  );
}

export async function updateOperationalRoleAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const parsed = metadata(formData);
  const stableKey = textValue(formData, "stableKey");
  if (!parsed || !stableKey) {
    return { status: "error", message: "Review the Operational Role change." };
  }
  const result = await updateOperationalRole({
    ...parsed,
    description: textValue(formData, "description") || null,
    name: textValue(formData, "name"),
    stableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };
  refreshResponsibilityPaths(stableKey);
  return { status: "success", message: result.message };
}

export async function inactivateOperationalRoleAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const parsed = metadata(formData);
  const stableKey = textValue(formData, "stableKey");
  if (
    !parsed ||
    !stableKey ||
    textValue(formData, "confirmInactivation") !== "confirmed"
  ) {
    return {
      status: "error",
      message: "Confirm the history-preserving removal and review its details.",
    };
  }
  const result = await inactivateOperationalRole({ ...parsed, stableKey });
  if (!result.ok) return { status: "error", message: result.message };
  refreshResponsibilityPaths();
  redirect("/studio/responsibilities");
}
