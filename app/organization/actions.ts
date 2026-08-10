"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  correctPositionReportingRelationship,
  endPositionAssignment,
  endPositionReportingRelationship,
  removeStructureEntity,
  replacePositionAssignment,
  type StructureChangeKind,
  type StructureEntityType,
  updateStructureEntity,
} from "@/lib/organization-structure-administration";

export type StructureActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialStructureActionState: StructureActionState = {
  message: "",
  status: "idle",
};

function textValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function entityType(formData: FormData): StructureEntityType | null {
  const value = textValue(formData, "entityType");
  return ["organization_unit", "position", "person"].includes(value)
    ? (value as StructureEntityType)
    : null;
}

function changeKind(formData: FormData): StructureChangeKind | null {
  const value = textValue(formData, "changeKind");
  return ["correction", "organizational_change"].includes(value)
    ? (value as StructureChangeKind)
    : null;
}

function effectiveAt(formData: FormData) {
  const value = textValue(formData, "effectiveDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (value > today) return null;
  const parsed =
    value === today
      ? new Date()
      : new Date(`${value}T23:59:59.999Z`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function commonInput(formData: FormData) {
  const parsedEntityType = entityType(formData);
  const parsedChangeKind = changeKind(formData);
  const parsedEffectiveAt = effectiveAt(formData);
  if (!parsedEntityType || !parsedChangeKind || !parsedEffectiveAt) return null;
  return {
    changeKind: parsedChangeKind,
    effectiveAt: parsedEffectiveAt,
    entityType: parsedEntityType,
    expectedRevision: textValue(formData, "expectedRevision"),
    reason: textValue(formData, "reason"),
    stableKey: textValue(formData, "stableKey"),
  };
}

function changeMetadata(formData: FormData) {
  const parsedChangeKind = changeKind(formData);
  const parsedEffectiveAt = effectiveAt(formData);
  if (!parsedChangeKind || !parsedEffectiveAt) return null;
  return {
    changeKind: parsedChangeKind,
    effectiveAt: parsedEffectiveAt,
    expectedRevision: textValue(formData, "expectedRevision"),
    reason: textValue(formData, "reason"),
  };
}

function targetPath(entityType: StructureEntityType, stableKey: string) {
  const segment =
    entityType === "organization_unit"
      ? "units"
      : entityType === "position"
        ? "positions"
        : "people";
  return `/organization/${segment}/${encodeURIComponent(stableKey)}`;
}

export async function updateStructureEntityAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const common = commonInput(formData);
  if (!common) {
    return { status: "error", message: "Review the change details and try again." };
  }

  const result = await updateStructureEntity({
    ...common,
    displayName: textValue(formData, "displayName"),
    name: textValue(formData, "name"),
    organizationUnitStableKey:
      textValue(formData, "organizationUnitStableKey") || null,
    title: textValue(formData, "title"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/organization");
  revalidatePath(targetPath(common.entityType, common.stableKey));
  return { status: "success", message: result.message };
}

export async function removeStructureEntityAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const common = commonInput(formData);
  if (!common || textValue(formData, "confirmRemoval") !== "confirmed") {
    return {
      status: "error",
      message: "Confirm the history-preserving removal and review its details.",
    };
  }

  const result = await removeStructureEntity(common);
  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/organization");
  redirect("/organization");
}

function revalidatePosition(stableKey: string) {
  revalidatePath("/organization");
  revalidatePath(
    `/organization/positions/${encodeURIComponent(stableKey)}`,
  );
}

export async function endPositionAssignmentAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  if (!metadata || !positionStableKey) {
    return {
      status: "error",
      message: "Review the Assignment change details and try again.",
    };
  }
  const result = await endPositionAssignment({
    ...metadata,
    assignmentRecordKey: textValue(formData, "assignmentRecordKey"),
    positionStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}

export async function replacePositionAssignmentAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  if (!metadata || !positionStableKey) {
    return {
      status: "error",
      message: "Review the replacement Assignment details and try again.",
    };
  }
  const result = await replacePositionAssignment({
    ...metadata,
    assignmentRecordKey: textValue(formData, "assignmentRecordKey"),
    positionStableKey,
    replacementPersonStableKey: textValue(
      formData,
      "replacementPersonStableKey",
    ),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}

export async function endPositionReportingRelationshipAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  if (!metadata || !positionStableKey) {
    return {
      status: "error",
      message: "Review the reporting change details and try again.",
    };
  }
  const result = await endPositionReportingRelationship({
    ...metadata,
    positionStableKey,
    reportingRecordKey: textValue(formData, "reportingRecordKey"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}

export async function correctPositionReportingRelationshipAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  const relationshipType = textValue(formData, "relationshipType");
  if (
    !metadata ||
    !positionStableKey ||
    !["primary", "dotted_line", "functional"].includes(relationshipType)
  ) {
    return {
      status: "error",
      message: "Review the reporting correction details and try again.",
    };
  }
  const result = await correctPositionReportingRelationship({
    ...metadata,
    managerPositionStableKey: textValue(
      formData,
      "managerPositionStableKey",
    ),
    positionStableKey,
    relationshipReason: textValue(formData, "relationshipReason") || null,
    relationshipType: relationshipType as
      | "primary"
      | "dotted_line"
      | "functional",
    reportingRecordKey: textValue(formData, "reportingRecordKey"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}
