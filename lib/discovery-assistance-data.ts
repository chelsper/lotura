import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  discoveryAssistanceDecision,
  discoveryAssistanceRun,
  discoveryAssistanceSource,
  discoveryAssistanceSuggestion,
  discoveryInquirySession,
} from "@/db/schema";

export type DiscoveryAssistanceSuggestionRecord = {
  decision: {
    disposition: "used_as_written" | "edited" | "skipped" | "rejected";
    selectedText: string | null;
  } | null;
  id: string;
  kind: "follow_up_question" | "clarity_draft";
  originalText: string | null;
  promptKey: string;
  rationale: string;
  suggestedText: string;
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

export type DiscoveryAssistanceRunRecord = {
  assistanceKind: "question_suggestions" | "clarity_draft";
  createdAt: string;
  id: string;
  modelIdentifier: string;
  participantFocus: string | null;
  promptPolicyVersion: string;
  providerKey: string;
  requestedSessionRevision: number;
  sourceCount: number;
  suggestions: DiscoveryAssistanceSuggestionRecord[];
};

async function loadRunDetails(
  organizationId: number,
  runId: number,
  runStableKey: string,
  run: Omit<DiscoveryAssistanceRunRecord, "sourceCount" | "suggestions">,
): Promise<DiscoveryAssistanceRunRecord> {
  const [sourceRows, suggestionRows] = await Promise.all([
    db
      .select({ id: discoveryAssistanceSource.id })
      .from(discoveryAssistanceSource)
      .where(
        and(
          eq(discoveryAssistanceSource.organizationId, organizationId),
          eq(discoveryAssistanceSource.runId, runId),
          eq(discoveryAssistanceSource.runStableKey, runStableKey),
        ),
      ),
    db
      .select({
        decisionDisposition: discoveryAssistanceDecision.disposition,
        decisionSelectedText: discoveryAssistanceDecision.selectedText,
        id: discoveryAssistanceSuggestion.stableKey,
        kind: discoveryAssistanceSuggestion.suggestionKind,
        originalText: discoveryAssistanceSuggestion.originalText,
        promptKey: discoveryAssistanceSuggestion.promptKey,
        rationale: discoveryAssistanceSuggestion.rationale,
        suggestedText: discoveryAssistanceSuggestion.suggestedText,
        topic: discoveryAssistanceSuggestion.topic,
      })
      .from(discoveryAssistanceSuggestion)
      .leftJoin(
        discoveryAssistanceDecision,
        and(
          eq(discoveryAssistanceDecision.organizationId, organizationId),
          eq(
            discoveryAssistanceDecision.suggestionStableKey,
            discoveryAssistanceSuggestion.stableKey,
          ),
        ),
      )
      .where(
        and(
          eq(discoveryAssistanceSuggestion.organizationId, organizationId),
          eq(discoveryAssistanceSuggestion.runId, runId),
          eq(discoveryAssistanceSuggestion.runStableKey, runStableKey),
        ),
      )
      .orderBy(asc(discoveryAssistanceSuggestion.suggestionSequence)),
  ]);

  return {
    ...run,
    sourceCount: sourceRows.length,
    suggestions: suggestionRows.map((suggestion) => ({
      decision: suggestion.decisionDisposition
        ? {
            disposition: suggestion.decisionDisposition,
            selectedText: suggestion.decisionSelectedText,
          }
        : null,
      id: suggestion.id,
      kind: suggestion.kind,
      originalText: suggestion.originalText,
      promptKey: suggestion.promptKey,
      rationale: suggestion.rationale,
      suggestedText: suggestion.suggestedText,
      topic: suggestion.topic,
    })),
  };
}

export async function loadProcessDiscoveryAssistance(
  organizationId: number,
  sessionStableKey: string,
  requestedSessionRevision: number,
  promptKey: string,
): Promise<DiscoveryAssistanceRunRecord | null> {
  const rows = await db
    .select({
      assistanceKind: discoveryAssistanceRun.assistanceKind,
      createdAt: discoveryAssistanceRun.createdAt,
      id: discoveryAssistanceRun.stableKey,
      internalId: discoveryAssistanceRun.id,
      modelIdentifier: discoveryAssistanceRun.modelIdentifier,
      participantFocus: discoveryAssistanceRun.participantFocus,
      promptPolicyVersion: discoveryAssistanceRun.promptPolicyVersion,
      providerKey: discoveryAssistanceRun.providerKey,
      requestedSessionRevision: discoveryAssistanceRun.requestedSessionRevision,
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
    .where(
      and(
        eq(discoveryAssistanceRun.organizationId, organizationId),
        eq(discoveryAssistanceRun.sessionKind, "process"),
        eq(discoveryAssistanceRun.discoverySessionStableKey, sessionStableKey),
        eq(
          discoveryAssistanceRun.requestedSessionRevision,
          requestedSessionRevision,
        ),
        eq(discoveryAssistanceRun.promptKey, promptKey),
      ),
    )
    .orderBy(desc(discoveryAssistanceRun.createdAt), desc(discoveryAssistanceRun.id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return loadRunDetails(organizationId, row.internalId, row.id, {
    assistanceKind: row.assistanceKind,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    modelIdentifier: row.modelIdentifier,
    participantFocus: row.participantFocus,
    promptPolicyVersion: row.promptPolicyVersion,
    providerKey: row.providerKey,
    requestedSessionRevision: row.requestedSessionRevision,
  });
}

export async function loadInquiryDiscoveryAssistance(
  organizationId: number,
  inquiryStableKey: string,
  sessionStableKey: string,
  requestedSessionRevision: number,
  promptKey: string,
): Promise<DiscoveryAssistanceRunRecord | null> {
  const rows = await db
    .select({
      assistanceKind: discoveryAssistanceRun.assistanceKind,
      createdAt: discoveryAssistanceRun.createdAt,
      id: discoveryAssistanceRun.stableKey,
      internalId: discoveryAssistanceRun.id,
      modelIdentifier: discoveryAssistanceRun.modelIdentifier,
      participantFocus: discoveryAssistanceRun.participantFocus,
      promptPolicyVersion: discoveryAssistanceRun.promptPolicyVersion,
      providerKey: discoveryAssistanceRun.providerKey,
      requestedSessionRevision: discoveryAssistanceRun.requestedSessionRevision,
    })
    .from(discoveryAssistanceRun)
    .innerJoin(
      discoveryInquirySession,
      and(
        eq(discoveryInquirySession.organizationId, organizationId),
        eq(discoveryInquirySession.id, discoveryAssistanceRun.inquirySessionId),
        eq(
          discoveryInquirySession.stableKey,
          discoveryAssistanceRun.inquirySessionStableKey,
        ),
        eq(discoveryInquirySession.inquiryStableKey, inquiryStableKey),
      ),
    )
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
    .where(
      and(
        eq(discoveryAssistanceRun.organizationId, organizationId),
        eq(discoveryAssistanceRun.sessionKind, "inquiry"),
        eq(discoveryAssistanceRun.inquirySessionStableKey, sessionStableKey),
        eq(
          discoveryAssistanceRun.requestedSessionRevision,
          requestedSessionRevision,
        ),
        eq(discoveryAssistanceRun.promptKey, promptKey),
      ),
    )
    .orderBy(desc(discoveryAssistanceRun.createdAt), desc(discoveryAssistanceRun.id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return loadRunDetails(organizationId, row.internalId, row.id, {
    assistanceKind: row.assistanceKind,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    modelIdentifier: row.modelIdentifier,
    participantFocus: row.participantFocus,
    promptPolicyVersion: row.promptPolicyVersion,
    providerKey: row.providerKey,
    requestedSessionRevision: row.requestedSessionRevision,
  });
}
