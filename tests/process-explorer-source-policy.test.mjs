import assert from "node:assert/strict";
import test from "node:test";

import {
  isTransientNeonError,
  loadOperatingModelFromPolicy,
  OperatingModelConfigurationError,
  resolveOperatingModelConfiguration,
} from "../lib/process-explorer-source-policy.mjs";

const DATABASE_URL =
  "postgresql://runtime:fictional@ep-example-pooler.example.test/lotura";

test("development defaults to demo without database configuration", () => {
  assert.deepEqual(
    resolveOperatingModelConfiguration({ NODE_ENV: "development" }),
    {
      deploymentEnvironment: "development",
      mode: "demo",
      organizationId: null,
    },
  );
});

test("preview permits explicitly configured fallback without production opt-in", () => {
  assert.deepEqual(
    resolveOperatingModelConfiguration({
      DATABASE_URL,
      LOTURA_EXPLORER_MODE: "neon-with-demo-fallback",
      LOTURA_ORGANIZATION_ID: "17",
      VERCEL_ENV: "preview",
    }),
    {
      deploymentEnvironment: "preview",
      mode: "neon-with-demo-fallback",
      organizationId: 17,
    },
  );
});

test("production rejects fallback unless the separate opt-in is exactly true", () => {
  assert.throws(
    () =>
      resolveOperatingModelConfiguration({
        DATABASE_URL,
        LOTURA_EXPLORER_MODE: "neon-with-demo-fallback",
        LOTURA_ORGANIZATION_ID: "17",
        VERCEL_ENV: "production",
      }),
    OperatingModelConfigurationError,
  );

  const approved = resolveOperatingModelConfiguration({
    DATABASE_URL,
    LOTURA_ALLOW_DEMO_FALLBACK: "true",
    LOTURA_EXPLORER_MODE: "neon-with-demo-fallback",
    LOTURA_ORGANIZATION_ID: "17",
    VERCEL_ENV: "production",
  });
  assert.equal(approved.mode, "neon-with-demo-fallback");
});

test("Neon modes require the runtime URL and never substitute the migration URL", () => {
  assert.throws(
    () =>
      resolveOperatingModelConfiguration({
        DATABASE_URL_UNPOOLED:
          "postgresql://owner:fictional@ep-example.example.test/lotura",
        LOTURA_EXPLORER_MODE: "neon",
        LOTURA_ORGANIZATION_ID: "17",
        VERCEL_ENV: "preview",
      }),
    /DATABASE_URL is required.*never replaced by DATABASE_URL_UNPOOLED/,
  );
});

test("organization identifiers must be positive safe integers", () => {
  for (const organizationId of ["", "0", "-1", "2.5", "not-an-id"]) {
    assert.throws(
      () =>
        resolveOperatingModelConfiguration({
          DATABASE_URL,
          LOTURA_EXPLORER_MODE: "neon",
          LOTURA_ORGANIZATION_ID: organizationId,
          VERCEL_ENV: "preview",
        }),
      OperatingModelConfigurationError,
    );
  }
});

test("demo mode uses one injected request timestamp and never calls Neon", async () => {
  let neonCalls = 0;
  let clockCalls = 0;
  const seed = { organization: { name: "Fictional" } };
  const loaded = await loadOperatingModelFromPolicy(
    { deploymentEnvironment: "development", mode: "demo", organizationId: null },
    {
      loadDemo: async () => ({ seed }),
      loadNeon: async () => {
        neonCalls += 1;
        throw new Error("unexpected");
      },
      now: () => {
        clockCalls += 1;
        return new Date("2026-08-07T12:00:00.000Z");
      },
    },
  );

  assert.equal(neonCalls, 0);
  assert.equal(clockCalls, 1);
  assert.equal(loaded.asOf, "2026-08-07T12:00:00.000Z");
  assert.equal(loaded.source.kind, "demo");
  assert.equal(loaded.seed, seed);
});

test("live mode preserves the Neon transaction timestamp", async () => {
  const loaded = await loadOperatingModelFromPolicy(
    { deploymentEnvironment: "preview", mode: "neon", organizationId: 17 },
    {
      loadDemo: async () => {
        throw new Error("unexpected");
      },
      loadNeon: async (organizationId) => ({
        seed: { organization: { name: `Organization ${organizationId}` } },
        asOf: "2026-08-07T12:01:02.345Z",
      }),
    },
  );

  assert.equal(loaded.asOf, "2026-08-07T12:01:02.345Z");
  assert.equal(loaded.source.kind, "neon");
});

test("fallback is limited to recognized transient Neon failures", async () => {
  const configuration = {
    deploymentEnvironment: "preview",
    mode: "neon-with-demo-fallback",
    organizationId: 17,
  };
  const dependencies = {
    loadDemo: async () => ({ seed: { organization: { name: "Demo" } } }),
    loadNeon: async () => {
      throw new TypeError("fetch failed");
    },
    now: () => new Date("2026-08-07T12:00:00.000Z"),
  };

  const loaded = await loadOperatingModelFromPolicy(
    configuration,
    dependencies,
  );
  assert.equal(loaded.source.kind, "demo-fallback");
  assert.match(loaded.source.notice, /fictional demo workspace/);

  await assert.rejects(
    loadOperatingModelFromPolicy(configuration, {
      ...dependencies,
      loadNeon: async () => {
        throw new Error("The configured organization was not found in Neon.");
      },
    }),
    /organization was not found/,
  );
});

test("transient Neon error recognition covers network, timeout, and SQL connection failures", () => {
  assert.equal(isTransientNeonError({ code: "ETIMEDOUT" }), true);
  assert.equal(isTransientNeonError({ code: "08006" }), true);
  assert.equal(isTransientNeonError({ name: "AbortError" }), true);
  assert.equal(
    isTransientNeonError({ cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }),
    true,
  );
  assert.equal(isTransientNeonError(new Error("invalid model data")), false);
});
