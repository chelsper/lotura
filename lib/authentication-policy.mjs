const AUTHENTICATION_MODES = new Set(["public", "temporary-password"]);
const ARGON2ID_HASH = /^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$[^$]+\$[^$]+$/;
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export class AuthenticationConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationConfigurationError";
  }
}

function requiredValue(environment, name, { maximumLength = 4096 } = {}) {
  const value = environment[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new AuthenticationConfigurationError(
      `${name} is required in temporary-password mode.`,
    );
  }

  const normalized = value.trim();
  if (normalized.length > maximumLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new AuthenticationConfigurationError(`${name} is invalid.`);
  }

  return normalized;
}

function sessionSecret(environment) {
  const value = requiredValue(environment, "LOTURA_SESSION_SECRET", {
    maximumLength: 256,
  });

  if (!/^[A-Za-z0-9_-]{43,}$/.test(value)) {
    throw new AuthenticationConfigurationError(
      "LOTURA_SESSION_SECRET must be at least 32 bytes encoded as base64url.",
    );
  }

  return value;
}

export function resolveAuthenticationConfiguration(
  environment,
  operatingModelConfiguration,
) {
  const configuredMode = environment.LOTURA_AUTH_MODE || null;
  const deployed =
    operatingModelConfiguration.deploymentEnvironment === "preview" ||
    operatingModelConfiguration.deploymentEnvironment === "production";

  if (configuredMode && !AUTHENTICATION_MODES.has(configuredMode)) {
    throw new AuthenticationConfigurationError(
      "LOTURA_AUTH_MODE must be public or temporary-password.",
    );
  }

  const mode =
    configuredMode ||
    (deployed && operatingModelConfiguration.mode !== "demo"
      ? null
      : "public");

  if (!mode) {
    throw new AuthenticationConfigurationError(
      "Deployed Neon workspaces require an explicit temporary-password authentication mode.",
    );
  }

  if (
    mode === "public" &&
    deployed &&
    operatingModelConfiguration.mode !== "demo"
  ) {
    throw new AuthenticationConfigurationError(
      "A deployed Neon workspace cannot use public authentication mode.",
    );
  }

  if (mode === "public") {
    return { mode };
  }

  const adminIdentifier = requiredValue(
    environment,
    "LOTURA_TEMPORARY_ADMIN_IDENTIFIER",
    { maximumLength: 128 },
  );
  const passwordHash = requiredValue(
    environment,
    "LOTURA_TEMPORARY_ADMIN_PASSWORD_HASH",
  );

  if (!ARGON2ID_HASH.test(passwordHash)) {
    throw new AuthenticationConfigurationError(
      "LOTURA_TEMPORARY_ADMIN_PASSWORD_HASH must be an Argon2id PHC string.",
    );
  }

  return {
    mode,
    adminIdentifier,
    passwordHash,
    sessionDurationSeconds: SESSION_DURATION_SECONDS,
    sessionSecret: sessionSecret(environment),
  };
}

export function safeReturnPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.includes("\\") || value.length > 2048) {
    return "/";
  }

  try {
    const parsed = new URL(value, "https://lotura.invalid");
    if (parsed.origin !== "https://lotura.invalid") return "/";
    if (parsed.pathname.startsWith("/login") || parsed.pathname.startsWith("/auth/")) {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export { SESSION_DURATION_SECONDS };
