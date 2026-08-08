import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Overview, Explorer, Process Detail, and FLOW are distinct story routes", async () => {
  await Promise.all([
    access(new URL("app/page.tsx", root)),
    access(new URL("app/overview/page.tsx", root)),
    access(new URL("app/explorer/page.tsx", root)),
    access(new URL("app/explorer/[processId]/page.tsx", root)),
    access(new URL("app/flow/page.tsx", root)),
  ]);

  const shell = await read("app/workspace-shell.tsx");
  assert.match(shell, /href: "\/overview".*label: "Overview"/s);
  assert.match(shell, /href: "\/explorer".*label: "Explorer"/s);
  assert.match(shell, /href: "\/flow".*label: "FLOW"/s);
  assert.doesNotMatch(shell, /label: "Home"/);
  assert.doesNotMatch(shell, /label: "Operating Model"/);
});

test("Home answers what Lotura is, what is shown, and what to do next", async () => {
  const home = await read("app/home-orientation.tsx");

  for (const copy of [
    "See how your organization really works.",
    "Lotura connects work, ownership, people, systems, exceptions, and",
    "Organization workspace",
    "Data current as of",
    "Explore only — nothing you do here changes data.",
    "See {configuration.appearance.displayName}’s organization",
    "This sample follows a service request from intake through",
    "See how Lotura works",
  ]) {
    assert.match(home, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Explorer browses while Process Detail explains accountability and context", async () => {
  const [explorer, detail] = await Promise.all([
    read("app/process-explorer.tsx"),
    read("app/process-detail.tsx"),
  ]);

  for (const copy of [
    "Owner Role:",
    "Local process dependencies",
    "Tap a process to preview its dependencies below, then choose View process.",
    "View process",
  ]) {
    assert.match(explorer, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const copy of [
    "Purpose",
    "Owner Role",
    "Current assignment",
    "Responsibilities remain. People change.",
    "Systems used",
    "Exceptions",
    "Process dependencies",
    "Responsible Role:",
  ]) {
    assert.match(detail, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(explorer, /href=\{processHref\(process\.id\)\}/);
  assert.match(detail, /href=\{processHref\(dependency\.processId\)\}/);
});

test("FLOW frames analysis as review and preserves distinct evidence language", async () => {
  const [page, flow, css] = await Promise.all([
    read("app/flow/page.tsx"),
    read("app/flow-analysis.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(page, /Evidence-based review/);
  assert.match(flow, /Explore a what-if/);
  assert.match(flow, /Exploring this scenario changes and approves nothing\./);
  assert.match(flow, /Documented reach/);
  assert.match(flow, /does not measure workload, performance, importance, or risk/);
  assert.match(flow, /open=\{defaultExplanationOpen\}/);
  assert.ok(
    flow.indexOf('title="Items to review"') <
      flow.indexOf('title="Explore a what-if"'),
  );
  assert.ok(
    flow.indexOf('title="Explore a what-if"') <
      flow.indexOf('title="Concentrations"'),
  );

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
