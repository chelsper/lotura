import "server-only";

import { and, asc, desc, eq, lt, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  discoveryInquiry,
  discoveryInquiryObservation,
  discoveryInquiryReview,
  discoveryInquiryReviewOutcome,
  discoveryInquiryReviewSource,
  discoveryInquiryRoute,
  discoveryInquirySession,
  discoveryObservation,
  discoveryObservationConfirmation,
  discoveryProposalMapping,
  discoveryProposalMappingItem,
  discoveryProposalMappingSource,
  discoveryProposal,
  discoveryProposalDecision,
  discoverySession,
  exception as exceptionTable,
  operatingModelProposalReview,
  operatingModelProposalReviewDecision,
  operatingModelProposalApplication,
  operatingModelProposalApplicationItem,
  process as processTable,
  processFamily,
  processVersion,
  processStep,
  processSystem,
  role,
  system as systemTable,
} from "@/db/schema";

import type {
  DiscoveryMappingAction,
  DiscoveryMappingItemState,
} from "./discovery-mapping-model.mjs";
import type {
  DiscoveryInquiryReviewOutcomeKind,
} from "./discovery-inquiry-review-model.mjs";
import type {
  DiscoveryProposalDisposition,
  DocumentedProcessSnapshot,
} from "./discovery-proposal-model.mjs";
import type {
  ProposalReviewDisposition,
  ProposalReviewStatus,
} from "./proposal-review-model.mjs";

export type DiscoveryInquiryRecord = {
  actorIdentifier: string;
  createdAt: string;
  id: string;
  questionText: string;
  revision: number;
  status: "open" | "waiting_for_information" | "routed" | "closed_for_now";
  updatedAt: string;
};

export type DiscoveryInquiryRouteRecord = {
  actorIdentifier: string;
  createdAt: string;
  discoveryInquirySessionId: string | null;
  discoverySessionId: string | null;
  id: string;
  processFamilyId: string | null;
  processFamilyName: string | null;
  processId: string | null;
  processName: string | null;
  routeKind:
    | "review_process"
    | "review_process_family"
    | "start_guided_interview"
    | "start_inquiry_exploration"
    | "wait_for_source"
    | "finish_for_now";
  routeNote: string | null;
  routeSequence: number;
};

export type DiscoverySessionSummary = {
  actorIdentifier: string;
  analystAuthorizationVersion: string | null;
  analystAuthorizedAt: string | null;
  analystEnabled: boolean;
  createdAt: string;
  currentQuestionKey: string;
  id: string;
  observationCount: number;
  processId: string;
  processName: string;
  revision: number;
  scopeStatement: string;
  status: "in_progress" | "paused" | "ready_for_review" | "closed";
  updatedAt: string;
};

export async function loadDiscoveryInquiries(
  organizationId: number,
): Promise<DiscoveryInquiryRecord[]> {
  const rows = await db
    .select({
      actorIdentifier: discoveryInquiry.actorIdentifier,
      createdAt: discoveryInquiry.createdAt,
      id: discoveryInquiry.stableKey,
      questionText: discoveryInquiry.questionText,
      revision: discoveryInquiry.revision,
      status: discoveryInquiry.status,
      updatedAt: discoveryInquiry.updatedAt,
    })
    .from(discoveryInquiry)
    .where(eq(discoveryInquiry.organizationId, organizationId))
    .orderBy(desc(discoveryInquiry.updatedAt), desc(discoveryInquiry.id));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function loadDiscoveryInquiry(
  organizationId: number,
  stableKey: string,
): Promise<DiscoveryInquiryRecord | null> {
  const rows = await db
    .select({
      actorIdentifier: discoveryInquiry.actorIdentifier,
      createdAt: discoveryInquiry.createdAt,
      id: discoveryInquiry.stableKey,
      questionText: discoveryInquiry.questionText,
      revision: discoveryInquiry.revision,
      status: discoveryInquiry.status,
      updatedAt: discoveryInquiry.updatedAt,
    })
    .from(discoveryInquiry)
    .where(
      and(
        eq(discoveryInquiry.organizationId, organizationId),
        eq(discoveryInquiry.stableKey, stableKey),
      ),
    )
    .limit(1);
  const inquiry = rows[0];
  return inquiry
    ? {
        ...inquiry,
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString(),
      }
    : null;
}

export async function loadDiscoveryInquiryRoutes(
  organizationId: number,
  inquiryStableKey: string,
): Promise<DiscoveryInquiryRouteRecord[]> {
  const rows = await db
    .select({
      actorIdentifier: discoveryInquiryRoute.actorIdentifier,
      createdAt: discoveryInquiryRoute.createdAt,
      discoveryInquirySessionId:
        discoveryInquiryRoute.discoveryInquirySessionStableKey,
      discoverySessionId: discoveryInquiryRoute.discoverySessionStableKey,
      id: discoveryInquiryRoute.stableKey,
      processFamilyId: discoveryInquiryRoute.processFamilyStableKey,
      processFamilyName: processFamily.name,
      processId: discoveryInquiryRoute.processId,
      processName: processTable.name,
      routeKind: discoveryInquiryRoute.routeKind,
      routeNote: discoveryInquiryRoute.routeNote,
      routeSequence: discoveryInquiryRoute.routeSequence,
    })
    .from(discoveryInquiryRoute)
    .leftJoin(
      processTable,
      and(
        eq(processTable.organizationId, organizationId),
        eq(processTable.id, discoveryInquiryRoute.processId),
        eq(processTable.stableKey, discoveryInquiryRoute.processStableKey),
      ),
    )
    .leftJoin(
      processFamily,
      and(
        eq(processFamily.organizationId, organizationId),
        eq(processFamily.id, discoveryInquiryRoute.processFamilyId),
        eq(
          processFamily.stableKey,
          discoveryInquiryRoute.processFamilyStableKey,
        ),
      ),
    )
    .where(
      and(
        eq(discoveryInquiryRoute.organizationId, organizationId),
        eq(discoveryInquiryRoute.inquiryStableKey, inquiryStableKey),
      ),
    )
    .orderBy(asc(discoveryInquiryRoute.routeSequence));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    processFamilyId: row.processFamilyId?.toString() ?? null,
    processId: row.processId ? `process:${row.processId}` : null,
  }));
}

export type DiscoveryObservationRecord = {
  actorIdentifier: string;
  createdAt: string;
  epistemicState:
    | "known"
    | "assumed"
    | "unknown"
    | "needs_validation"
    | "conflicting_observation";
  id: string;
  promptKey: string;
  promptText: string;
  responseText: string | null;
  sequence: number;
  supersedesObservationId: string | null;
  topic:
    | "purpose"
    | "boundary"
    | "participants_responsibility"
    | "sequence"
    | "systems"
    | "exceptions"
    | "dependencies_handoffs"
    | "unresolved_questions";
  confirmedFrom?: {
    actorIdentifier: string;
    createdAt: string;
    observationId: string;
    scopeStatement: string;
    sessionId: string;
  } | null;
};

export type PriorDiscoveryObservationRecord = {
  actorIdentifier: string;
  createdAt: string;
  epistemicState: DiscoveryObservationRecord["epistemicState"];
  id: string;
  promptText: string;
  responseText: string | null;
  scopeStatement: string;
  sessionId: string;
};

export type DiscoverySessionDetail = DiscoverySessionSummary & {
  observations: DiscoveryObservationRecord[];
  priorObservations: PriorDiscoveryObservationRecord[];
};

export type DiscoveryInquirySessionDetail = {
  actorIdentifier: string;
  analystAuthorizationVersion: string | null;
  analystAuthorizedAt: string | null;
  analystEnabled: boolean;
  createdAt: string;
  currentQuestionKey: string;
  id: string;
  inquiryId: string;
  observationCount: number;
  observations: DiscoveryObservationRecord[];
  questionText: string;
  revision: number;
  scopeStatement: string;
  status: "in_progress" | "paused" | "ready_for_review" | "closed";
  updatedAt: string;
};

export type DiscoveryInquiryReviewOutcomeRecord = {
  explanation: string | null;
  id: string;
  kind: DiscoveryInquiryReviewOutcomeKind;
  processId: string | null;
  processName: string | null;
};

export type DiscoveryInquiryReviewRecord = {
  actorIdentifier: string;
  completedAt: string;
  id: string;
  observations: DiscoveryObservationRecord[];
  outcomes: DiscoveryInquiryReviewOutcomeRecord[];
  reviewNote: string | null;
  reviewedSessionRevision: number;
  reviewSequence: number;
  supersedesReviewId: string | null;
};

export type DiscoveryInquiryReviewProcess = {
  id: string;
  name: string;
  status: "draft" | "active";
};

export type DiscoveryProposalDecisionRecord = {
  actorIdentifier: string;
  createdAt: string;
  decisionSequence: number;
  disposition: DiscoveryProposalDisposition;
  id: string;
  observationId: string;
  reviewNote: string | null;
};

export type DiscoveryProposalRecord = {
  actorIdentifier: string;
  createdAt: string;
  decisions: DiscoveryProposalDecisionRecord[];
  documentedProcessFingerprint: string;
  documentedProcessSnapshot: DocumentedProcessSnapshot;
  id: string;
  readyAt: string | null;
  readyByActor: string | null;
  revision: number;
  status: "draft" | "ready_for_review";
  updatedAt: string;
};

export type DiscoveryMappingItemRecord = {
  action: DiscoveryMappingAction;
  actorIdentifier: string;
  beforeState: Record<string, unknown>;
  createdAt: string;
  exceptionId: string | null;
  id: string;
  itemId: string;
  itemSequence: number;
  ownerRole: { id: string; name: string } | null;
  processStepId: string | null;
  proposedState: Record<string, unknown>;
  rationale: string;
  relatedProcessId: string | null;
  responsibleRoleId: string | null;
  sourceObservationIds: string[];
  state: DiscoveryMappingItemState;
  systemId: string | null;
};

export type DiscoveryProposalMappingRecord = {
  actorIdentifier: string;
  createdAt: string;
  id: string;
  items: DiscoveryMappingItemRecord[];
  readyAt: string | null;
  readyByActor: string | null;
  revision: number;
  status: "draft" | "ready_for_proposal_review";
  updatedAt: string;
};

export type ProposalReviewDecisionRecord = {
  actorIdentifier: string;
  createdAt: string;
  decisionSequence: number;
  disposition: ProposalReviewDisposition;
  id: string;
  itemId: string;
  itemRevisionId: string;
  itemSequence: number;
  reviewNote: string | null;
};

export type ProposalReviewRecord = {
  completedAt: string | null;
  completedByActor: string | null;
  completionNote: string | null;
  createdAt: string;
  decisions: ProposalReviewDecisionRecord[];
  documentedProcessFingerprint: string;
  id: string;
  mappingId: string;
  mappingRevision: number;
  revision: number;
  startedByActor: string;
  status: ProposalReviewStatus;
  updatedAt: string;
};

export type ProcessApplicationItemRecord = {
  action: DiscoveryMappingAction;
  afterState: Record<string, unknown>;
  applicationSequence: number;
  beforeState: Record<string, unknown>;
  changeKind: "correction" | "organizational_change";
  id: string;
};

export type ProcessApplicationRecord = {
  actorIdentifier: string;
  afterVersionSequence: number;
  beforeVersionSequence: number;
  createdAt: string;
  effectiveAt: string;
  id: string;
  items: ProcessApplicationItemRecord[];
  reason: string;
};

export type DiscoveryMappingCatalog = {
  exceptions: Array<{
    condition: string;
    id: string;
    name: string;
    response: string;
    stepId: string | null;
    stepTitle: string | null;
  }>;
  processes: Array<{
    id: string;
    name: string;
    status: "draft" | "active" | "archived";
  }>;
  steps: Array<{
    id: string;
    instructions: string;
    position: number;
    responsibleRoleId: string | null;
    responsibleRoleName: string | null;
    title: string;
  }>;
  systems: Array<{
    alreadyLinked: boolean;
    id: string;
    name: string;
    status: "active" | "inactive";
  }>;
};

export async function loadDiscoveryMappingCatalog(
  organizationId: number,
  sessionStableKey: string,
): Promise<DiscoveryMappingCatalog | null> {
  const contexts = await db
    .select({ processId: discoverySession.processId })
    .from(discoverySession)
    .where(
      and(
        eq(discoverySession.organizationId, organizationId),
        eq(discoverySession.stableKey, sessionStableKey),
      ),
    )
    .limit(1);
  const context = contexts[0];
  if (!context) return null;

  const [steps, exceptions, systems, processes] = await Promise.all([
    db
      .select({
        id: processStep.stableKey,
        instructions: processStep.instructions,
        position: processStep.position,
        responsibleRoleId: role.stableKey,
        responsibleRoleName: role.name,
        title: processStep.title,
      })
      .from(processStep)
      .leftJoin(
        role,
        and(
          eq(role.organizationId, organizationId),
          eq(role.id, processStep.responsibleRoleId),
        ),
      )
      .where(
        and(
          eq(processStep.organizationId, organizationId),
          eq(processStep.processId, context.processId),
        ),
      )
      .orderBy(asc(processStep.position)),
    db
      .select({
        condition: exceptionTable.condition,
        id: exceptionTable.stableKey,
        name: exceptionTable.name,
        response: exceptionTable.response,
        stepId: processStep.stableKey,
        stepTitle: processStep.title,
      })
      .from(exceptionTable)
      .leftJoin(
        processStep,
        and(
          eq(processStep.organizationId, organizationId),
          eq(processStep.processId, context.processId),
          eq(processStep.id, exceptionTable.processStepId),
        ),
      )
      .where(
        and(
          eq(exceptionTable.organizationId, organizationId),
          eq(exceptionTable.processId, context.processId),
          eq(exceptionTable.status, "active"),
        ),
      )
      .orderBy(asc(exceptionTable.name)),
    db
      .select({
        id: systemTable.stableKey,
        linkedProcessId: processSystem.processId,
        name: systemTable.name,
        status: systemTable.status,
      })
      .from(systemTable)
      .leftJoin(
        processSystem,
        and(
          eq(processSystem.organizationId, organizationId),
          eq(processSystem.processId, context.processId),
          eq(processSystem.systemId, systemTable.id),
        ),
      )
      .where(eq(systemTable.organizationId, organizationId))
      .orderBy(asc(systemTable.name)),
    db
      .select({
        id: processTable.stableKey,
        name: processTable.name,
        status: processTable.status,
      })
      .from(processTable)
      .where(
        and(
          eq(processTable.organizationId, organizationId),
          sql`${processTable.id} <> ${context.processId}`,
        ),
      )
      .orderBy(asc(processTable.name)),
  ]);

  return {
    exceptions,
    processes,
    steps,
    systems: systems.map(({ linkedProcessId, ...system }) => ({
      ...system,
      alreadyLinked: linkedProcessId !== null,
    })),
  };
}

export async function loadDiscoverySessions(
  organizationId: number,
): Promise<DiscoverySessionSummary[]> {
  const rows = await db
    .select({
      actorIdentifier: discoverySession.actorIdentifier,
      analystAuthorizationVersion: discoverySession.analystAuthorizationVersion,
      analystAuthorizedAt: discoverySession.analystAuthorizedAt,
      analystEnabled: discoverySession.analystEnabled,
      createdAt: discoverySession.createdAt,
      currentQuestionKey: discoverySession.currentQuestionKey,
      id: discoverySession.stableKey,
      processId: processTable.id,
      processName: processTable.name,
      revision: discoverySession.revision,
      scopeStatement: discoverySession.scopeStatement,
      status: discoverySession.status,
      updatedAt: discoverySession.updatedAt,
    })
    .from(discoverySession)
    .innerJoin(
      processTable,
      and(
        eq(processTable.organizationId, organizationId),
        eq(processTable.id, discoverySession.processId),
        eq(processTable.stableKey, discoverySession.processStableKey),
      ),
    )
    .where(eq(discoverySession.organizationId, organizationId))
    .orderBy(desc(discoverySession.updatedAt));

  const counts = await db
    .select({
      sessionId: discoveryObservation.sessionStableKey,
      sequence: discoveryObservation.sequence,
    })
    .from(discoveryObservation)
    .where(eq(discoveryObservation.organizationId, organizationId));
  const countBySession = new Map<string, number>();
  for (const row of counts) {
    countBySession.set(
      row.sessionId,
      Math.max(countBySession.get(row.sessionId) || 0, row.sequence),
    );
  }

  return rows.map((row) => ({
    ...row,
    analystAuthorizedAt: row.analystAuthorizedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    observationCount: countBySession.get(row.id) || 0,
    processId: `process:${row.processId}`,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function loadDiscoveryInquirySession(
  organizationId: number,
  inquiryStableKey: string,
  sessionStableKey: string,
): Promise<DiscoveryInquirySessionDetail | null> {
  const sessions = await db
    .select({
      actorIdentifier: discoveryInquirySession.actorIdentifier,
      analystAuthorizationVersion:
        discoveryInquirySession.analystAuthorizationVersion,
      analystAuthorizedAt: discoveryInquirySession.analystAuthorizedAt,
      analystEnabled: discoveryInquirySession.analystEnabled,
      createdAt: discoveryInquirySession.createdAt,
      currentQuestionKey: discoveryInquirySession.currentQuestionKey,
      id: discoveryInquirySession.stableKey,
      inquiryId: discoveryInquiry.stableKey,
      questionText: discoveryInquiry.questionText,
      revision: discoveryInquirySession.revision,
      scopeStatement: discoveryInquirySession.scopeStatement,
      status: discoveryInquirySession.status,
      updatedAt: discoveryInquirySession.updatedAt,
    })
    .from(discoveryInquirySession)
    .innerJoin(
      discoveryInquiry,
      and(
        eq(discoveryInquiry.organizationId, organizationId),
        eq(discoveryInquiry.id, discoveryInquirySession.inquiryId),
        eq(
          discoveryInquiry.stableKey,
          discoveryInquirySession.inquiryStableKey,
        ),
      ),
    )
    .where(
      and(
        eq(discoveryInquirySession.organizationId, organizationId),
        eq(discoveryInquiry.stableKey, inquiryStableKey),
        eq(discoveryInquirySession.stableKey, sessionStableKey),
      ),
    )
    .limit(1);
  const session = sessions[0];
  if (!session) return null;

  const observations = await db
    .select({
      actorIdentifier: discoveryInquiryObservation.actorIdentifier,
      createdAt: discoveryInquiryObservation.createdAt,
      epistemicState: discoveryInquiryObservation.epistemicState,
      id: discoveryInquiryObservation.stableKey,
      promptKey: discoveryInquiryObservation.promptKey,
      promptText: discoveryInquiryObservation.promptText,
      responseText: discoveryInquiryObservation.responseText,
      sequence: discoveryInquiryObservation.sequence,
      supersedesObservationId:
        discoveryInquiryObservation.supersedesObservationStableKey,
      topic: discoveryInquiryObservation.topic,
    })
    .from(discoveryInquiryObservation)
    .where(
      and(
        eq(discoveryInquiryObservation.organizationId, organizationId),
        eq(discoveryInquiryObservation.sessionStableKey, sessionStableKey),
      ),
    )
    .orderBy(asc(discoveryInquiryObservation.sequence));

  return {
    ...session,
    analystAuthorizedAt: session.analystAuthorizedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    observationCount: observations.length,
    observations: observations.map((observation) => ({
      ...observation,
      confirmedFrom: null,
      createdAt: observation.createdAt.toISOString(),
    })),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export async function loadDiscoveryInquiryReviewProcesses(
  organizationId: number,
): Promise<DiscoveryInquiryReviewProcess[]> {
  const rows = await db
    .select({
      id: processTable.id,
      name: processTable.name,
      status: processTable.status,
    })
    .from(processTable)
    .where(
      and(
        eq(processTable.organizationId, organizationId),
        sql`${processTable.status} in ('draft', 'active')`,
      ),
    )
    .orderBy(asc(processTable.name));

  return rows.map((row) => ({
    id: `process:${row.id}`,
    name: row.name,
    status: row.status as "draft" | "active",
  }));
}

export async function loadDiscoveryInquiryReview(
  organizationId: number,
  inquiryStableKey: string,
  sessionStableKey: string,
  reviewStableKey?: string,
): Promise<DiscoveryInquiryReviewRecord | null> {
  const reviewWhere = reviewStableKey
    ? and(
        eq(discoveryInquiryReview.organizationId, organizationId),
        eq(discoveryInquiry.stableKey, inquiryStableKey),
        eq(discoveryInquirySession.stableKey, sessionStableKey),
        eq(discoveryInquiryReview.stableKey, reviewStableKey),
      )
    : and(
        eq(discoveryInquiryReview.organizationId, organizationId),
        eq(discoveryInquiry.stableKey, inquiryStableKey),
        eq(discoveryInquirySession.stableKey, sessionStableKey),
      );
  const reviews = await db
    .select({
      actorIdentifier: discoveryInquiryReview.actorIdentifier,
      completedAt: discoveryInquiryReview.completedAt,
      id: discoveryInquiryReview.stableKey,
      reviewNote: discoveryInquiryReview.reviewNote,
      reviewedSessionRevision: discoveryInquiryReview.reviewedSessionRevision,
      reviewSequence: discoveryInquiryReview.reviewSequence,
      supersedesReviewId:
        discoveryInquiryReview.supersedesReviewStableKey,
    })
    .from(discoveryInquiryReview)
    .innerJoin(
      discoveryInquirySession,
      and(
        eq(discoveryInquirySession.organizationId, organizationId),
        eq(discoveryInquirySession.id, discoveryInquiryReview.sessionId),
        eq(
          discoveryInquirySession.stableKey,
          discoveryInquiryReview.sessionStableKey,
        ),
      ),
    )
    .innerJoin(
      discoveryInquiry,
      and(
        eq(discoveryInquiry.organizationId, organizationId),
        eq(discoveryInquiry.id, discoveryInquiryReview.inquiryId),
        eq(
          discoveryInquiry.stableKey,
          discoveryInquiryReview.inquiryStableKey,
        ),
      ),
    )
    .where(reviewWhere)
    .orderBy(desc(discoveryInquiryReview.reviewSequence))
    .limit(1);
  const review = reviews[0];
  if (!review) return null;

  const [outcomes, observations] = await Promise.all([
    db
      .select({
        explanation: discoveryInquiryReviewOutcome.explanation,
        id: discoveryInquiryReviewOutcome.stableKey,
        kind: discoveryInquiryReviewOutcome.outcomeKind,
        processId: processTable.id,
        processName: processTable.name,
      })
      .from(discoveryInquiryReviewOutcome)
      .leftJoin(
        processTable,
        and(
          eq(processTable.organizationId, organizationId),
          eq(processTable.id, discoveryInquiryReviewOutcome.processId),
          eq(
            processTable.stableKey,
            discoveryInquiryReviewOutcome.processStableKey,
          ),
        ),
      )
      .where(
        and(
          eq(discoveryInquiryReviewOutcome.organizationId, organizationId),
          eq(discoveryInquiryReviewOutcome.reviewStableKey, review.id),
        ),
      )
      .orderBy(asc(discoveryInquiryReviewOutcome.id)),
    db
      .select({
        actorIdentifier: discoveryInquiryObservation.actorIdentifier,
        createdAt: discoveryInquiryObservation.createdAt,
        epistemicState: discoveryInquiryObservation.epistemicState,
        id: discoveryInquiryObservation.stableKey,
        promptKey: discoveryInquiryObservation.promptKey,
        promptText: discoveryInquiryObservation.promptText,
        responseText: discoveryInquiryObservation.responseText,
        sequence: discoveryInquiryObservation.sequence,
        supersedesObservationId:
          discoveryInquiryObservation.supersedesObservationStableKey,
        topic: discoveryInquiryObservation.topic,
      })
      .from(discoveryInquiryReviewSource)
      .innerJoin(
        discoveryInquiryObservation,
        and(
          eq(
            discoveryInquiryObservation.organizationId,
            discoveryInquiryReviewSource.organizationId,
          ),
          eq(
            discoveryInquiryObservation.sessionId,
            discoveryInquiryReviewSource.sessionId,
          ),
          eq(
            discoveryInquiryObservation.stableKey,
            discoveryInquiryReviewSource.observationStableKey,
          ),
        ),
      )
      .where(
        and(
          eq(discoveryInquiryReviewSource.organizationId, organizationId),
          eq(discoveryInquiryReviewSource.reviewStableKey, review.id),
        ),
      )
      .orderBy(asc(discoveryInquiryObservation.sequence)),
  ]);

  return {
    ...review,
    completedAt: review.completedAt.toISOString(),
    observations: observations.map((observation) => ({
      ...observation,
      createdAt: observation.createdAt.toISOString(),
    })),
    outcomes: outcomes.map((outcome) => ({
      ...outcome,
      processId: outcome.processId ? `process:${outcome.processId}` : null,
    })),
  };
}

export async function loadDiscoverySession(
  organizationId: number,
  stableKey: string,
): Promise<DiscoverySessionDetail | null> {
  const sessions = await db
    .select({
      actorIdentifier: discoverySession.actorIdentifier,
      analystAuthorizationVersion: discoverySession.analystAuthorizationVersion,
      analystAuthorizedAt: discoverySession.analystAuthorizedAt,
      analystEnabled: discoverySession.analystEnabled,
      createdAt: discoverySession.createdAt,
      currentQuestionKey: discoverySession.currentQuestionKey,
      id: discoverySession.stableKey,
      internalProcessId: discoverySession.processId,
      internalSessionId: discoverySession.id,
      processId: processTable.id,
      processName: processTable.name,
      processStableKey: discoverySession.processStableKey,
      revision: discoverySession.revision,
      scopeStatement: discoverySession.scopeStatement,
      status: discoverySession.status,
      updatedAt: discoverySession.updatedAt,
    })
    .from(discoverySession)
    .innerJoin(
      processTable,
      and(
        eq(processTable.organizationId, organizationId),
        eq(processTable.id, discoverySession.processId),
        eq(processTable.stableKey, discoverySession.processStableKey),
      ),
    )
    .where(
      and(
        eq(discoverySession.organizationId, organizationId),
        eq(discoverySession.stableKey, stableKey),
      ),
    )
    .limit(1);
  const session = sessions[0];
  if (!session) return null;

  const sourceSession = alias(discoverySession, "source_discovery_session");
  const supersedingObservation = alias(
    discoveryObservation,
    "superseding_discovery_observation",
  );

  const [observations, confirmations, priorObservations] = await Promise.all([
    db
      .select({
        actorIdentifier: discoveryObservation.actorIdentifier,
        createdAt: discoveryObservation.createdAt,
        epistemicState: discoveryObservation.epistemicState,
        id: discoveryObservation.stableKey,
        promptKey: discoveryObservation.promptKey,
        promptText: discoveryObservation.promptText,
        responseText: discoveryObservation.responseText,
        sequence: discoveryObservation.sequence,
        supersedesObservationId:
          discoveryObservation.supersedesObservationStableKey,
        topic: discoveryObservation.topic,
      })
      .from(discoveryObservation)
      .where(
        and(
          eq(discoveryObservation.organizationId, organizationId),
          eq(discoveryObservation.sessionStableKey, stableKey),
        ),
      )
      .orderBy(asc(discoveryObservation.sequence)),
    db
      .select({
        confirmationObservationId:
          discoveryObservationConfirmation.confirmationObservationStableKey,
        sourceActorIdentifier: sourceSession.actorIdentifier,
        sourceCreatedAt: sourceSession.createdAt,
        sourceObservationId:
          discoveryObservationConfirmation.sourceObservationStableKey,
        sourceScopeStatement: sourceSession.scopeStatement,
        sourceSessionId: sourceSession.stableKey,
      })
      .from(discoveryObservationConfirmation)
      .innerJoin(
        sourceSession,
        and(
          eq(sourceSession.organizationId, organizationId),
          eq(
            sourceSession.id,
            discoveryObservationConfirmation.sourceSessionId,
          ),
          eq(
            sourceSession.stableKey,
            discoveryObservationConfirmation.sourceSessionStableKey,
          ),
        ),
      )
      .where(
        and(
          eq(discoveryObservationConfirmation.organizationId, organizationId),
          eq(
            discoveryObservationConfirmation.confirmationSessionStableKey,
            stableKey,
          ),
        ),
      ),
    session.status === "in_progress"
      ? db
          .select({
            actorIdentifier: sourceSession.actorIdentifier,
            createdAt: discoveryObservation.createdAt,
            epistemicState: discoveryObservation.epistemicState,
            id: discoveryObservation.stableKey,
            promptText: discoveryObservation.promptText,
            responseText: discoveryObservation.responseText,
            scopeStatement: sourceSession.scopeStatement,
            sessionId: sourceSession.stableKey,
          })
          .from(discoveryObservation)
          .innerJoin(
            sourceSession,
            and(
              eq(sourceSession.organizationId, organizationId),
              eq(sourceSession.id, discoveryObservation.sessionId),
              eq(
                sourceSession.stableKey,
                discoveryObservation.sessionStableKey,
              ),
            ),
          )
          .where(
            and(
              eq(discoveryObservation.organizationId, organizationId),
              eq(sourceSession.processId, session.internalProcessId),
              eq(sourceSession.processStableKey, session.processStableKey),
              lt(sourceSession.id, session.internalSessionId),
              eq(
                discoveryObservation.promptKey,
                session.currentQuestionKey,
              ),
              notExists(
                db
                  .select({ id: supersedingObservation.id })
                  .from(supersedingObservation)
                  .where(
                    and(
                      eq(
                        supersedingObservation.organizationId,
                        organizationId,
                      ),
                      eq(
                        supersedingObservation.sessionId,
                        discoveryObservation.sessionId,
                      ),
                      eq(
                        supersedingObservation.supersedesObservationStableKey,
                        discoveryObservation.stableKey,
                      ),
                    ),
                  ),
              ),
            ),
          )
          .orderBy(desc(discoveryObservation.createdAt))
          .limit(3)
      : Promise.resolve([]),
  ]);

  const confirmationByObservation = new Map(
    confirmations.map((confirmation) => [
      confirmation.confirmationObservationId,
      {
        actorIdentifier: confirmation.sourceActorIdentifier,
        createdAt: confirmation.sourceCreatedAt.toISOString(),
        observationId: confirmation.sourceObservationId,
        scopeStatement: confirmation.sourceScopeStatement,
        sessionId: confirmation.sourceSessionId,
      },
    ]),
  );

  return {
    actorIdentifier: session.actorIdentifier,
    analystAuthorizationVersion: session.analystAuthorizationVersion,
    analystAuthorizedAt: session.analystAuthorizedAt?.toISOString() ?? null,
    analystEnabled: session.analystEnabled,
    createdAt: session.createdAt.toISOString(),
    currentQuestionKey: session.currentQuestionKey,
    id: session.id,
    observationCount: observations.length,
    observations: observations.map((observation) => ({
      ...observation,
      confirmedFrom: confirmationByObservation.get(observation.id) ?? null,
      createdAt: observation.createdAt.toISOString(),
    })),
    priorObservations: priorObservations.map((observation) => ({
      ...observation,
      createdAt: observation.createdAt.toISOString(),
    })),
    processId: `process:${session.processId}`,
    processName: session.processName,
    revision: session.revision,
    scopeStatement: session.scopeStatement,
    status: session.status,
    updatedAt: session.updatedAt.toISOString(),
  };
}

export async function loadDiscoveryProposal(
  organizationId: number,
  sessionStableKey: string,
): Promise<DiscoveryProposalRecord | null> {
  const proposals = await db
    .select({
      actorIdentifier: discoveryProposal.actorIdentifier,
      createdAt: discoveryProposal.createdAt,
      documentedProcessFingerprint:
        discoveryProposal.documentedProcessFingerprint,
      documentedProcessSnapshot: discoveryProposal.documentedProcessSnapshot,
      id: discoveryProposal.stableKey,
      readyAt: discoveryProposal.readyAt,
      readyByActor: discoveryProposal.readyByActor,
      revision: discoveryProposal.revision,
      status: discoveryProposal.status,
      updatedAt: discoveryProposal.updatedAt,
    })
    .from(discoveryProposal)
    .where(
      and(
        eq(discoveryProposal.organizationId, organizationId),
        eq(discoveryProposal.sessionStableKey, sessionStableKey),
      ),
    )
    .limit(1);
  const proposal = proposals[0];
  if (!proposal) return null;

  const decisions = await db
    .select({
      actorIdentifier: discoveryProposalDecision.actorIdentifier,
      createdAt: discoveryProposalDecision.createdAt,
      decisionSequence: discoveryProposalDecision.decisionSequence,
      disposition: discoveryProposalDecision.disposition,
      id: discoveryProposalDecision.stableKey,
      observationId: discoveryProposalDecision.observationStableKey,
      reviewNote: discoveryProposalDecision.reviewNote,
    })
    .from(discoveryProposalDecision)
    .where(
      and(
        eq(discoveryProposalDecision.organizationId, organizationId),
        eq(discoveryProposalDecision.proposalStableKey, proposal.id),
      ),
    )
    .orderBy(
      asc(discoveryProposalDecision.createdAt),
      asc(discoveryProposalDecision.id),
    );

  return {
    ...proposal,
    createdAt: proposal.createdAt.toISOString(),
    decisions: decisions.map((decision) => ({
      ...decision,
      createdAt: decision.createdAt.toISOString(),
    })),
    documentedProcessSnapshot:
      proposal.documentedProcessSnapshot as DocumentedProcessSnapshot,
    readyAt: proposal.readyAt?.toISOString() ?? null,
    updatedAt: proposal.updatedAt.toISOString(),
  };
}

export async function loadDiscoveryProposalMapping(
  organizationId: number,
  sessionStableKey: string,
): Promise<DiscoveryProposalMappingRecord | null> {
  const mappings = await db
    .select({
      actorIdentifier: discoveryProposalMapping.actorIdentifier,
      createdAt: discoveryProposalMapping.createdAt,
      id: discoveryProposalMapping.stableKey,
      readyAt: discoveryProposalMapping.readyAt,
      readyByActor: discoveryProposalMapping.readyByActor,
      revision: discoveryProposalMapping.revision,
      status: discoveryProposalMapping.status,
      updatedAt: discoveryProposalMapping.updatedAt,
    })
    .from(discoveryProposalMapping)
    .where(
      and(
        eq(discoveryProposalMapping.organizationId, organizationId),
        eq(discoveryProposalMapping.sessionStableKey, sessionStableKey),
      ),
    )
    .limit(1);
  const mapping = mappings[0];
  if (!mapping) return null;

  const items = await db
    .select({
      action: discoveryProposalMappingItem.action,
      actorIdentifier: discoveryProposalMappingItem.actorIdentifier,
      beforeState: discoveryProposalMappingItem.beforeState,
      createdAt: discoveryProposalMappingItem.createdAt,
      exceptionId: discoveryProposalMappingItem.exceptionStableKey,
      id: discoveryProposalMappingItem.stableKey,
      itemId: discoveryProposalMappingItem.itemStableKey,
      itemSequence: discoveryProposalMappingItem.itemSequence,
      ownerRoleId: role.stableKey,
      ownerRoleName: role.name,
      processStepId: discoveryProposalMappingItem.processStepStableKey,
      proposedState: discoveryProposalMappingItem.proposedState,
      rationale: discoveryProposalMappingItem.rationale,
      relatedProcessId: discoveryProposalMappingItem.relatedProcessStableKey,
      responsibleRoleId:
        discoveryProposalMappingItem.responsibleRoleStableKey,
      state: discoveryProposalMappingItem.state,
      systemId: discoveryProposalMappingItem.systemStableKey,
    })
    .from(discoveryProposalMappingItem)
    .leftJoin(
      role,
      and(
        eq(role.organizationId, organizationId),
        eq(role.id, discoveryProposalMappingItem.ownerRoleId),
        eq(role.stableKey, discoveryProposalMappingItem.ownerRoleStableKey),
      ),
    )
    .where(
      and(
        eq(discoveryProposalMappingItem.organizationId, organizationId),
        eq(discoveryProposalMappingItem.mappingStableKey, mapping.id),
      ),
    )
    .orderBy(
      asc(discoveryProposalMappingItem.createdAt),
      asc(discoveryProposalMappingItem.id),
    );

  const sources = await db
    .select({
      itemRevisionId: discoveryProposalMappingSource.itemRevisionStableKey,
      observationId: discoveryProposalMappingSource.observationStableKey,
    })
    .from(discoveryProposalMappingSource)
    .where(
      and(
        eq(discoveryProposalMappingSource.organizationId, organizationId),
        eq(discoveryProposalMappingSource.mappingStableKey, mapping.id),
      ),
    )
    .orderBy(asc(discoveryProposalMappingSource.id));
  const sourcesByRevision = new Map<string, string[]>();
  for (const source of sources) {
    const current = sourcesByRevision.get(source.itemRevisionId) ?? [];
    current.push(source.observationId);
    sourcesByRevision.set(source.itemRevisionId, current);
  }

  return {
    ...mapping,
    createdAt: mapping.createdAt.toISOString(),
    items: items.map((item) => ({
      action: item.action,
      actorIdentifier: item.actorIdentifier,
      beforeState: item.beforeState as Record<string, unknown>,
      createdAt: item.createdAt.toISOString(),
      exceptionId: item.exceptionId,
      id: item.id,
      itemId: item.itemId,
      itemSequence: item.itemSequence,
      ownerRole: item.ownerRoleId && item.ownerRoleName
        ? { id: item.ownerRoleId, name: item.ownerRoleName }
        : null,
      processStepId: item.processStepId,
      proposedState: item.proposedState as Record<string, unknown>,
      rationale: item.rationale,
      relatedProcessId: item.relatedProcessId,
      responsibleRoleId: item.responsibleRoleId,
      sourceObservationIds: sourcesByRevision.get(item.id) ?? [],
      state: item.state,
      systemId: item.systemId,
    })),
    readyAt: mapping.readyAt?.toISOString() ?? null,
    updatedAt: mapping.updatedAt.toISOString(),
  };
}

export async function loadOperatingModelProposalReview(
  organizationId: number,
  sessionStableKey: string,
): Promise<ProposalReviewRecord | null> {
  const reviews = await db
    .select({
      completedAt: operatingModelProposalReview.completedAt,
      completedByActor: operatingModelProposalReview.completedByActor,
      completionNote: operatingModelProposalReview.completionNote,
      createdAt: operatingModelProposalReview.createdAt,
      documentedProcessFingerprint:
        operatingModelProposalReview.documentedProcessFingerprint,
      id: operatingModelProposalReview.stableKey,
      mappingId: operatingModelProposalReview.mappingStableKey,
      mappingRevision: operatingModelProposalReview.mappingRevision,
      revision: operatingModelProposalReview.revision,
      startedByActor: operatingModelProposalReview.startedByActor,
      status: operatingModelProposalReview.status,
      updatedAt: operatingModelProposalReview.updatedAt,
    })
    .from(operatingModelProposalReview)
    .where(
      and(
        eq(operatingModelProposalReview.organizationId, organizationId),
        eq(operatingModelProposalReview.sessionStableKey, sessionStableKey),
      ),
    )
    .limit(1);
  const review = reviews[0];
  if (!review) return null;

  const decisions = await db
    .select({
      actorIdentifier: operatingModelProposalReviewDecision.actorIdentifier,
      createdAt: operatingModelProposalReviewDecision.createdAt,
      decisionSequence:
        operatingModelProposalReviewDecision.decisionSequence,
      disposition: operatingModelProposalReviewDecision.disposition,
      id: operatingModelProposalReviewDecision.stableKey,
      itemId: operatingModelProposalReviewDecision.itemStableKey,
      itemRevisionId:
        operatingModelProposalReviewDecision.itemRevisionStableKey,
      itemSequence: operatingModelProposalReviewDecision.itemSequence,
      reviewNote: operatingModelProposalReviewDecision.reviewNote,
    })
    .from(operatingModelProposalReviewDecision)
    .where(
      and(
        eq(
          operatingModelProposalReviewDecision.organizationId,
          organizationId,
        ),
        eq(
          operatingModelProposalReviewDecision.reviewStableKey,
          review.id,
        ),
      ),
    )
    .orderBy(
      asc(operatingModelProposalReviewDecision.createdAt),
      asc(operatingModelProposalReviewDecision.id),
    );

  return {
    ...review,
    completedAt: review.completedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    decisions: decisions.map((decision) => ({
      ...decision,
      createdAt: decision.createdAt.toISOString(),
    })),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export async function loadOperatingModelProposalApplication(
  organizationId: number,
  sessionStableKey: string,
): Promise<ProcessApplicationRecord | null> {
  const applications = await db
    .select({
      actorIdentifier: operatingModelProposalApplication.actorIdentifier,
      afterVersionSequence: processVersion.versionSequence,
      beforeVersionId: operatingModelProposalApplication.beforeVersionId,
      createdAt: operatingModelProposalApplication.createdAt,
      effectiveAt: operatingModelProposalApplication.effectiveAt,
      id: operatingModelProposalApplication.stableKey,
      reason: operatingModelProposalApplication.reason,
      reviewId: operatingModelProposalApplication.reviewId,
    })
    .from(operatingModelProposalApplication)
    .innerJoin(
      operatingModelProposalReview,
      and(
        eq(
          operatingModelProposalReview.organizationId,
          operatingModelProposalApplication.organizationId,
        ),
        eq(
          operatingModelProposalReview.id,
          operatingModelProposalApplication.reviewId,
        ),
        eq(
          operatingModelProposalReview.stableKey,
          operatingModelProposalApplication.reviewStableKey,
        ),
      ),
    )
    .innerJoin(
      processVersion,
      and(
        eq(
          processVersion.organizationId,
          operatingModelProposalApplication.organizationId,
        ),
        eq(
          processVersion.id,
          operatingModelProposalApplication.afterVersionId,
        ),
        eq(
          processVersion.stableKey,
          operatingModelProposalApplication.afterVersionStableKey,
        ),
      ),
    )
    .where(
      and(
        eq(operatingModelProposalApplication.organizationId, organizationId),
        eq(operatingModelProposalReview.sessionStableKey, sessionStableKey),
      ),
    )
    .limit(1);
  const application = applications[0];
  if (!application) return null;

  const [beforeVersions, items] = await Promise.all([
    db
      .select({ versionSequence: processVersion.versionSequence })
      .from(processVersion)
      .where(
        and(
          eq(processVersion.organizationId, organizationId),
          eq(processVersion.id, application.beforeVersionId),
        ),
      )
      .limit(1),
    db
      .select({
        action: operatingModelProposalApplicationItem.action,
        afterState: operatingModelProposalApplicationItem.afterState,
        applicationSequence:
          operatingModelProposalApplicationItem.applicationSequence,
        beforeState: operatingModelProposalApplicationItem.beforeState,
        changeKind: operatingModelProposalApplicationItem.changeKind,
        id: operatingModelProposalApplicationItem.stableKey,
      })
      .from(operatingModelProposalApplicationItem)
      .where(
        and(
          eq(
            operatingModelProposalApplicationItem.organizationId,
            organizationId,
          ),
          eq(
            operatingModelProposalApplicationItem.applicationStableKey,
            application.id,
          ),
        ),
      )
      .orderBy(asc(operatingModelProposalApplicationItem.applicationSequence)),
  ]);
  const beforeVersion = beforeVersions[0];
  if (!beforeVersion) return null;

  return {
    actorIdentifier: application.actorIdentifier,
    afterVersionSequence: application.afterVersionSequence,
    beforeVersionSequence: beforeVersion.versionSequence,
    createdAt: application.createdAt.toISOString(),
    effectiveAt: application.effectiveAt.toISOString(),
    id: application.id,
    items: items.map((item) => ({
      ...item,
      afterState: item.afterState as Record<string, unknown>,
      beforeState: item.beforeState as Record<string, unknown>,
    })),
    reason: application.reason,
  };
}
