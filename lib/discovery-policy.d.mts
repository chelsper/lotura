import type { RuntimeAccessConfiguration } from "./authentication";

export type DisabledDiscoveryConfiguration = { enabled: false };
export type EnabledDiscoveryConfiguration = {
  actorIdentifier: string;
  databaseUrl: string;
  enabled: true;
  organizationId: number;
};
export type DiscoveryConfiguration =
  | DisabledDiscoveryConfiguration
  | EnabledDiscoveryConfiguration;

export class DiscoveryConfigurationError extends Error {}

export function resolveDiscoveryConfiguration(
  environment: Record<string, string | undefined>,
  runtimeAccess: RuntimeAccessConfiguration,
): DiscoveryConfiguration;
