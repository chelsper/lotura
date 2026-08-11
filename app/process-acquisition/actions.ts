"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createDraftProcess } from "@/lib/process-acquisition-administration";

import type { ProcessAcquisitionActionState } from "./action-state";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function createDraftProcessAction(
  _previousState: ProcessAcquisitionActionState,
  formData: FormData,
): Promise<ProcessAcquisitionActionState> {
  const result = await createDraftProcess({
    effectiveAt: new Date(),
    name: text(formData, "name"),
    ownerConfirmed: text(formData, "ownerConfirmed") === "yes",
    ownerRoleKey: text(formData, "ownerRoleKey") || null,
    purpose: text(formData, "purpose") || null,
    reason: text(formData, "reason"),
  });

  if (!result.ok) {
    return { message: result.message, status: "error" };
  }

  revalidatePath("/explorer");
  revalidatePath("/organization");
  redirect(`/explorer/${encodeURIComponent(result.processId)}`);
}
