import assert from "node:assert/strict";
import test from "node:test";

import { loadOrganizationStructureFromPolicy } from "../lib/organization-structure-source-policy.mjs";

const payload = {
  operatingModel: { organization: { name: "Fictional Group" } },
  structure: { organization: { name: "Fictional Group" } },
};

test("demo mode uses the fictional structure and never calls Neon", async () => {
  let neonCalls = 0;
  const loaded = await loadOrganizationStructureFromPolicy(
    { deploymentEnvironment: "production", mode: "demo", organizationId: null },
    {
      loadDemo: async () => payload,
      loadNeon: async () => {
        neonCalls += 1;
        throw new Error("unexpected Neon call");
      },
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    },
  );

  assert.equal(neonCalls, 0);
  assert.equal(loaded.source.kind, "demo");
  assert.equal(loaded.asOf, "2026-08-09T12:00:00.000Z");
});

test("Neon mode keeps the configured organization ID and database timestamp", async () => {
  let requestedOrganizationId = null;
  const loaded = await loadOrganizationStructureFromPolicy(
    { deploymentEnvironment: "development", mode: "neon", organizationId: 42 },
    {
      loadDemo: async () => payload,
      loadNeon: async (organizationId) => {
        requestedOrganizationId = organizationId;
        return { ...payload, asOf: "2026-08-09T13:00:00.000Z" };
      },
    },
  );

  assert.equal(requestedOrganizationId, 42);
  assert.equal(loaded.source.kind, "neon");
  assert.equal(loaded.asOf, "2026-08-09T13:00:00.000Z");
});

test("fallback is limited to transient Neon failures and remains explicit", async () => {
  const transient = Object.assign(new Error("network error"), {
    code: "ETIMEDOUT",
  });
  const loaded = await loadOrganizationStructureFromPolicy(
    {
      deploymentEnvironment: "preview",
      mode: "neon-with-demo-fallback",
      organizationId: 8,
    },
    {
      loadDemo: async () => payload,
      loadNeon: async () => {
        throw transient;
      },
      now: () => new Date("2026-08-09T14:00:00.000Z"),
    },
  );

  assert.equal(loaded.source.kind, "demo-fallback");
  assert.match(loaded.source.label, /Fictional sample organization/);
  assert.match(loaded.source.notice, /fictional sample organization instead/);

  await assert.rejects(
    loadOrganizationStructureFromPolicy(
      { deploymentEnvironment: "development", mode: "neon", organizationId: 8 },
      {
        loadDemo: async () => payload,
        loadNeon: async () => {
          throw transient;
        },
      },
    ),
    /network error/,
  );
});
