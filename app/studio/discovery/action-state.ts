import type {
  NonConfidentialPilotPreview,
} from "@/lib/discovery-assistance-non-confidential-pilot.mjs";

export type DiscoveryActionState = {
  message: string;
  status: "idle" | "error";
};

export type DiscoveryAssistanceRequestState =
  | DiscoveryActionState
  | {
      message: string;
      preview: NonConfidentialPilotPreview;
      status: "external_review";
    };

export const initialDiscoveryActionState: DiscoveryActionState = {
  message: "",
  status: "idle",
};

export const initialDiscoveryAssistanceRequestState: DiscoveryAssistanceRequestState =
  initialDiscoveryActionState;
