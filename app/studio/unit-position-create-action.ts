"use server";

import { revalidatePath } from "next/cache";

import { createPosition } from "@/lib/organization-structure-administration";
import { loadWorkspaceStudioExperience } from "@/lib/organization-structure-experience";

import type { StructureActionState } from "../organization/action-state";
import type { UnitPositionCreateState } from "./unit-position-create-state";

function textValue(formData: FormData, name: string) {
  const values = formData.getAll(name);
  return values.length === 1 && typeof values[0] === "string" ? values[0].trim() : "";
}

function validStableKey(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function effectiveAt(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (value > today) return null;
  return value === today ? now : new Date(`${value}T23:59:59.999Z`);
}

function unconfirmedSave(): UnitPositionCreateState {
  return {
    status: "error",
    message: "We could not confirm whether this job title was saved. Close this panel and refresh the roster before trying again.",
    saveUnconfirmed: true,
  };
}

export async function createUnitPositionAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<UnitPositionCreateState> {
  const title = textValue(formData, "title");
  const organizationUnitStableKey = textValue(formData, "organizationUnitStableKey");
  const changeKind = textValue(formData, "changeKind");
  const reason = textValue(formData, "reason");
  const effectiveDate = effectiveAt(textValue(formData, "effectiveDate"));
  const duplicateValues = formData.getAll("acknowledgePossibleDuplicate");
  if (
    !title || title.length > 255 || !reason || reason.length > 2000 ||
    !validStableKey(organizationUnitStableKey) || !effectiveDate ||
    (changeKind !== "correction" && changeKind !== "organizational_change") ||
    duplicateValues.length > 1 ||
    (duplicateValues.length === 1 && duplicateValues[0] !== "confirmed")
  ) {
    return { status: "error", message: "Check the job title, change note, and effective date, then try again." };
  }

  try {
    const experience = await loadWorkspaceStudioExperience();
    if (!experience.enabled || !experience.data.units.some((unit) => unit.id === organizationUnitStableKey && unit.status === "active")) {
      return { status: "error", message: "This Unit is not available to update. Return to the Unit and refresh the page." };
    }
  } catch {
    return { status: "error", message: "We could not check access to this Unit. Refresh the page before trying again." };
  }

  try {
    const result = await createPosition({
      title,
      organizationUnitStableKey,
      changeKind,
      effectiveAt: effectiveDate,
      reason,
      acknowledgePossibleDuplicate: duplicateValues.length === 1,
    });
    if (!result.ok) {
      return result.code === "unavailable"
        ? unconfirmedSave()
        : { status: "error", message: result.message };
    }
    if (!result.stableKey || !validStableKey(result.stableKey)) return unconfirmedSave();
    for (const path of [
      "/context", "/organization", "/studio", "/studio/organization",
      `/studio/organization/units/${encodeURIComponent(organizationUnitStableKey)}`,
    ]) revalidatePath(path);
    return { status: "success", message: "Job title added to this Unit.", stableKey: result.stableKey };
  } catch {
    // The mutation may have committed before its response or revalidation failed.
    return unconfirmedSave();
  }
}
