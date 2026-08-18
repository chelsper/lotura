export type ProcessFamilyActionState = {
  message: string;
  status: "idle" | "success" | "error";
};

export const initialProcessFamilyActionState: ProcessFamilyActionState = {
  message: "",
  status: "idle",
};
