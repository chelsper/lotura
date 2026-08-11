export type ProcessAuthoringActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialProcessAuthoringActionState: ProcessAuthoringActionState = {
  message: "",
  status: "idle",
};
