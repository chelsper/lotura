export type StructureActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialStructureActionState: StructureActionState = {
  message: "",
  status: "idle",
};
