import type { StructureActionState } from "../organization/action-state";

export type UnitPositionCreateState = StructureActionState & {
  stableKey?: string;
  saveUnconfirmed?: boolean;
};

export const initialUnitPositionCreateState: UnitPositionCreateState = {
  status: "idle",
  message: "",
};
