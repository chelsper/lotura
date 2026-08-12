const DISCOVERY_MODES = new Set(["disabled", "enabled"]);

export class DiscoveryConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DiscoveryConfigurationError";
  }
}

function endpointIdentity(url) {
  const labels = url.hostname.toLowerCase().split(".");
  labels[0] = labels[0].replace(/-pooler$/, "");
  return labels.join(".");
}

function credentialIdentity(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return `${parsed.username}:${parsed.pathname}`;
  } catch {
    return null;
  }
}

function requiredDiscoveryDatabaseUrl(environment) {
  const variableName = "LOTURA_DISCOVERY_DATABASE_URL";
  const value = environment[variableName];
  if (typeof value !== "string" || !value.trim()) {
    throw new DiscoveryConfigurationError(
      `${variableName} is required when Guided Discovery is enabled.`,
    );
  }

  let parsed;
  let runtimeUrl;
  try {
    parsed = new URL(value.trim());
    runtimeUrl = new URL(environment.DATABASE_URL || "");
  } catch {
    throw new DiscoveryConfigurationError(
      "Guided Discovery requires valid runtime and Discovery-write PostgreSQL URLs.",
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.username ||
    !parsed.password ||
    !parsed.hostname ||
    parsed.pathname.length < 2
  ) {
    throw new DiscoveryConfigurationError(
      `${variableName} must identify a credentialed PostgreSQL database.`,
    );
  }

  if (
    parsed.pathname !== runtimeUrl.pathname ||
    endpointIdentity(parsed) !== endpointIdentity(runtimeUrl)
  ) {
    throw new DiscoveryConfigurationError(
      "The Discovery-write credential must target the configured runtime database and Neon endpoint.",
    );
  }

  const discoveryIdentity = credentialIdentity(value);
  const forbiddenIdentities = [
    environment.DATABASE_URL,
    environment.DATABASE_URL_UNPOOLED,
    environment.LOTURA_STRUCTURE_ADMIN_DATABASE_URL,
    environment.LOTURA_PROCESS_ADMIN_DATABASE_URL,
  ]
    .map(credentialIdentity)
    .filter(Boolean);

  if (discoveryIdentity && forbiddenIdentities.includes(discoveryIdentity)) {
    throw new DiscoveryConfigurationError(
      "Guided Discovery requires a distinct database role and cannot reuse runtime, structural-administration, Process-administration, owner, or migration credentials.",
    );
  }

  return value.trim();
}

export function resolveDiscoveryConfiguration(environment, runtimeAccess) {
  const mode = environment.LOTURA_DISCOVERY_MODE || "disabled";
  if (!DISCOVERY_MODES.has(mode)) {
    throw new DiscoveryConfigurationError(
      "LOTURA_DISCOVERY_MODE must be disabled or enabled.",
    );
  }

  if (mode === "disabled") return { enabled: false };

  if (runtimeAccess.authentication.mode !== "temporary-password") {
    throw new DiscoveryConfigurationError(
      "Guided Discovery requires authenticated private-workspace access.",
    );
  }

  if (
    runtimeAccess.operatingModel.mode !== "neon" ||
    !Number.isSafeInteger(runtimeAccess.operatingModel.organizationId) ||
    runtimeAccess.operatingModel.organizationId < 1
  ) {
    throw new DiscoveryConfigurationError(
      "Guided Discovery requires a single organization-scoped Neon source.",
    );
  }

  return {
    actorIdentifier: runtimeAccess.authentication.adminIdentifier,
    databaseUrl: requiredDiscoveryDatabaseUrl(environment),
    enabled: true,
    organizationId: runtimeAccess.operatingModel.organizationId,
  };
}
