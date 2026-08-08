import "server-only";

import { timingSafeEqual } from "node:crypto";

import { verify } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  resolveAuthenticationConfiguration,
  type AuthenticationConfiguration,
  type TemporaryPasswordAuthenticationConfiguration,
} from "./authentication-policy.mjs";
import {
  createSignedSession,
  SESSION_COOKIE_NAME,
  verifySignedSession,
} from "./authentication-session.mjs";
import {
  resolveOperatingModelConfiguration,
  type OperatingModelConfiguration,
} from "./process-explorer-source-policy.mjs";

export type RuntimeAccessConfiguration = {
  authentication: AuthenticationConfiguration;
  operatingModel: OperatingModelConfiguration;
};

export function resolveRuntimeAccessConfiguration(
  environment: Record<string, string | undefined> = process.env,
): RuntimeAccessConfiguration {
  const operatingModel = resolveOperatingModelConfiguration(environment);
  return {
    authentication: resolveAuthenticationConfiguration(
      environment,
      operatingModel,
    ),
    operatingModel,
  };
}

async function validTemporarySession(
  configuration: TemporaryPasswordAuthenticationConfiguration,
) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifySignedSession(token, {
    maximumDurationSeconds: configuration.sessionDurationSeconds,
    secret: configuration.sessionSecret,
  });
}

export async function requireWorkspaceAccess() {
  const configuration = resolveRuntimeAccessConfiguration();
  if (configuration.authentication.mode === "public") return configuration;

  const session = await validTemporarySession(configuration.authentication);
  if (!session) redirect("/login");
  return configuration;
}

export async function workspaceAccessContext() {
  const { authentication } = resolveRuntimeAccessConfiguration();
  if (authentication.mode === "public") {
    return { authenticated: true, mode: "public" as const };
  }

  return {
    authenticated: Boolean(await validTemporarySession(authentication)),
    mode: "temporary-password" as const,
  };
}

function sameText(left: string, right: string) {
  const leftBytes = Buffer.from(left.normalize("NFKC"));
  const rightBytes = Buffer.from(right.normalize("NFKC"));
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export async function verifyTemporaryCredentials(
  configuration: TemporaryPasswordAuthenticationConfiguration,
  identifier: unknown,
  password: unknown,
) {
  const candidateIdentifier = typeof identifier === "string" ? identifier.trim() : "";
  const candidatePassword = typeof password === "string" ? password : "";
  if (
    candidateIdentifier.length > 128 ||
    candidatePassword.length < 1 ||
    candidatePassword.length > 1024
  ) {
    return false;
  }

  let passwordMatches = false;
  try {
    passwordMatches = await verify(configuration.passwordHash, candidatePassword);
  } catch {
    return false;
  }

  return passwordMatches && sameText(candidateIdentifier, configuration.adminIdentifier);
}

export async function createTemporarySessionToken(
  configuration: TemporaryPasswordAuthenticationConfiguration,
) {
  return createSignedSession({
    durationSeconds: configuration.sessionDurationSeconds,
    secret: configuration.sessionSecret,
  });
}

export { SESSION_COOKIE_NAME };
