import type {
  OrganizationPosition,
  OrganizationStructureData,
} from "./organization-structure-data.mjs";
import type { StructureChangeSummary } from "./organization-structure-administration";

export type ResponsibilityRole =
  OrganizationStructureData["operationalRoles"][number] & {
    mandates: Array<{
      mandate: OrganizationPosition["mandates"][number];
      position: OrganizationPosition;
    }>;
    activity: StructureChangeSummary[];
  };

function changeReferencesRole(change: StructureChangeSummary, roleId: string) {
  if (change.targetType === "operational_role") return false;
  return [change.beforeState, change.afterState].some(
    (state) => state.operationalRoleId === roleId,
  );
}

export function buildResponsibilityRoles(
  data: OrganizationStructureData,
  changes: StructureChangeSummary[],
): ResponsibilityRole[] {
  return data.operationalRoles.map((role) => {
    const mandates = data.positions.flatMap((position) =>
      position.mandates
        .filter((mandate) => mandate.role.id === role.id)
        .map((mandate) => ({ mandate, position })),
    );
    const activity = changes.filter(
      (change) =>
        (change.targetType === "operational_role" &&
          change.targetStableKey === role.stableKey) ||
        changeReferencesRole(change, role.id),
    );
    return { ...role, activity, mandates };
  });
}
