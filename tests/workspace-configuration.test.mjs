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

test("workspace appearance resolves only the Organization name and Lotura defaults", () => {
  const configuration = resolveWorkspaceConfiguration({
    organizationName: "  Northstar Service Collective  ",
  });

  assert.equal(configuration.appearance.displayName, "Northstar Service Collective");
  assert.deepEqual(configuration.appearance.logo, {
    kind: "monogram",
    text: "NS",
    accessibleLabel: "Northstar Service Collective monogram",
  });
  assert.deepEqual(configuration.appearance.accent, LOTURA_DEFAULT_ACCENT);
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

test("workspace configuration has no persistent or environment-driven source", async () => {
  const source = await readFile(
    new URL("../lib/workspace-configuration.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /process\.env|DATABASE_URL|drizzle|from ["'][^"']*db|fetch\(|customer/i,
  );
  assert.match(source, /resolveWorkspaceConfiguration\(\{ organizationName \}\)/);
});
