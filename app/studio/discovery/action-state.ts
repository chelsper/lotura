import type {
  NonConfidentialPilotPreview,
} from "@/lib/discovery-assistance-non-confidential-pilot.mjs";
import type {
  DiscoveryProcessProposalDraft,
} from "@/lib/discovery-process-proposal-draft-model.mjs";

export type DiscoveryActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

export type DiscoveryProcessProposalDraftState =
  | DiscoveryActionState
  | {
      draft: DiscoveryProcessProposalDraft;
      message: string;
      providerMetadata: {
        durationMs: number;
        inputTokens: number;
        model: string;
        outputTokens: number;
        totalTokens: number;
      };
      status: "drafted";
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

export const initialDiscoveryProcessProposalDraftState: DiscoveryProcessProposalDraftState =
  initialDiscoveryActionState;
