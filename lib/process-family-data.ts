import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import {
  operatingModelChange,
  process as processTable,
  processFamily,
  processFamilyMembership,
} from "@/db/schema";

export type ProcessFamilyHistoryItem = {
  action:
    | "create_process_family"
    | "update_process_family"
    | "deactivate_process_family"
    | "add_process_family_membership"
    | "end_process_family_membership";
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

export type ProcessFamilyContext = ProcessFamilySummary & {
  history: ProcessFamilyHistoryItem[];
  members: ProcessFamilyMember[];
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
        updatedAt: processFamily.updatedAt,
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
      revision: family.updatedAt.toISOString(),
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
  const [families, members, processes, history] = await db.batch([
    db
      .select({
        description: processFamily.description,
        id: processFamily.id,
        name: processFamily.name,
        stableKey: processFamily.stableKey,
        status: processFamily.status,
        updatedAt: processFamily.updatedAt,
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
        membershipUpdatedAt: processFamilyMembership.updatedAt,
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
        action: operatingModelChange.changeAction,
        actorIdentifier: operatingModelChange.actorIdentifier,
        changeKind: operatingModelChange.changeKind,
        createdAt: operatingModelChange.createdAt,
        effectiveAt: operatingModelChange.effectiveAt,
        id: operatingModelChange.stableKey,
        reason: operatingModelChange.reason,
      })
      .from(operatingModelChange)
      .where(
        and(
          eq(operatingModelChange.organizationId, organizationId),
          eq(operatingModelChange.processFamilyStableKey, stableKey),
        ),
      )
      .orderBy(desc(operatingModelChange.createdAt), desc(operatingModelChange.id)),
  ] as const);

  const family = families[0];
  if (!family) return null;

  const activeMemberCount = members.filter((item) => item.status === "active").length;
  return {
    activeMemberCount,
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
      membershipRevision: item.membershipUpdatedAt.toISOString(),
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
    processOptions: processes.map((item) => ({
      id: `process:${item.id}`,
      name: item.name,
      purpose: item.purpose,
      stableKey: item.stableKey,
      status: item.status,
    })),
    revision: family.updatedAt.toISOString(),
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
