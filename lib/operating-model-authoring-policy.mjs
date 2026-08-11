const AUTHORING_MODES = new Set(["disabled", "enabled"]);

export class OperatingModelAuthoringConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "OperatingModelAuthoringConfigurationError";
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

function requiredAuthoringDatabaseUrl(environment) {
  const variableName = "LOTURA_PROCESS_ADMIN_DATABASE_URL";
  const value = environment[variableName];
  if (typeof value !== "string" || !value.trim()) {
    throw new OperatingModelAuthoringConfigurationError(
      `${variableName} is required when Operating Model Authoring is enabled.`,
    );
  }

  let parsed;
  let runtimeUrl;
  try {
    parsed = new URL(value.trim());
    runtimeUrl = new URL(environment.DATABASE_URL || "");
  } catch {
    throw new OperatingModelAuthoringConfigurationError(
      "Operating Model Authoring requires valid runtime and Process administration PostgreSQL URLs.",
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.username ||
    !parsed.password ||
    !parsed.hostname ||
    parsed.pathname.length < 2
  ) {
    throw new OperatingModelAuthoringConfigurationError(
      `${variableName} must identify a credentialed PostgreSQL database.`,
    );
  }

  if (
    parsed.pathname !== runtimeUrl.pathname ||
    endpointIdentity(parsed) !== endpointIdentity(runtimeUrl)
  ) {
    throw new OperatingModelAuthoringConfigurationError(
      "The Process administration credential must target the configured runtime database and Neon endpoint.",
    );
  }

  const authoringIdentity = credentialIdentity(value);
  const forbiddenIdentities = [
    environment.DATABASE_URL,
    environment.DATABASE_URL_UNPOOLED,
    environment.LOTURA_STRUCTURE_ADMIN_DATABASE_URL,
  ]
    .map(credentialIdentity)
    .filter(Boolean);

  if (authoringIdentity && forbiddenIdentities.includes(authoringIdentity)) {
    throw new OperatingModelAuthoringConfigurationError(
      "Operating Model Authoring requires a distinct database role and cannot reuse runtime, structural-administration, owner, or migration credentials.",
    );
  }

  return value.trim();
}

export function resolveOperatingModelAuthoringConfiguration(
  environment,
  runtimeAccess,
) {
  const mode = environment.LOTURA_OPERATING_MODEL_AUTHORING_MODE || "disabled";
  if (!AUTHORING_MODES.has(mode)) {
    throw new OperatingModelAuthoringConfigurationError(
      "LOTURA_OPERATING_MODEL_AUTHORING_MODE must be disabled or enabled.",
    );
  }

  if (mode === "disabled") return { enabled: false };

  if (runtimeAccess.authentication.mode !== "temporary-password") {
    throw new OperatingModelAuthoringConfigurationError(
      "Operating Model Authoring requires authenticated private-workspace access.",
    );
  }

  if (
    runtimeAccess.operatingModel.mode !== "neon" ||
    !Number.isSafeInteger(runtimeAccess.operatingModel.organizationId) ||
    runtimeAccess.operatingModel.organizationId < 1
  ) {
    throw new OperatingModelAuthoringConfigurationError(
      "Operating Model Authoring requires a single organization-scoped Neon source.",
    );
  }

  return {
    actorIdentifier: runtimeAccess.authentication.adminIdentifier,
    databaseUrl: requiredAuthoringDatabaseUrl(environment),
    enabled: true,
    organizationId: runtimeAccess.operatingModel.organizationId,
  };
}
