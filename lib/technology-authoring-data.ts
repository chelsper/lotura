import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import {
  operatingModelChange,
  process as processTable,
  processSystem,
  role,
  system,
} from "@/db/schema";

import type {
  AuthoringRoleContext,
  OperatingModelChangeSummary,
} from "./operating-model-authoring-data";

export type TechnologySystemSummary = {
  description: string | null;
  id: string;
  name: string;
  ownerRoleId: string | null;
  processCount: number;
  revision: string;
  stableKey: string;
  status: "active" | "inactive";
  systemType: "software" | "external_service" | "manual_record" | "other";
  url: string | null;
};

export type TechnologyCatalog = {
  systems: TechnologySystemSummary[];
};

export type TechnologyRoleOption = {
  description: string | null;
  id: string;
  name: string;
  status: "active" | "inactive";
};

export async function loadTechnologyRoles(
  organizationId: number,
): Promise<TechnologyRoleOption[]> {
  const { db } = await import("@/db");
  const roles = await db
    .select({
      description: role.description,
      id: role.id,
      name: role.name,
      status: role.status,
    })
    .from(role)
    .where(eq(role.organizationId, organizationId))
    .orderBy(asc(role.name), asc(role.id));

  return roles.map((item) => ({
    description: item.description,
    id: `role:${item.id}`,
    name: item.name,
    status: item.status,
  }));
}

export type TechnologySystemContext = TechnologySystemSummary & {
  history: OperatingModelChangeSummary[];
  processes: Array<{
    id: string;
    name: string;
    stableKey: string;
    status: "draft" | "active" | "archived";
    usage: string;
  }>;
  roles: Pick<AuthoringRoleContext, "id" | "name" | "description" | "status">[];
};

export async function loadTechnologyCatalog(
  organizationId: number,
): Promise<TechnologyCatalog> {
  const { db } = await import("@/db");
  const [systems, links] = await db.batch([
    db
      .select({
        description: system.description,
        id: system.id,
        name: system.name,
        ownerRoleId: system.ownerRoleId,
        stableKey: system.stableKey,
        status: system.status,
        systemType: system.systemType,
        updatedAt: system.updatedAt,
        url: system.url,
      })
      .from(system)
      .where(eq(system.organizationId, organizationId))
      .orderBy(asc(system.name), asc(system.id)),
    db
      .select({ systemId: processSystem.systemId })
      .from(processSystem)
      .where(eq(processSystem.organizationId, organizationId)),
  ] as const);

  const processCountBySystem = new Map<number, number>();
  for (const link of links) {
    processCountBySystem.set(
      link.systemId,
      (processCountBySystem.get(link.systemId) ?? 0) + 1,
    );
  }

  return {
    systems: systems.map((item) => ({
      description: item.description,
      id: `system:${item.id}`,
      name: item.name,
      ownerRoleId: item.ownerRoleId ? `role:${item.ownerRoleId}` : null,
      processCount: processCountBySystem.get(item.id) ?? 0,
      revision: item.updatedAt.toISOString(),
      stableKey: item.stableKey,
      status: item.status,
      systemType: item.systemType,
      url: item.url,
    })),
  };
}

export async function loadTechnologySystemContext(
  organizationId: number,
  stableKey: string,
): Promise<TechnologySystemContext | null> {
  const { db } = await import("@/db");
  const [systems, links, roles, history] = await db.batch([
    db
      .select({
        description: system.description,
        id: system.id,
        name: system.name,
        ownerRoleId: system.ownerRoleId,
        stableKey: system.stableKey,
        status: system.status,
        systemType: system.systemType,
        updatedAt: system.updatedAt,
        url: system.url,
      })
      .from(system)
      .where(
        and(
          eq(system.organizationId, organizationId),
          eq(system.stableKey, stableKey),
        ),
      )
      .limit(1),
    db
      .select({
        id: processTable.id,
        name: processTable.name,
        stableKey: processTable.stableKey,
        status: processTable.status,
        usage: processSystem.usage,
      })
      .from(processSystem)
      .innerJoin(
        system,
        and(
          eq(system.id, processSystem.systemId),
          eq(system.organizationId, processSystem.organizationId),
        ),
      )
      .innerJoin(
        processTable,
        and(
          eq(processTable.id, processSystem.processId),
          eq(processTable.organizationId, processSystem.organizationId),
        ),
      )
      .where(
        and(
          eq(processSystem.organizationId, organizationId),
          eq(system.stableKey, stableKey),
        ),
      )
      .orderBy(asc(processTable.name), asc(processTable.id)),
    db
      .select({
        description: role.description,
        id: role.id,
        name: role.name,
        status: role.status,
      })
      .from(role)
      .where(eq(role.organizationId, organizationId))
      .orderBy(asc(role.name), asc(role.id)),
    db
      .select({
        action: operatingModelChange.changeAction,
        actorIdentifier: operatingModelChange.actorIdentifier,
        afterState: operatingModelChange.afterState,
        beforeState: operatingModelChange.beforeState,
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
          eq(operatingModelChange.systemStableKey, stableKey),
        ),
      )
      .orderBy(
        desc(operatingModelChange.createdAt),
        desc(operatingModelChange.id),
      ),
  ] as const);

  const current = systems[0];
  if (!current) return null;

  return {
    description: current.description,
    history: history.map((item) => ({
      action: item.action,
      actorIdentifier: item.actorIdentifier,
      afterState: item.afterState as Record<string, unknown>,
      beforeState: item.beforeState as Record<string, unknown>,
      changeKind: item.changeKind,
      createdAt: item.createdAt.toISOString(),
      effectiveAt: item.effectiveAt.toISOString(),
      id: item.id,
      reason: item.reason,
    })),
    id: `system:${current.id}`,
    name: current.name,
    ownerRoleId: current.ownerRoleId ? `role:${current.ownerRoleId}` : null,
    processCount: links.length,
    processes: links.map((item) => ({
      id: `process:${item.id}`,
      name: item.name,
      stableKey: item.stableKey,
      status: item.status,
      usage: item.usage,
    })),
    revision: current.updatedAt.toISOString(),
    roles: roles.map((item) => ({
      description: item.description,
      id: `role:${item.id}`,
      name: item.name,
      status: item.status,
    })),
    stableKey: current.stableKey,
    status: current.status,
    systemType: current.systemType,
    url: current.url,
  };
}
