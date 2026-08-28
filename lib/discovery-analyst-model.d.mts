export type DiscoveryAnalystEpistemicState =
  | "known"
  | "assumed"
  | "unknown"
  | "needs_validation"
  | "conflicting_observation";

export type DiscoveryAnalystResult = {
  acknowledgement: string;
  clear: string[];
  conflicts: string[];
  narrative: string;
  needsValidation: string[];
  nextQuestion: {
    promptKey: string;
    rationale: string;
    text: string;
    topic: string;
  };
  openQuestions: string[];
  participantsNeeded: string[];
  process: {
    alternatePaths: string[];
    approvals: string[];
    dependencies: string[];
    endBoundary: string | null;
    exceptions: string[];
    handoffs: string[];
    ownerRole: string | null;
    participants: string[];
    purpose: string | null;
    steps: string[];
    systems: string[];
    trigger: string | null;
  };
  suggestedEpistemicState: DiscoveryAnalystEpistemicState;
};

export const DISCOVERY_ANALYST_AUTHORIZATION_VERSION: "lad-067-alpha-v1";
export const DISCOVERY_ANALYST_PROMPT_POLICY_VERSION: "lad-067-alpha-v1";
export const DISCOVERY_ANALYST_STATES: ReadonlyArray<DiscoveryAnalystEpistemicState>;
export function validateDiscoveryAnalystResult(value: unknown): DiscoveryAnalystResult | null;
export function createDiscoveryAnalystFallback(
  context: Record<string, unknown>,
  reason?: string,
  excludedPromptKeys?: string[],
): DiscoveryAnalystResult;
