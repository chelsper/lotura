import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Workspace Studio exposes Process Builder through the existing authoring boundary", async () => {
  const [studio, list, detail] = await Promise.all([
    read("app/studio/page.tsx"),
    read("app/studio/processes/page.tsx"),
    read("app/studio/processes/[processId]/page.tsx"),
  ]);
  assert.match(studio, /href: "\/studio\/processes"/);
  assert.match(list, /loadWorkspaceExperience/);
  assert.match(list, /if \(!experience\.authoring\.enabled\) notFound\(\)/);
  assert.match(detail, /if \(!authoring\.enabled\) notFound\(\)/);
  assert.match(detail, /loadProcessAuthoringContext/);
  assert.match(detail, /surface="studio"/);
});

test("Process Builder is a maintenance inventory rather than a second Explorer", async () => {
  const [list, browser] = await Promise.all([
    read("app/studio/processes/page.tsx"),
    read("app/studio/processes/process-builder-browser.tsx"),
  ]);
  assert.match(list, /title="Process Builder"/);
  assert.match(list, /Canonical existence does not establish institutional approval/);
  assert.match(list, /ordered Steps, explicit or inherited Step responsibility/);
  assert.match(list, /documented Systems, and legitimate alternate-path Exceptions/);
  assert.match(list, /Dependencies remain read-only/);
  assert.match(browser, /Search by Process, purpose, or Owner Role/);
  assert.match(browser, /Owner needs validation/);
  assert.match(browser, /href={`\/studio\/processes\/\$\{encodeURIComponent\(process\.id\)\}`}/);
  assert.doesNotMatch(browser, /FLOW|what-if|dependency graph/i);
});

test("Process Detail now enters Studio while the legacy maintain route stays available", async () => {
  const [detail, legacy, workspace] = await Promise.all([
    read("app/process-detail.tsx"),
    read("app/explorer/[processId]/maintain/page.tsx"),
    read("app/process-authoring/process-authoring-workspace.tsx"),
  ]);
  assert.match(detail, /href={`\/studio\/processes\/\$\{encodeURIComponent\(process\.id\)\}`}/);
  assert.match(legacy, /ProcessAuthoringWorkspace/);
  assert.match(workspace, /surface\?: "explorer" \| "studio"/);
  assert.match(workspace, /href="\/studio\/processes"/);
  assert.match(workspace, /Process dependencies remain read-only/);
});

test("Step Builder remains bounded while Technology and Exceptions use their separate reviewed module", async () => {
  const [administration, actions, schema, journal] = await Promise.all([
    read("lib/operating-model-administration.ts"),
    read("app/process-authoring/actions.ts"),
    read("db/schema.ts"),
    read("drizzle/meta/_journal.json"),
  ]);
  assert.deepEqual(
    [...administration.matchAll(/export async function (\w+)/g)].map((match) => match[1]),
    [
      "updateProcessDefinition",
      "changeProcessOwner",
      "createProcessStep",
      "updateProcessStep",
      "changeProcessStepResponsibility",
      "reorderProcessStep",
    ],
  );
  assert.match(actions, /createProcessStepAction/);
  assert.match(actions, /linkProcessSystemAction/);
  assert.match(actions, /createExceptionAction/);
  assert.doesNotMatch(actions, /addDependency|removeProcessStep/);
  assert.match(schema, /processStepStableKey/);
  assert.doesNotMatch(schema, /retire_step/);
  assert.ok(
    JSON.parse(journal).entries.some(
      (entry) => entry.tag === "0015_workspace_studio_technology_exceptions",
    ),
  );
});

test("Process mutations revalidate both Explorer and Studio views", async () => {
  const actions = await read("app/process-authoring/actions.ts");
  assert.match(actions, /revalidatePath\("\/explorer"\)/);
  assert.match(actions, /revalidatePath\("\/studio\/processes"\)/);
  assert.match(actions, /revalidatePath\(`\/studio\/processes\/\$\{encoded\}`\)/);
});
