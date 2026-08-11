import type { RuntimeAccessConfiguration } from "./authentication";

export type DisabledProcessAcquisitionConfiguration = {
  enabled: false;
};

export type EnabledProcessAcquisitionConfiguration = {
  actorIdentifier: string;
  databaseUrl: string;
  enabled: true;
  organizationId: number;
};

export type ProcessAcquisitionConfiguration =
  | DisabledProcessAcquisitionConfiguration
  | EnabledProcessAcquisitionConfiguration;

export class ProcessAcquisitionConfigurationError extends Error {}

export function resolveProcessAcquisitionConfiguration(
  environment: Record<string, string | undefined>,
  runtimeAccess: RuntimeAccessConfiguration,
): ProcessAcquisitionConfiguration;
