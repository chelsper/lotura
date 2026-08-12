import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  discoveryObservation,
  discoverySession,
  process as processTable,
} from "@/db/schema";

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
