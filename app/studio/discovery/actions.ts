"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  answerDiscoveryQuestion,
  appendDiscoveryCorrection,
  createDiscoverySession,
  finishDiscoveryProposal,
  saveDiscoveryProposalDecision,
  setDiscoverySessionPaused,
  type DiscoveryEpistemicState,
} from "@/lib/discovery-administration";
import { buildDocumentedProcessSnapshot } from "@/lib/discovery-proposal-model.mjs";
import type { DiscoveryProposalDisposition } from "@/lib/discovery-proposal-model.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

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

function proposalDisposition(formData: FormData) {
  return text(formData, "disposition") as DiscoveryProposalDisposition;
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

export async function saveDiscoveryProposalDecisionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) {
    return { message: "Guided Discovery is not enabled.", status: "error" };
  }
  const { loadDiscoverySession } = await import("@/lib/discovery-data");
  const session = await loadDiscoverySession(
    experience.discovery.organizationId,
    sessionId,
  );
  const process = session
    ? experience.data.processes.find((item) => item.id === session.processId)
    : null;
  if (!session || session.status !== "ready_for_review" || !process) {
    return {
      message: "The interview or documented Process is no longer available for review.",
      status: "error",
    };
  }
  const result = await saveDiscoveryProposalDecision({
    disposition: proposalDisposition(formData),
    documentedProcessSnapshot: buildDocumentedProcessSnapshot(process),
    expectedProposalRevision: Number(
      text(formData, "expectedProposalRevision"),
    ),
    observationId: text(formData, "observationId"),
    reviewNote: text(formData, "reviewNote"),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}`);
  revalidatePath(`/studio/discovery/interviews/${sessionId}/reconcile`);
  redirect(`/studio/discovery/interviews/${sessionId}/reconcile`);
}

export async function finishDiscoveryProposalAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await finishDiscoveryProposal({
    expectedProposalRevision: Number(
      text(formData, "expectedProposalRevision"),
    ),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}`);
  revalidatePath(`/studio/discovery/interviews/${sessionId}/reconcile`);
  redirect(`/studio/discovery/interviews/${sessionId}/reconcile`);
}
