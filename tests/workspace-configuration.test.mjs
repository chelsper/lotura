import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  LOTURA_DEFAULT_ACCENT,
  accessibleForeground,
  contrastRatio,
  hasAccessibleContrast,
  resolveWorkspaceConfiguration,
} from "../lib/workspace-configuration.mjs";
import {
  resolveWorkspaceConfigurationOverrides,
  WorkspaceConfigurationError,
} from "../lib/workspace-configuration-policy.mjs";

test("workspace appearance resolves only the Organization name and Lotura defaults", () => {
  const configuration = resolveWorkspaceConfiguration({
    organizationName: "  Northstar Service Collective  ",
  });

  assert.equal(configuration.appearance.displayName, "Northstar Service Collective");
  assert.equal(configuration.appearance.scopeLabel, null);
  assert.deepEqual(configuration.appearance.logo, {
    kind: "monogram",
    text: "NS",
    accessibleLabel: "Northstar Service Collective monogram",
  });
  assert.deepEqual(configuration.appearance.accent, LOTURA_DEFAULT_ACCENT);
  assert.equal(configuration.knowledgeState, null);
});

test("workspace appearance uses the Lotura mark when no monogram can be derived", () => {
  const configuration = resolveWorkspaceConfiguration({
    organizationName: "---",
  });

  assert.deepEqual(configuration.appearance.logo, {
    kind: "lotura-mark",
    text: "L",
    accessibleLabel: "Lotura mark",
  });
});

test("contrast utilities validate accessible workspace presentation", () => {
  assert.equal(hasAccessibleContrast("#ffffff", "#286653"), true);
  assert.equal(hasAccessibleContrast("#777777", "#ffffff"), false);
  assert.equal(accessibleForeground("#ffffff"), "#1c1f1d");
  assert.equal(accessibleForeground("#1c1f1d"), "#ffffff");
  assert.ok(contrastRatio("#ffffff", "#000000") > 20);
});

test("workspace resolver remains pure with no persistent or direct environment source", async () => {
  const source = await readFile(
    new URL("../lib/workspace-configuration.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /process\.env|DATABASE_URL|drizzle|from ["'][^"']*db|fetch\(|customer/i,
  );
  assert.match(source, /resolveWorkspaceConfiguration\(\{[\s\S]*organizationName,[\s\S]*overrides = \{\}/);
});

test("workspace appearance accepts constrained generic overrides", () => {
  const overrides = resolveWorkspaceConfigurationOverrides({
    LOTURA_WORKSPACE_ACCENT: "#123456",
    LOTURA_WORKSPACE_DISPLAY_NAME: "Fictional Private Workspace",
    LOTURA_WORKSPACE_KNOWLEDGE_STATE: "sanitized-working-draft",
    LOTURA_WORKSPACE_LOGO_MONOGRAM: "FP",
    LOTURA_WORKSPACE_SCOPE_LABEL: "Fictional exercise",
  });
  const configuration = resolveWorkspaceConfiguration({
    organizationName: "Stored Fictional Organization",
    overrides,
  });

  assert.equal(configuration.appearance.displayName, "Fictional Private Workspace");
  assert.equal(configuration.appearance.scopeLabel, "Fictional exercise");
  assert.equal(configuration.appearance.logo.kind, "monogram");
  assert.equal(configuration.appearance.logo.text, "FP");
  assert.equal(configuration.appearance.accent.base, "#123456");
  assert.equal(
    hasAccessibleContrast(
      configuration.appearance.accent.foreground,
      configuration.appearance.accent.base,
    ),
    true,
  );
  assert.equal(configuration.knowledgeState.label, "Working draft");
  assert.match(configuration.knowledgeState.description, /check it for sensitive information/);
});

test("workspace environment policy rejects unsafe or ambiguous presentation values", () => {
  assert.throws(
    () =>
      resolveWorkspaceConfigurationOverrides({
        LOTURA_WORKSPACE_LOGO_URL: "http://example.test/logo.svg",
      }),
    WorkspaceConfigurationError,
  );
  assert.throws(
    () =>
      resolveWorkspaceConfigurationOverrides({
        LOTURA_WORKSPACE_KNOWLEDGE_STATE: "official",
      }),
    WorkspaceConfigurationError,
  );
  assert.throws(
    () =>
      resolveWorkspaceConfigurationOverrides({
        LOTURA_WORKSPACE_LOGO_MONOGRAM: "A B",
      }),
    WorkspaceConfigurationError,
  );
});
