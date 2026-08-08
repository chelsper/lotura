import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthenticationConfigurationError,
  resolveAuthenticationConfiguration,
  safeReturnPath,
  SESSION_DURATION_SECONDS,
} from "../lib/authentication-policy.mjs";

const demoProduction = {
  deploymentEnvironment: "production",
  mode: "demo",
  organizationId: null,
};
const neonProduction = {
  deploymentEnvironment: "production",
  mode: "neon",
  organizationId: 17,
};
const fictionalTemporaryEnvironment = {
  LOTURA_AUTH_MODE: "temporary-password",
  LOTURA_SESSION_SECRET: "A".repeat(43),
  LOTURA_TEMPORARY_ADMIN_IDENTIFIER: "fictional-admin",
  LOTURA_TEMPORARY_ADMIN_PASSWORD_HASH:
    "$argon2id$v=19$m=19456,t=2,p=1$ZmljdGlvbmFs$ZmljdGlvbmFsLWhhc2g",
};

test("Production demo remains public when authentication is omitted", () => {
  assert.deepEqual(
    resolveAuthenticationConfiguration({}, demoProduction),
    { mode: "public" },
  );
});

test("deployed Neon workspaces reject missing or public authentication", () => {
  assert.throws(
    () => resolveAuthenticationConfiguration({}, neonProduction),
    AuthenticationConfigurationError,
  );
  assert.throws(
    () =>
      resolveAuthenticationConfiguration(
        { LOTURA_AUTH_MODE: "public" },
        neonProduction,
      ),
    /cannot use public authentication mode/,
  );
});

test("temporary-password mode requires complete server configuration", () => {
  const configuration = resolveAuthenticationConfiguration(
    fictionalTemporaryEnvironment,
    neonProduction,
  );
  assert.equal(configuration.mode, "temporary-password");
  assert.equal(configuration.adminIdentifier, "fictional-admin");
  assert.equal(configuration.sessionDurationSeconds, SESSION_DURATION_SECONDS);

  for (const key of [
    "LOTURA_SESSION_SECRET",
    "LOTURA_TEMPORARY_ADMIN_IDENTIFIER",
    "LOTURA_TEMPORARY_ADMIN_PASSWORD_HASH",
  ]) {
    const incomplete = { ...fictionalTemporaryEnvironment };
    delete incomplete[key];
    assert.throws(
      () => resolveAuthenticationConfiguration(incomplete, neonProduction),
      AuthenticationConfigurationError,
    );
  }
});

test("temporary-password policy rejects non-Argon2id hashes and weak session secrets", () => {
  assert.throws(
    () =>
      resolveAuthenticationConfiguration(
        {
          ...fictionalTemporaryEnvironment,
          LOTURA_TEMPORARY_ADMIN_PASSWORD_HASH: "fictional-plaintext",
        },
        neonProduction,
      ),
    /Argon2id/,
  );
  assert.throws(
    () =>
      resolveAuthenticationConfiguration(
        {
          ...fictionalTemporaryEnvironment,
          LOTURA_SESSION_SECRET: "too-short",
        },
        neonProduction,
      ),
    /at least 32 bytes/,
  );
});

test("return paths remain local and cannot target auth routes", () => {
  assert.equal(safeReturnPath("/explorer?process=one"), "/explorer?process=one");
  assert.equal(safeReturnPath("https://example.test/steal"), "/");
  assert.equal(safeReturnPath("//example.test/steal"), "/");
  assert.equal(safeReturnPath("/login?loop=true"), "/");
  assert.equal(safeReturnPath("/auth/logout"), "/");
});
