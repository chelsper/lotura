export type DiscoveryActionState = {
  message: string;
  status: "idle" | "error";
};

export const initialDiscoveryActionState: DiscoveryActionState = {
  message: "",
  status: "idle",
};
