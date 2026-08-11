import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveAuthenticationConfiguration } from "../lib/authentication-policy.mjs";
import {
  loadOperatingModelFromPolicy,
  resolveOperatingModelConfiguration,
} from "../lib/process-explorer-source-policy.mjs";
import {
  LOTURA_DEFAULT_ACCENT,
  resolveWorkspaceConfiguration,
} from "../lib/workspace-configuration.mjs";
import { resolveWorkspaceConfigurationOverrides } from "../lib/workspace-configuration-policy.mjs";
import { resolveOperatingModelAuthoringConfiguration } from "../lib/operating-model-authoring-policy.mjs";

test("Production fixture mode remains public and never calls Neon", async () => {
  const source = resolveOperatingModelConfiguration({
    LOTURA_EXPLORER_MODE: "demo",
    VERCEL_ENV: "production",
  });
  const authentication = resolveAuthenticationConfiguration({}, source);
  let neonCalls = 0;
  const loaded = await loadOperatingModelFromPolicy(source, {
    loadDemo: async () => ({
      seed: { organization: { name: "Northstar Service Collective" } },
    }),
    loadNeon: async () => {
      neonCalls += 1;
      throw new Error("unexpected Neon call");
    },
    now: () => new Date("2026-08-07T16:00:00.000Z"),
  });

  assert.deepEqual(authentication, { mode: "public" });
  assert.equal(neonCalls, 0);
  assert.equal(loaded.source.kind, "demo");
  assert.equal(loaded.source.label, "Fictional sample organization");
  assert.deepEqual(
    resolveOperatingModelAuthoringConfiguration(
      {},
      { authentication, operatingModel: source },
    ),
    { enabled: false },
  );
});

test("absent workspace overrides preserve the Northstar public presentation", () => {
  const configuration = resolveWorkspaceConfiguration({
    organizationName: "Northstar Service Collective",
    overrides: resolveWorkspaceConfigurationOverrides({}),
  });
  assert.equal(configuration.appearance.displayName, "Northstar Service Collective");
  assert.deepEqual(configuration.appearance.logo, {
    kind: "monogram",
    text: "NS",
    accessibleLabel: "Northstar Service Collective monogram",
  });
  assert.deepEqual(configuration.appearance.accent, LOTURA_DEFAULT_ACCENT);
  assert.equal(configuration.appearance.scopeLabel, null);
  assert.equal(configuration.knowledgeState, null);
});

test("the repository fixture remains fictional and unchanged as the demo source", async () => {
  const seed = JSON.parse(
    await readFile(
      new URL("../db/seeds/process-explorer.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(seed.organization.name, "Northstar Service Collective");
  assert.equal(seed.processes.length, 6);
  assert.ok(seed.users.every((user) => user.email.endsWith("@example.test")));
});

test("the separate structure fixture is fictional and leaves the operating fixture intact", async () => {
  const [structure, operating] = await Promise.all(
    ["organization-structure.json", "process-explorer.json"].map(async (name) =>
      JSON.parse(
        await readFile(new URL(`../db/seeds/${name}`, import.meta.url), "utf8"),
      ),
    ),
  );

  assert.equal(structure.organization.name, "Northstar Service Collective");
  assert.equal(operating.processes.length, 6);
  assert.ok(structure.people.length > 0);
  assert.doesNotMatch(JSON.stringify(structure), /Jacksonville|University|JU Pilot/i);
});
