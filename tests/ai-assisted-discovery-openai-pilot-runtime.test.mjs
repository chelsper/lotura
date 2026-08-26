import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OpenAINonConfidentialPilotCredentialError,
  executeConfiguredOpenAINonConfidentialPilot,
} from "../lib/discovery-assistance-openai-pilot-runtime.mjs";
import {
  buildNonConfidentialPilotPreview,
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

const baseEnvironment = {
  LOTURA_AI_ASSISTANCE_PILOT_ENVIRONMENT: "production",
  LOTURA_AI_ASSISTANCE_PILOT_KILL_SWITCH: "off",
  LOTURA_AI_ASSISTANCE_PILOT_MODE: "non_confidential_pilot",
  LOTURA_AI_ASSISTANCE_PILOT_OPENAI_PROJECT_ID: "proj_fictional_runtime",
  LOTURA_AI_ASSISTANCE_PILOT_ORGANIZATION_ID: "17",
};

const baseInput = {
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
  sessionId: "30000000-0000-4000-8000-000000000001",
  sessionRevision: 1,
};

function confirmedInput() {
  const preview = buildNonConfidentialPilotPreview(baseInput);
  return {
    ...baseInput,
    confirmedContextFingerprint: preview.contextFingerprint,
    nonConfidentialAuthorized: true,
    providerRetentionAccepted: true,
  };
}

function providerResponse() {
  const body = JSON.stringify({
    model: "gpt-5.6-terra",
    output: [
      {
        content: [
          {
            text: JSON.stringify({
              suggestions: [
                {
                  kind: "follow_up_question",
                  originalText: null,
                  promptKey: "systems",
                  rationale: "The physical-card dependency remains uncertain.",
                  suggestedText: "Is a physical card still required at that printer?",
                  topic: "systems",
                },
              ],
            }),
            type: "output_text",
          },
        ],
        role: "assistant",
        status: "completed",
        type: "message",
      },
    ],
    status: "completed",
    usage: {
      input_tokens: 20,
      output_tokens: 10,
      total_tokens: 30,
    },
  });
  return {
    headers: { get: () => String(body.length) },
    ok: true,
    async text() {
      return body;
    },
  };
}

test("the disabled and kill-switch paths never require or read a credential", async () => {
  for (const environment of [
    {},
    { LOTURA_AI_ASSISTANCE_PILOT_MODE: "non_confidential_pilot" },
  ]) {
    let calls = 0;
    const result = await executeConfiguredOpenAINonConfidentialPilot({
      environment,
      fetchImpl: async () => {
        calls += 1;
        return providerResponse();
      },
      input: baseInput,
      runtimeAccess: privateRuntime,
    });
    assert.equal(calls, 0);
    assert.equal(result.ok, false);
    assert.equal(result.fallback, "standard_questions");
  }
});

test("an enabled runtime fails closed when the dedicated credential is absent or invalid", async () => {
  let calls = 0;
  for (const candidate of [undefined, "not-a-key", "sk-short"]) {
    const environment = {
      ...baseEnvironment,
      ...(candidate === undefined
        ? {}
        : { LOTURA_AI_ASSISTANCE_PILOT_OPENAI_API_KEY: candidate }),
    };
    await assert.rejects(
      () => executeConfiguredOpenAINonConfidentialPilot({
        environment,
        fetchImpl: async () => {
          calls += 1;
          return providerResponse();
        },
        input: confirmedInput(),
        runtimeAccess: privateRuntime,
      }),
      OpenAINonConfidentialPilotCredentialError,
    );
  }
  assert.equal(calls, 0);
});

test("the server boundary uses only the dedicated credential and returns no secret", async () => {
  const apiKey = "sk-svcacct-fictional-runtime-key-1234567890";
  let capturedAuthorization;
  const result = await executeConfiguredOpenAINonConfidentialPilot({
    environment: {
      ...baseEnvironment,
      LOTURA_AI_ASSISTANCE_PILOT_OPENAI_API_KEY: apiKey,
      OPENAI_API_KEY: "sk-should-not-be-used-1234567890",
    },
    fetchImpl: async (_url, init) => {
      capturedAuthorization = init.headers.Authorization;
      return providerResponse();
    },
    input: confirmedInput(),
    runtimeAccess: privateRuntime,
    timeoutMs: 50,
  });

  assert.equal(capturedAuthorization, `Bearer ${apiKey}`);
  assert.equal(result.ok, true);
  assert.doesNotMatch(JSON.stringify(result), /svcacct|fictional-runtime-key/);
});

test("the credential loader is server-only, content-silent, narrowly routed, and migration-free", async () => {
  const [
    runtime,
    wrapper,
    administration,
    actions,
    requestForm,
    processPage,
    inquiryPage,
    provider,
    journal,
    documentation,
  ] =
    await Promise.all([
      read("lib/discovery-assistance-openai-pilot-runtime.mjs"),
      read("lib/discovery-assistance-openai-pilot-runtime.ts"),
      read("lib/discovery-assistance-administration.ts"),
      read("app/studio/discovery/actions.ts"),
      read("app/studio/discovery/discovery-assistance-request-form.tsx"),
      read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
      read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
      read("lib/discovery-assistance-provider.ts"),
      read("drizzle/meta/_journal.json"),
      read("docs/AI_ASSISTED_DISCOVERY_NON_CONFIDENTIAL_PILOT_AUTHORIZATION.md"),
    ]);

  assert.match(wrapper, /import "server-only"/);
  assert.match(wrapper, /environment: process\.env/);
  assert.match(runtime, /LOTURA_AI_ASSISTANCE_PILOT_OPENAI_API_KEY/);
  assert.doesNotMatch(runtime + wrapper, /NEXT_PUBLIC_|console\.|JSON\.stringify\(error/);
  assert.match(administration, /executeOpenAINonConfidentialPilotFromServer/);
  assert.match(administration, /prepareProcessDiscoveryAssistancePilot/);
  assert.match(administration, /prepareInquiryDiscoveryAssistancePilot/);
  assert.match(actions, /confirmProcessOpenAIDiscoveryAssistanceAction/);
  assert.match(actions, /confirmInquiryOpenAIDiscoveryAssistanceAction/);
  assert.match(requestForm, /DiscoveryAssistancePilotAuthorization/);
  assert.match(requestForm, /Continue with OpenAI/);
  assert.doesNotMatch(actions + requestForm, /OPENAI_API_KEY|Authorization:\s*`Bearer/);
  assert.doesNotMatch(processPage, /openai-pilot-runtime/);
  assert.doesNotMatch(inquiryPage, /openai-pilot-runtime/);
  assert.match(provider, /key: "mocked_provider"/);
  assert.match(journal, /"idx": 29/);
  assert.doesNotMatch(journal, /"idx": 30/);
  assert.match(documentation, /server-only credential boundary/i);
  assert.match(documentation, /authenticated Discovery Server Actions/i);
  assert.match(documentation, /route remains inactive/i);
});
