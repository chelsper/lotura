import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import {
  exception,
  operatingModelChange,
  person,
  position,
  process as processTable,
  processStep,
  processSystem,
  role,
  roleCoverage,
  roleMandate,
  system,
} from "@/db/schema";

export type OperatingModelChangeSummary = {
  action:
    | "create_draft"
    | "update_definition"
    | "change_owner"
    | "create_step"
    | "update_step"
    | "reorder_steps"
    | "change_step_responsibility"
    | "create_system"
    | "update_system"
    | "deactivate_system"
    | "link_system"
    | "update_system_usage"
    | "unlink_system"
    | "create_exception"
    | "update_exception"
    | "deactivate_exception";
  actorIdentifier: string;
  afterState: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  changeKind: "correction" | "organizational_change";
  createdAt: string;
  effectiveAt: string;
  id: string;
  reason: string;
};

export type AuthoringRoleContext = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  mandates: Array<{
    id: string;
    mandateType: "primary" | "shared";
    position: {
      id: string;
      status: "active" | "inactive" | "retired";
      title: string;
    };
    scope: string | null;
    coverage: Array<{
      id: string;
      coverageType:
        | "permanent"
        | "interim"
        | "acting"
        | "delegated"
        | "backup";
      person: { id: string; name: string };
    }>;
  }>;
};

export type ProcessAuthoringContext = {
  asOf: string;
  history: OperatingModelChangeSummary[];
  process: {
    id: string;
    stableKey: string;
    name: string;
    ownerRoleId: string | null;
    purpose: string | null;
    revision: string;
    status: "draft" | "active" | "archived";
  };
  roles: AuthoringRoleContext[];
  systems: Array<{
    description: string | null;
    id: string;
    name: string;
    stableKey: string;
    status: "active" | "inactive";
    systemType: "software" | "external_service" | "manual_record" | "other";
  }>;
  systemLinks: Array<{
    id: string;
    name: string;
    stableKey: string;
    status: "active" | "inactive";
    systemType: "software" | "external_service" | "manual_record" | "other";
    usage: string;
  }>;
  exceptions: Array<{
    condition: string;
    id: string;
    name: string;
    ownerRoleId: string | null;
    processStepStableKey: string | null;
    response: string;
    revision: string;
    stableKey: string;
    status: "active" | "inactive";
  }>;
  steps: Array<{
    id: string;
    stableKey: string;
    instructions: string;
    position: number;
    responsibleRoleId: string | null;
    revision: string;
    title: string;
  }>;
};

function processDatabaseId(value: string) {
  const match = /^process:([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

function currentAt(
  record: {
    effectiveFrom: Date;
    effectiveUntil: Date | null;
    status: string;
  },
  asOf: Date,
) {
  return (
    record.status === "active" &&
    record.effectiveFrom <= asOf &&
    (!record.effectiveUntil || record.effectiveUntil > asOf)
  );
}

export async function loadProcessAuthoringContext(
  organizationId: number,
  processKey: string,
  snapshotAsOf: string,
): Promise<ProcessAuthoringContext | null> {
  const processId = processDatabaseId(processKey);
  if (!processId) return null;
  const asOf = new Date(snapshotAsOf);
  if (!Number.isFinite(asOf.getTime())) {
    throw new Error("Invalid Process authoring snapshot time.");
  }
  const { db } = await import("@/db");

  const [
    processes,
    steps,
    roles,
    positions,
    people,
    mandates,
    coverages,
    systems,
    systemLinks,
    exceptions,
    history,
  ] =
    await db.batch([
      db
        .select({
          id: processTable.id,
          stableKey: processTable.stableKey,
          name: processTable.name,
          purpose: processTable.purpose,
          ownerRoleId: processTable.ownerRoleId,
          status: processTable.status,
          updatedAt: processTable.updatedAt,
        })
        .from(processTable)
        .where(
          and(
            eq(processTable.organizationId, organizationId),
            eq(processTable.id, processId),
          ),
        )
        .limit(1),
      db
        .select({
          id: processStep.id,
          stableKey: processStep.stableKey,
          instructions: processStep.instructions,
          position: processStep.position,
          responsibleRoleId: processStep.responsibleRoleId,
          title: processStep.title,
          updatedAt: processStep.updatedAt,
        })
        .from(processStep)
        .where(
          and(
            eq(processStep.organizationId, organizationId),
            eq(processStep.processId, processId),
          ),
        )
        .orderBy(asc(processStep.position), asc(processStep.id)),
      db
        .select({
          id: role.id,
          name: role.name,
          description: role.description,
          status: role.status,
        })
        .from(role)
        .where(eq(role.organizationId, organizationId))
        .orderBy(asc(role.name), asc(role.id)),
      db
        .select({
          id: position.id,
          stableKey: position.stableKey,
          title: position.title,
          status: position.status,
        })
        .from(position)
        .where(eq(position.organizationId, organizationId))
        .orderBy(asc(position.title), asc(position.id)),
      db
        .select({
          id: person.id,
          stableKey: person.stableKey,
          displayName: person.displayName,
          status: person.status,
        })
        .from(person)
        .where(eq(person.organizationId, organizationId))
        .orderBy(asc(person.displayName), asc(person.id)),
      db
        .select({
          id: roleMandate.id,
          roleId: roleMandate.roleId,
          positionId: roleMandate.positionId,
          mandateType: roleMandate.mandateType,
          scope: roleMandate.scope,
          status: roleMandate.status,
          effectiveFrom: roleMandate.effectiveFrom,
          effectiveUntil: roleMandate.effectiveUntil,
        })
        .from(roleMandate)
        .where(eq(roleMandate.organizationId, organizationId))
        .orderBy(asc(roleMandate.roleId), asc(roleMandate.id)),
      db
        .select({
          id: roleCoverage.id,
          roleMandateId: roleCoverage.roleMandateId,
          personId: roleCoverage.personId,
          coverageType: roleCoverage.coverageType,
          status: roleCoverage.status,
          effectiveFrom: roleCoverage.effectiveFrom,
          effectiveUntil: roleCoverage.effectiveUntil,
        })
        .from(roleCoverage)
        .where(eq(roleCoverage.organizationId, organizationId))
        .orderBy(asc(roleCoverage.roleMandateId), asc(roleCoverage.id)),
      db
        .select({
          description: system.description,
          id: system.id,
          name: system.name,
          stableKey: system.stableKey,
          status: system.status,
          systemType: system.systemType,
        })
        .from(system)
        .where(eq(system.organizationId, organizationId))
        .orderBy(asc(system.name), asc(system.id)),
      db
        .select({
          id: system.id,
          name: system.name,
          stableKey: system.stableKey,
          status: system.status,
          systemType: system.systemType,
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
        .where(
          and(
            eq(processSystem.organizationId, organizationId),
            eq(processSystem.processId, processId),
          ),
        )
        .orderBy(asc(system.name), asc(system.id)),
      db
        .select({
          condition: exception.condition,
          id: exception.id,
          name: exception.name,
          ownerRoleId: exception.ownerRoleId,
          processStepId: exception.processStepId,
          response: exception.response,
          stableKey: exception.stableKey,
          status: exception.status,
          updatedAt: exception.updatedAt,
        })
        .from(exception)
        .where(
          and(
            eq(exception.organizationId, organizationId),
            eq(exception.processId, processId),
          ),
        )
        .orderBy(asc(exception.name), asc(exception.id)),
      db
        .select({
          id: operatingModelChange.stableKey,
          action: operatingModelChange.changeAction,
          actorIdentifier: operatingModelChange.actorIdentifier,
          beforeState: operatingModelChange.beforeState,
          afterState: operatingModelChange.afterState,
          changeKind: operatingModelChange.changeKind,
          reason: operatingModelChange.reason,
          effectiveAt: operatingModelChange.effectiveAt,
          createdAt: operatingModelChange.createdAt,
        })
        .from(operatingModelChange)
        .where(
          and(
            eq(operatingModelChange.organizationId, organizationId),
            eq(operatingModelChange.processId, processId),
          ),
        )
        .orderBy(desc(operatingModelChange.createdAt), desc(operatingModelChange.id)),
    ] as const);

  const currentProcess = processes[0];
  if (!currentProcess) return null;

  const positionsById = new Map(positions.map((item) => [item.id, item]));
  const peopleById = new Map(people.map((item) => [item.id, item]));
  const activeMandates = mandates.filter((item) => currentAt(item, asOf));
  const activeCoverages = coverages.filter((item) => currentAt(item, asOf));
  const stepStableKeyById = new Map(
    steps.map((item) => [item.id, item.stableKey]),
  );

  const roleContexts = roles.map<AuthoringRoleContext>((item) => ({
      id: `role:${item.id}`,
      name: item.name,
      description: item.description,
      status: item.status,
      mandates: activeMandates
        .filter((mandate) => mandate.roleId === item.id)
        .flatMap((mandate) => {
          const mandatePosition = positionsById.get(mandate.positionId);
          if (!mandatePosition) return [];
          return [
            {
              id: `mandate:${mandate.id}`,
              mandateType: mandate.mandateType,
              position: {
                id: mandatePosition.stableKey,
                status: mandatePosition.status,
                title: mandatePosition.title,
              },
              scope: mandate.scope,
              coverage: activeCoverages
                .filter((coverage) => coverage.roleMandateId === mandate.id)
                .flatMap((coverage) => {
                  const coveredPerson = peopleById.get(coverage.personId);
                  if (!coveredPerson || coveredPerson.status !== "active") return [];
                  return [
                    {
                      id: `coverage:${coverage.id}`,
                      coverageType: coverage.coverageType,
                      person: {
                        id: coveredPerson.stableKey,
                        name: coveredPerson.displayName,
                      },
                    },
                  ];
                }),
            },
          ];
        }),
    }));

  return {
    asOf: snapshotAsOf,
    process: {
      id: `process:${currentProcess.id}`,
      stableKey: currentProcess.stableKey,
      name: currentProcess.name,
      ownerRoleId: currentProcess.ownerRoleId
        ? `role:${currentProcess.ownerRoleId}`
        : null,
      purpose: currentProcess.purpose,
      revision: currentProcess.updatedAt.toISOString(),
      status: currentProcess.status,
    },
    roles: roleContexts,
    systems: systems.map((item) => ({
      description: item.description,
      id: `system:${item.id}`,
      name: item.name,
      stableKey: item.stableKey,
      status: item.status,
      systemType: item.systemType,
    })),
    systemLinks: systemLinks.map((item) => ({
      id: `system:${item.id}`,
      name: item.name,
      stableKey: item.stableKey,
      status: item.status,
      systemType: item.systemType,
      usage: item.usage,
    })),
    exceptions: exceptions.map((item) => ({
      condition: item.condition,
      id: `exception:${item.id}`,
      name: item.name,
      ownerRoleId: item.ownerRoleId ? `role:${item.ownerRoleId}` : null,
      processStepStableKey: item.processStepId
        ? (stepStableKeyById.get(item.processStepId) ?? null)
        : null,
      response: item.response,
      revision: item.updatedAt.toISOString(),
      stableKey: item.stableKey,
      status: item.status,
    })),
    steps: steps.map((item) => ({
      id: `step:${item.id}`,
      stableKey: item.stableKey,
      instructions: item.instructions,
      position: item.position,
      responsibleRoleId: item.responsibleRoleId
        ? `role:${item.responsibleRoleId}`
        : null,
      revision: item.updatedAt.toISOString(),
      title: item.title,
    })),
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
  };
}
