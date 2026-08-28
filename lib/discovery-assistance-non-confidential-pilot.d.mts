import type {
  DiscoveryAssistancePacket,
  DiscoveryAssistanceSuggestion,
} from "./discovery-assistance-model.mjs";

export type NonConfidentialPilotConfiguration =
  | {
      enabled: false;
      fallback: "standard_questions";
      reason: "disabled" | "kill_switch";
    }
  | {
      dataClassification: "non_confidential_test";
      deploymentEnvironment: "development" | "preview" | "production";
      enabled: true;
      organizationId: number;
      providerKey: "openai";
      providerProjectId: string;
    };

export type NonConfidentialPilotPreview = {
  affirmations: ReadonlyArray<{ key: string; label: string }>;
  contextFingerprint: string;
  disclosure: string;
  providerContext: {
    assistanceKind: "question_suggestions" | "clarity_draft";
    dataClassification: "non_confidential_test";
    originalText: string | null;
    packet: DiscoveryAssistancePacket;
  };
};

export type NonConfidentialPilotInput = {
  assistanceKind: "question_suggestions" | "clarity_draft";
  confirmedContextFingerprint?: string;
  dataClassification: "non_confidential_test";
  deploymentEnvironment: "development" | "preview" | "production";
  nonConfidentialAuthorized?: boolean;
  organizationId: number;
  originalText?: string | null;
  packet: DiscoveryAssistancePacket;
  providerRetentionAccepted?: boolean;
  sessionId: string;
  sessionRevision: number;
};

export const NON_CONFIDENTIAL_PILOT_DISCLOSURE: string;
export const NON_CONFIDENTIAL_PILOT_CONTRACT: Readonly<{
  modelIdentifier: "gpt-5.6-terra";
  promptPolicyVersion: "lad-064-v4";
  providerKey: "openai";
  reasoningEffort: "low";
}>;
export const NON_CONFIDENTIAL_PILOT_AFFIRMATIONS: ReadonlyArray<{
  key: string;
  label: string;
}>;

export class NonConfidentialPilotConfigurationError extends Error {}
export class NonConfidentialPilotAuthorizationError extends Error {}

export function assertNonConfidentialPilotContent(
  value: unknown,
  path?: string,
): string;

export function resolveNonConfidentialPilotConfiguration(
  environment: Record<string, string | undefined>,
  runtimeAccess: {
    authentication: { mode: string };
    operatingModel: {
      deploymentEnvironment?: string;
      mode: string;
      organizationId?: number | null;
    };
  },
): NonConfidentialPilotConfiguration;

export function buildNonConfidentialPilotPreview(
  input: NonConfidentialPilotInput,
): NonConfidentialPilotPreview;

export function authorizeNonConfidentialPilotRequest(
  input: NonConfidentialPilotInput,
  configuration: Extract<
    NonConfidentialPilotConfiguration,
    { enabled: true }
  >,
): {
  authorization: {
    contextFingerprint: string;
    dataClassification: "non_confidential_test";
    providerRetentionAccepted: true;
  };
  request: Record<string, unknown>;
};

export function parseNonConfidentialPilotOutput(
  input: NonConfidentialPilotInput,
  outputText: string,
): DiscoveryAssistanceSuggestion[];

export function nonConfidentialPilotFallback(reason?: string): {
  fallback: "standard_questions";
  ok: false;
  reason: string;
};
