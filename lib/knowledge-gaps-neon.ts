import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  discoveryObservation,
  discoveryProposalDecision,
  discoverySession,
  process as processTable,
} from "@/db/schema";

import type { KnowledgeGapDiscoverySources } from "./knowledge-gaps.mjs";

export async function loadNeonKnowledgeGapDiscoverySources(
  organizationId: number,
): Promise<KnowledgeGapDiscoverySources> {
  const [observations, decisions] = await db.batch([
    db
      .select({
        createdAt: discoveryObservation.createdAt,
        epistemicState: discoveryObservation.epistemicState,
        id: discoveryObservation.stableKey,
        processKey: discoverySession.processStableKey,
        processName: processTable.name,
        promptText: discoveryObservation.promptText,
        sessionId: discoverySession.stableKey,
        supersedesObservationId:
          discoveryObservation.supersedesObservationStableKey,
      })
      .from(discoveryObservation)
      .innerJoin(
        discoverySession,
        and(
          eq(discoverySession.organizationId, organizationId),
          eq(discoverySession.id, discoveryObservation.sessionId),
          eq(
            discoverySession.stableKey,
            discoveryObservation.sessionStableKey,
          ),
        ),
      )
      .innerJoin(
        processTable,
        and(
          eq(processTable.organizationId, organizationId),
          eq(processTable.id, discoverySession.processId),
          eq(processTable.stableKey, discoverySession.processStableKey),
        ),
      )
      .where(eq(discoveryObservation.organizationId, organizationId))
      .orderBy(asc(discoveryObservation.createdAt)),
    db
      .select({
        createdAt: discoveryProposalDecision.createdAt,
        decisionSequence: discoveryProposalDecision.decisionSequence,
        disposition: discoveryProposalDecision.disposition,
        observationId: discoveryProposalDecision.observationStableKey,
      })
      .from(discoveryProposalDecision)
      .where(eq(discoveryProposalDecision.organizationId, organizationId))
      .orderBy(
        asc(discoveryProposalDecision.observationStableKey),
        asc(discoveryProposalDecision.decisionSequence),
      ),
  ]);

  return {
    decisions: decisions.map((decision) => ({
      ...decision,
      createdAt: decision.createdAt.toISOString(),
    })),
    observations: observations.map((observation) => ({
      ...observation,
      createdAt: observation.createdAt.toISOString(),
    })),
  };
}
