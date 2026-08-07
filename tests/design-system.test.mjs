import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Design System v1 defines the required neutral and semantic tokens", async () => {
  const css = await read("app/globals.css");
  const requiredTokens = [
    "--canvas",
    "--surface",
    "--surface-subtle",
    "--border",
    "--text",
    "--text-secondary",
    "--accent",
    "--workspace-accent",
    "--workspace-focus-ring",
    "--success",
    "--warning",
    "--error",
    "--info",
  ];

  for (const token of requiredTokens) {
    assert.match(css, new RegExp(`${token}:`));
  }

  assert.doesNotMatch(css, /(?:linear|radial|conic)-gradient/i);
});

test("the shared primitive layer exposes the v1 component language", async () => {
  const primitives = await read("app/ui/primitives.tsx");
  const requiredComponents = [
    "Button",
    "Input",
    "Select",
    "SearchField",
    "Badge",
    "Chip",
    "Alert",
    "Card",
    "SidePanel",
    "Dialog",
    "ExpandableSection",
    "Table",
    "EmptyState",
  ];

  for (const component of requiredComponents) {
    assert.match(
      primitives,
      new RegExp(`export function ${component}\\b`),
      `${component} should be exported from the shared primitive layer`,
    );
  }
});

test("Explorer and FLOW both compose the shared design system", async () => {
  const [explorer, flow] = await Promise.all([
    read("app/process-explorer.tsx"),
    read("app/flow-analysis.tsx"),
  ]);

  assert.match(explorer, /from "\.\/ui\/primitives"/);
  assert.match(flow, /from "\.\/ui\/primitives"/);
  assert.match(explorer, /ExpandableSection/);
  assert.match(flow, /Table/);
});

test("workspace branding cannot override semantic or evidence colors", async () => {
  const css = await read("app/globals.css");

  for (const token of [
    "--workspace-accent",
    "--success",
    "--warning",
    "--error",
    "--evidence-direct",
    "--evidence-indirect",
    "--evidence-review",
  ]) {
    assert.match(css, new RegExp(`${token}:`));
  }

  assert.doesNotMatch(css, /--success:\s*var\(--workspace-accent/);
  assert.doesNotMatch(css, /--evidence-review:\s*var\(--workspace-accent/);
});

test("FLOW preserves the approved evidence language", async () => {
  const flow = await read("app/flow-analysis.tsx");

  assert.match(flow, /"Direct impact"/);
  assert.match(flow, /"Potential indirect impact"/);
  assert.match(flow, /"Review recommended"/);
  assert.match(flow, /does not prove operational\s+failure/);
});

test("the design specification preserves the Version 1 implementation boundary", async () => {
  const designSystem = await read("DESIGN_SYSTEM.md");

  assert.match(designSystem, /White space is a feature/);
  assert.match(designSystem, /FLOW must not resemble a BI dashboard/);
  assert.match(
    designSystem,
    /does not add or change routes, database access, operating-model data, schema, migrations, analysis rules/,
  );
});
