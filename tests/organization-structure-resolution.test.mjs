import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyOrganizationStructureResolutionDecision,
  approveOrganizationStructureResolutionSession,
  buildOrganizationStructureResolutionGroups,
  createOrganizationStructureResolutionSession,
  evaluateOrganizationStructureResolutionReadiness,
  organizationStructureResolutionActions,
  removeOrganizationStructureResolutionDecision,
  updateOrganizationStructureResolutionAttestation,
  updateOrganizationStructureResolutionPreparation,
} from "../lib/organization-structure-resolution.mjs";
import {
  buildOrganizationStructurePreview,
} from "../lib/organization-structure-preview.mjs";

const root = new URL("../", import.meta.url);
const headers = [
  "Employee Name",
  "Manager Name",
  "Position Title",
  "Number of Direct Reports",
  "Department",
  "Location",
];

function build(rows, overrides = {}) {
  return buildOrganizationStructurePreview({
    fileName: "fictional-organization.xlsx",
    organizationName: "Cedar Harbor Collaborative",
    rows: [headers, ...rows],
    sheetName: "Organization",
    sourceAsOf: "2026-08-01",
    ...overrides,
  });
}

function buildReviewFixture() {
  return build([
    ["Morgan Vale", "", "Executive Director", 5, "Operations", "Harbor"],
    ["Alex Rivera", "Morgan Vale", "Acting Program Director", 0, "", "Harbor"],
    ["Jamie Quinn", "Morgan Vale", "Coordinator", 0, "Programs", "Remote"],
    ["Jamie Quinn", "Morgan Vale", "Coordinator", 0, "Programs", "Remote"],
    ["Taylor Brooks", "Jamie Quinn", "Specialist", 0, "Programs", "Remote"],
    ["Jordan Lee", "Outside Manager", "Analyst", 0, "Services", "Harbor"],
    ["Sam Rivera", "Sam Rivera", "Manager", 0, "Services", "Harbor"],
    ["", "Morgan Vale", "Open Specialist", 0, "Services", "Harbor"],
  ]);
}

function applyResolvedTreatment(session, groups, group) {
  const action = group.actions.find(
    (actionId) =>
      organizationStructureResolutionActions[actionId].result !== "needs-validation",
  );
  const definition = organizationStructureResolutionActions[action];
  return applyOrganizationStructureResolutionDecision(session, groups, {
    action,
    candidateRecordKey: definition.requiresCandidate
      ? group.candidateRecordKeys[0]
      : null,
    groupKey: group.key,
    note: definition.requiresNote ? "Reviewed against fictional source context." : "",
  });
}

function prepareApproachableSession(preview) {
  const groups = buildOrganizationStructureResolutionGroups(preview);
  let session = createOrganizationStructureResolutionSession();
  for (const group of groups) {
    session = applyResolvedTreatment(session, groups, group);
  }
  session = updateOrganizationStructureResolutionPreparation(session, {
    identityStrategyNote:
      "Reconcile stable fictional Person and Position source identifiers before import.",
    identityStrategyReviewed: true,
  });
  for (const key of ["basisOnly", "humanReview", "localOnly"]) {
    session = updateOrganizationStructureResolutionAttestation(session, key, true);
  }
  return { groups, session };
}

test("resolution groups classify the approved issue types without changing source evidence", () => {
  const preview = buildReviewFixture();
  const original = structuredClone(preview);
  const groups = buildOrganizationStructureResolutionGroups(preview);
  const kinds = new Set(groups.map((group) => group.kind));

  assert.ok(kinds.has("duplicate-person"));
  assert.ok(kinds.has("ambiguous-manager"));
  assert.ok(kinds.has("unresolved-manager"));
  assert.ok(kinds.has("blank-manager"));
  assert.ok(kinds.has("duplicate-row"));
  assert.ok(kinds.has("missing-organization-unit"));
  assert.ok(kinds.has("temporary-wording"));
  assert.ok(kinds.has("broad-reporting-span"));
  assert.ok(kinds.has("source-record-conflict"));
  assert.equal(
    groups.find((group) => group.kind === "source-record-conflict")?.severity,
    "blocker",
  );
  assert.deepEqual(preview, original);
});

test("reporting cycles and self-reporting remain deterministic blockers", () => {
  const preview = build([
    ["Avery Stone", "Casey Park", "Director", 0, "Programs", "Harbor"],
    ["Casey Park", "Avery Stone", "Director", 0, "Programs", "Harbor"],
    ["Sam Rivera", "Sam Rivera", "Manager", 0, "Services", "Harbor"],
  ]);
  const readiness = evaluateOrganizationStructureResolutionReadiness(
    preview,
    createOrganizationStructureResolutionSession(),
  );

  assert.ok(readiness.blockers.some((item) => item.key.startsWith("reporting-cycle")));
  assert.ok(readiness.blockers.some((item) => item.key.startsWith("self-reporting")));
  assert.equal(readiness.readyForLocalApproval, false);
});

test("ambiguous managers require an exact candidate and decisions identify affected evidence", () => {
  const preview = buildReviewFixture();
  const groups = buildOrganizationStructureResolutionGroups(preview);
  const group = groups.find((item) => item.kind === "ambiguous-manager");
  const session = createOrganizationStructureResolutionSession();

  assert.ok(group);
  assert.equal(group.candidateRecordKeys.length, 2);
  assert.throws(
    () =>
      applyOrganizationStructureResolutionDecision(session, groups, {
        action: "choose-manager",
        groupKey: group.key,
        note: "Fictional review note.",
      }),
    /choose one of the source candidates/i,
  );

  const next = applyOrganizationStructureResolutionDecision(session, groups, {
    action: "choose-manager",
    candidateRecordKey: group.candidateRecordKeys[1],
    groupKey: group.key,
    note: "Fictional source identifier establishes the intended candidate.",
  });
  assert.deepEqual(next.decisions[group.key].recordKeys, group.recordKeys);
  assert.equal(next.decisions[group.key].candidateRecordKey, group.candidateRecordKeys[1]);
  assert.equal(next.decisions[group.key].result, "resolved");
});

test("duplicate Person candidates can remain distinct or share one proposed identity anchor", () => {
  const preview = buildReviewFixture();
  const groups = buildOrganizationStructureResolutionGroups(preview);
  const group = groups.find((item) => item.kind === "duplicate-person");
  const session = applyOrganizationStructureResolutionDecision(
    createOrganizationStructureResolutionSession(),
    groups,
    {
      action: "treat-as-one-person-candidate",
      candidateRecordKey: group.candidateRecordKeys[0],
      groupKey: group.key,
      note: "Fictional stable identifier connects both source rows to one Person candidate.",
    },
  );

  assert.equal(session.decisions[group.key].result, "resolved");
  assert.deepEqual(session.decisions[group.key].recordKeys, group.recordKeys);
  assert.equal(preview.records.length, 8);
});

test("review decisions are reversible and never mutate the original evidence", () => {
  const preview = buildReviewFixture();
  const original = JSON.stringify(preview);
  const groups = buildOrganizationStructureResolutionGroups(preview);
  const group = groups.find((item) => item.kind === "unresolved-manager");
  const initial = createOrganizationStructureResolutionSession();
  const decided = applyOrganizationStructureResolutionDecision(initial, groups, {
    action: "manager-outside-source",
    groupKey: group.key,
    note: "This fictional manager is outside the supplied source scope.",
  });
  const reversed = removeOrganizationStructureResolutionDecision(decided, group.key);

  assert.ok(decided.decisions[group.key]);
  assert.deepEqual(reversed, initial);
  assert.equal(JSON.stringify(preview), original);
});

test("exact duplicate handling can retain one row and exclude the other candidates", () => {
  const preview = buildReviewFixture();
  const groups = buildOrganizationStructureResolutionGroups(preview);
  const group = groups.find((item) => item.kind === "duplicate-row");
  const keptKey = group.candidateRecordKeys[0];
  const session = applyOrganizationStructureResolutionDecision(
    createOrganizationStructureResolutionSession(),
    groups,
    {
      action: "keep-one-source-record",
      candidateRecordKey: keptKey,
      groupKey: group.key,
      note: "Exact fictional duplicate; keep the first source row as the basis.",
    },
  );
  const readiness = evaluateOrganizationStructureResolutionReadiness(preview, session);

  assert.equal(readiness.includedRecordKeys.includes(keptKey), true);
  assert.equal(
    group.recordKeys
      .filter((key) => key !== keptKey)
      .every((key) => readiness.excludedRecordKeys.includes(key)),
    true,
  );
  assert.equal(
    readiness.blockers.some((item) => item.key.startsWith("duplicate-person:")),
    false,
  );
});

test("explicit exclusions skip source records without deleting evidence", () => {
  const preview = buildReviewFixture();
  const originalCount = preview.records.length;
  const groups = buildOrganizationStructureResolutionGroups(preview);
  const group = groups.find((item) => item.kind === "unresolved-manager");
  const session = applyOrganizationStructureResolutionDecision(
    createOrganizationStructureResolutionSession(),
    groups,
    {
      action: "exclude-source-records",
      groupKey: group.key,
      note: "Outside the fictional review scope.",
    },
  );
  const readiness = evaluateOrganizationStructureResolutionReadiness(preview, session);

  assert.equal(readiness.excludedRecordKeys.includes(group.recordKeys[0]), true);
  assert.equal(preview.records.length, originalCount);
  assert.ok(preview.records.some((record) => record.key === group.recordKeys[0]));
});

test("authoritative external validation remains blocking rather than pretending to resolve evidence", () => {
  const preview = buildReviewFixture();
  const groups = buildOrganizationStructureResolutionGroups(preview);
  const group = groups.find((item) => item.kind === "temporary-wording");
  const session = applyOrganizationStructureResolutionDecision(
    createOrganizationStructureResolutionSession(),
    groups,
    {
      action: "requires-authoritative-information",
      groupKey: group.key,
      note: "An authoritative fictional appointment record is required.",
    },
  );
  const readiness = evaluateOrganizationStructureResolutionReadiness(preview, session);

  assert.equal(session.decisions[group.key].result, "needs-validation");
  assert.ok(readiness.blockers.some((item) => item.key === group.key));
});

test("warnings remain non-blocking conditions but must be explicitly reviewed for approval", () => {
  const preview = build([
    ["Morgan Vale", "", "Executive Director", 1, "Operations", "Harbor"],
    ["Alex Rivera", "Morgan Vale", "Acting Director", 0, "Programs", "Harbor"],
  ]);
  const groups = buildOrganizationStructureResolutionGroups(preview);
  let session = createOrganizationStructureResolutionSession();
  const warning = groups.find((group) => group.kind === "temporary-wording");
  let readiness = evaluateOrganizationStructureResolutionReadiness(preview, session);
  assert.ok(readiness.warnings.some((item) => item.key === warning.key));

  session = applyOrganizationStructureResolutionDecision(session, groups, {
    action: "preserve-temporary-wording",
    groupKey: warning.key,
  });
  readiness = evaluateOrganizationStructureResolutionReadiness(preview, session);
  assert.equal(readiness.warnings.some((item) => item.key === warning.key), false);
});

test("readiness recalculates after reversible decisions and preparation attestations", () => {
  const preview = buildReviewFixture();
  const { groups, session } = prepareApproachableSession(preview);
  const readiness = evaluateOrganizationStructureResolutionReadiness(preview, session);

  assert.equal(readiness.blockers.length, 0);
  assert.equal(readiness.warnings.length, 0);
  assert.equal(readiness.attestationsComplete, true);
  assert.equal(readiness.readyForLocalApproval, true);

  const reversed = removeOrganizationStructureResolutionDecision(session, groups[0].key);
  const recalculated = evaluateOrganizationStructureResolutionReadiness(preview, reversed);
  assert.equal(recalculated.readyForLocalApproval, false);
});

test("missing source dates and identity reconciliation decisions block local approval", () => {
  const preview = build(
    [["Morgan Vale", "", "Executive Director", 0, "Operations", "Harbor"]],
    { sourceAsOf: null },
  );
  const readiness = evaluateOrganizationStructureResolutionReadiness(
    preview,
    createOrganizationStructureResolutionSession(),
  );

  assert.ok(readiness.blockers.some((item) => item.key === "source-as-of"));
  assert.ok(readiness.blockers.some((item) => item.key === "identity-strategy"));
});

test("approval requires readiness and remains a local session value", () => {
  const preview = buildReviewFixture();
  assert.throws(
    () =>
      approveOrganizationStructureResolutionSession(
        preview,
        createOrganizationStructureResolutionSession(),
        "2026-08-08T12:00:00.000Z",
      ),
    /resolve all blockers/i,
  );

  const { groups, session } = prepareApproachableSession(preview);
  const approved = approveOrganizationStructureResolutionSession(
    preview,
    session,
    "2026-08-08T12:00:00.000Z",
  );
  assert.equal(approved.approval.status, "approved-for-import");
  assert.equal(approved.approval.approvedAt, "2026-08-08T12:00:00.000Z");

  const changed = removeOrganizationStructureResolutionDecision(approved, groups[0].key);
  assert.equal(changed.approval, null);
});

test("resolution UI remains access-gated, browser-local, and free of persistence or mutation paths", async () => {
  const [page, previewClient, resolutionClient, analysis] = await Promise.all([
    readFile(new URL("app/organization-structure/preview/page.tsx", root), "utf8"),
    readFile(
      new URL("app/organization-structure/preview/organization-structure-preview.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("app/organization-structure/preview/organization-structure-resolution.tsx", root),
      "utf8",
    ),
    readFile(new URL("lib/organization-structure-resolution.mjs", root), "utf8"),
  ]);
  const source = `${page}\n${previewClient}\n${resolutionClient}\n${analysis}`;

  assert.match(page, /await requireWorkspaceAccess\(\)/);
  assert.match(resolutionClient, /Approved for import — local session only\. Nothing has been saved or imported\./);
  assert.match(resolutionClient, /Review decisions live only in this tab/);
  assert.doesNotMatch(
    source,
    /fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|FormData|use server|@neondatabase|drizzle|from ["']@\/db/i,
  );
  assert.doesNotMatch(
    source,
    /route\.ts|server action|writeFile|appendFile|createWriteStream|navigator\.sendBeacon/i,
  );
});

test("resolution work does not alter public-demo source policy or fixture behavior", async () => {
  const [sourcePolicy, seed] = await Promise.all([
    readFile(new URL("lib/process-explorer-source-policy.mjs", root), "utf8"),
    readFile(new URL("db/seeds/process-explorer.json", root), "utf8"),
  ]);

  assert.match(sourcePolicy, /mode === "demo"/);
  assert.equal(JSON.parse(seed).organization.name, "Northstar Service Collective");
});
