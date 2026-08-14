import type { RuntimeAccessConfiguration } from "./authentication";

export type DisabledProposalReviewConfiguration = { enabled: false };
export type EnabledProposalReviewConfiguration = {
  actorIdentifier: string;
  databaseUrl: string;
  enabled: true;
  organizationId: number;
};
export type ProposalReviewConfiguration =
  | DisabledProposalReviewConfiguration
  | EnabledProposalReviewConfiguration;

export class ProposalReviewConfigurationError extends Error {}

export function resolveProposalReviewConfiguration(
  environment: Record<string, string | undefined>,
  runtimeAccess: RuntimeAccessConfiguration,
): ProposalReviewConfiguration;
