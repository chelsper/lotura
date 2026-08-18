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
import { buildDiscoveryScopeStatement } from "@/lib/discovery-scope.mjs";
import {
  changeDiscoveryMappingItemState,
  fingerprintDocumentedProcessSnapshot,
  finishDiscoveryProposalMapping,
  saveDiscoveryMappingItem,
  saveDiscoveryMappingItemSlice2,
} from "@/lib/discovery-mapping-administration";
import type { DiscoveryMappingAction } from "@/lib/discovery-mapping-model.mjs";
import { buildDocumentedProcessSnapshot } from "@/lib/discovery-proposal-model.mjs";
import type { DiscoveryProposalDisposition } from "@/lib/discovery-proposal-model.mjs";
import {
  beginOperatingModelProposalReview,
  finishOperatingModelProposalReview,
  saveOperatingModelProposalReviewDecision,
} from "@/lib/proposal-review-administration";
import type { ProposalReviewDisposition } from "@/lib/proposal-review-model.mjs";
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

function mappingAction(formData: FormData) {
  return text(formData, "mappingAction") as DiscoveryMappingAction;
}

const slice2MappingActions = new Set<DiscoveryMappingAction>([
  "add_process_step",
  "revise_process_step",
  "change_step_responsibility",
  "link_existing_system",
  "add_process_exception",
  "revise_process_exception",
  "add_process_dependency",
]);

export async function startDiscoverySessionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const scopeStatement = buildDiscoveryScopeStatement({
    details: text(formData, "scopeDetails"),
    mode: text(formData, "scopeMode"),
  });
  if (!scopeStatement) {
    return {
      message: "Choose the whole process or briefly describe the part you want to discuss.",
      status: "error",
    };
  }
  const result = await createDiscoverySession({
    processKey: text(formData, "processKey"),
    scopeStatement,
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

export async function saveDiscoveryMappingItemAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) {
    return { message: "Guided Discovery is not enabled.", status: "error" };
  }
  const { loadDiscoveryProposal, loadDiscoverySession } = await import(
    "@/lib/discovery-data"
  );
  const [session, proposal] = await Promise.all([
    loadDiscoverySession(experience.discovery.organizationId, sessionId),
    loadDiscoveryProposal(experience.discovery.organizationId, sessionId),
  ]);
  const process = session
    ? experience.data.processes.find((item) => item.id === session.processId)
    : null;
  if (!session || !proposal || proposal.status !== "ready_for_review" || !process) {
    return {
      message: "The finished proposed update or documented Process is no longer available.",
      status: "error",
    };
  }
  const selectedAction = mappingAction(formData);
  const sharedInput = {
    action: selectedAction,
    currentProcessFingerprint: fingerprintDocumentedProcessSnapshot(
      buildDocumentedProcessSnapshot(process),
    ),
    expectedMappingRevision: Number(text(formData, "expectedMappingRevision")),
    itemId: text(formData, "itemId"),
    observationIds: formData.getAll("observationId").filter(
      (value): value is string => typeof value === "string",
    ),
    rationale: text(formData, "rationale"),
    sessionId,
  };
  const result = slice2MappingActions.has(selectedAction)
    ? await saveDiscoveryMappingItemSlice2({
        ...sharedInput,
        dependencyDescription: text(formData, "dependencyDescription"),
        dependencyDirection: text(formData, "dependencyDirection"),
        dependencyType: text(formData, "dependencyType"),
        exceptionCondition: text(formData, "exceptionCondition"),
        exceptionId: text(formData, "exceptionId"),
        exceptionName: text(formData, "exceptionName"),
        exceptionResponse: text(formData, "exceptionResponse"),
        processStepId: text(formData, "processStepId"),
        proposedStepInstructions: text(formData, "proposedStepInstructions"),
        proposedStepPosition: Number(text(formData, "proposedStepPosition")),
        proposedStepTitle: text(formData, "proposedStepTitle"),
        relatedProcessId: text(formData, "relatedProcessId"),
        responsibleRoleId: text(formData, "responsibleRoleId"),
        systemId: text(formData, "systemId"),
        systemUsage: text(formData, "systemUsage"),
      })
    : await saveDiscoveryMappingItem({
        ...sharedInput,
        ownerRoleId: text(formData, "ownerRoleId"),
        proposedPurpose: text(formData, "proposedPurpose"),
        unresolvedQuestion: text(formData, "unresolvedQuestion"),
      });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}/map`);
  redirect(`/studio/discovery/interviews/${sessionId}/map`);
}

export async function changeDiscoveryMappingItemStateAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await changeDiscoveryMappingItemState({
    expectedMappingRevision: Number(text(formData, "expectedMappingRevision")),
    itemId: text(formData, "itemId"),
    rationale: text(formData, "rationale"),
    sessionId,
    state: text(formData, "itemState") as "active" | "withdrawn",
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}/map`);
  redirect(`/studio/discovery/interviews/${sessionId}/map`);
}

export async function finishDiscoveryProposalMappingAction(
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
  if (!session || !process) {
    return { message: "The documented Process is no longer available.", status: "error" };
  }
  const result = await finishDiscoveryProposalMapping({
    currentProcessFingerprint: fingerprintDocumentedProcessSnapshot(
      buildDocumentedProcessSnapshot(process),
    ),
    expectedMappingRevision: Number(text(formData, "expectedMappingRevision")),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}`);
  revalidatePath(`/studio/discovery/interviews/${sessionId}/map`);
  redirect(`/studio/discovery/interviews/${sessionId}/map`);
}

export async function beginProposalReviewAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const experience = await loadWorkspaceExperience();
  if (!experience.proposalReview.enabled) {
    return { message: "Proposal Review is not enabled.", status: "error" };
  }
  const { loadDiscoveryProposalMapping, loadDiscoverySession } = await import(
    "@/lib/discovery-data"
  );
  const [session, mapping] = await Promise.all([
    loadDiscoverySession(experience.proposalReview.organizationId, sessionId),
    loadDiscoveryProposalMapping(
      experience.proposalReview.organizationId,
      sessionId,
    ),
  ]);
  const process = session
    ? experience.data.processes.find((item) => item.id === session.processId)
    : null;
  if (!session || !mapping || !process) {
    return {
      message: "The finished proposal or documented Process is no longer available.",
      status: "error",
    };
  }
  const result = await beginOperatingModelProposalReview({
    currentProcessFingerprint: fingerprintDocumentedProcessSnapshot(
      buildDocumentedProcessSnapshot(process),
    ),
    expectedMappingRevision: Number(text(formData, "expectedMappingRevision")),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}/map`);
  revalidatePath(`/studio/discovery/interviews/${sessionId}/proposal-review`);
  redirect(`/studio/discovery/interviews/${sessionId}/proposal-review`);
}

export async function saveProposalReviewDecisionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await saveOperatingModelProposalReviewDecision({
    disposition: text(formData, "disposition") as ProposalReviewDisposition,
    expectedReviewRevision: Number(text(formData, "expectedReviewRevision")),
    itemId: text(formData, "itemId"),
    reviewNote: text(formData, "reviewNote"),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}/proposal-review`);
  redirect(`/studio/discovery/interviews/${sessionId}/proposal-review`);
}

export async function finishProposalReviewAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const experience = await loadWorkspaceExperience();
  if (!experience.proposalReview.enabled) {
    return { message: "Proposal Review is not enabled.", status: "error" };
  }
  const { loadDiscoverySession } = await import("@/lib/discovery-data");
  const session = await loadDiscoverySession(
    experience.proposalReview.organizationId,
    sessionId,
  );
  const process = session
    ? experience.data.processes.find((item) => item.id === session.processId)
    : null;
  if (!session || !process) {
    return {
      message: "The documented Process is no longer available.",
      status: "error",
    };
  }
  const result = await finishOperatingModelProposalReview({
    completionNote: text(formData, "completionNote"),
    currentProcessFingerprint: fingerprintDocumentedProcessSnapshot(
      buildDocumentedProcessSnapshot(process),
    ),
    expectedReviewRevision: Number(text(formData, "expectedReviewRevision")),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}/proposal-review`);
  revalidatePath(`/studio/discovery/interviews/${sessionId}/reconcile`);
  redirect(`/studio/discovery/interviews/${sessionId}/proposal-review`);
}

export async function applyProposalReviewAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const experience = await loadWorkspaceExperience();
  if (!experience.processApplication.enabled) {
    return { message: "Process application is not enabled.", status: "error" };
  }

  const classifications: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (
      name.startsWith("classification:") &&
      typeof value === "string"
    ) {
      classifications[name.slice("classification:".length)] = value;
    }
  }
  const effectiveDate = text(formData, "effectiveDate");
  const effectiveAt = new Date(`${effectiveDate}T00:00:00.000Z`);
  const { applyApprovedOperatingModelProposal } = await import(
    "@/lib/process-application-administration"
  );
  const result = await applyApprovedOperatingModelProposal({
    classifications,
    effectiveAt,
    expectedDocumentedFingerprint: text(
      formData,
      "expectedDocumentedFingerprint",
    ),
    expectedReviewId: text(formData, "expectedReviewId"),
    reason: text(formData, "reason"),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}/proposal-review`);
  revalidatePath(`/studio/discovery/interviews/${sessionId}/proposal-review/apply`);
  revalidatePath(`/studio/discovery/interviews/${sessionId}/reconcile`);
  revalidatePath("/studio/operating-model");
  revalidatePath("/explorer");
  redirect(`/studio/discovery/interviews/${sessionId}/proposal-review/apply`);
}
