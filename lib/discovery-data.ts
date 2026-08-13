import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  discoveryObservation,
  discoveryProposalMapping,
  discoveryProposalMappingItem,
  discoveryProposalMappingSource,
  discoveryProposal,
  discoveryProposalDecision,
  discoverySession,
  process as processTable,
  role,
} from "@/db/schema";

import type {
  DiscoveryMappingAction,
  DiscoveryMappingItemState,
} from "./discovery-mapping-model.mjs";
import type {
  DiscoveryProposalDisposition,
  DocumentedProcessSnapshot,
} from "./discovery-proposal-model.mjs";

export type DiscoverySessionSummary = {
  actorIdentifier: string;
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
};

export type DiscoverySessionDetail = DiscoverySessionSummary & {
  observations: DiscoveryObservationRecord[];
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
  id: string;
  itemId: string;
  itemSequence: number;
  ownerRole: { id: string; name: string } | null;
  proposedState: Record<string, unknown>;
  rationale: string;
  sourceObservationIds: string[];
  state: DiscoveryMappingItemState;
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

export async function loadDiscoverySessions(
  organizationId: number,
): Promise<DiscoverySessionSummary[]> {
  const rows = await db
    .select({
      actorIdentifier: discoverySession.actorIdentifier,
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
    createdAt: row.createdAt.toISOString(),
    observationCount: countBySession.get(row.id) || 0,
    processId: `process:${row.processId}`,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function loadDiscoverySession(
  organizationId: number,
  stableKey: string,
): Promise<DiscoverySessionDetail | null> {
  const sessions = await db
    .select({
      actorIdentifier: discoverySession.actorIdentifier,
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
    .where(
      and(
        eq(discoverySession.organizationId, organizationId),
        eq(discoverySession.stableKey, stableKey),
      ),
    )
    .limit(1);
  const session = sessions[0];
  if (!session) return null;

  const observations = await db
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
    .orderBy(asc(discoveryObservation.sequence));

  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    observationCount: observations.length,
    observations: observations.map((observation) => ({
      ...observation,
      createdAt: observation.createdAt.toISOString(),
    })),
    processId: `process:${session.processId}`,
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
      id: discoveryProposalMappingItem.stableKey,
      itemId: discoveryProposalMappingItem.itemStableKey,
      itemSequence: discoveryProposalMappingItem.itemSequence,
      ownerRoleId: role.stableKey,
      ownerRoleName: role.name,
      proposedState: discoveryProposalMappingItem.proposedState,
      rationale: discoveryProposalMappingItem.rationale,
      state: discoveryProposalMappingItem.state,
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
      id: item.id,
      itemId: item.itemId,
      itemSequence: item.itemSequence,
      ownerRole: item.ownerRoleId && item.ownerRoleName
        ? { id: item.ownerRoleId, name: item.ownerRoleName }
        : null,
      proposedState: item.proposedState as Record<string, unknown>,
      rationale: item.rationale,
      sourceObservationIds: sourcesByRevision.get(item.id) ?? [],
      state: item.state,
    })),
    readyAt: mapping.readyAt?.toISOString() ?? null,
    updatedAt: mapping.updatedAt.toISOString(),
  };
}
