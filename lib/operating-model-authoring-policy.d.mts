import type { RuntimeAccessConfiguration } from "./authentication";

export type DisabledOperatingModelAuthoringConfiguration = {
  enabled: false;
};

export type EnabledOperatingModelAuthoringConfiguration = {
  actorIdentifier: string;
  databaseUrl: string;
  enabled: true;
  organizationId: number;
};

export type OperatingModelAuthoringConfiguration =
  | DisabledOperatingModelAuthoringConfiguration
  | EnabledOperatingModelAuthoringConfiguration;

export class OperatingModelAuthoringConfigurationError extends Error {}

export function resolveOperatingModelAuthoringConfiguration(
  environment: Record<string, string | undefined>,
  runtimeAccess: RuntimeAccessConfiguration,
): OperatingModelAuthoringConfiguration;
