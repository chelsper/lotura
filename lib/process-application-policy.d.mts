export type ProcessApplicationConfiguration =
  | { enabled: false }
  | {
      actorIdentifier: string;
      databaseUrl: string;
      enabled: true;
      organizationId: number;
    };

export class ProcessApplicationConfigurationError extends Error {}

export function resolveProcessApplicationConfiguration(
  environment: Record<string, string | undefined>,
  runtimeAccess: RuntimeAccessConfiguration,
): ProcessApplicationConfiguration;
import type { RuntimeAccessConfiguration } from "./authentication";
