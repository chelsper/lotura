import type {
  WorkspaceConfigurationOverrides,
} from "./workspace-configuration.mjs";

export class WorkspaceConfigurationError extends Error {}

export function resolveWorkspaceConfigurationOverrides(
  environment: Record<string, string | undefined>,
): WorkspaceConfigurationOverrides;
