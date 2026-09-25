import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const primitive = tag => function TestPrimitive({ children, ...props }) {
  delete props.tone;
  delete props.variant;
  delete props.size;
  return React.createElement(tag, props, children);
};
const Button = primitive("button");
const primitives = {
  Badge: primitive("span"), Button, Card: primitive("div"),
  EmptyState: ({ title }) => React.createElement("p", null, title),
  FieldLabel: primitive("span"), Select: primitive("select"),
  Table: primitive("table"), TableBody: primitive("tbody"),
  TableCell: primitive("td"), TableHeadCell: primitive("th"),
  TableHeader: primitive("thead"), TableRow: primitive("tr"),
  cn: (...values) => values.filter(Boolean).join(" "),
};

async function load(overrides = {}) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(await readFile(new URL("../app/flow-analysis.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    require(id) {
      if (id in overrides) return overrides[id];
      if (id === "react") return React;
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "next/link") return { default: primitive("a") };
      if (id === "next/navigation") return { useRouter: () => ({ refresh() {} }) };
      if (id === "./ui/primitives") return primitives;
      if (id === "./ui/icons") return { ArrowIcon: () => null, FlowIcon: () => null, InfoIcon: () => null };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return loaded.exports;
}

const finding = {
  id: "vacant-fictional-coordinator", evidence: "Review recommended",
  title: "Review fictional coverage", summary: "The recorded primary assignment is missing.",
  facts: [{ label: "Affected Processes", value: 2 }], howDetermined: "From documented assignments.",
  limitation: null, processIds: ["fictional-printing", "fictional-intake"], roleIds: ["fictional-coordinator"], systemIds: [],
};
const analysis = {
  organization: { name: "Fictional Campus" }, asOf: "2026-09-25T12:00:00.000Z",
  currentGaps: [finding], roleCoverage: [], responsibilities: [],
  responsibilityCounts: { explicit: 0, inherited: 0, unclear: 0, unstaffed: 0, retired: 0 },
  scenarios: { roles: [], processes: [], systems: [] },
  concentrations: { roles: [], systems: [], exceptions: [], dependencies: [] },
};
const reviewActions = {
  [finding.id]: {
    actions: [
      { label: "Review Role coverage", href: "/studio/responsibilities/roles/11111111-1111-4111-8111-111111111111#coverage" },
      { label: "Explore in Discovery", href: "/studio/discovery?process=fictional-printing" },
    ],
    processLinks: [
      { name: "Fictional Printing", href: "/explorer/fictional-printing" },
      { name: "Fictional Intake", href: "/explorer/fictional-intake" },
    ],
    note: "This staffing check uses older assignment records. Updating current Role coverage may not clear this finding.",
  },
};

const elements = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(elements) : [node, ...elements(node.props?.children)];
const textContent = node => node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(textContent).join("") : typeof node === "object" ? textContent(node.props?.children) : String(node);

test("FLOW review items render actual next-action links and every verified affected Process", async () => {
  const { FlowAnalysis } = await load();
  const html = renderToStaticMarkup(React.createElement(FlowAnalysis, { analysis, reviewActions }));
  for (const action of reviewActions[finding.id].actions) {
    assert.ok(html.includes(`href="${action.href}"`), action.href);
    assert.ok(html.includes(action.label), action.label);
  }
  for (const link of reviewActions[finding.id].processLinks) {
    assert.ok(html.includes(`href="${link.href}"`), link.href);
    assert.ok(html.includes(link.name), link.name);
  }
  assert.doesNotMatch(html, /Mark (?:as )?resolved|Resolve all|Approve all|<form|type="submit"/i);
});

test("the current coverage limitation is visible without opening methodology details", async () => {
  const { FlowAnalysis } = await load();
  const html = renderToStaticMarkup(React.createElement(FlowAnalysis, { analysis, reviewActions }));
  const visibleOutsideDetails = html.replace(/<details\b[\s\S]*?<\/details>/g, "");
  assert.match(visibleOutsideDetails, /older assignment records/);
  assert.match(visibleOutsideDetails, /may not clear this finding/);
});

test("read-only FLOW retains Process exploration without exposing ungranted Studio actions", async () => {
  const { FlowAnalysis } = await load();
  for (const props of [
    { analysis },
    { analysis, reviewActions: { [finding.id]: { ...reviewActions[finding.id], actions: [] } } },
  ]) {
    const html = renderToStaticMarkup(React.createElement(FlowAnalysis, props));
    assert.match(html, /href="\/explorer\/fictional-printing"/);
    assert.doesNotMatch(html, /href="\/studio\/|Review Role coverage|Explore in Discovery/);
  }
});

test("Refresh findings refreshes the read-only snapshot and communicates the pending state", async () => {
  let refreshCount = 0;
  let transitionCount = 0;
  let pending = false;
  const { FlowAnalysis } = await load({
    react: {
      ...React,
      useState: initial => [typeof initial === "function" ? initial() : initial, () => {}],
      useMemo: create => create(),
      useTransition: () => [pending, work => { transitionCount++; work(); }],
    },
    "next/navigation": { useRouter: () => ({ refresh() { refreshCount++; } }) },
  });
  const refresh = tree => elements(tree).find(node => node.type === Button && /Refresh findings|Refreshing/.test(textContent(node)));
  const control = refresh(FlowAnalysis({ analysis, reviewActions }));
  assert.ok(control, "FLOW should have an explicit way to reload review findings after a saved edit");
  assert.equal(Boolean(control.props.disabled), false);
  control.props.onClick();
  assert.equal(refreshCount, 1);
  assert.equal(transitionCount, 1);
  pending = true;
  const pendingControl = refresh(FlowAnalysis({ analysis, reviewActions }));
  assert.equal(pendingControl.props.disabled, true);
  assert.match(textContent(pendingControl), /Refreshing/);
  assert.equal(refreshCount, 1, "Rendering does not trigger autonomous refreshes");
});

test("FLOW editor links have destination anchors and successful edits invalidate FLOW", async () => {
  const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const processWorkspace = await read("app/process-authoring/process-authoring-workspace.tsx");
  for (const anchor of ["ownership", "steps", "exceptions"]) {
    assert.match(processWorkspace, new RegExp(`<(?:Card|section)\\b[^>]*\\bid="${anchor}"`), `Missing Process editor #${anchor} destination`);
  }
  const roleWorkspace = await read("app/studio/responsibilities/responsibility-role-workspace.tsx");
  assert.match(roleWorkspace, /<Card\b[^>]*\bid="coverage"/, "Missing Role coverage destination");
  for (const path of [
    "app/process-authoring/actions.ts",
    "app/studio/technology/actions.ts",
    "app/studio/responsibilities/actions.ts",
  ]) {
    assert.match(await read(path), /revalidatePath\("\/flow"\)/, `${path} must refresh FLOW after a saved edit`);
  }
});

test("FLOW page builds navigation from server-resolved capabilities and passes no write configuration to the client", async () => {
  const code = ts.transpileModule(await readFile(new URL("../app/flow/page.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const FlowClient = () => null;
  const seedData = { processes: [], roles: [], systems: [] };
  let input;
  let connections = 0;
  let gates = { canAuthorProcesses: false, canManageResponsibilities: false, canDiscover: false };
  let denyAccess = false;
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    require(id) {
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "next/server") return { connection: async () => { connections++; } };
      if (id === "@/lib/workspace-experience") return { loadWorkspaceExperience: async () => {
        if (denyAccess) throw new Error("Access denied");
        return {
          analysis, data: seedData, asOf: analysis.asOf, source: "demo",
          configuration: { name: "Fictional Campus" },
          authoring: { enabled: gates.canAuthorProcesses, databaseUrl: "SECRET_AUTHORING_CONFIGURATION" },
          canManageResponsibilities: gates.canManageResponsibilities,
          discovery: { enabled: gates.canDiscover, databaseUrl: "SECRET_DISCOVERY_CONFIGURATION" },
        };
      } };
      if (id === "@/lib/flow-review-actions") return { buildFlowReviewActions: args => { input = args; return reviewActions; } };
      if (id === "../flow-analysis") return { FlowAnalysis: FlowClient, EvidenceLegend: () => null };
      if (id === "../ui/icons") return { FlowIcon: () => null };
      if (id === "../workspace-shell") return { WorkspacePageHeader: primitive("header"), WorkspaceShell: primitive("main") };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  for (const values of [
    { canAuthorProcesses: false, canManageResponsibilities: false, canDiscover: false },
    { canAuthorProcesses: true, canManageResponsibilities: false, canDiscover: true },
    { canAuthorProcesses: false, canManageResponsibilities: true, canDiscover: false },
  ]) {
    gates = values;
    const tree = await loaded.exports.default();
    assert.equal(input.data, seedData);
    assert.equal(input.findings, analysis.currentGaps);
    for (const [key, value] of Object.entries(values)) assert.equal(input[key], value);
    const client = elements(tree).find(node => node.type === FlowClient);
    assert.deepEqual(Object.keys(client.props).sort(), ["analysis", "reviewActions"]);
    assert.equal(client.props.analysis, analysis);
    assert.equal(client.props.reviewActions, reviewActions);
    assert.doesNotMatch(JSON.stringify(input), /SECRET_|databaseUrl|organizationId/);
    assert.doesNotMatch(JSON.stringify(client.props), /SECRET_|databaseUrl/);
  }
  assert.equal(connections, 3);
  input = undefined;
  denyAccess = true;
  await assert.rejects(loaded.exports.default(), /Access denied/);
  assert.equal(input, undefined, "No navigation is prepared before the authenticated workspace load succeeds");
});
