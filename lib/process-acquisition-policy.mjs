const ACQUISITION_MODES = new Set(["disabled", "enabled"]);

export class ProcessAcquisitionConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProcessAcquisitionConfigurationError";
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

function requiredProcessDatabaseUrl(environment) {
  const variableName = "LOTURA_PROCESS_ADMIN_DATABASE_URL";
  const value = environment[variableName];
  if (typeof value !== "string" || !value.trim()) {
    throw new ProcessAcquisitionConfigurationError(
      `${variableName} is required when Process Acquisition is enabled.`,
    );
  }

  let parsed;
  let runtimeUrl;
  try {
    parsed = new URL(value.trim());
    runtimeUrl = new URL(environment.DATABASE_URL || "");
  } catch {
    throw new ProcessAcquisitionConfigurationError(
      "Process Acquisition requires valid runtime and Process-write PostgreSQL URLs.",
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.username ||
    !parsed.password ||
    !parsed.hostname ||
    parsed.pathname.length < 2
  ) {
    throw new ProcessAcquisitionConfigurationError(
      `${variableName} must identify a credentialed PostgreSQL database.`,
    );
  }

  if (
    parsed.pathname !== runtimeUrl.pathname ||
    endpointIdentity(parsed) !== endpointIdentity(runtimeUrl)
  ) {
    throw new ProcessAcquisitionConfigurationError(
      "The Process-write credential must target the configured runtime database and Neon endpoint.",
    );
  }

  const processIdentity = credentialIdentity(value);
  const forbiddenIdentities = [
    environment.DATABASE_URL,
    environment.DATABASE_URL_UNPOOLED,
    environment.LOTURA_STRUCTURE_ADMIN_DATABASE_URL,
    environment.LOTURA_DISCOVERY_DATABASE_URL,
    environment.LOTURA_PROPOSAL_REVIEW_DATABASE_URL,
  ]
    .map(credentialIdentity)
    .filter(Boolean);

  if (processIdentity && forbiddenIdentities.includes(processIdentity)) {
    throw new ProcessAcquisitionConfigurationError(
      "Process Acquisition requires a distinct database role and cannot reuse runtime, structural-administration, Discovery, proposal-review, owner, or migration credentials.",
    );
  }

  return value.trim();
}

export function resolveProcessAcquisitionConfiguration(
  environment,
  runtimeAccess,
) {
  const mode = environment.LOTURA_PROCESS_ACQUISITION_MODE || "disabled";
  if (!ACQUISITION_MODES.has(mode)) {
    throw new ProcessAcquisitionConfigurationError(
      "LOTURA_PROCESS_ACQUISITION_MODE must be disabled or enabled.",
    );
  }

  if (mode === "disabled") return { enabled: false };

  if (runtimeAccess.authentication.mode !== "temporary-password") {
    throw new ProcessAcquisitionConfigurationError(
      "Process Acquisition requires authenticated private-workspace access.",
    );
  }

  if (
    runtimeAccess.operatingModel.mode !== "neon" ||
    !Number.isSafeInteger(runtimeAccess.operatingModel.organizationId) ||
    runtimeAccess.operatingModel.organizationId < 1
  ) {
    throw new ProcessAcquisitionConfigurationError(
      "Process Acquisition requires a single organization-scoped Neon source.",
    );
  }

  return {
    actorIdentifier: runtimeAccess.authentication.adminIdentifier,
    databaseUrl: requiredProcessDatabaseUrl(environment),
    enabled: true,
    organizationId: runtimeAccess.operatingModel.organizationId,
  };
}
