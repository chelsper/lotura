export type ProcessAcquisitionActionState = {
  message: string;
  status: "error" | "idle";
};

export const initialProcessAcquisitionActionState: ProcessAcquisitionActionState = {
  message: "",
  status: "idle",
};
