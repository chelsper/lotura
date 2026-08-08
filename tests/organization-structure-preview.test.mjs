import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildOrganizationStructurePreview,
  detectOrganizationStructureColumnMapping,
  OrganizationStructurePreviewError,
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

test("common source headings map to generic preview concepts", () => {
  const detected = detectOrganizationStructureColumnMapping(headers);

  assert.deepEqual(detected.conflicts, []);
  assert.deepEqual(detected.mapping, {
    personName: 0,
    reportsToName: 1,
    positionTitle: 2,
    statedDirectReports: 3,
    organizationUnit: 4,
    location: 5,
  });
});

test("preview resolves reporting relationships while preserving source uncertainty", () => {
  const preview = build([
    ["Morgan Vale", "", "Executive Director", 2, "Operations", "Harbor"],
    ["Alex Rivera", "Morgan Vale", "Program Director", 1, "Programs", "Harbor"],
    ["Riley Chen", "Morgan Vale", "Analyst", 0, "Operations", "Harbor"],
    ["Taylor Brooks", "Alex Rivera", "Coordinator", 0, "Programs", "Remote"],
    ["Jordan Lee", "Unknown Manager", "Specialist", 0, "Services", "Harbor"],
  ]);

  assert.equal(preview.stats.recordCount, 5);
  assert.equal(preview.stats.resolvedRelationships, 3);
  assert.equal(preview.stats.unresolvedRelationships, 1);
  assert.equal(preview.stats.organizationUnits, 3);
  assert.equal(preview.records[0].derivedDirectReports, 2);
  assert.equal(preview.records[1].derivedDirectReports, 1);
  assert.equal(
    preview.issues.find((issue) => issue.kind === "unresolved-manager")?.count,
    1,
  );
  assert.equal(
    preview.issues.find((issue) => issue.kind === "blank-manager")?.tone,
    "neutral",
  );
});

test("duplicate names, cycles, self-reporting, and count differences remain review questions", () => {
  const preview = build([
    ["Avery Stone", "Casey Park", "Director", 0, "Programs", "Harbor"],
    ["Casey Park", "Avery Stone", "Director", 0, "Programs", "Harbor"],
    ["Sam Rivera", "Sam Rivera", "Manager", 0, "Services", "Harbor"],
    ["Jamie Quinn", "", "Coordinator", 3, "Services", "Remote"],
    ["Jamie Quinn", "", "Specialist", 0, "Operations", "Remote"],
  ]);
  const issueKinds = new Set(preview.issues.map((issue) => issue.kind));

  assert.ok(issueKinds.has("reporting-cycle"));
  assert.ok(issueKinds.has("self-reporting"));
  assert.ok(issueKinds.has("duplicate-name"));
  assert.ok(issueKinds.has("direct-report-mismatch"));
  assert.equal(preview.stats.duplicateNameGroups, 1);
});

test("blank Person names and temporary wording are surfaced without asserting truth", () => {
  const preview = build([
    ["Morgan Vale", "", "Executive Director", 2, "Operations", "Harbor"],
    ["", "Morgan Vale", "Open Program Specialist", 0, "Programs", "Harbor"],
    ["Taylor Brooks", "Morgan Vale", "Acting Coordinator", 0, "Programs", "Remote"],
  ]);

  assert.equal(preview.stats.possibleVacancies, 1);
  assert.equal(preview.vacancyAssessment.kind, "possible");
  assert.match(preview.vacancyAssessment.message, /review questions, not confirmed vacancies/i);
  assert.equal(
    preview.issues.find((issue) => issue.kind === "possible-temporary-coverage")?.count,
    1,
  );
});

test("a person-centric source cannot prove the absence of vacancies", () => {
  const preview = build([
    ["Morgan Vale", "", "Executive Director", 1, "Operations", "Harbor"],
    ["Riley Chen", "Morgan Vale", "Analyst", 0, "Operations", "Harbor"],
  ]);

  assert.equal(preview.stats.possibleVacancies, 0);
  assert.equal(preview.vacancyAssessment.kind, "not-determinable");
  assert.match(preview.vacancyAssessment.message, /cannot prove that every Position is filled/i);
});

test("missing Person or manager columns do not become vacancy or hierarchy evidence", () => {
  const preview = buildOrganizationStructurePreview({
    fileName: "fictional-positions.xlsx",
    mapping: {
      personName: null,
      reportsToName: null,
      positionTitle: 0,
      statedDirectReports: 1,
      organizationUnit: 2,
      location: null,
    },
    organizationName: "Cedar Harbor Collaborative",
    rows: [
      ["Position Title", "Number of Direct Reports", "Department"],
      ["Executive Director", 3, "Operations"],
      ["Program Director", 0, "Programs"],
    ],
    sheetName: "Positions",
  });

  assert.equal(preview.stats.possibleVacancies, 0);
  assert.equal(preview.stats.maximumDepth, null);
  assert.equal(preview.stats.medianDepth, null);
  assert.equal(preview.stats.rootOrUnknownRecords, 2);
  assert.equal(preview.vacancyAssessment.kind, "not-determinable");
  assert.equal(
    preview.issues.some((issue) => issue.kind === "possible-vacancy"),
    false,
  );
  assert.equal(
    preview.issues.some((issue) => issue.kind === "direct-report-mismatch"),
    false,
  );
});

test("mapping requires structure evidence and rejects one source column serving two concepts", () => {
  assert.throws(
    () =>
      build([["Morgan Vale", "", "", 0, "Operations", "Harbor"]], {
        mapping: {
          personName: null,
          reportsToName: null,
          positionTitle: null,
          statedDirectReports: null,
          organizationUnit: 4,
          location: 5,
        },
      }),
    (error) =>
      error instanceof OrganizationStructurePreviewError &&
      error.code === "insufficient-column-mapping",
  );

  assert.throws(
    () =>
      build([["Morgan Vale", "", "Director", 0, "Operations", "Harbor"]], {
        mapping: {
          personName: 0,
          reportsToName: null,
          positionTitle: 0,
          statedDirectReports: null,
          organizationUnit: 4,
          location: 5,
        },
      }),
    (error) =>
      error instanceof OrganizationStructurePreviewError &&
      error.code === "duplicate-column-mapping",
  );
});

test("preview route is access-checked, local-only, and independent of the operating model", async () => {
  const [page, client, analysis] = await Promise.all([
    readFile(new URL("app/organization-structure/preview/page.tsx", root), "utf8"),
    readFile(
      new URL(
        "app/organization-structure/preview/organization-structure-preview.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(new URL("lib/organization-structure-preview.mjs", root), "utf8"),
  ]);
  const source = `${page}\n${client}\n${analysis}`;

  assert.match(page, /await requireWorkspaceAccess\(\)/);
  assert.doesNotMatch(page, /loadWorkspaceExperience|loadOperatingModel|DATABASE_URL/);
  assert.match(client, /import\("read-excel-file\/browser"\)/);
  assert.match(client, /workbook is evidence/i);
  assert.match(client, /held only in memory/i);
  assert.match(client, /Working draft evidence/);
  assert.match(client, /Nothing imported/);
  assert.doesNotMatch(client, /Sanitized working draft/);
  assert.doesNotMatch(
    source,
    /fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|FormData|use server|@neondatabase|drizzle|from ["']@\/db/i,
  );
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/);
});

test("preview source does not infer User, Operational Role, or Process ownership", async () => {
  const client = await readFile(
    new URL(
      "app/organization-structure/preview/organization-structure-preview.tsx",
      root,
    ),
    "utf8",
  );

  assert.match(client, /title does not create a durable Operational Role/i);
  assert.match(client, /reporting line does not establish Process ownership/i);
  assert.match(client, /named Person does not establish Lotura User access/i);
  assert.match(client, /creates no Person, Position,\s+Operational Role, RoleMandate, RoleCoverage/i);
});
