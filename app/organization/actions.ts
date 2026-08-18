"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  correctPositionReportingRelationship,
  createOrganizationUnit,
  createPerson,
  createPosition,
  endRoleCoverage,
  endRoleMandate,
  endPositionAssignment,
  endPositionReportingRelationship,
  establishRoleCoverage,
  establishRoleMandate,
  establishPositionAssignment,
  establishPositionReportingRelationship,
  mergeOrganizationUnit,
  removeOrganizationUnitAndMoveContents,
  removeStructureEntity,
  replacePositionAssignment,
  replacePositionReportingRelationship,
  type StructureChangeKind,
  type StructureEntityType,
  updateStructureEntity,
} from "@/lib/organization-structure-administration";
import type { StructureActionState } from "./action-state";

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

function creationMetadata(formData: FormData) {
  const parsedChangeKind = changeKind(formData);
  const parsedEffectiveAt = effectiveAt(formData);
  if (!parsedChangeKind || !parsedEffectiveAt) return null;
  return {
    acknowledgePossibleDuplicate:
      textValue(formData, "acknowledgePossibleDuplicate") === "confirmed",
    changeKind: parsedChangeKind,
    effectiveAt: parsedEffectiveAt,
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

function studioTargetPath(entityType: StructureEntityType, stableKey: string) {
  const segment =
    entityType === "organization_unit"
      ? "units"
      : entityType === "position"
        ? "positions"
        : "people";
  return `/studio/organization/${segment}/${encodeURIComponent(stableKey)}`;
}

export async function createOrganizationUnitAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = creationMetadata(formData);
  if (!metadata) {
    return { status: "error", message: "Review the new Unit details and try again." };
  }
  const result = await createOrganizationUnit({
    ...metadata,
    name: textValue(formData, "name"),
    parentOrganizationUnitStableKey:
      textValue(formData, "parentOrganizationUnitStableKey") || null,
  });
  if (!result.ok) return { status: "error", message: result.message };
  if (!result.stableKey) {
    return { status: "error", message: "The new Unit could not be opened safely." };
  }
  revalidatePath("/organization");
  revalidatePath("/studio");
  revalidatePath("/studio/organization");
  redirect(studioTargetPath("organization_unit", result.stableKey));
}

export async function createPositionAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = creationMetadata(formData);
  if (!metadata) {
    return { status: "error", message: "Review the new Position details and try again." };
  }
  const result = await createPosition({
    ...metadata,
    organizationUnitStableKey:
      textValue(formData, "organizationUnitStableKey") || null,
    title: textValue(formData, "title"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  if (!result.stableKey) {
    return { status: "error", message: "The new Position could not be opened safely." };
  }
  revalidatePath("/organization");
  revalidatePath("/studio");
  revalidatePath("/studio/organization");
  redirect(studioTargetPath("position", result.stableKey));
}

export async function createPersonAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = creationMetadata(formData);
  if (!metadata) {
    return { status: "error", message: "Review the new Person details and try again." };
  }
  const result = await createPerson({
    ...metadata,
    displayName: textValue(formData, "displayName"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  if (!result.stableKey) {
    return { status: "error", message: "The new Person could not be opened safely." };
  }
  revalidatePath("/organization");
  revalidatePath("/studio");
  revalidatePath("/studio/organization");
  redirect(studioTargetPath("person", result.stableKey));
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
    parentOrganizationUnitStableKey:
      textValue(formData, "parentOrganizationUnitStableKey") || null,
    title: textValue(formData, "title"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/organization");
  revalidatePath(targetPath(common.entityType, common.stableKey));
  revalidatePath(studioTargetPath(common.entityType, common.stableKey));
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
  revalidatePath("/studio");
  revalidatePath("/studio/organization");
  redirect("/studio/organization");
}

export async function mergeOrganizationUnitAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const sourceStableKey = textValue(formData, "sourceStableKey");
  const targetStableKey = textValue(formData, "targetStableKey");
  if (
    !metadata ||
    !sourceStableKey ||
    !targetStableKey ||
    textValue(formData, "confirmMerge") !== "confirmed"
  ) {
    return {
      status: "error",
      message: "Select the surviving Unit and confirm the reviewed merge impact.",
    };
  }

  const result = await mergeOrganizationUnit({
    ...metadata,
    expectedImpactFingerprint: textValue(
      formData,
      "expectedImpactFingerprint",
    ),
    expectedTargetRevision: textValue(formData, "expectedTargetRevision"),
    sourceStableKey,
    targetStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };
  if (!result.stableKey) {
    return {
      status: "error",
      message: "The surviving Unit could not be opened safely.",
    };
  }

  revalidatePath("/organization");
  revalidatePath("/studio");
  revalidatePath("/studio/organization");
  redirect(studioTargetPath("organization_unit", result.stableKey));
}

export async function removeOrganizationUnitAndMoveContentsAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const sourceStableKey = textValue(formData, "sourceStableKey");
  const targetStableKey = textValue(formData, "targetStableKey");
  if (
    !metadata ||
    !sourceStableKey ||
    !targetStableKey ||
    textValue(formData, "confirmRemovalWithContents") !== "confirmed"
  ) {
    return {
      status: "error",
      message:
        "Select the destination Unit and confirm the reviewed removal impact.",
    };
  }

  const result = await removeOrganizationUnitAndMoveContents({
    ...metadata,
    expectedImpactFingerprint: textValue(
      formData,
      "expectedImpactFingerprint",
    ),
    expectedTargetRevision: textValue(formData, "expectedTargetRevision"),
    sourceStableKey,
    targetStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };
  if (!result.stableKey) {
    return {
      status: "error",
      message: "The destination Unit could not be opened safely.",
    };
  }

  revalidatePath("/organization");
  revalidatePath("/studio");
  revalidatePath("/studio/organization");
  redirect(studioTargetPath("organization_unit", result.stableKey));
}

function revalidatePosition(stableKey: string) {
  revalidatePath("/organization");
  revalidatePath("/studio");
  revalidatePath("/studio/responsibilities");
  revalidatePath(
    `/organization/positions/${encodeURIComponent(stableKey)}`,
  );
  revalidatePath(
    `/studio/organization/positions/${encodeURIComponent(stableKey)}`,
  );
}

export async function establishPositionAssignmentAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  const assignmentType = textValue(formData, "assignmentType");
  if (
    !metadata ||
    !positionStableKey ||
    !["incumbent", "job_share", "interim", "acting", "backup"].includes(
      assignmentType,
    )
  ) {
    return {
      status: "error",
      message: "Review the new Position Assignment and try again.",
    };
  }
  const result = await establishPositionAssignment({
    ...metadata,
    assignmentType: assignmentType as
      | "incumbent"
      | "job_share"
      | "interim"
      | "acting"
      | "backup",
    personStableKey: textValue(formData, "personStableKey"),
    positionStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
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

export async function establishPositionReportingRelationshipAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  if (!metadata || !positionStableKey) {
    return {
      status: "error",
      message: "Review the new manager relationship and try again.",
    };
  }
  const result = await establishPositionReportingRelationship({
    ...metadata,
    managerPositionStableKey: textValue(
      formData,
      "managerPositionStableKey",
    ),
    positionStableKey,
    relationshipReason: textValue(formData, "relationshipReason") || null,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}

export async function replacePositionReportingRelationshipAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  if (!metadata || !positionStableKey) {
    return {
      status: "error",
      message: "Review the replacement manager relationship and try again.",
    };
  }
  const result = await replacePositionReportingRelationship({
    ...metadata,
    managerPositionStableKey: textValue(
      formData,
      "managerPositionStableKey",
    ),
    positionStableKey,
    relationshipReason: textValue(formData, "relationshipReason") || null,
    reportingRecordKey: textValue(formData, "reportingRecordKey"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}

export async function establishRoleMandateAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  const mandateType = textValue(formData, "mandateType");
  if (
    !metadata ||
    !positionStableKey ||
    !["primary", "shared"].includes(mandateType)
  ) {
    return {
      status: "error",
      message: "Review the Operational Role mandate and try again.",
    };
  }
  const result = await establishRoleMandate({
    ...metadata,
    mandateType: mandateType as "primary" | "shared",
    newRoleDescription: textValue(formData, "newRoleDescription") || null,
    newRoleName: textValue(formData, "newRoleName") || null,
    positionStableKey,
    roleKey: textValue(formData, "roleKey") || null,
    scope: textValue(formData, "scope") || null,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}

export async function endRoleMandateAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  if (!metadata || !positionStableKey) {
    return {
      status: "error",
      message: "Review the Role mandate change and try again.",
    };
  }
  const result = await endRoleMandate({
    ...metadata,
    mandateRecordKey: textValue(formData, "mandateRecordKey"),
    positionStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}

export async function establishRoleCoverageAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  const coverageType = textValue(formData, "coverageType");
  if (
    !metadata ||
    !positionStableKey ||
    !["permanent", "interim", "acting", "delegated", "backup"].includes(
      coverageType,
    )
  ) {
    return {
      status: "error",
      message: "Review the Role Coverage details and try again.",
    };
  }
  const result = await establishRoleCoverage({
    ...metadata,
    coverageReason: textValue(formData, "coverageReason") || null,
    coverageType: coverageType as
      | "permanent"
      | "interim"
      | "acting"
      | "delegated"
      | "backup",
    mandateRecordKey: textValue(formData, "mandateRecordKey"),
    personStableKey: textValue(formData, "personStableKey"),
    positionStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}

export async function endRoleCoverageAction(
  _previousState: StructureActionState,
  formData: FormData,
): Promise<StructureActionState> {
  const metadata = changeMetadata(formData);
  const positionStableKey = textValue(formData, "positionStableKey");
  if (!metadata || !positionStableKey) {
    return {
      status: "error",
      message: "Review the Role Coverage change and try again.",
    };
  }
  const result = await endRoleCoverage({
    ...metadata,
    coverageRecordKey: textValue(formData, "coverageRecordKey"),
    mandateRecordKey: textValue(formData, "mandateRecordKey"),
    positionStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePosition(positionStableKey);
  return { status: "success", message: result.message };
}
