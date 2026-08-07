const SOURCE_MODES = new Set(["neon", "demo", "neon-with-demo-fallback"]);
const DEPLOYMENT_ENVIRONMENTS = new Set([
  "development",
  "preview",
  "production",
]);

const TRANSIENT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "57P01",
  "57P02",
  "57P03",
]);

export class OperatingModelConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "OperatingModelConfigurationError";
  }
}

function normalizedEnvironment(value, label) {
  if (!value) return null;
  if (!DEPLOYMENT_ENVIRONMENTS.has(value)) {
    throw new OperatingModelConfigurationError(
      `${label} must be development, preview, or production.`,
    );
  }
  return value;
}

export function resolveDeploymentEnvironment({
  vercelEnvironment,
  runtimeEnvironment,
  nodeEnvironment,
}) {
  const vercel = normalizedEnvironment(vercelEnvironment, "VERCEL_ENV");
  if (vercel) return vercel;

  const configured = normalizedEnvironment(
    runtimeEnvironment,
    "LOTURA_RUNTIME_ENV",
  );
  if (configured) return configured;

  return nodeEnvironment === "production" ? "production" : "development";
}

function parseBoolean(value, label) {
  if (value === undefined || value === "") return false;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new OperatingModelConfigurationError(
    `${label} must be exactly 'true' or 'false'.`,
  );
}

function parseOrganizationId(value) {
  if (!value || !/^\d+$/.test(value)) {
    throw new OperatingModelConfigurationError(
      "LOTURA_ORGANIZATION_ID must be a positive integer in Neon modes.",
    );
  }

  const organizationId = Number(value);
  if (!Number.isSafeInteger(organizationId) || organizationId < 1) {
    throw new OperatingModelConfigurationError(
      "LOTURA_ORGANIZATION_ID must be a positive safe integer.",
    );
  }

  return organizationId;
}

export function resolveOperatingModelConfiguration(environment) {
  const deploymentEnvironment = resolveDeploymentEnvironment({
    vercelEnvironment: environment.VERCEL_ENV,
    runtimeEnvironment: environment.LOTURA_RUNTIME_ENV,
    nodeEnvironment: environment.NODE_ENV,
  });
  const defaultMode =
    deploymentEnvironment === "development" ? "demo" : "neon";
  const mode = environment.LOTURA_EXPLORER_MODE || defaultMode;

  if (!SOURCE_MODES.has(mode)) {
    throw new OperatingModelConfigurationError(
      "LOTURA_EXPLORER_MODE must be neon, demo, or neon-with-demo-fallback.",
    );
  }

  const allowProductionFallback = parseBoolean(
    environment.LOTURA_ALLOW_DEMO_FALLBACK,
    "LOTURA_ALLOW_DEMO_FALLBACK",
  );

  if (
    deploymentEnvironment === "production" &&
    mode === "neon-with-demo-fallback" &&
    !allowProductionFallback
  ) {
    throw new OperatingModelConfigurationError(
      "Production demo fallback requires LOTURA_ALLOW_DEMO_FALLBACK=true.",
    );
  }

  if (mode === "demo") {
    return { deploymentEnvironment, mode, organizationId: null };
  }

  if (!environment.DATABASE_URL) {
    throw new OperatingModelConfigurationError(
      "DATABASE_URL is required in Neon modes. It is never replaced by DATABASE_URL_UNPOOLED.",
    );
  }

  return {
    deploymentEnvironment,
    mode,
    organizationId: parseOrganizationId(environment.LOTURA_ORGANIZATION_ID),
  };
}

function errorCode(error) {
  if (!error || typeof error !== "object") return null;
  return typeof error.code === "string" ? error.code : null;
}

export function isTransientNeonError(error) {
  if (!error || typeof error !== "object") return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;

  const code = errorCode(error);
  if (code && (TRANSIENT_ERROR_CODES.has(code) || code.startsWith("08"))) {
    return true;
  }

  const message =
    typeof error.message === "string" ? error.message.toLowerCase() : "";
  if (
    message.includes("fetch failed") ||
    message.includes("connection terminated") ||
    message.includes("connect timeout") ||
    message.includes("network error")
  ) {
    return true;
  }

  return error.cause ? isTransientNeonError(error.cause) : false;
}

function requestTimestamp(now) {
  const value = now();
  const timestamp = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("The operating-model request clock returned an invalid time.");
  }

  return timestamp.toISOString();
}

export async function loadOperatingModelFromPolicy(
  configuration,
  { loadDemo, loadNeon, now = () => new Date() },
) {
  const requestedAt = requestTimestamp(now);

  if (configuration.mode === "demo") {
    return {
      ...(await loadDemo()),
      asOf: requestedAt,
      source: {
        kind: "demo",
        label: "Fictional sample organization",
        notice: null,
      },
    };
  }

  try {
    const live = await loadNeon(configuration.organizationId);
    return {
      ...live,
      source: {
        kind: "neon",
        label: "Live database",
        notice: null,
      },
    };
  } catch (error) {
    if (
      configuration.mode !== "neon-with-demo-fallback" ||
      !isTransientNeonError(error)
    ) {
      throw error;
    }

    return {
      ...(await loadDemo()),
      asOf: requestedAt,
      source: {
        kind: "demo-fallback",
        label: "Fictional sample organization — live data unavailable",
        notice:
          "Live data is temporarily unavailable. Lotura is showing the fictional sample organization instead.",
      },
    };
  }
}
