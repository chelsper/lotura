"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspaceAccess } from "@/lib/authentication";
import {
  answerDiscoveryQuestion,
  appendDiscoveryCorrection,
  confirmPriorDiscoveryObservation,
  createDiscoveryInquiry,
  createDiscoverySession,
  finishDiscoveryProposal,
  finishDiscoveryReviewByException,
  saveDiscoveryProposalDecision,
  setDiscoverySessionPaused,
  type DiscoveryEpistemicState,
} from "@/lib/discovery-administration";
import {
  answerDiscoveryAnalyst,
  authorizeDiscoveryAnalyst,
  correctDiscoveryAnalyst,
  finishDiscoveryAnalyst,
  refreshDiscoveryAnalyst,
  skipDiscoveryAnalystQuestion,
} from "@/lib/discovery-analyst-administration";
import {
  DISCOVERY_ANALYST_AUTHORIZATION_VERSION,
} from "@/lib/discovery-analyst-model.mjs";
import {
  answerInquiryDiscoveryAnalyst,
  authorizeInquiryDiscoveryAnalyst,
  correctInquiryDiscoveryAnalyst,
  finishInquiryDiscoveryAnalyst,
  refreshInquiryDiscoveryAnalyst,
  saveInquiryReferenceConfirmations,
  skipInquiryDiscoveryAnalystQuestion,
} from "@/lib/discovery-inquiry-analyst-administration";
import {
  decideInquiryDiscoverySuggestion,
  decideProcessDiscoverySuggestion,
  dismissDiscoverySuggestion,
  prepareInquiryDiscoveryAssistancePilot,
  prepareProcessDiscoveryAssistancePilot,
  requestInquiryDiscoveryAssistance,
  requestInquiryOpenAIDiscoveryAssistance,
  requestProcessDiscoveryAssistance,
  requestProcessOpenAIDiscoveryAssistance,
} from "@/lib/discovery-assistance-administration";
import {
  answerInquiryDiscoveryQuestion,
  appendInquiryDiscoveryCorrection,
  routeDiscoveryInquiry,
  setInquiryDiscoverySessionPaused,
  startInquiryDiscoverySession,
  startProcessDiscoverySessionFromInquiry,
} from "@/lib/discovery-inquiry-administration";
import {
  finishDiscoveryInquiryReview,
} from "@/lib/discovery-inquiry-review-administration";
import {
  isDiscoveryInquiryReviewOutcomeKind,
} from "@/lib/discovery-inquiry-review-model.mjs";
import { buildDiscoveryScopeStatement } from "@/lib/discovery-scope.mjs";
import {
  changeDiscoveryMappingItemState,
  fingerprintDocumentedProcessSnapshot,
  finishDiscoveryProposalMapping,
  saveDiscoveryMappingItem,
  saveDiscoveryMappingItemSlice2,
} from "@/lib/discovery-mapping-administration";
import {
  currentDiscoveryMappingItems,
  type DiscoveryMappingAction,
} from "@/lib/discovery-mapping-model.mjs";
import {
  executeConfiguredDiscoveryProcessProposal,
} from "@/lib/discovery-process-proposal-draft-runtime";
import { buildDocumentedProcessSnapshot } from "@/lib/discovery-proposal-model.mjs";
import {
  currentDiscoveryProposalDecisions,
  type DiscoveryProposalDisposition,
} from "@/lib/discovery-proposal-model.mjs";
import { buildDiscoveryReconciliationEvidence } from "@/lib/discovery-reconciliation-preview.mjs";
import {
  beginOperatingModelProposalReview,
  finishOperatingModelProposalReview,
  saveOperatingModelProposalReviewDecision,
} from "@/lib/proposal-review-administration";
import type { ProposalReviewDisposition } from "@/lib/proposal-review-model.mjs";
import { loadWorkspaceExperience } from "@/lib/workspace-experience";

import type {
  DiscoveryActionState,
  DiscoveryAssistanceRequestState,
  DiscoveryProcessProposalDraftState,
} from "./action-state";

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

export async function createDiscoveryInquiryAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const result = await createDiscoveryInquiry({
    questionText: text(formData, "questionText"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath("/studio/discovery");
  redirect(`/studio/discovery/inquiries/${result.inquiryId}`);
}

export async function startInquiryDiscoverySessionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const inquiryId = text(formData, "inquiryId");
  const result = await startInquiryDiscoverySession({
    expectedRevision: revision(formData),
    inquiryId,
    scopeStatement: text(formData, "scopeStatement"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  if (!result.destinationId) {
    return {
      message: "Lotura could not open the preserved interview.",
      status: "error",
    };
  }
  revalidatePath(`/studio/discovery/inquiries/${inquiryId}`);
  revalidatePath("/studio/discovery");
  redirect(
    `/studio/discovery/inquiries/${inquiryId}/interviews/${result.destinationId}`,
  );
}

export async function startProcessDiscoveryFromInquiryAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const inquiryId = text(formData, "inquiryId");
  const result = await startProcessDiscoverySessionFromInquiry({
    expectedRevision: revision(formData),
    inquiryId,
    processKey: text(formData, "processKey"),
    scopeStatement: text(formData, "scopeStatement"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  if (!result.destinationId) {
    return {
      message: "Lotura could not open the preserved interview.",
      status: "error",
    };
  }
  revalidatePath(`/studio/discovery/inquiries/${inquiryId}`);
  revalidatePath("/studio/discovery");
  redirect(`/studio/discovery/interviews/${result.destinationId}`);
}

const inquiryRouteKinds = new Set([
  "review_process",
  "review_process_family",
  "wait_for_source",
  "finish_for_now",
]);

export async function routeDiscoveryInquiryAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const inquiryId = text(formData, "inquiryId");
  const routeKind = text(formData, "routeKind");
  if (!inquiryRouteKinds.has(routeKind)) {
    return { message: "Choose what should happen next.", status: "error" };
  }
  const result = await routeDiscoveryInquiry({
    expectedRevision: revision(formData),
    inquiryId,
    routeKind: routeKind as
      | "review_process"
      | "review_process_family"
      | "wait_for_source"
      | "finish_for_now",
    routeNote: text(formData, "routeNote"),
    targetKey: text(formData, "targetKey"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/inquiries/${inquiryId}`);
  revalidatePath("/studio/discovery");
  if (result.destinationKind === "process" && result.destinationId) {
    redirect(
      `/studio/processes/${encodeURIComponent(result.destinationId)}`,
    );
  }
  if (result.destinationKind === "process_family" && result.destinationId) {
    redirect(`/studio/process-families/${result.destinationId}`);
  }
  redirect(`/studio/discovery/inquiries/${inquiryId}`);
}

export async function answerInquiryDiscoveryQuestionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const inquiryId = text(formData, "inquiryId");
  const sessionId = text(formData, "sessionId");
  const result = await answerInquiryDiscoveryQuestion({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    inquiryId,
    promptKey: text(formData, "promptKey"),
    responseText: text(formData, "responseText"),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function requestInquiryDiscoveryAssistanceAction(
  _previousState: DiscoveryAssistanceRequestState,
  formData: FormData,
): Promise<DiscoveryAssistanceRequestState> {
  const inquiryId = text(formData, "inquiryId");
  const sessionId = text(formData, "sessionId");
  const assistanceKind = text(formData, "assistanceKind");
  if (assistanceKind !== "question_suggestions" && assistanceKind !== "clarity_draft") {
    return { message: "Choose the kind of help you want.", status: "error" };
  }
  const request = {
    assistanceKind: assistanceKind as "question_suggestions" | "clarity_draft",
    expectedRevision: revision(formData),
    focus: text(formData, "focus"),
    inquiryId,
    originalText: text(formData, "originalText"),
    promptKey: text(formData, "promptKey"),
    sessionId,
  };
  const preparation = await prepareInquiryDiscoveryAssistancePilot(request);
  if (!preparation.ok) {
    return { message: preparation.message, status: "error" };
  }
  if (preparation.mode === "external_review") {
    return {
      message: "Review the exact context and confirm both statements before anything is sent.",
      preview: preparation.preview,
      status: "external_review",
    };
  }
  const result = await requestInquiryDiscoveryAssistance(request);
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function confirmInquiryOpenAIDiscoveryAssistanceAction(
  _previousState: DiscoveryAssistanceRequestState,
  formData: FormData,
): Promise<DiscoveryAssistanceRequestState> {
  const inquiryId = text(formData, "inquiryId");
  const sessionId = text(formData, "sessionId");
  const assistanceKind = text(formData, "assistanceKind");
  if (assistanceKind !== "question_suggestions" && assistanceKind !== "clarity_draft") {
    return { message: "Choose the kind of help you want.", status: "error" };
  }
  const result = await requestInquiryOpenAIDiscoveryAssistance({
    assistanceKind,
    confirmedContextFingerprint: text(formData, "confirmedContextFingerprint"),
    expectedRevision: revision(formData),
    focus: text(formData, "focus"),
    inquiryId,
    nonConfidentialAuthorized: text(formData, "nonConfidentialAuthorized") === "yes",
    originalText: text(formData, "originalText"),
    promptKey: text(formData, "promptKey"),
    providerRetentionAccepted: text(formData, "providerRetentionAccepted") === "yes",
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function decideInquiryDiscoverySuggestionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const inquiryId = text(formData, "inquiryId");
  const sessionId = text(formData, "sessionId");
  const result = await decideInquiryDiscoverySuggestion({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    finalPromptText: text(formData, "finalPromptText"),
    finalResponseText: text(formData, "finalResponseText"),
    inquiryId,
    promptKey: text(formData, "promptKey"),
    sessionId,
    suggestionId: text(formData, "suggestionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function correctInquiryDiscoveryObservationAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const inquiryId = text(formData, "inquiryId");
  const sessionId = text(formData, "sessionId");
  const result = await appendInquiryDiscoveryCorrection({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    inquiryId,
    observationId: text(formData, "observationId"),
    responseText: text(formData, "responseText"),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function changeInquiryDiscoveryPauseAction(formData: FormData) {
  const inquiryId = text(formData, "inquiryId");
  const sessionId = text(formData, "sessionId");
  await setInquiryDiscoverySessionPaused({
    expectedRevision: revision(formData),
    inquiryId,
    paused: text(formData, "paused") === "yes",
    sessionId,
  });
  const path = `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function finishDiscoveryInquiryReviewAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const inquiryId = text(formData, "inquiryId");
  const sessionId = text(formData, "sessionId");
  const outcomeKinds = formData
    .getAll("outcomeKind")
    .filter((value): value is string => typeof value === "string")
    .filter(isDiscoveryInquiryReviewOutcomeKind);
  const result = await finishDiscoveryInquiryReview({
    expectedRevision: revision(formData),
    inquiryId,
    outcomes: outcomeKinds.map((kind) => ({
      explanation: text(formData, `explanation_${kind}`),
      kind,
      processKey: kind === "connect_existing_process"
        ? text(formData, "processKey")
        : "",
    })),
    reviewNote: text(formData, "reviewNote"),
    sessionId,
    supersedesReviewId: text(formData, "supersedesReviewId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const interviewPath =
    `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`;
  revalidatePath(interviewPath);
  revalidatePath(`${interviewPath}/review`);
  revalidatePath(`/studio/discovery/inquiries/${inquiryId}`);
  revalidatePath("/studio/discovery");
  redirect(`${interviewPath}/outcomes/${result.reviewId}`);
}

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

export async function authorizeDiscoveryAnalystAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await authorizeDiscoveryAnalyst({
    expectedRevision: revision(formData),
    nonConfidentialAuthorized:
      text(formData, "nonConfidentialAuthorized") === "yes",
    providerRetentionAccepted:
      text(formData, "providerRetentionAccepted") === "yes",
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function answerDiscoveryAnalystAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await answerDiscoveryAnalyst({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    responseText: text(formData, "responseText"),
    sessionId,
    suggestionId: text(formData, "suggestionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function skipDiscoveryAnalystQuestionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await skipDiscoveryAnalystQuestion({
    expectedRevision: revision(formData),
    sessionId,
    suggestionId: text(formData, "suggestionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function correctDiscoveryAnalystAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await correctDiscoveryAnalyst({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    responseText: text(formData, "responseText"),
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function refreshDiscoveryAnalystAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await refreshDiscoveryAnalyst({
    expectedRevision: revision(formData),
    focus: text(formData, "focus") === "synthesize" ? "synthesize" : "continue",
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  return { message: result.message, status: "success" };
}

export async function finishDiscoveryAnalystAction(formData: FormData) {
  const sessionId = text(formData, "sessionId");
  await finishDiscoveryAnalyst({
    expectedRevision: revision(formData),
    sessionId,
  });
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  revalidatePath("/studio/discovery");
  redirect(path);
}

function inquiryInterviewPath(formData: FormData) {
  return `/studio/discovery/inquiries/${text(formData, "inquiryId")}/interviews/${text(formData, "sessionId")}`;
}

export async function authorizeInquiryDiscoveryAnalystAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const result = await authorizeInquiryDiscoveryAnalyst({
    expectedRevision: revision(formData),
    nonConfidentialAuthorized: text(formData, "nonConfidentialAuthorized") === "yes",
    providerRetentionAccepted: text(formData, "providerRetentionAccepted") === "yes",
    sessionId: text(formData, "sessionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = inquiryInterviewPath(formData);
  revalidatePath(path);
  redirect(path);
}

export async function answerInquiryDiscoveryAnalystAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const result = await answerInquiryDiscoveryAnalyst({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    responseText: text(formData, "responseText"),
    sessionId: text(formData, "sessionId"),
    suggestionId: text(formData, "suggestionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = inquiryInterviewPath(formData);
  revalidatePath(path);
  redirect(path);
}

export async function skipInquiryDiscoveryAnalystQuestionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const result = await skipInquiryDiscoveryAnalystQuestion({
    expectedRevision: revision(formData),
    sessionId: text(formData, "sessionId"),
    suggestionId: text(formData, "suggestionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = inquiryInterviewPath(formData);
  revalidatePath(path);
  redirect(path);
}

export async function correctInquiryDiscoveryAnalystAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const result = await correctInquiryDiscoveryAnalyst({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    responseText: text(formData, "responseText"),
    sessionId: text(formData, "sessionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = inquiryInterviewPath(formData);
  revalidatePath(path);
  redirect(path);
}

export async function refreshInquiryDiscoveryAnalystAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const result = await refreshInquiryDiscoveryAnalyst({
    expectedRevision: revision(formData),
    focus: text(formData, "focus") === "synthesize" ? "synthesize" : "continue",
    sessionId: text(formData, "sessionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = inquiryInterviewPath(formData);
  revalidatePath(path);
  return { message: result.message, status: "success" };
}

export async function finishInquiryDiscoveryAnalystAction(formData: FormData) {
  await finishInquiryDiscoveryAnalyst({
    expectedRevision: revision(formData),
    sessionId: text(formData, "sessionId"),
  });
  const path = inquiryInterviewPath(formData);
  revalidatePath(path);
  revalidatePath("/studio/discovery");
  redirect(path);
}

export async function saveInquiryReferenceConfirmationsAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const count = Number(text(formData, "decisionCount"));
  if (!Number.isSafeInteger(count) || count < 1 || count > 16) {
    return { message: "Choose at least one changed reference decision.", status: "error" };
  }
  const decisions = Array.from({ length: count }, (_, index) => ({
    disposition: text(formData, `decision.${index}.disposition`) as
      | "confirmed" | "rejected" | "unresolved",
    kind: text(formData, `decision.${index}.kind`),
    mentionSequence: Number(text(formData, `decision.${index}.mentionSequence`)),
    mentionText: text(formData, `decision.${index}.mentionText`),
    runId: text(formData, `decision.${index}.runId`),
    sourceFingerprint: text(formData, `decision.${index}.sourceFingerprint`),
    sourceObservationId: text(formData, `decision.${index}.sourceObservationId`),
    targetKey: text(formData, `decision.${index}.targetKey`) || null,
  }));
  const result = await saveInquiryReferenceConfirmations({
    decisions,
    sessionId: text(formData, "sessionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = inquiryInterviewPath(formData);
  revalidatePath(path);
  redirect(`${path}#references-to-confirm`);
}

export async function requestProcessDiscoveryAssistanceAction(
  _previousState: DiscoveryAssistanceRequestState,
  formData: FormData,
): Promise<DiscoveryAssistanceRequestState> {
  const sessionId = text(formData, "sessionId");
  const assistanceKind = text(formData, "assistanceKind");
  if (assistanceKind !== "question_suggestions" && assistanceKind !== "clarity_draft") {
    return { message: "Choose the kind of help you want.", status: "error" };
  }
  const request = {
    assistanceKind: assistanceKind as "question_suggestions" | "clarity_draft",
    expectedRevision: revision(formData),
    focus: text(formData, "focus"),
    originalText: text(formData, "originalText"),
    promptKey: text(formData, "promptKey"),
    sessionId,
  };
  const preparation = await prepareProcessDiscoveryAssistancePilot(request);
  if (!preparation.ok) {
    return { message: preparation.message, status: "error" };
  }
  if (preparation.mode === "external_review") {
    return {
      message: "Review the exact context and confirm both statements before anything is sent.",
      preview: preparation.preview,
      status: "external_review",
    };
  }
  const result = await requestProcessDiscoveryAssistance(request);
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function confirmProcessOpenAIDiscoveryAssistanceAction(
  _previousState: DiscoveryAssistanceRequestState,
  formData: FormData,
): Promise<DiscoveryAssistanceRequestState> {
  const sessionId = text(formData, "sessionId");
  const assistanceKind = text(formData, "assistanceKind");
  if (assistanceKind !== "question_suggestions" && assistanceKind !== "clarity_draft") {
    return { message: "Choose the kind of help you want.", status: "error" };
  }
  const result = await requestProcessOpenAIDiscoveryAssistance({
    assistanceKind,
    confirmedContextFingerprint: text(formData, "confirmedContextFingerprint"),
    expectedRevision: revision(formData),
    focus: text(formData, "focus"),
    nonConfidentialAuthorized: text(formData, "nonConfidentialAuthorized") === "yes",
    originalText: text(formData, "originalText"),
    promptKey: text(formData, "promptKey"),
    providerRetentionAccepted: text(formData, "providerRetentionAccepted") === "yes",
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function decideProcessDiscoverySuggestionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await decideProcessDiscoverySuggestion({
    epistemicState: state(formData),
    expectedRevision: revision(formData),
    finalPromptText: text(formData, "finalPromptText"),
    finalResponseText: text(formData, "finalResponseText"),
    promptKey: text(formData, "promptKey"),
    sessionId,
    suggestionId: text(formData, "suggestionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function dismissDiscoverySuggestionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionKind = text(formData, "sessionKind");
  const disposition = text(formData, "disposition");
  if ((sessionKind !== "process" && sessionKind !== "inquiry") || (disposition !== "skipped" && disposition !== "rejected")) {
    return { message: "The assistance choice is invalid.", status: "error" };
  }
  const inquiryId = text(formData, "inquiryId");
  const sessionId = text(formData, "sessionId");
  const result = await dismissDiscoverySuggestion({
    disposition,
    expectedRevision: revision(formData),
    inquiryId: sessionKind === "inquiry" ? inquiryId : undefined,
    promptKey: text(formData, "promptKey"),
    sessionId,
    sessionKind,
    suggestionId: text(formData, "suggestionId"),
  });
  if (!result.ok) return { message: result.message, status: "error" };
  const path = sessionKind === "inquiry"
    ? `/studio/discovery/inquiries/${inquiryId}/interviews/${sessionId}`
    : `/studio/discovery/interviews/${sessionId}`;
  revalidatePath(path);
  redirect(path);
}

export async function confirmPriorDiscoveryObservationAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const result = await confirmPriorDiscoveryObservation({
    expectedRevision: revision(formData),
    promptKey: text(formData, "promptKey"),
    sessionId,
    sourceObservationId: text(formData, "sourceObservationId"),
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

export async function finishDiscoveryReviewByExceptionAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const sessionId = text(formData, "sessionId");
  const mode = text(formData, "reviewMode");
  if (mode !== "no_changes" && mode !== "selected_changes") {
    return { message: "Choose how to finish this review.", status: "error" };
  }
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
  const result = await finishDiscoveryReviewByException({
    documentedProcessSnapshot: buildDocumentedProcessSnapshot(process),
    expectedProposalRevision: Number(
      text(formData, "expectedProposalRevision"),
    ),
    mode,
    sessionId,
  });
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}`);
  revalidatePath(`/studio/discovery/interviews/${sessionId}/reconcile`);
  redirect(`/studio/discovery/interviews/${sessionId}/reconcile`);
}

export async function draftDiscoveryProcessProposalAction(
  _previousState: DiscoveryProcessProposalDraftState,
  formData: FormData,
): Promise<DiscoveryProcessProposalDraftState> {
  const sessionId = text(formData, "sessionId");
  const expectedProposalRevision = Number(
    text(formData, "expectedProposalRevision"),
  );
  const expectedMappingRevision = Number(
    text(formData, "expectedMappingRevision"),
  );
  const runtimeAccess = await requireWorkspaceAccess();
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) {
    return { message: "Guided Discovery is not enabled.", status: "error" };
  }
  const {
    loadDiscoveryMappingCatalog,
    loadDiscoveryProposal,
    loadDiscoveryProposalMapping,
    loadDiscoverySession,
  } = await import("@/lib/discovery-data");
  const [session, proposal, mapping, catalog] = await Promise.all([
    loadDiscoverySession(experience.discovery.organizationId, sessionId),
    loadDiscoveryProposal(experience.discovery.organizationId, sessionId),
    loadDiscoveryProposalMapping(experience.discovery.organizationId, sessionId),
    loadDiscoveryMappingCatalog(experience.discovery.organizationId, sessionId),
  ]);
  const process = session
    ? experience.data.processes.find((item) => item.id === session.processId)
    : null;
  if (
    !session
    || !proposal
    || !catalog
    || !process
    || session.status !== "ready_for_review"
    || proposal.status !== "ready_for_review"
  ) {
    return {
      message: "The reviewed interview or documented Process is no longer available.",
      status: "error",
    };
  }
  if (
    !session.analystEnabled
    || session.analystAuthorizationVersion !== DISCOVERY_ANALYST_AUTHORIZATION_VERSION
  ) {
    return {
      message: "This interview was not authorized for the AI Discovery Analyst.",
      status: "error",
    };
  }
  if (
    proposal.revision !== expectedProposalRevision
    || (mapping?.revision ?? 0) !== expectedMappingRevision
    || mapping?.status === "ready_for_proposal_review"
  ) {
    return {
      message: "This proposal changed after the page loaded. Reload before drafting.",
      status: "error",
    };
  }
  const currentFingerprint = fingerprintDocumentedProcessSnapshot(
    buildDocumentedProcessSnapshot(process),
  );
  if (currentFingerprint !== proposal.documentedProcessFingerprint) {
    return {
      message: "The documented Process changed after this review began. A draft cannot be generated until the review is rebased.",
      status: "error",
    };
  }

  const observations = buildDiscoveryReconciliationEvidence(session.observations)
    .flatMap((section) => section.evidence.map((observation) => ({
      ...observation,
      topic: section.topics[0],
    })));
  const decisions = currentDiscoveryProposalDecisions(proposal.decisions);
  const includedObservationIds = observations
    .filter(
      (observation) =>
        decisions.get(observation.id)?.disposition === "use_in_proposal",
    )
    .map((observation) => observation.id);
  if (includedObservationIds.length === 0) {
    return {
      message: "Select at least one interview answer as evidence for a proposed update before drafting.",
      status: "error",
    };
  }

  const roles = experience.data.roles
    .filter((role) => role.status === "active" && role.stableKey)
    .map((role) => ({ id: role.stableKey!, name: role.name }));
  const currentItems = [...currentDiscoveryMappingItems(mapping?.items ?? []).values()]
    .filter((item) => item.state === "active")
    .map((item) => ({
      action: item.action,
      exceptionId: item.exceptionId,
      processStepId: item.processStepId,
      proposedState: item.proposedState,
      rationale: item.rationale,
      relatedProcessId: item.relatedProcessId,
      responsibleRoleId: item.responsibleRoleId,
      sourceObservationIds: item.sourceObservationIds,
      systemId: item.systemId,
    }));
  const result = await executeConfiguredDiscoveryProcessProposal({
    context: {
      currentMappingItems: currentItems,
      documentedProcess: proposal.documentedProcessSnapshot,
      interview: {
        observations: observations.map((observation) => ({
          disposition: decisions.get(observation.id)?.disposition ?? null,
          epistemicState: observation.epistemicState,
          id: observation.id,
          promptText: observation.promptText,
          responseText: observation.responseText,
          reviewNote: decisions.get(observation.id)?.reviewNote ?? null,
          sequence: observation.sequence,
          topic: observation.topic,
        })),
        scopeStatement: session.scopeStatement,
      },
      processName: process.name,
      targetCatalog: {
        exceptions: catalog.exceptions,
        processes: catalog.processes.filter((item) => item.status !== "archived"),
        roles,
        steps: catalog.steps,
        systems: catalog.systems.filter(
          (system) => system.status === "active" && !system.alreadyLinked,
        ),
      },
    },
    runtimeAccess,
    validationContext: {
      exceptionIds: catalog.exceptions.map((item) => item.id),
      observationIds: includedObservationIds,
      processIds: catalog.processes
        .filter((item) => item.status !== "archived")
        .map((item) => item.id),
      roleIds: roles.map((item) => item.id),
      stepIds: catalog.steps.map((item) => item.id),
      systemIds: catalog.systems
        .filter((item) => item.status === "active" && !item.alreadyLinked)
        .map((item) => item.id),
    },
  });
  if (!result.ok) {
    return {
      message: result.reason === "timeout"
        ? "Lotura did not finish the proposal draft in time. Your evidence is intact; try again when ready."
        : result.reason === "prohibited_or_oversized_context"
          ? "The reviewed evidence cannot be sent under the current non-confidential pilot boundary. Use the manual proposal form instead."
          : "Lotura could not generate a safe proposal draft. Your evidence is intact and the manual proposal path remains available.",
      status: "error",
    };
  }
  return {
    draft: result.draft,
    message: "Lotura organized the reviewed evidence into a temporary proposal draft. Review and edit every candidate before saving it.",
    providerMetadata: {
      durationMs: result.providerMetadata.durationMs,
      inputTokens: result.providerMetadata.inputTokens,
      model: result.providerMetadata.model,
      outputTokens: result.providerMetadata.outputTokens,
      totalTokens: result.providerMetadata.totalTokens,
    },
    status: "drafted",
  };
}

async function saveDiscoveryMappingItemFromForm(formData: FormData) {
  const sessionId = text(formData, "sessionId");
  const experience = await loadWorkspaceExperience();
  if (!experience.discovery.enabled) {
    return {
      result: { message: "Guided Discovery is not enabled.", ok: false as const },
      sessionId,
    };
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
      result: {
        message: "The finished proposed update or documented Process is no longer available.",
        ok: false as const,
      },
      sessionId,
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
  return { result, sessionId };
}

export async function saveDiscoveryMappingItemAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const { result, sessionId } = await saveDiscoveryMappingItemFromForm(formData);
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}/map`);
  redirect(`/studio/discovery/interviews/${sessionId}/map`);
}

export async function saveAIDiscoveryMappingCandidateAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  const { result, sessionId } = await saveDiscoveryMappingItemFromForm(formData);
  if (!result.ok) return { message: result.message, status: "error" };
  revalidatePath(`/studio/discovery/interviews/${sessionId}/map`);
  return {
    message: "Added to the governed proposed changes. The documented Process has not changed.",
    status: "success",
  };
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
