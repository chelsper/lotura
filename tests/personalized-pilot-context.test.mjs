import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildKnowledgeGaps } from "../lib/knowledge-gaps.mjs";
import { buildOrganizationStructureData } from "../lib/organization-structure-data.mjs";
import {
  buildPersonalContext,
  describePersonalContextDependency,
  PersonalContextResolutionError,
} from "../lib/personal-context.mjs";
import {
  PilotIdentityConfigurationError,
  resolvePilotIdentityAssociationConfiguration,
} from "../lib/pilot-identity-policy.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const asOf = "2026-08-09T12:00:00.000Z";

const privateRuntime = {
  authentication: { mode: "temporary-password" },
  operatingModel: { mode: "neon", organizationId: 1 },
};

const personStableKey = "3088ae64-82c4-42b0-8b46-15328c78d803";
const positionStableKey = "218ab812-1e5e-4704-a195-c9756ac6809a";

test("pilot identity configuration is paired, private, exact, and disabled by default", () => {
  assert.deepEqual(
    resolvePilotIdentityAssociationConfiguration({}, privateRuntime),
    { enabled: false },
  );
  assert.throws(
    () =>
      resolvePilotIdentityAssociationConfiguration(
        { LOTURA_PILOT_PERSON_STABLE_KEY: personStableKey },
        privateRuntime,
      ),
    PilotIdentityConfigurationError,
  );
  assert.throws(
    () =>
      resolvePilotIdentityAssociationConfiguration(
        {
          LOTURA_PILOT_PERSON_STABLE_KEY: "not-a-stable-key",
          LOTURA_PILOT_POSITION_STABLE_KEY: positionStableKey,
        },
        privateRuntime,
      ),
    PilotIdentityConfigurationError,
  );
  assert.throws(
    () =>
      resolvePilotIdentityAssociationConfiguration(
        {
          LOTURA_PILOT_PERSON_STABLE_KEY: personStableKey,
          LOTURA_PILOT_POSITION_STABLE_KEY: positionStableKey,
        },
        {
          authentication: { mode: "public" },
          operatingModel: { mode: "demo", organizationId: null },
        },
      ),
    /authenticated private Neon workspace/,
  );

  assert.deepEqual(
    resolvePilotIdentityAssociationConfiguration(
      {
        LOTURA_PILOT_PERSON_STABLE_KEY: personStableKey.toUpperCase(),
        LOTURA_PILOT_POSITION_STABLE_KEY: positionStableKey.toUpperCase(),
      },
      privateRuntime,
    ),
    {
      applicationIdentity: "temporary-admin",
      enabled: true,
      organizationId: 1,
      personStableKey,
      positionStableKey,
    },
  );
});

async function fictionalProjection() {
  const [structure, operatingModel] = await Promise.all([
    read("db/seeds/organization-structure.json").then(JSON.parse),
    read("db/seeds/process-explorer.json").then(JSON.parse),
  ]);
  const data = buildOrganizationStructureData(
    structure,
    operatingModel,
    asOf,
  );
  const relevant = data.people.find((person) => person.id === personStableKey);
  const processes = [
    ...new Map(
      relevant.coverages
        .flatMap((coverage) => coverage.processes)
        .map((process) => [process.id, process]),
    ).values(),
  ];
  const explorerData = {
    organization: data.organization,
    processes: processes.map((process) => ({
      ...process,
      downstream: [],
      exceptions: [],
      ownerRole: null,
      purpose: `Purpose of ${process.name}.`,
      roleIds: [],
      steps: [],
      upstream: [],
    })),
    roles: [],
    systems: [],
  };
  const knowledgeGaps = buildKnowledgeGaps({
    asOf,
    operatingModel,
    organizationKey: "organization:1",
    structure,
  });
  return { data, explorerData, knowledgeGaps };
}

test("the personal lens derives responsibility and reach from the canonical projection", async () => {
  const input = await fictionalProjection();
  const context = buildPersonalContext({
    association: {
      applicationIdentity: "temporary-admin",
      personStableKey,
      positionStableKey,
    },
    ...input,
    familyIndex: {
      "receive-service-request": [
        {
          name: "Client lifecycle",
          stableKey: "d7242954-911f-460e-890d-b9ab014327ca",
          status: "active",
        },
      ],
    },
    systemStableKeys: {
      "intake-vault": "cbf69519-980e-4cf4-8b98-904c37e1a4b1",
    },
  });

  assert.equal(context.person.id, personStableKey);
  assert.equal(context.position.id, positionStableKey);
  assert.equal(context.unit.name, "Client Services");
  assert.ok(context.manager);
  assert.ok(context.directReports.length > 0);
  assert.ok(context.roles.some((role) => role.name === "Client Services Lead"));
  assert.ok(
    context.ownedProcesses.some(
      (process) => process.id === "receive-service-request",
    ),
  );
  assert.ok(context.systems.some((system) => system.name === "Intake Vault"));
  assert.equal(context.ownedProcesses[0].families[0].name, "Client lifecycle");
  assert.ok(
    context.connectedUnits.some((unit) => unit.relationship === "Your Unit"),
  );
});

test("an exact current Person-Position assignment is required", async () => {
  const input = await fictionalProjection();
  assert.throws(
    () =>
      buildPersonalContext({
        association: {
          applicationIdentity: "temporary-admin",
          personStableKey,
          positionStableKey: "84232496-1656-46f8-bab3-2ae2ac3ed7df",
        },
        ...input,
      }),
    PersonalContextResolutionError,
  );
});

test("personal Discovery questions match the same Process keys as the organizational model", async () => {
  const input = await fictionalProjection();
  const process = input.explorerData.processes[0];
  const observation = {
    createdAt: asOf,
    epistemicState: "needs_validation",
    id: "fictional-observation",
    processKey: process.id,
    processName: process.name,
    promptText: "Who validates the handoff?",
    sessionId: "fictional-session",
    supersedesObservationId: null,
  };
  const sources = buildKnowledgeGaps({
    asOf,
    discovery: {
      decisions: [],
      observations: [
        observation,
        { ...observation, id: "unrelated-observation", processKey: "process:999" },
      ],
    },
    operatingModel: { processes: [], processSteps: [], roles: [] },
    organizationKey: "organization:1",
    structure: { positions: [], roleMandates: [], roleCoverages: [] },
  });
  const context = buildPersonalContext({
    ...input,
    association: { applicationIdentity: "temporary-admin", personStableKey, positionStableKey },
    knowledgeGaps: sources,
  });
  assert.deepEqual(
    context.unresolved.map((item) => item.sourceStableKey),
    ["fictional-observation"],
  );

  // The live adapter must normalize only after its tenant and stable-key join.
  const reader = await read("lib/knowledge-gaps-neon.ts");
  assert.match(reader, /processId: processTable\.id/);
  assert.match(reader, /processKey: `process:\$\{processId\}`/);
  assert.match(reader, /eq\(processTable\.stableKey, discoverySession\.processStableKey\)/);
  assert.match(reader, /eq\(processTable\.organizationId, organizationId\)/);
});

test("dependency descriptions preserve source and target in both directions", () => {
  for (const [type, verb] of Object.entries({
    provides_to: "provides to",
    receives_from: "receives from",
    requires: "requires",
    triggers: "triggers",
  })) {
    assert.equal(
      describePersonalContextDependency("Current work", {
        direction: "outgoing", processName: "Connected work", type,
      }),
      `Current work ${verb} Connected work`,
    );
    assert.equal(
      describePersonalContextDependency("Current work", {
        direction: "incoming", processName: "Connected work", type,
      }),
      `Connected work ${verb} Current work`,
    );
  }
});

test("the route is a read-only lens with outward navigation and no canonical writes", async () => {
  const [architecture, page, view, shell, deployment] = await Promise.all([
    read("ARCHITECTURE_DECISIONS.md"),
    read("app/context/page.tsx"),
    read("app/personal-context.tsx"),
    read("app/workspace-shell.tsx"),
    read("docs/WORKSPACE_DEPLOYMENT_CONTRACT.md"),
  ]);

  assert.match(architecture, /LAD-071/);
  assert.match(page, /loadPersonalContextExperience/);
  assert.match(page, /if \(!experience\.enabled\) notFound\(\)/);
  assert.match(view, /See the whole organization/);
  assert.match(view, /Open the whole Studio/);
  assert.match(view, /application identity, Person,\s+Position, and Operational Roles remain separate/);
  assert.match(shell, /label: "Your context"/);
  assert.match(deployment, /read-only personal\s+lens/);
  assert.doesNotMatch(view, /server action|form action|INSERT|UPDATE|DELETE/i);
});
