import "server-only";

import { and, desc, eq, lte, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  discoveryAssistanceRun,
  discoveryInquiryObservation,
  discoveryInquirySession,
  discoveryReferenceConfirmation,
  operatingModelChange,
  organizationStructureChange,
  organizationUnit,
  person,
  position,
  positionAssignment,
  process,
  processFamily,
  role,
  roleMandate,
  system,
} from "@/db/schema";

import {
  buildDiscoveryReferenceCandidates,
  fingerprintDiscoveryReferenceMention,
} from "./discovery-reference-matching.mjs";

export type DiscoveryReferenceKind =
  | "organization_unit"
  | "operational_role"
  | "person_capacity"
  | "system"
  | "process"
  | "process_family"
  | "policy"
  | "other";

export type DiscoveryReferenceOption = {
  context: string;
  key: string;
  label: string;
};

export type DiscoveryReferenceCandidateRecord = {
  decision: {
    disposition: "confirmed" | "rejected" | "unresolved";
    id: string;
    selectedTargetKey: string | null;
  } | null;
  kind: DiscoveryReferenceKind;
  kindLabel: string;
  mentionSequence: number;
  mentionText: string;
  observationSequence: number;
  options: DiscoveryReferenceOption[];
  sourceFingerprint: string;
  sourceObservationId: string;
  suggestedTargetKey: string | null;
};

export type DiscoveryReferenceConfirmationView = {
  candidates: DiscoveryReferenceCandidateRecord[];
  runId: string;
};

function historicName(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["name", "title", "displayName", "display_name"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function addAlias(map: Map<string, Set<string>>, stableKey: string | null, name: string | null) {
  if (!stableKey || !name) return;
  const aliases = map.get(stableKey) ?? new Set<string>();
  aliases.add(name);
  map.set(stableKey, aliases);
}

function selectedTargetKey(row: {
  organizationUnitStableKey: string | null;
  personStableKey: string | null;
  positionStableKey: string | null;
  processFamilyStableKey: string | null;
  processStableKey: string | null;
  referenceKind: DiscoveryReferenceKind;
  roleStableKey: string | null;
  systemStableKey: string | null;
}) {
  switch (row.referenceKind) {
    case "organization_unit": return row.organizationUnitStableKey
      ? `organization_unit:${row.organizationUnitStableKey}` : null;
    case "operational_role": return row.roleStableKey
      ? `operational_role:${row.roleStableKey}` : null;
    case "person_capacity": return row.personStableKey && row.positionStableKey
      ? `person_capacity:${row.personStableKey}:${row.positionStableKey}:${row.roleStableKey ?? "none"}`
      : null;
    case "system": return row.systemStableKey
      ? `system:${row.systemStableKey}` : null;
    case "process": return row.processStableKey
      ? `process:${row.processStableKey}` : null;
    case "process_family": return row.processFamilyStableKey
      ? `process_family:${row.processFamilyStableKey}` : null;
    default: return null;
  }
}

export async function loadInquiryReferenceConfirmations(
  organizationId: number,
  sessionStableKey: string,
): Promise<DiscoveryReferenceConfirmationView | null> {
  const sessionRows = await db
    .select({ id: discoveryInquirySession.id })
    .from(discoveryInquirySession)
    .where(and(
      eq(discoveryInquirySession.organizationId, organizationId),
      eq(discoveryInquirySession.stableKey, sessionStableKey),
      eq(discoveryInquirySession.analystEnabled, true),
    ))
    .limit(1);
  const session = sessionRows[0];
  if (!session) return null;

  const runRows = await db
    .select({
      createdAt: discoveryAssistanceRun.createdAt,
      id: discoveryAssistanceRun.id,
      stableKey: discoveryAssistanceRun.stableKey,
    })
    .from(discoveryAssistanceRun)
    .where(and(
      eq(discoveryAssistanceRun.organizationId, organizationId),
      eq(discoveryAssistanceRun.sessionKind, "inquiry"),
      eq(discoveryAssistanceRun.inquirySessionId, session.id),
      eq(discoveryAssistanceRun.analystTurn, true),
    ))
    .orderBy(desc(discoveryAssistanceRun.createdAt), desc(discoveryAssistanceRun.id))
    .limit(1);
  const run = runRows[0];
  if (!run) return null;
  const supersedingObservation = alias(
    discoveryInquiryObservation,
    "supersedingInquiryReferenceObservation",
  );

  const [
    observations,
    units,
    roles,
    systems,
    processes,
    families,
    people,
    structureHistory,
    operatingHistory,
    decisions,
  ] = await Promise.all([
    db.select({
      id: discoveryInquiryObservation.stableKey,
      responseText: discoveryInquiryObservation.responseText,
      sequence: discoveryInquiryObservation.sequence,
    }).from(discoveryInquiryObservation).where(and(
      eq(discoveryInquiryObservation.organizationId, organizationId),
      eq(discoveryInquiryObservation.sessionId, session.id),
      lte(discoveryInquiryObservation.createdAt, run.createdAt),
      notExists(
        db.select({ id: supersedingObservation.id })
          .from(supersedingObservation)
          .where(and(
            eq(supersedingObservation.organizationId, organizationId),
            eq(supersedingObservation.sessionId, session.id),
            eq(
              supersedingObservation.supersedesObservationStableKey,
              discoveryInquiryObservation.stableKey,
            ),
          )),
      ),
    )),
    db.select({ name: organizationUnit.name, stableKey: organizationUnit.stableKey })
      .from(organizationUnit).where(and(
        eq(organizationUnit.organizationId, organizationId),
        eq(organizationUnit.status, "active"),
      )),
    db.select({ name: role.name, stableKey: role.stableKey })
      .from(role).where(and(eq(role.organizationId, organizationId), eq(role.status, "active"))),
    db.select({ name: system.name, stableKey: system.stableKey })
      .from(system).where(and(eq(system.organizationId, organizationId), eq(system.status, "active"))),
    db.select({ name: process.name, stableKey: process.stableKey, status: process.status })
      .from(process).where(eq(process.organizationId, organizationId)),
    db.select({ name: processFamily.name, stableKey: processFamily.stableKey })
      .from(processFamily).where(and(
        eq(processFamily.organizationId, organizationId),
        eq(processFamily.status, "active"),
      )),
    db.select({
      displayName: person.displayName,
      personStableKey: person.stableKey,
      positionStableKey: position.stableKey,
      positionTitle: position.title,
      roleName: role.name,
      roleStableKey: role.stableKey,
      unitName: organizationUnit.name,
    }).from(person)
      .innerJoin(positionAssignment, and(
        eq(positionAssignment.organizationId, person.organizationId),
        eq(positionAssignment.personId, person.id),
        eq(positionAssignment.status, "active"),
      ))
      .innerJoin(position, and(
        eq(position.organizationId, positionAssignment.organizationId),
        eq(position.id, positionAssignment.positionId),
        eq(position.status, "active"),
      ))
      .leftJoin(organizationUnit, and(
        eq(organizationUnit.organizationId, position.organizationId),
        eq(organizationUnit.id, position.organizationUnitId),
      ))
      .leftJoin(roleMandate, and(
        eq(roleMandate.organizationId, position.organizationId),
        eq(roleMandate.positionId, position.id),
        eq(roleMandate.status, "active"),
      ))
      .leftJoin(role, and(
        eq(role.organizationId, roleMandate.organizationId),
        eq(role.id, roleMandate.roleId),
      ))
      .where(and(eq(person.organizationId, organizationId), eq(person.status, "active"))),
    db.select({
      beforeState: organizationStructureChange.beforeState,
      entityType: organizationStructureChange.entityType,
      targetStableKey: organizationStructureChange.targetStableKey,
    }).from(organizationStructureChange)
      .where(eq(organizationStructureChange.organizationId, organizationId))
      .orderBy(desc(organizationStructureChange.createdAt)).limit(250),
    db.select({
      beforeState: operatingModelChange.beforeState,
      entityType: operatingModelChange.entityType,
      processFamilyStableKey: operatingModelChange.processFamilyStableKey,
      processStableKey: operatingModelChange.processStableKey,
      systemStableKey: operatingModelChange.systemStableKey,
    }).from(operatingModelChange)
      .where(eq(operatingModelChange.organizationId, organizationId))
      .orderBy(desc(operatingModelChange.createdAt)).limit(250),
    db.select({
      disposition: discoveryReferenceConfirmation.disposition,
      id: discoveryReferenceConfirmation.stableKey,
      organizationUnitStableKey: discoveryReferenceConfirmation.organizationUnitStableKey,
      personStableKey: discoveryReferenceConfirmation.personStableKey,
      positionStableKey: discoveryReferenceConfirmation.positionStableKey,
      processFamilyStableKey: discoveryReferenceConfirmation.processFamilyStableKey,
      processStableKey: discoveryReferenceConfirmation.processStableKey,
      referenceKind: discoveryReferenceConfirmation.referenceKind,
      roleStableKey: discoveryReferenceConfirmation.roleStableKey,
      sourceFingerprint: discoveryReferenceConfirmation.sourceFingerprint,
      supersedesConfirmationStableKey:
        discoveryReferenceConfirmation.supersedesConfirmationStableKey,
      systemStableKey: discoveryReferenceConfirmation.systemStableKey,
    }).from(discoveryReferenceConfirmation)
      .where(and(
        eq(discoveryReferenceConfirmation.organizationId, organizationId),
        eq(discoveryReferenceConfirmation.inquirySessionId, session.id),
      )).orderBy(desc(discoveryReferenceConfirmation.createdAt), desc(discoveryReferenceConfirmation.id)),
  ]);

  const aliases = new Map<string, Set<string>>();
  for (const change of structureHistory) {
    addAlias(aliases, change.targetStableKey, historicName(change.beforeState));
  }
  for (const change of operatingHistory) {
    const stableKey = change.entityType === "system"
      ? change.systemStableKey
      : change.entityType === "process_family"
        ? change.processFamilyStableKey
        : change.entityType === "process"
          ? change.processStableKey
          : null;
    addAlias(aliases, stableKey, historicName(change.beforeState));
  }
  const withAliases = (stableKey: string) => [...(aliases.get(stableKey) ?? [])];

  const catalog = [
    ...units.map((item) => ({
      aliases: withAliases(item.stableKey),
      context: "Current Organization Unit",
      kind: "organization_unit",
      label: item.name,
      stableKey: item.stableKey,
    })),
    ...roles.map((item) => ({
      aliases: withAliases(item.stableKey),
      context: "Current Operational Role",
      kind: "operational_role",
      label: item.name,
      stableKey: item.stableKey,
    })),
    ...systems.map((item) => ({
      aliases: withAliases(item.stableKey),
      context: "Current System",
      kind: "system",
      label: item.name,
      stableKey: item.stableKey,
    })),
    ...processes.map((item) => ({
      aliases: withAliases(item.stableKey),
      context: `${item.status === "draft" ? "Draft" : item.status === "active" ? "Current" : "Archived"} Process`,
      kind: "process",
      label: item.name,
      stableKey: item.stableKey,
    })),
    ...families.map((item) => ({
      aliases: withAliases(item.stableKey),
      context: "Current Process Family",
      kind: "process_family",
      label: item.name,
      stableKey: item.stableKey,
    })),
    ...people.map((item) => ({
      aliases: withAliases(item.personStableKey),
      context: [
        `Person currently assigned to ${item.positionTitle}`,
        item.unitName ? `in ${item.unitName}` : null,
        item.roleName ? `with ${item.roleName} Role context` : null,
      ].filter(Boolean).join(" "),
      kind: "person_capacity",
      label: item.displayName,
      personStableKey: item.personStableKey,
      positionStableKey: item.positionStableKey,
      roleStableKey: item.roleStableKey,
    })),
  ];

  const latestDecisionByFingerprint = new Map<string, typeof decisions[number]>();
  const superseded = new Set(
    decisions.map((decision) => decision.supersedesConfirmationStableKey).filter(Boolean),
  );
  for (const decision of decisions) {
    if (!superseded.has(decision.id) && !latestDecisionByFingerprint.has(decision.sourceFingerprint)) {
      latestDecisionByFingerprint.set(decision.sourceFingerprint, decision);
    }
  }
  const candidates = buildDiscoveryReferenceCandidates({ catalog, observations })
    .map((candidate) => {
      const sourceFingerprint = fingerprintDiscoveryReferenceMention({
        mentionSequence: candidate.mentionSequence,
        mentionText: candidate.mentionText,
        referenceKind: candidate.kind,
        sourceObservationId: candidate.sourceObservationId,
      });
      const decision = latestDecisionByFingerprint.get(sourceFingerprint);
      return {
        ...candidate,
        decision: decision
          ? {
              disposition: decision.disposition,
              id: decision.id,
              selectedTargetKey: selectedTargetKey(decision),
            }
          : null,
        sourceFingerprint,
      } as DiscoveryReferenceCandidateRecord;
    });

  return { candidates, runId: run.stableKey };
}
