export type TechnologyActionState = {
  message: string;
  status: "idle" | "success" | "error";
};

export const initialTechnologyActionState: TechnologyActionState = {
  message: "",
  status: "idle",
};
