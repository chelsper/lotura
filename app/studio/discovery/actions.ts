"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  answerDiscoveryQuestion,
  appendDiscoveryCorrection,
  createDiscoverySession,
  setDiscoverySessionPaused,
  type DiscoveryEpistemicState,
} from "@/lib/discovery-administration";

import type { DiscoveryActionState } from "./action-state";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function state(formData: FormData): DiscoveryEpistemicState {
  return text(formData, "epistemicState") as DiscoveryEpistemicState;
}

function revision(formData: FormData) {
  return Number(text(formData, "expectedRevision"));
}

export async function startDiscoverySessionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const result = await createDiscoverySession({
    processKey: text(formData, "processKey"),
    scopeStatement: text(formData, "scopeStatement"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath("/studio/discovery");
  redirect(`/studio/discovery/interviews/${result.sessionId}`);
}

export async function answerDiscoveryQuestionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await answerDiscoveryQuestion({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    promptKey: text(formData, "promptKey"),
    responseText: text(formData, "responseText"),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}`);
  redirect(`/studio/discovery/interviews/${sessionId}`);
}

export async function correctDiscoveryObservationAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await appendDiscoveryCorrection({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    observationId: text(formData, "observationId"),
    responseText: text(formData, "responseText"),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}`);
  redirect(`/studio/discovery/interviews/${sessionId}`);
}

export async function changeDiscoveryPauseAction(formData: FormData) {
  const sessionId = text(formData, "sessionId");
  await setDiscoverySessionPaused({
    expectedRevision: revision(formData),
    paused: text(formData, "paused") === "yes",
    sessionId,
  });
  revalidatePath(`/studio/discovery/interviews/${sessionId}`);
  redirect(`/studio/discovery/interviews/${sessionId}`);
}
