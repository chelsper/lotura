import "server-only";

import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  exception as exceptionTable,
  membership,
  organization,
  organizationStructureImport,
  organizationUnit,
  person,
  position,
  positionAssignment,
  positionReportingRelationship,
  process as processTable,
  processDependency,
  processStep,
  processSystem,
  role,
  roleAssignment,
  roleCoverage,
  roleMandate,
  system as systemTable,
  user,
} from "@/db/schema";

import { mapNeonOrganizationStructure } from "./organization-structure-data.mjs";
import { mapNeonOperatingModel } from "./process-explorer-neon-data.mjs";

export async function loadNeonOrganizationStructure(organizationId: number) {
  const [
    asOfRows,
    organizations,
    users,
    memberships,
    roles,
    roleAssignments,
    systems,
    processes,
    processSteps,
    exceptions,
    processSystems,
    processDependencies,
    imports,
    people,
    organizationUnits,
    positions,
    positionAssignments,
    positionReportingRelationships,
    roleMandates,
    roleCoverages,
  ] = await db.batch([
    db
      .select({ asOf: sql<string>`transaction_timestamp()::text` })
      .from(sql`(select 1) as snapshot`),
    db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1),
    db
      .select({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      })
      .from(user)
      .innerJoin(
        membership,
        and(
          eq(membership.userId, user.id),
          eq(membership.organizationId, organizationId),
        ),
      )
      .orderBy(asc(user.id)),
    db
      .select({
        id: membership.id,
        userId: membership.userId,
        accessLevel: membership.accessLevel,
        status: membership.status,
      })
      .from(membership)
      .where(eq(membership.organizationId, organizationId))
      .orderBy(asc(membership.id)),
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
        id: roleAssignment.id,
        roleId: roleAssignment.roleId,
        membershipId: roleAssignment.membershipId,
        assignmentType: roleAssignment.assignmentType,
        status: roleAssignment.status,
        effectiveFrom: roleAssignment.effectiveFrom,
        effectiveUntil: roleAssignment.effectiveUntil,
        reason: roleAssignment.reason,
      })
      .from(roleAssignment)
      .where(eq(roleAssignment.organizationId, organizationId))
      .orderBy(
        asc(roleAssignment.roleId),
        asc(roleAssignment.effectiveFrom),
        asc(roleAssignment.id),
      ),
    db
      .select({
        id: systemTable.id,
        name: systemTable.name,
        description: systemTable.description,
        systemType: systemTable.systemType,
        url: systemTable.url,
        ownerRoleId: systemTable.ownerRoleId,
        status: systemTable.status,
      })
      .from(systemTable)
      .where(eq(systemTable.organizationId, organizationId))
      .orderBy(asc(systemTable.name), asc(systemTable.id)),
    db
      .select({
        id: processTable.id,
        name: processTable.name,
        purpose: processTable.purpose,
        ownerRoleId: processTable.ownerRoleId,
        status: processTable.status,
      })
      .from(processTable)
      .where(eq(processTable.organizationId, organizationId))
      .orderBy(asc(processTable.name), asc(processTable.id)),
    db
      .select({
        id: processStep.id,
        processId: processStep.processId,
        position: processStep.position,
        title: processStep.title,
        instructions: processStep.instructions,
        responsibleRoleId: processStep.responsibleRoleId,
      })
      .from(processStep)
      .where(eq(processStep.organizationId, organizationId))
      .orderBy(
        asc(processStep.processId),
        asc(processStep.position),
        asc(processStep.id),
      ),
    db
      .select({
        id: exceptionTable.id,
        processId: exceptionTable.processId,
        processStepId: exceptionTable.processStepId,
        name: exceptionTable.name,
        condition: exceptionTable.condition,
        response: exceptionTable.response,
        status: exceptionTable.status,
        ownerRoleId: exceptionTable.ownerRoleId,
      })
      .from(exceptionTable)
      .where(eq(exceptionTable.organizationId, organizationId))
      .orderBy(asc(exceptionTable.processId), asc(exceptionTable.id)),
    db
      .select({
        processId: processSystem.processId,
        systemId: processSystem.systemId,
        usage: processSystem.usage,
      })
      .from(processSystem)
      .where(eq(processSystem.organizationId, organizationId))
      .orderBy(asc(processSystem.processId), asc(processSystem.systemId)),
    db
      .select({
        id: processDependency.id,
        sourceProcessId: processDependency.sourceProcessId,
        targetProcessId: processDependency.targetProcessId,
        dependencyType: processDependency.dependencyType,
        description: processDependency.description,
      })
      .from(processDependency)
      .where(eq(processDependency.organizationId, organizationId))
      .orderBy(
        asc(processDependency.sourceProcessId),
        asc(processDependency.targetProcessId),
        asc(processDependency.dependencyType),
        asc(processDependency.id),
      ),
    db
      .select({
        id: organizationStructureImport.id,
        stableKey: organizationStructureImport.stableKey,
        sourceAsOf: organizationStructureImport.sourceAsOf,
        isPartial: organizationStructureImport.isPartial,
        vacancyEvidenceComplete:
          organizationStructureImport.vacancyEvidenceComplete,
        approvedForImportAt: organizationStructureImport.approvedForImportAt,
        importedAt: organizationStructureImport.importedAt,
        currentForPilotUseAt:
          organizationStructureImport.currentForPilotUseAt,
      })
      .from(organizationStructureImport)
      .where(
        and(
          eq(organizationStructureImport.organizationId, organizationId),
          isNotNull(organizationStructureImport.currentForPilotUseAt),
          isNull(organizationStructureImport.endedForPilotUseAt),
        ),
      )
      .limit(1),
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
        id: organizationUnit.id,
        stableKey: organizationUnit.stableKey,
        name: organizationUnit.name,
        parentOrganizationUnitId: organizationUnit.parentOrganizationUnitId,
        isProvisional: organizationUnit.isProvisional,
        status: organizationUnit.status,
        statusReason: organizationUnit.statusReason,
        effectiveFrom: organizationUnit.effectiveFrom,
        effectiveUntil: organizationUnit.effectiveUntil,
      })
      .from(organizationUnit)
      .where(eq(organizationUnit.organizationId, organizationId))
      .orderBy(asc(organizationUnit.name), asc(organizationUnit.id)),
    db
      .select({
        id: position.id,
        stableKey: position.stableKey,
        organizationUnitId: position.organizationUnitId,
        title: position.title,
        status: position.status,
        statusReason: position.statusReason,
        effectiveFrom: position.effectiveFrom,
        effectiveUntil: position.effectiveUntil,
      })
      .from(position)
      .where(eq(position.organizationId, organizationId))
      .orderBy(asc(position.title), asc(position.id)),
    db
      .select({
        id: positionAssignment.id,
        positionId: positionAssignment.positionId,
        personId: positionAssignment.personId,
        assignmentType: positionAssignment.assignmentType,
        status: positionAssignment.status,
        effectiveFrom: positionAssignment.effectiveFrom,
        effectiveUntil: positionAssignment.effectiveUntil,
        reason: positionAssignment.reason,
      })
      .from(positionAssignment)
      .where(eq(positionAssignment.organizationId, organizationId))
      .orderBy(
        asc(positionAssignment.positionId),
        asc(positionAssignment.effectiveFrom),
        asc(positionAssignment.id),
      ),
    db
      .select({
        id: positionReportingRelationship.id,
        subordinatePositionId:
          positionReportingRelationship.subordinatePositionId,
        managerPositionId: positionReportingRelationship.managerPositionId,
        relationshipType: positionReportingRelationship.relationshipType,
        status: positionReportingRelationship.status,
        effectiveFrom: positionReportingRelationship.effectiveFrom,
        effectiveUntil: positionReportingRelationship.effectiveUntil,
        reason: positionReportingRelationship.reason,
      })
      .from(positionReportingRelationship)
      .where(
        eq(positionReportingRelationship.organizationId, organizationId),
      )
      .orderBy(
        asc(positionReportingRelationship.subordinatePositionId),
        asc(positionReportingRelationship.relationshipType),
        asc(positionReportingRelationship.id),
      ),
    db
      .select({
        id: roleMandate.id,
        positionId: roleMandate.positionId,
        roleId: roleMandate.roleId,
        mandateType: roleMandate.mandateType,
        scope: roleMandate.scope,
        status: roleMandate.status,
        effectiveFrom: roleMandate.effectiveFrom,
        effectiveUntil: roleMandate.effectiveUntil,
        reason: roleMandate.reason,
      })
      .from(roleMandate)
      .where(eq(roleMandate.organizationId, organizationId))
      .orderBy(
        asc(roleMandate.positionId),
        asc(roleMandate.roleId),
        asc(roleMandate.id),
      ),
    db
      .select({
        id: roleCoverage.id,
        roleMandateId: roleCoverage.roleMandateId,
        personId: roleCoverage.personId,
        coverageType: roleCoverage.coverageType,
        status: roleCoverage.status,
        effectiveFrom: roleCoverage.effectiveFrom,
        effectiveUntil: roleCoverage.effectiveUntil,
        reason: roleCoverage.reason,
      })
      .from(roleCoverage)
      .where(eq(roleCoverage.organizationId, organizationId))
      .orderBy(
        asc(roleCoverage.roleMandateId),
        asc(roleCoverage.effectiveFrom),
        asc(roleCoverage.id),
      ),
  ] as const);

  const asOf = asOfRows[0]?.asOf;
  if (!asOf) {
    throw new Error("Neon did not return an Organization Structure snapshot time.");
  }

  const operatingModel = mapNeonOperatingModel({
    asOf,
    organizations,
    users,
    memberships,
    roles,
    roleAssignments,
    systems,
    processes,
    processSteps,
    exceptions,
    processSystems,
    processDependencies,
  });
  const structure = mapNeonOrganizationStructure({
    asOf,
    organizations,
    imports,
    people,
    organizationUnits,
    positions,
    positionAssignments,
    positionReportingRelationships,
    roleMandates,
    roleCoverages,
  });

  return {
    asOf: structure.asOf,
    operatingModel: operatingModel.seed,
    structure: structure.structure,
  };
}
