export class PilotIdentityConfigurationError extends Error {}

export type PilotIdentityAssociationConfiguration =
  | { enabled: false }
  | {
      applicationIdentity: "temporary-admin";
      enabled: true;
      organizationId: number;
      personStableKey: string;
      positionStableKey: string;
    };

export function resolvePilotIdentityAssociationConfiguration(
  environment: Record<string, string | undefined>,
  runtimeAccess: {
    authentication: { mode: "public" | "temporary-password" };
    operatingModel: {
      mode: "demo" | "neon" | "neon-with-demo-fallback";
      organizationId: number | null;
    };
  },
): PilotIdentityAssociationConfiguration;
