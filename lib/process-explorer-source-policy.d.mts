import type { ProcessExplorerSeed } from "./process-explorer-data";

export type ExplorerSourceMode =
  | "neon"
  | "demo"
  | "neon-with-demo-fallback";
export type DeploymentEnvironment = "development" | "preview" | "production";

export type OperatingModelConfiguration = {
  deploymentEnvironment: DeploymentEnvironment;
  mode: ExplorerSourceMode;
  organizationId: number | null;
};

export type OperatingModelSource = {
  kind: "neon" | "demo" | "demo-fallback";
  label: string;
  notice: string | null;
};

export type LoadedOperatingModel = {
  seed: ProcessExplorerSeed;
  asOf: string;
  source: OperatingModelSource;
};

export class OperatingModelConfigurationError extends Error {}

export function resolveDeploymentEnvironment(input: {
  vercelEnvironment?: string;
  runtimeEnvironment?: string;
  nodeEnvironment?: string;
}): DeploymentEnvironment;

export function resolveOperatingModelConfiguration(
  environment: Record<string, string | undefined>,
): OperatingModelConfiguration;

export function isTransientNeonError(error: unknown): boolean;

export function loadOperatingModelFromPolicy(
  configuration: OperatingModelConfiguration,
  dependencies: {
    loadDemo: () => Promise<{ seed: ProcessExplorerSeed }>;
    loadNeon: (
      organizationId: number,
    ) => Promise<{ seed: ProcessExplorerSeed; asOf: string }>;
    now?: () => Date | string | number;
  },
): Promise<LoadedOperatingModel>;
