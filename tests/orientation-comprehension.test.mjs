import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Home, Explorer, and FLOW are distinct orientation routes", async () => {
  await Promise.all([
    access(new URL("app/page.tsx", root)),
    access(new URL("app/explorer/page.tsx", root)),
    access(new URL("app/flow/page.tsx", root)),
  ]);

  const shell = await read("app/workspace-shell.tsx");
  assert.match(shell, /href: "\/".*label: "Home"/s);
  assert.match(shell, /href: "\/explorer".*label: "Explorer"/s);
  assert.match(shell, /href: "\/flow".*label: "FLOW Analysis"/s);
});

test("Home answers what Lotura is, what is shown, and what to do next", async () => {
  const home = await read("app/home-orientation.tsx");

  for (const copy of [
    "Understand how your organization works.",
    "Organization workspace",
    "Operating-model snapshot",
    "Explore only — nothing you do here changes data.",
    "Explore a process",
    "Review FLOW findings",
    "See how Lotura works",
    "Lotura models the organization through connected records.",
  ]) {
    assert.match(home, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Explorer uses the canonical ownership, responsibility, exception, and dependency language", async () => {
  const explorer = await read("app/process-explorer.tsx");

  for (const copy of [
    "Owner role:",
    "Responsible role:",
    "Documented process",
    "Process dependencies",
    "Processes this work relies on.",
    "Processes that receive or follow this work.",
    "Tap a process to view its details below.",
    "View connected process",
  ]) {
    assert.match(explorer, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(explorer, />Connections</);
  assert.doesNotMatch(explorer, /Read-only definition/);
});

test("FLOW frames analysis as review and preserves distinct evidence language", async () => {
  const [page, flow, css] = await Promise.all([
    read("app/flow/page.tsx"),
    read("app/flow-analysis.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(page, /Evidence-based review/);
  assert.match(page, /Items to review/);
  assert.match(flow, /Explore a what-if/);
  assert.match(flow, /does not change or approve anything/);
  assert.match(flow, /Documented reach/);
  assert.match(flow, /does not measure workload, performance, importance, or risk/);
  assert.match(flow, /open=\{defaultExplanationOpen\}/);

  for (const evidence of [
    "Direct impact",
    "Potential indirect impact",
    "Review recommended",
  ]) {
    assert.match(flow, new RegExp(evidence));
  }

  for (const token of [
    "--evidence-direct",
    "--evidence-indirect",
    "--evidence-review",
  ]) {
    assert.match(css, new RegExp(`${token}:`));
  }
});

test("canonical vocabulary records preferred terms and discouraged alternatives", async () => {
  const language = await read("LANGUAGE.md");

  assert.match(language, /\| Preferred term \| Concise definition \| Example \| Discouraged or confusing alternatives \|/);
  assert.match(language, /deterministic analysis in primary UI/);
  assert.match(language, /direct impact[\s\S]*potential indirect impact[\s\S]*review recommended/i);
  assert.match(language, /exact plural \*\*processes\*\*/i);
  assert.match(language, /never “processs\.”/i);
});
