import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  discoveryAssistanceDecision,
  discoveryAssistanceRun,
  discoveryAssistanceSuggestion,
} from "@/db/schema";

import {
  readStoredDiscoveryAnalystResult,
  type DiscoveryAnalystResult,
} from "./discovery-analyst-model.mjs";

export type DiscoveryAnalystTurnRecord = {
  createdAt: string;
  modelIdentifier: string;
  providerKey: string;
  requestMetadata: {
    estimatedCostMicrousd: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  snapshot: DiscoveryAnalystResult;
  suggestion: {
    answered: boolean;
    id: string;
    promptKey: string;
    rationale: string;
    text: string;
    topic: string;
  };
};

export async function loadDiscoveryAnalystTurn(
  organizationId: number,
  sessionStableKey: string,
  revision: number,
  sessionKind: "inquiry" | "process" = "process",
): Promise<DiscoveryAnalystTurnRecord | null> {
  const rows = await db
    .select({
      createdAt: discoveryAssistanceRun.createdAt,
      decisionId: discoveryAssistanceDecision.id,
      estimatedCostMicrousd: discoveryAssistanceRun.estimatedCostMicrousd,
      inputTokens: discoveryAssistanceRun.providerInputTokens,
      modelIdentifier: discoveryAssistanceRun.modelIdentifier,
      outputTokens: discoveryAssistanceRun.providerOutputTokens,
      providerKey: discoveryAssistanceRun.providerKey,
      snapshot: discoveryAssistanceRun.analysisSnapshot,
      suggestionId: discoveryAssistanceSuggestion.stableKey,
      suggestionPromptKey: discoveryAssistanceSuggestion.promptKey,
      suggestionRationale: discoveryAssistanceSuggestion.rationale,
      suggestionText: discoveryAssistanceSuggestion.suggestedText,
      suggestionTopic: discoveryAssistanceSuggestion.topic,
      totalTokens: discoveryAssistanceRun.providerTotalTokens,
    })
    .from(discoveryAssistanceRun)
    .innerJoin(
      discoveryAssistanceSuggestion,
      and(
        eq(
          discoveryAssistanceSuggestion.organizationId,
          discoveryAssistanceRun.organizationId,
        ),
        eq(discoveryAssistanceSuggestion.runId, discoveryAssistanceRun.id),
        eq(
          discoveryAssistanceSuggestion.runStableKey,
          discoveryAssistanceRun.stableKey,
        ),
      ),
    )
    .leftJoin(
      discoveryAssistanceDecision,
      and(
        eq(
          discoveryAssistanceDecision.organizationId,
          discoveryAssistanceSuggestion.organizationId,
        ),
        eq(
          discoveryAssistanceDecision.suggestionStableKey,
          discoveryAssistanceSuggestion.stableKey,
        ),
      ),
    )
    .where(
      and(
        eq(discoveryAssistanceRun.organizationId, organizationId),
        eq(discoveryAssistanceRun.sessionKind, sessionKind),
        sessionKind === "process"
          ? eq(discoveryAssistanceRun.discoverySessionStableKey, sessionStableKey)
          : eq(discoveryAssistanceRun.inquirySessionStableKey, sessionStableKey),
        eq(discoveryAssistanceRun.requestedSessionRevision, revision),
        eq(discoveryAssistanceRun.analystTurn, true),
      ),
    )
    .orderBy(desc(discoveryAssistanceRun.createdAt), desc(discoveryAssistanceRun.id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const snapshot = readStoredDiscoveryAnalystResult(row.snapshot, row.providerKey);
  if (!snapshot) return null;
  const hasMetadata = row.inputTokens !== null
    && row.outputTokens !== null
    && row.totalTokens !== null
    && row.estimatedCostMicrousd !== null;
  return {
    createdAt: row.createdAt.toISOString(),
    modelIdentifier: row.modelIdentifier,
    providerKey: row.providerKey,
    requestMetadata: hasMetadata
      ? {
          estimatedCostMicrousd: row.estimatedCostMicrousd!,
          inputTokens: row.inputTokens!,
          outputTokens: row.outputTokens!,
          totalTokens: row.totalTokens!,
        }
      : null,
    snapshot,
    suggestion: {
      answered: row.decisionId !== null,
      id: row.suggestionId,
      promptKey: row.suggestionPromptKey,
      rationale: row.suggestionRationale,
      text: row.suggestionText,
      topic: row.suggestionTopic,
    },
  };
}
