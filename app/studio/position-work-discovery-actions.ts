"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startPositionWorkDiscovery } from "@/lib/position-work-discovery-administration";
import type { DiscoveryActionState } from "./discovery/action-state";

export async function startPositionWorkDiscoveryAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const text = (name: string) => typeof formData.get(name) === "string" ? String(formData.get(name)) : "";
  const result = await startPositionWorkDiscovery({
    positionId: text("positionId"),
    requestId: text("requestId"),
    workDescription: text("workDescription"),
    involvement: text("involvement"),
    epistemicState: text("epistemicState"),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/studio/discovery");
  revalidatePath("/context");
  redirect(`/studio/discovery/inquiries/${result.inquiryId}/interviews/${result.sessionId}`);
}
