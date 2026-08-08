import type {
  OperatingModelConfiguration,
} from "./process-explorer-source-policy.mjs";

export type PublicAuthenticationConfiguration = {
  mode: "public";
};

export type TemporaryPasswordAuthenticationConfiguration = {
  mode: "temporary-password";
  adminIdentifier: string;
  passwordHash: string;
  sessionDurationSeconds: number;
  sessionSecret: string;
};

export type AuthenticationConfiguration =
  | PublicAuthenticationConfiguration
  | TemporaryPasswordAuthenticationConfiguration;

export class AuthenticationConfigurationError extends Error {}

export function resolveAuthenticationConfiguration(
  environment: Record<string, string | undefined>,
  operatingModelConfiguration: OperatingModelConfiguration,
): AuthenticationConfiguration;

export function safeReturnPath(value: unknown): string;

export const SESSION_DURATION_SECONDS: number;
