import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildOrganizationStructureData,
  mapNeonOrganizationStructure,
} from "../lib/organization-structure-data.mjs";

const fixtureUrl = new URL(
  "../db/seeds/organization-structure.json",
  import.meta.url,
);
const operatingUrl = new URL(
  "../db/seeds/process-explorer.json",
  import.meta.url,
);

async function inputs() {
  return {
    structure: JSON.parse(await readFile(fixtureUrl, "utf8")),
    operating: JSON.parse(await readFile(operatingUrl, "utf8")),
  };
}

test("the fictional projection exercises the approved structural scenarios", async () => {
  const { structure, operating } = await inputs();
  const before = JSON.stringify(structure);
  const data = buildOrganizationStructureData(
    structure,
    operating,
    "2026-08-09T12:00:00.000Z",
  );

  assert.equal(JSON.stringify(structure), before, "source evidence is immutable");
  assert.equal(data.organization.name, "Northstar Service Collective");
  assert.equal(data.units.length, 6);
  assert.equal(data.gaps.provisionalUnits, 1);
  assert.equal(
    data.positions.filter((item) => item.title === "Service Coordinator").length,
    2,
  );
  assert.equal(data.people.filter((item) => item.name === "Jordan Lee").length, 2);

  const taylor = data.people.find((item) => item.name === "Taylor Brooks");
  assert.equal(taylor.assignments.length, 2);
  assert.ok(taylor.assignments.some((item) => item.type === "acting"));

  const billing = data.positions.find(
    (item) => item.title === "Billing Coordinator",
  );
  assert.deepEqual(
    billing.assignments.map((item) => item.type),
    ["job_share", "job_share"],
  );

  const community = data.positions.find(
    (item) => item.title === "Community Liaison",
  );
  assert.equal(community.occupancy.id, "temporarily_covered");
  assert.equal(
    data.positions.find((item) => item.title === "Data Coordinator").occupancy.id,
    "vacant",
  );
});

test("vacancy labels require snapshot-wide authoritative vacancy evidence", async () => {
  const { structure, operating } = await inputs();
  structure.snapshot.vacancyEvidenceComplete = false;
  const data = buildOrganizationStructureData(
    structure,
    operating,
    "2026-08-09T12:00:00.000Z",
  );

  assert.equal(data.gaps.confirmedVacancies, 0);
  assert.equal(data.gaps.occupancyNotEstablished, 1);
  assert.equal(
    data.positions.find((item) => item.title === "Data Coordinator").occupancy.id,
    "not_established",
  );
});

test("effective windows are evaluated as half-open periods at one as-of time", async () => {
  const { structure, operating } = await inputs();
  const acting = structure.positionAssignments.find(
    (item) => item.key === "assignment-community-acting",
  );

  const before = buildOrganizationStructureData(
    structure,
    operating,
    "2026-05-31T23:59:59.999Z",
  );
  assert.equal(
    before.positions.find((item) => item.title === "Community Liaison").occupancy.id,
    "vacant",
  );

  const atStart = buildOrganizationStructureData(
    structure,
    operating,
    acting.effectiveFrom,
  );
  assert.equal(
    atStart.positions.find((item) => item.title === "Community Liaison").occupancy.id,
    "temporarily_covered",
  );

  const atEnd = buildOrganizationStructureData(
    structure,
    operating,
    acting.effectiveUntil,
  );
  assert.equal(
    atEnd.positions.find((item) => item.title === "Community Liaison").occupancy.id,
    "vacant",
  );
});

test("reporting types and cross-Unit context remain distinct", async () => {
  const { structure, operating } = await inputs();
  const data = buildOrganizationStructureData(
    structure,
    operating,
    "2026-08-09T12:00:00.000Z",
  );
  const systems = data.positions.find((item) => item.title === "Systems Steward");
  const records = data.positions.find((item) => item.title === "Records Analyst");
  const billing = data.positions.find((item) => item.title === "Billing Coordinator");

  assert.equal(records.primaryManager.position.title, "Systems Steward");
  assert.ok(
    records.additionalManagers.some(
      (item) => item.type === "dotted_line" && item.isCrossUnit,
    ),
  );
  assert.ok(
    systems.additionalReports.some(
      (item) => item.type === "functional" && item.isCrossUnit,
    ),
  );
  assert.equal(billing.primaryManager.position.title, "Finance Operations Lead");
  assert.equal(
    data.positions.find((item) => item.title === "Delivery Lead").managerChain.length,
    2,
  );
});

test("Role Mandates and Role Coverage connect structure to Processes without title inference", async () => {
  const { structure, operating } = await inputs();
  const data = buildOrganizationStructureData(
    structure,
    operating,
    "2026-08-09T12:00:00.000Z",
  );
  const clientLead = data.positions.find(
    (item) => item.title === "Client Services Lead",
  );
  const dataCoordinator = data.positions.find(
    (item) => item.title === "Data Coordinator",
  );
  const executive = data.positions.find(
    (item) => item.title === "Executive Director of Services",
  );

  assert.equal(clientLead.mandates[0].role.name, "Client Services Lead");
  assert.equal(clientLead.mandates[0].coverage[0].person.name, "Amara Patel");
  assert.deepEqual(
    clientLead.processes.map((item) => item.name),
    ["Receive a service request"],
  );
  assert.ok(clientLead.systems.some((item) => item.name === "Intake Vault"));
  assert.equal(dataCoordinator.mandates[0].type, "shared");
  assert.equal(dataCoordinator.mandates[0].coverage.length, 0);
  assert.equal(executive.mandates.length, 0);
  assert.equal(executive.processes.length, 0, "reporting reach is not Process reach");
});

test("the Neon mapper preserves UUID stable keys and maps database relationships", () => {
  const rows = {
    asOf: "2026-08-09T12:00:00.000Z",
    organizations: [{ id: 4, name: "Fictional Structure Group" }],
    imports: [
      {
        id: 1,
        stableKey: "10000000-0000-4000-8000-000000000001",
        sourceAsOf: "2026-08-01T00:00:00.000Z",
        isPartial: true,
        vacancyEvidenceComplete: false,
        approvedForImportAt: "2026-08-02T00:00:00.000Z",
        importedAt: "2026-08-03T00:00:00.000Z",
        currentForPilotUseAt: "2026-08-04T00:00:00.000Z",
      },
    ],
    people: [
      {
        id: 2,
        stableKey: "20000000-0000-4000-8000-000000000002",
        displayName: "Example Person",
        status: "active",
      },
    ],
    organizationUnits: [
      {
        id: 3,
        stableKey: "30000000-0000-4000-8000-000000000003",
        name: "Example Unit",
        parentOrganizationUnitId: null,
        isProvisional: true,
        status: "active",
        statusReason: null,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveUntil: null,
      },
    ],
    positions: [
      {
        id: 4,
        stableKey: "40000000-0000-4000-8000-000000000004",
        organizationUnitId: 3,
        title: "Example Position",
        status: "active",
        statusReason: null,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveUntil: null,
      },
    ],
    positionAssignments: [
      {
        id: 5,
        positionId: 4,
        personId: 2,
        assignmentType: "incumbent",
        status: "active",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveUntil: null,
        reason: null,
      },
    ],
    positionReportingRelationships: [],
    roleMandates: [
      {
        id: 6,
        positionId: 4,
        roleId: 7,
        mandateType: "primary",
        scope: null,
        status: "active",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveUntil: null,
        reason: null,
      },
    ],
    roleCoverages: [
      {
        id: 8,
        roleMandateId: 6,
        personId: 2,
        coverageType: "permanent",
        status: "active",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveUntil: null,
        reason: null,
      },
    ],
  };

  const mapped = mapNeonOrganizationStructure(rows);
  assert.equal(mapped.structure.people[0].stableKey, rows.people[0].stableKey);
  assert.equal(
    mapped.structure.positions[0].organizationUnitKey,
    rows.organizationUnits[0].stableKey,
  );
  assert.equal(mapped.structure.roleMandates[0].roleKey, "role:7");
  assert.equal(
    mapped.structure.roleCoverages[0].roleMandateKey,
    "role-mandate:6",
  );
});
