const ADMINISTRATION_MODES = new Set(["disabled", "enabled"]);

export class OrganizationStructureAdministrationConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "OrganizationStructureAdministrationConfigurationError";
  }
}

function requiredConnectionUrl(environment) {
  const variableName = "LOTURA_STRUCTURE_ADMIN_DATABASE_URL";
  const value = environment[variableName];
  if (typeof value !== "string" || !value.trim()) {
    throw new OrganizationStructureAdministrationConfigurationError(
      `${variableName} is required when structure administration is enabled.`,
    );
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new OrganizationStructureAdministrationConfigurationError(
      `${variableName} must be a valid PostgreSQL connection URL.`,
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.username ||
    !parsed.password ||
    !parsed.hostname ||
    parsed.pathname.length < 2
  ) {
    throw new OrganizationStructureAdministrationConfigurationError(
      `${variableName} must identify a credentialed PostgreSQL database.`,
    );
  }

  function reusesCredential(otherValue) {
    if (typeof otherValue !== "string" || !otherValue.trim()) return false;
    try {
      const other = new URL(otherValue.trim());
      return (
        parsed.username === other.username &&
        parsed.pathname === other.pathname
      );
    } catch {
      return false;
    }
  }

  let runtimeUrl;
  try {
    runtimeUrl = new URL(environment.DATABASE_URL || "");
  } catch {
    throw new OrganizationStructureAdministrationConfigurationError(
      "Structure administration requires the configured Neon runtime database identity.",
    );
  }
  if (runtimeUrl.pathname !== parsed.pathname) {
    throw new OrganizationStructureAdministrationConfigurationError(
      "The structural-write credential must target the same database as the configured runtime source.",
    );
  }

  function endpointIdentity(url) {
    const labels = url.hostname.toLowerCase().split(".");
    labels[0] = labels[0].replace(/-pooler$/, "");
    return labels.join(".");
  }

  if (
    reusesCredential(environment.DATABASE_URL) ||
    reusesCredential(environment.DATABASE_URL_UNPOOLED) ||
    reusesCredential(environment.LOTURA_PROCESS_ADMIN_DATABASE_URL) ||
    reusesCredential(environment.LOTURA_DISCOVERY_DATABASE_URL) ||
    reusesCredential(environment.LOTURA_PROPOSAL_REVIEW_DATABASE_URL)
  ) {
    throw new OrganizationStructureAdministrationConfigurationError(
      "Structure administration requires a distinct database role and cannot reuse runtime, owner, or migration credentials, or Process-administration, Discovery, or proposal-review credentials.",
    );
  }

  if (endpointIdentity(runtimeUrl) !== endpointIdentity(parsed)) {
    throw new OrganizationStructureAdministrationConfigurationError(
      "The structural-write credential must target the same Neon endpoint as the configured runtime source.",
    );
  }

  return value.trim();
}

export function resolveOrganizationStructureAdministrationConfiguration(
  environment,
  runtimeAccess,
) {
  const mode = environment.LOTURA_STRUCTURE_ADMIN_MODE || "disabled";
  if (!ADMINISTRATION_MODES.has(mode)) {
    throw new OrganizationStructureAdministrationConfigurationError(
      "LOTURA_STRUCTURE_ADMIN_MODE must be disabled or enabled.",
    );
  }

  if (mode === "disabled") return { enabled: false };

  if (runtimeAccess.authentication.mode !== "temporary-password") {
    throw new OrganizationStructureAdministrationConfigurationError(
      "Structure administration requires authenticated temporary-password access.",
    );
  }

  if (
    runtimeAccess.operatingModel.mode !== "neon" ||
    !Number.isSafeInteger(runtimeAccess.operatingModel.organizationId) ||
    runtimeAccess.operatingModel.organizationId < 1
  ) {
    throw new OrganizationStructureAdministrationConfigurationError(
      "Structure administration requires a single organization-scoped Neon source.",
    );
  }

  return {
    actorIdentifier: runtimeAccess.authentication.adminIdentifier,
    databaseUrl: requiredConnectionUrl(environment),
    enabled: true,
    organizationId: runtimeAccess.operatingModel.organizationId,
  };
}
