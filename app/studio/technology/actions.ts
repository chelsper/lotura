"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSystem,
  deactivateSystem,
  type SystemType,
  updateSystem,
} from "@/lib/technology-exceptions-administration";
import type { OperatingModelChangeKind } from "@/lib/operating-model-administration";

import type { TechnologyActionState } from "./action-state";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function changeKind(formData: FormData): OperatingModelChangeKind | null {
  const value = text(formData, "changeKind");
  return value === "correction" || value === "organizational_change"
    ? value
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

function systemType(formData: FormData): SystemType | null {
  const value = text(formData, "systemType");
  return ["software", "external_service", "manual_record", "other"].includes(
    value,
  )
    ? (value as SystemType)
    : null;
}

function metadata(formData: FormData) {
  const parsedChangeKind = changeKind(formData);
  const parsedEffectiveAt = effectiveAt(formData);
  if (!parsedChangeKind || !parsedEffectiveAt) return null;
  return {
    changeKind: parsedChangeKind,
    effectiveAt: parsedEffectiveAt,
    reason: text(formData, "reason"),
  };
}

function definition(formData: FormData) {
  const parsedSystemType = systemType(formData);
  if (!parsedSystemType) return null;
  return {
    description: text(formData, "description") || null,
    name: text(formData, "name"),
    ownerRoleKey: text(formData, "ownerRoleKey") || null,
    systemType: parsedSystemType,
    url: text(formData, "url") || null,
  };
}

function revalidateTechnology(stableKey?: string) {
  revalidatePath("/studio");
  revalidatePath("/studio/technology");
  revalidatePath("/studio/processes");
  revalidatePath("/explorer");
  if (stableKey) {
    revalidatePath(`/studio/technology/systems/${stableKey}`);
  }
}

export async function createSystemAction(
  _previousState: TechnologyActionState,
  formData: FormData,
): Promise<TechnologyActionState> {
  const common = metadata(formData);
  const fields = definition(formData);
  if (!common || !fields) {
    return { status: "error", message: "Review the System details and try again." };
  }
  const result = await createSystem({ ...common, ...fields });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateTechnology(result.stableKey);
  redirect(`/studio/technology/systems/${result.stableKey}`);
}

export async function updateSystemAction(
  _previousState: TechnologyActionState,
  formData: FormData,
): Promise<TechnologyActionState> {
  const common = metadata(formData);
  const fields = definition(formData);
  if (!common || !fields) {
    return { status: "error", message: "Review the System details and try again." };
  }
  const systemStableKey = text(formData, "systemStableKey");
  const result = await updateSystem({
    ...common,
    ...fields,
    expectedSystemRevision: text(formData, "expectedSystemRevision"),
    systemStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateTechnology(systemStableKey);
  return { status: "success", message: result.message };
}

export async function deactivateSystemAction(
  _previousState: TechnologyActionState,
  formData: FormData,
): Promise<TechnologyActionState> {
  const common = metadata(formData);
  if (!common) {
    return { status: "error", message: "Review the deactivation details and try again." };
  }
  const systemStableKey = text(formData, "systemStableKey");
  const result = await deactivateSystem({
    ...common,
    expectedSystemRevision: text(formData, "expectedSystemRevision"),
    systemStableKey,
  });
  if (!result.ok) return { status: "error", message: result.message };

  revalidateTechnology(systemStableKey);
  return { status: "success", message: result.message };
}
