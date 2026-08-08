import { KNOWLEDGE_STATES } from "./workspace-configuration.mjs";

export class WorkspaceConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkspaceConfigurationError";
  }
}

function optionalText(environment, name, maximumLength) {
  const value = environment[name];
  if (value === undefined || value === "") return undefined;
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new WorkspaceConfigurationError(`${name} is invalid.`);
  }
  return value.trim();
}

function logoUrl(environment) {
  const value = optionalText(environment, "LOTURA_WORKSPACE_LOGO_URL", 2048);
  if (!value) return undefined;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error("unsafe");
    }
    return parsed.toString();
  } catch {
    throw new WorkspaceConfigurationError(
      "LOTURA_WORKSPACE_LOGO_URL must be an HTTPS URL without embedded credentials.",
    );
  }
}

function knowledgeState(environment) {
  const value = optionalText(
    environment,
    "LOTURA_WORKSPACE_KNOWLEDGE_STATE",
    64,
  );
  if (!value) return undefined;
  if (!Object.hasOwn(KNOWLEDGE_STATES, value)) {
    throw new WorkspaceConfigurationError(
      "LOTURA_WORKSPACE_KNOWLEDGE_STATE must be sanitized-working-draft, validated, or approved-for-pilot.",
    );
  }
  return value;
}

export function resolveWorkspaceConfigurationOverrides(environment) {
  const logoMonogram = optionalText(
    environment,
    "LOTURA_WORKSPACE_LOGO_MONOGRAM",
    4,
  );
  if (logoMonogram && !/^[\p{L}\p{N}]{1,4}$/u.test(logoMonogram)) {
    throw new WorkspaceConfigurationError(
      "LOTURA_WORKSPACE_LOGO_MONOGRAM must contain one to four letters or numbers.",
    );
  }

  const accent = optionalText(environment, "LOTURA_WORKSPACE_ACCENT", 7);
  if (accent && !/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/iu.test(accent)) {
    throw new WorkspaceConfigurationError(
      "LOTURA_WORKSPACE_ACCENT must use three- or six-digit hexadecimal notation.",
    );
  }

  return {
    accent,
    displayName: optionalText(
      environment,
      "LOTURA_WORKSPACE_DISPLAY_NAME",
      120,
    ),
    knowledgeState: knowledgeState(environment),
    logoMonogram: logoMonogram?.toLocaleUpperCase(),
    logoUrl: logoUrl(environment),
    scopeLabel: optionalText(
      environment,
      "LOTURA_WORKSPACE_SCOPE_LABEL",
      160,
    ),
  };
}
