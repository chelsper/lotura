import type { StructureActionState } from "../organization/action-state";

export type UnitPersonCreateState = StructureActionState & {
  stableKey?: string;
  saveUnconfirmed?: boolean;
};

export const initialUnitPersonCreateState: UnitPersonCreateState = {
  status: "idle",
  message: "",
};
