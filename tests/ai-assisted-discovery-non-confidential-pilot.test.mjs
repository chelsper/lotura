import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  NonConfidentialPilotAuthorizationError,
  NonConfidentialPilotConfigurationError,
  authorizeNonConfidentialPilotRequest,
  buildNonConfidentialPilotPreview,
  nonConfidentialPilotFallback,
  resolveNonConfidentialPilotConfiguration,
} from "../lib/discovery-assistance-non-confidential-pilot.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const privateRuntime = {
  authentication: {
    adminIdentifier: "fictional-pilot-owner",
    mode: "temporary-password",
  },
  operatingModel: {
    deploymentEnvironment: "production",
    mode: "neon",
    organizationId: 17,
  },
};

const boundedInput = {
  assistanceKind: "question_suggestions",
  dataClassification: "non_confidential_test",
  deploymentEnvironment: "production",
  organizationId: 17,
  originalText: null,
  packet: {
    currentQuestion: "Which systems are used?",
    participantFocus: "the fictional printing handoff",
    promptKey: "systems",
    sessionKind: "process",
    sources: [
      {
        kind: "process_snapshot",
        sequence: 1,
        snapshot: {
          name: "Fictional Campus Printing",
          purpose: "Help fictional participants print documents.",
          scopeStatement: "Review the ordinary printing handoff.",
          status: "draft",
        },
      },
      {
        kind: "process_observation",
        sequence: 2,
        snapshot: {
          createdAt: "2026-08-22T12:00:00.000Z",
          epistemicState: "needs_validation",
          promptText: "Which systems are used?",
          responseText: "A physical card may still be required.",
          scopeStatement: "Review the ordinary printing handoff.",
        },
      },
    ],
    topic: "systems",
  },
  sessionId: "10000000-0000-4000-8000-000000000001",
  sessionRevision: 3,
};

const enabledConfiguration = {
  dataClassification: "non_confidential_test",
  deploymentEnvironment: "production",
  enabled: true,
  organizationId: 17,
  providerKey: "openai",
  providerProjectId: "proj_fictional_pilot",
};

test("LAD-066 authorizes only an explicitly non-confidential bounded pilot", async () => {
  const decisions = await read("ARCHITECTURE_DECISIONS.md");
  const start = decisions.indexOf("### LAD-066");
  assert.notEqual(start, -1);
  const decision = decisions.slice(start);
  assert.match(decision, /explicitly non-confidential AI pilot/);
  assert.match(decision, /two participant confirmations/i);
  assert.match(decision, /exact Organization and\s+environment allowlist/i);
  assert.match(decision, /manual kill switch/);
  assert.match(decision, /Public Northstar\s+must remain unable/);
  assert.match(decision, /does not authorize confidential or regulated content/);
  assert.match(decision, /cannot become\s+evidence/);
});

test("the repository pilot is disabled by default and the kill switch fails closed", () => {
  assert.deepEqual(
    resolveNonConfidentialPilotConfiguration({}, privateRuntime),
    {
      enabled: false,
      fallback: "standard_questions",
      reason: "disabled",
    },
  );
  assert.deepEqual(
    resolveNonConfidentialPilotConfiguration(
      { LOTURA_AI_ASSISTANCE_PILOT_MODE: "non_confidential_pilot" },
      privateRuntime,
    ),
    {
      enabled: false,
      fallback: "standard_questions",
      reason: "kill_switch",
    },
  );
  assert.deepEqual(nonConfidentialPilotFallback("kill_switch"), {
    fallback: "standard_questions",
    ok: false,
    reason: "kill_switch",
  });
});

test("enablement requires the exact authenticated Organization and environment", () => {
  const environment = {
    LOTURA_AI_ASSISTANCE_PILOT_ENVIRONMENT: "production",
    LOTURA_AI_ASSISTANCE_PILOT_KILL_SWITCH: "off",
    LOTURA_AI_ASSISTANCE_PILOT_MODE: "non_confidential_pilot",
    LOTURA_AI_ASSISTANCE_PILOT_OPENAI_PROJECT_ID: "proj_fictional_pilot",
    LOTURA_AI_ASSISTANCE_PILOT_ORGANIZATION_ID: "17",
  };
  assert.deepEqual(
    resolveNonConfidentialPilotConfiguration(environment, privateRuntime),
    {
      dataClassification: "non_confidential_test",
      deploymentEnvironment: "production",
      enabled: true,
      organizationId: 17,
      providerKey: "openai",
      providerProjectId: "proj_fictional_pilot",
    },
  );

  assert.throws(
    () => resolveNonConfidentialPilotConfiguration(
      { ...environment, LOTURA_AI_ASSISTANCE_PILOT_ORGANIZATION_ID: "18" },
      privateRuntime,
    ),
    NonConfidentialPilotConfigurationError,
  );
  assert.throws(
    () => resolveNonConfidentialPilotConfiguration(
      { ...environment, LOTURA_AI_ASSISTANCE_PILOT_ENVIRONMENT: "preview" },
      privateRuntime,
    ),
    NonConfidentialPilotConfigurationError,
  );
  assert.throws(
    () => resolveNonConfidentialPilotConfiguration(environment, {
      authentication: { mode: "public" },
      operatingModel: {
        deploymentEnvironment: "production",
        mode: "demo",
        organizationId: null,
      },
    }),
    /cannot run in public Northstar|authenticated private-workspace access/,
  );
});

test("the preview is the exact bounded provider context and both confirmations are required", () => {
  const preview = buildNonConfidentialPilotPreview(boundedInput);
  assert.equal(preview.providerContext.dataClassification, "non_confidential_test");
  assert.deepEqual(preview.providerContext.packet, boundedInput.packet);
  assert.equal(preview.providerContext.originalText, null);
  assert.equal(preview.affirmations.length, 2);
  assert.match(preview.disclosure, /send the information shown here to OpenAI/i);
  assert.match(preview.disclosure, /up to 30 days/i);
  assert.equal(preview.contextFingerprint.length, 64);

  for (const missing of [
    { nonConfidentialAuthorized: false, providerRetentionAccepted: true },
    { nonConfidentialAuthorized: true, providerRetentionAccepted: false },
  ]) {
    assert.throws(
      () => authorizeNonConfidentialPilotRequest({
        ...boundedInput,
        ...missing,
        confirmedContextFingerprint: preview.contextFingerprint,
      }, enabledConfiguration),
      NonConfidentialPilotAuthorizationError,
    );
  }
  assert.throws(
    () => authorizeNonConfidentialPilotRequest({
      ...boundedInput,
      confirmedContextFingerprint: "0".repeat(64),
      nonConfidentialAuthorized: true,
      providerRetentionAccepted: true,
    }, enabledConfiguration),
    /changed after it was reviewed/,
  );
});

test("request authorization requires the resolved exact pilot configuration", () => {
  const preview = buildNonConfidentialPilotPreview(boundedInput);
  const confirmedInput = {
    ...boundedInput,
    confirmedContextFingerprint: preview.contextFingerprint,
    nonConfidentialAuthorized: true,
    providerRetentionAccepted: true,
  };
  assert.throws(
    () => authorizeNonConfidentialPilotRequest(confirmedInput),
    NonConfidentialPilotConfigurationError,
  );
  assert.throws(
    () => authorizeNonConfidentialPilotRequest(confirmedInput, {
      ...enabledConfiguration,
      organizationId: 18,
    }),
    NonConfidentialPilotConfigurationError,
  );
});

test("an authorized request remains foreground, stateless, tool-free, and strictly structured", () => {
  const preview = buildNonConfidentialPilotPreview(boundedInput);
  const result = authorizeNonConfidentialPilotRequest({
    ...boundedInput,
    confirmedContextFingerprint: preview.contextFingerprint,
    nonConfidentialAuthorized: true,
    providerRetentionAccepted: true,
  }, enabledConfiguration);
  const request = result.request;
  assert.equal(request.model, "gpt-5.6-terra");
  assert.equal(request.store, false);
  assert.equal(request.background, false);
  assert.equal(request.tool_choice, "none");
  assert.deepEqual(request.tools, []);
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.schema.properties.suggestions.maxItems, 1);
  assert.equal("conversation" in request, false);
  assert.equal("previous_response_id" in request, false);
  assert.match(
    request.input[0].content[0].text,
    /specific unresolved fact, contradiction, dependency, or uncertainty/i,
  );
  assert.match(
    request.input[0].content[0].text,
    /ask whether it is true before asking what follows/i,
  );
  assert.deepEqual(
    JSON.parse(request.input[1].content[0].text),
    preview.providerContext,
  );
});

test("obvious secrets, personal identifiers, disallowed fields, and unlisted fields fail before authorization", () => {
  const cases = [
    (() => {
      const input = structuredClone(boundedInput);
      input.packet.sources[0].snapshot.purpose =
        "Use postgresql://owner:secret@example.invalid/workspace";
      return input;
    })(),
    (() => {
      const input = structuredClone(boundedInput);
      input.packet.sources[1].snapshot.responseText =
        "Use sk-proj-not-a-real-secret-1234567890";
      return input;
    })(),
    (() => {
      const input = structuredClone(boundedInput);
      input.packet.sources[1].snapshot.responseText =
        "Student email: person@example.edu";
      return input;
    })(),
    (() => {
      const input = structuredClone(boundedInput);
      input.packet.sources[0].snapshot.studentId = "123456";
      return input;
    })(),
    (() => {
      const input = structuredClone(boundedInput);
      input.packet.sources[0].snapshot.internalNote = "Not allowlisted";
      return input;
    })(),
  ];
  for (const input of cases) {
    assert.throws(
      () => buildNonConfidentialPilotPreview(input),
      NonConfidentialPilotAuthorizationError,
    );
  }
});

test("the participant-facing authorization is plain-language, exact-context, and non-blocking", async () => {
  const component = await read(
    "app/studio/discovery/discovery-assistance-pilot-authorization.tsx",
  );
  assert.match(component, /Review what would be shared/);
  assert.match(component, /exact interview context/);
  assert.match(component, /preview\.providerContext\.originalText/);
  assert.match(component, /packet\.sources\.map/);
  assert.match(component, /confirmedContextFingerprint/);
  assert.match(component, /affirmations\.map/);
  assert.match(component, /required/);
  assert.match(component, /Leaving either box unchecked sends nothing/);
  assert.match(component, /regular interview stays\s+available/);
  assert.doesNotMatch(component, /canonical|sanitized working draft/i);
});

test("the authorization policy stays content-isolated after request metadata is added", async () => {
  const [contract, wrapper, transport, transportWrapper, runtimeWrapper, administration, provider, journal, migration, documentation] =
    await Promise.all([
      read("lib/discovery-assistance-non-confidential-pilot.mjs"),
      read("lib/discovery-assistance-non-confidential-pilot.ts"),
      read("lib/discovery-assistance-openai-pilot-transport.mjs"),
      read("lib/discovery-assistance-openai-pilot-transport.ts"),
      read("lib/discovery-assistance-openai-pilot-runtime.ts"),
      read("lib/discovery-assistance-administration.ts"),
      read("lib/discovery-assistance-provider.ts"),
      read("drizzle/meta/_journal.json"),
      read("drizzle/0030_ai_assistance_request_metadata.sql"),
      read("docs/AI_ASSISTED_DISCOVERY_NON_CONFIDENTIAL_PILOT_AUTHORIZATION.md"),
    ]);
  assert.match(wrapper, /import "server-only"/);
  assert.match(transportWrapper, /import "server-only"/);
  assert.match(runtimeWrapper, /import "server-only"/);
  assert.doesNotMatch(
    contract,
    /OPENAI_API_KEY|api\.openai\.com|\bfetch\s*\(|process\.env/,
  );
  assert.doesNotMatch(
    transport,
    /OPENAI_API_KEY|process\.env|console\.|\blog\s*\(/,
  );
  assert.match(administration, /executeOpenAINonConfidentialPilotFromServer/);
  assert.match(administration, /buildNonConfidentialPilotPreview/);
  assert.match(provider, /key: "mocked_provider"/);
  assert.match(journal, /"idx": 30/);
  assert.match(migration, /provider_input_tokens/);
  assert.doesNotMatch(migration, /prompt_text|response_text|provider_response/);
  assert.match(documentation, /one bounded Production request/i);
  assert.match(documentation, /provider route is disabled again by the manual kill switch/i);
  assert.match(documentation, /broader rollout not authorized/i);
});
