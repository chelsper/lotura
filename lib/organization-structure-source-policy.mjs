import { isTransientNeonError } from "./process-explorer-source-policy.mjs";

function requestTimestamp(now) {
  const value = now();
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error("The Organization Structure request clock returned an invalid time.");
  }
  return parsed.toISOString();
}

export async function loadOrganizationStructureFromPolicy(
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
    return {
      ...(await loadNeon(configuration.organizationId)),
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
