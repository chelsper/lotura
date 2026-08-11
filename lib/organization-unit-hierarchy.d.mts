import type { OrganizationUnit } from "./organization-structure-data.mjs";

export type OrganizationUnitHierarchyNode = {
  unit: OrganizationUnit;
  depth: number;
  path: OrganizationUnit[];
  children: OrganizationUnitHierarchyNode[];
  descendantCount: number;
};

export function organizationUnitPath(
  units: OrganizationUnit[],
  unitId: string,
): OrganizationUnit[];

export function buildOrganizationUnitHierarchy(
  units: OrganizationUnit[],
): OrganizationUnitHierarchyNode[];
