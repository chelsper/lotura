const STABLE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class PilotIdentityConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PilotIdentityConfigurationError";
  }
}

function stableKey(environment, name) {
  const value = environment[name];
  if (value === undefined || value === "") return null;
  if (typeof value !== "string" || !STABLE_KEY_PATTERN.test(value.trim())) {
    throw new PilotIdentityConfigurationError(`${name} must be a UUID stable key.`);
  }
  return value.trim().toLowerCase();
}

export function resolvePilotIdentityAssociationConfiguration(
  environment,
  runtimeAccess,
) {
  const personStableKey = stableKey(
    environment,
    "LOTURA_PILOT_PERSON_STABLE_KEY",
  );
  const positionStableKey = stableKey(
    environment,
    "LOTURA_PILOT_POSITION_STABLE_KEY",
  );

  if (!personStableKey && !positionStableKey) return { enabled: false };
  if (!personStableKey || !positionStableKey) {
    throw new PilotIdentityConfigurationError(
      "LOTURA_PILOT_PERSON_STABLE_KEY and LOTURA_PILOT_POSITION_STABLE_KEY must be configured together.",
    );
  }
  if (
    runtimeAccess.authentication.mode !== "temporary-password" ||
    runtimeAccess.operatingModel.mode === "demo" ||
    !runtimeAccess.operatingModel.organizationId
  ) {
    throw new PilotIdentityConfigurationError(
      "A pilot identity association requires an authenticated private Neon workspace.",
    );
  }

  return {
    applicationIdentity: "temporary-admin",
    enabled: true,
    organizationId: runtimeAccess.operatingModel.organizationId,
    personStableKey,
    positionStableKey,
  };
}
