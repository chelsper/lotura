import "server-only";

import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  operatingModelChange,
  process as processTable,
  processFamily,
  processFamilyMembership,
  processFamilyRelationship,
} from "@/db/schema";

export type ProcessFamilyHistoryItem = {
  action:
    | "create_process_family"
    | "update_process_family"
    | "deactivate_process_family"
    | "add_process_family_membership"
    | "end_process_family_membership"
    | "add_process_family_relationship"
    | "end_process_family_relationship";
  actorIdentifier: string;
  changeKind: "correction" | "organizational_change";
  createdAt: string;
  effectiveAt: string;
  id: string;
  reason: string;
};

export type ProcessFamilyMember = {
  effectiveFrom: string;
  effectiveUntil: string | null;
  membershipRevision: string;
  membershipStableKey: string;
  process: {
    id: string;
    name: string;
    purpose: string | null;
    stableKey: string;
    status: "draft" | "active" | "archived";
  };
  status: "active" | "ended";
};

export type ProcessFamilySummary = {
  activeMemberCount: number;
  description: string | null;
  memberProcessNames: string[];
  name: string;
  revision: string;
  stableKey: string;
  status: "active" | "inactive";
};

export type ProcessFamilyCatalog = {
  families: ProcessFamilySummary[];
};

export type ProcessFamilyRelationshipContext = {
  directMemberCount: number;
  effectiveFrom: string;
  family: {
    description: string | null;
    name: string;
    stableKey: string;
    status: "active" | "inactive";
  };
  relationshipRevision: string;
  relationshipStableKey: string;
};

export type ProcessFamilyContext = ProcessFamilySummary & {
  activeRelationshipCount: number;
  broaderFamilies: ProcessFamilyRelationshipContext[];
  broaderFamilyOptions: Array<{
    disabledReason: string | null;
    name: string;
    stableKey: string;
  }>;
  history: ProcessFamilyHistoryItem[];
  members: ProcessFamilyMember[];
  narrowerFamilies: ProcessFamilyRelationshipContext[];
  processOptions: Array<{
    id: string;
    name: string;
    purpose: string | null;
    stableKey: string;
    status: "draft" | "active" | "archived";
  }>;
};

export type ProcessFamilyProcessIndex = Record<
  string,
  Array<{ name: string; stableKey: string; status: "active" | "inactive" }>
>;

function exactRevision(value: string | Date) {
  return typeof value === "string" ? value : value.toISOString();
}

export async function loadProcessFamilyCatalog(
  organizationId: number,
): Promise<ProcessFamilyCatalog> {
  const { db } = await import("@/db");
  const [families, memberships] = await db.batch([
    db
      .select({
        description: processFamily.description,
        id: processFamily.id,
        name: processFamily.name,
        stableKey: processFamily.stableKey,
        status: processFamily.status,
        updatedAt: sql<string>`${processFamily.updatedAt}::text`,
      })
      .from(processFamily)
      .where(eq(processFamily.organizationId, organizationId))
      .orderBy(asc(processFamily.name), asc(processFamily.id)),
    db
      .select({
        processFamilyId: processFamilyMembership.processFamilyId,
        processName: processTable.name,
      })
      .from(processFamilyMembership)
      .innerJoin(
        processTable,
        and(
          eq(processTable.id, processFamilyMembership.processId),
          eq(processTable.organizationId, processFamilyMembership.organizationId),
        ),
      )
      .where(
        and(
          eq(processFamilyMembership.organizationId, organizationId),
          eq(processFamilyMembership.status, "active"),
        ),
      ),
  ] as const);

  const counts = new Map<number, number>();
  const memberProcessNames = new Map<number, string[]>();
  for (const membership of memberships) {
    counts.set(
      membership.processFamilyId,
      (counts.get(membership.processFamilyId) ?? 0) + 1,
    );
    const names = memberProcessNames.get(membership.processFamilyId) ?? [];
    names.push(membership.processName);
    memberProcessNames.set(membership.processFamilyId, names);
  }

  return {
    families: families.map((family) => ({
      activeMemberCount: counts.get(family.id) ?? 0,
      description: family.description,
      memberProcessNames: memberProcessNames.get(family.id) ?? [],
      name: family.name,
      revision: exactRevision(family.updatedAt),
      stableKey: family.stableKey,
      status: family.status,
    })),
  };
}

export async function loadProcessFamilyContext(
  organizationId: number,
  stableKey: string,
): Promise<ProcessFamilyContext | null> {
  const { db } = await import("@/db");
  const broaderFamily = alias(processFamily, "broader_family");
  const narrowerFamily = alias(processFamily, "narrower_family");
  const [
    relationships,
    allActiveMemberships,
    families,
    members,
    processes,
    familyOptions,
    history,
  ] = await db.batch([
    db
      .select({
        broaderDescription: broaderFamily.description,
        broaderFamilyId: broaderFamily.id,
        broaderName: broaderFamily.name,
        broaderStableKey: broaderFamily.stableKey,
        broaderStatus: broaderFamily.status,
        effectiveFrom: processFamilyRelationship.effectiveFrom,
        narrowerDescription: narrowerFamily.description,
        narrowerFamilyId: narrowerFamily.id,
        narrowerName: narrowerFamily.name,
        narrowerStableKey: narrowerFamily.stableKey,
        narrowerStatus: narrowerFamily.status,
        relationshipStableKey: processFamilyRelationship.stableKey,
        relationshipUpdatedAt: sql<string>`${processFamilyRelationship.updatedAt}::text`,
      })
      .from(processFamilyRelationship)
      .innerJoin(
        broaderFamily,
        and(
          eq(broaderFamily.id, processFamilyRelationship.broaderFamilyId),
          eq(broaderFamily.organizationId, processFamilyRelationship.organizationId),
        ),
      )
      .innerJoin(
        narrowerFamily,
        and(
          eq(narrowerFamily.id, processFamilyRelationship.narrowerFamilyId),
          eq(narrowerFamily.organizationId, processFamilyRelationship.organizationId),
        ),
      )
      .where(
        and(
          eq(processFamilyRelationship.organizationId, organizationId),
          eq(processFamilyRelationship.status, "active"),
        ),
      )
      .orderBy(asc(broaderFamily.name), asc(narrowerFamily.name)),
    db
      .select({
        processFamilyId: processFamilyMembership.processFamilyId,
      })
      .from(processFamilyMembership)
      .where(
        and(
          eq(processFamilyMembership.organizationId, organizationId),
          eq(processFamilyMembership.status, "active"),
        ),
      ),
    db
      .select({
        description: processFamily.description,
        id: processFamily.id,
        name: processFamily.name,
        stableKey: processFamily.stableKey,
        status: processFamily.status,
        updatedAt: sql<string>`${processFamily.updatedAt}::text`,
      })
      .from(processFamily)
      .where(
        and(
          eq(processFamily.organizationId, organizationId),
          eq(processFamily.stableKey, stableKey),
        ),
      )
      .limit(1),
    db
      .select({
        effectiveFrom: processFamilyMembership.effectiveFrom,
        effectiveUntil: processFamilyMembership.effectiveUntil,
        membershipStableKey: processFamilyMembership.stableKey,
        membershipUpdatedAt: sql<string>`${processFamilyMembership.updatedAt}::text`,
        processId: processTable.id,
        processName: processTable.name,
        processPurpose: processTable.purpose,
        processStableKey: processTable.stableKey,
        processStatus: processTable.status,
        status: processFamilyMembership.status,
      })
      .from(processFamilyMembership)
      .innerJoin(
        processFamily,
        and(
          eq(processFamily.id, processFamilyMembership.processFamilyId),
          eq(processFamily.organizationId, processFamilyMembership.organizationId),
        ),
      )
      .innerJoin(
        processTable,
        and(
          eq(processTable.id, processFamilyMembership.processId),
          eq(processTable.organizationId, processFamilyMembership.organizationId),
        ),
      )
      .where(
        and(
          eq(processFamilyMembership.organizationId, organizationId),
          eq(processFamily.stableKey, stableKey),
        ),
      )
      .orderBy(
        asc(processFamilyMembership.status),
        asc(processTable.name),
        asc(processFamilyMembership.id),
      ),
    db
      .select({
        id: processTable.id,
        name: processTable.name,
        purpose: processTable.purpose,
        stableKey: processTable.stableKey,
        status: processTable.status,
      })
      .from(processTable)
      .where(eq(processTable.organizationId, organizationId))
      .orderBy(asc(processTable.name), asc(processTable.id)),
    db
      .select({
        id: processFamily.id,
        name: processFamily.name,
        stableKey: processFamily.stableKey,
      })
      .from(processFamily)
      .where(
        and(
          eq(processFamily.organizationId, organizationId),
          eq(processFamily.status, "active"),
        ),
      )
      .orderBy(asc(processFamily.name), asc(processFamily.id)),
    db
      .select({
        action: operatingModelChange.changeAction,
        actorIdentifier: operatingModelChange.actorIdentifier,
        changeKind: operatingModelChange.changeKind,
        createdAt: operatingModelChange.createdAt,
        effectiveAt: operatingModelChange.effectiveAt,
        id: operatingModelChange.stableKey,
        reason: operatingModelChange.reason,
      })
      .from(operatingModelChange)
      .leftJoin(
        processFamilyRelationship,
        and(
          eq(
            processFamilyRelationship.id,
            operatingModelChange.processFamilyRelationshipId,
          ),
          eq(
            processFamilyRelationship.organizationId,
            operatingModelChange.organizationId,
          ),
        ),
      )
      .leftJoin(
        broaderFamily,
        and(
          eq(broaderFamily.id, processFamilyRelationship.broaderFamilyId),
          eq(broaderFamily.organizationId, processFamilyRelationship.organizationId),
        ),
      )
      .leftJoin(
        narrowerFamily,
        and(
          eq(narrowerFamily.id, processFamilyRelationship.narrowerFamilyId),
          eq(narrowerFamily.organizationId, processFamilyRelationship.organizationId),
        ),
      )
      .where(
        and(
          eq(operatingModelChange.organizationId, organizationId),
          or(
            eq(operatingModelChange.processFamilyStableKey, stableKey),
            eq(broaderFamily.stableKey, stableKey),
            eq(narrowerFamily.stableKey, stableKey),
          ),
        ),
      )
      .orderBy(desc(operatingModelChange.createdAt), desc(operatingModelChange.id)),
  ] as const);

  const family = families[0];
  if (!family) return null;

  const activeMemberCount = members.filter((item) => item.status === "active").length;
  const activeMemberCounts = new Map<number, number>();
  for (const membership of allActiveMemberships) {
    activeMemberCounts.set(
      membership.processFamilyId,
      (activeMemberCounts.get(membership.processFamilyId) ?? 0) + 1,
    );
  }
  const directBroaderFamilyIds = new Set(
    relationships
      .filter((item) => item.narrowerFamilyId === family.id)
      .map((item) => item.broaderFamilyId),
  );
  const descendantFamilyIds = new Set<number>();
  let frontier = [family.id];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const relationship of relationships) {
      if (
        frontier.includes(relationship.broaderFamilyId) &&
        !descendantFamilyIds.has(relationship.narrowerFamilyId)
      ) {
        descendantFamilyIds.add(relationship.narrowerFamilyId);
        next.push(relationship.narrowerFamilyId);
      }
    }
    frontier = next;
  }
  const broaderFamilies = relationships
    .filter((item) => item.narrowerFamilyId === family.id)
    .map((item) => ({
      directMemberCount: activeMemberCounts.get(item.broaderFamilyId) ?? 0,
      effectiveFrom: item.effectiveFrom.toISOString(),
      family: {
        description: item.broaderDescription,
        name: item.broaderName,
        stableKey: item.broaderStableKey,
        status: item.broaderStatus,
      },
      relationshipRevision: exactRevision(item.relationshipUpdatedAt),
      relationshipStableKey: item.relationshipStableKey,
    }));
  const narrowerFamilies = relationships
    .filter((item) => item.broaderFamilyId === family.id)
    .map((item) => ({
      directMemberCount: activeMemberCounts.get(item.narrowerFamilyId) ?? 0,
      effectiveFrom: item.effectiveFrom.toISOString(),
      family: {
        description: item.narrowerDescription,
        name: item.narrowerName,
        stableKey: item.narrowerStableKey,
        status: item.narrowerStatus,
      },
      relationshipRevision: exactRevision(item.relationshipUpdatedAt),
      relationshipStableKey: item.relationshipStableKey,
    }));
  return {
    activeMemberCount,
    activeRelationshipCount: broaderFamilies.length + narrowerFamilies.length,
    broaderFamilies,
    broaderFamilyOptions: familyOptions.map((candidate) => ({
      disabledReason:
        candidate.id === family.id
          ? "This is the current Family."
          : directBroaderFamilyIds.has(candidate.id)
            ? "Already a broader context."
            : descendantFamilyIds.has(candidate.id)
              ? "This would create a loop."
              : null,
      name: candidate.name,
      stableKey: candidate.stableKey,
    })),
    description: family.description,
    memberProcessNames: members
      .filter((item) => item.status === "active")
      .map((item) => item.processName),
    history: history.map((item) => ({
      action: item.action as ProcessFamilyHistoryItem["action"],
      actorIdentifier: item.actorIdentifier,
      changeKind: item.changeKind,
      createdAt: item.createdAt.toISOString(),
      effectiveAt: item.effectiveAt.toISOString(),
      id: item.id,
      reason: item.reason,
    })),
    members: members.map((item) => ({
      effectiveFrom: item.effectiveFrom.toISOString(),
      effectiveUntil: item.effectiveUntil?.toISOString() ?? null,
      membershipRevision: exactRevision(item.membershipUpdatedAt),
      membershipStableKey: item.membershipStableKey,
      process: {
        id: `process:${item.processId}`,
        name: item.processName,
        purpose: item.processPurpose,
        stableKey: item.processStableKey,
        status: item.processStatus,
      },
      status: item.status,
    })),
    name: family.name,
    narrowerFamilies,
    processOptions: processes.map((item) => ({
      id: `process:${item.id}`,
      name: item.name,
      purpose: item.purpose,
      stableKey: item.stableKey,
      status: item.status,
    })),
    revision: exactRevision(family.updatedAt),
    stableKey: family.stableKey,
    status: family.status,
  };
}

export async function loadProcessFamilyProcessIndex(
  organizationId: number,
): Promise<ProcessFamilyProcessIndex> {
  const { db } = await import("@/db");
  const rows = await db
    .select({
      familyName: processFamily.name,
      familyStableKey: processFamily.stableKey,
      familyStatus: processFamily.status,
      processId: processFamilyMembership.processId,
    })
    .from(processFamilyMembership)
    .innerJoin(
      processFamily,
      and(
        eq(processFamily.id, processFamilyMembership.processFamilyId),
        eq(processFamily.organizationId, processFamilyMembership.organizationId),
      ),
    )
    .where(
      and(
        eq(processFamilyMembership.organizationId, organizationId),
        eq(processFamilyMembership.status, "active"),
      ),
    )
    .orderBy(asc(processFamily.name), asc(processFamily.id));

  const index: ProcessFamilyProcessIndex = {};
  for (const row of rows) {
    const key = `process:${row.processId}`;
    (index[key] ??= []).push({
      name: row.familyName,
      stableKey: row.familyStableKey,
      status: row.familyStatus,
    });
  }
  return index;
}
