import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  NonConfidentialPilotAuthorizationError,
  buildNonConfidentialPilotPreview,
} from "../lib/discovery-assistance-non-confidential-pilot.mjs";
import {
  OPENAI_RESPONSES_ENDPOINT,
  executeOpenAINonConfidentialPilot,
} from "../lib/discovery-assistance-openai-pilot-transport.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const fictionalCredential = [
  "sk",
  "proj",
  "fictional",
  "not",
  "a",
  "credential",
  "1234567890",
].join("-");

const configuration = {
  dataClassification: "non_confidential_test",
  deploymentEnvironment: "preview",
  enabled: true,
  organizationId: 41,
  providerKey: "openai",
  providerProjectId: "proj_fictional_transport",
};

const baseInput = {
  assistanceKind: "question_suggestions",
  dataClassification: "non_confidential_test",
  deploymentEnvironment: "preview",
  organizationId: 41,
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
  sessionId: "20000000-0000-4000-8000-000000000001",
  sessionRevision: 2,
};

const suggestion = {
  kind: "follow_up_question",
  originalText: null,
  promptKey: "systems",
  rationale:
    "The earlier answer is uncertain about the physical-card dependency.",
  suggestedText: "Is a physical card still required at that printer?",
  topic: "systems",
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

function providerPayload(overrides = {}) {
  return {
    model: "gpt-5.6-terra",
    output: [
      {
        summary: [],
        type: "reasoning",
      },
      {
        content: [
          {
            text: JSON.stringify({ suggestions: [suggestion] }),
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
      input_tokens: 400,
      output_tokens: 80,
      total_tokens: 480,
    },
    ...overrides,
  };
}

function response(payload, { ok = true, status = 200 } = {}) {
  const body = JSON.stringify(payload);
  return {
    headers: {
      get(name) {
        return name.toLowerCase() === "content-length"
          ? String(body.length)
          : null;
      },
    },
    ok,
    status,
    async text() {
      return body;
    },
  };
}

test("the transport makes exactly one bounded Responses request and returns attributable metadata", async () => {
  let calls = 0;
  let captured;
  const result = await executeOpenAINonConfidentialPilot({
    apiKey: fictionalCredential,
    configuration,
    fetchImpl: async (url, init) => {
      calls += 1;
      captured = { init, url };
      return response(providerPayload());
    },
    input: confirmedInput(),
    timeoutMs: 50,
  });

  assert.equal(calls, 1);
  assert.equal(captured.url, OPENAI_RESPONSES_ENDPOINT);
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.redirect, "error");
  assert.equal(captured.init.cache, "no-store");
  assert.equal(captured.init.headers["OpenAI-Project"], configuration.providerProjectId);
  assert.equal(captured.init.headers.Authorization, `Bearer ${fictionalCredential}`);
  const request = JSON.parse(captured.init.body);
  assert.equal(request.store, false);
  assert.equal(request.background, false);
  assert.equal(request.tool_choice, "none");
  assert.deepEqual(request.tools, []);
  assert.equal("conversation" in request, false);
  assert.equal("previous_response_id" in request, false);
  assert.deepEqual(result, {
    ok: true,
    providerMetadata: {
      inputTokens: 400,
      model: "gpt-5.6-terra",
      outputTokens: 80,
      promptPolicyVersion: "lad-064-v4",
      providerProjectId: "proj_fictional_transport",
      requestCount: 1,
      status: "completed",
      totalTokens: 480,
    },
    suggestions: [suggestion],
  });
});

test("authorization and exact configuration fail before transport", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response(providerPayload());
  };
  await assert.rejects(
    () => executeOpenAINonConfidentialPilot({
      apiKey: fictionalCredential,
      configuration,
      fetchImpl,
      input: baseInput,
    }),
    NonConfidentialPilotAuthorizationError,
  );
  await assert.rejects(
    () => executeOpenAINonConfidentialPilot({
      apiKey: fictionalCredential,
      configuration: { ...configuration, organizationId: 42 },
      fetchImpl,
      input: confirmedInput(),
    }),
    /must match this Organization and environment/,
  );
  assert.equal(calls, 0);
});

test("timeout aborts the one request and never retries", async () => {
  let calls = 0;
  let aborted = false;
  const result = await executeOpenAINonConfidentialPilot({
    apiKey: fictionalCredential,
    configuration,
    fetchImpl: async (_url, init) => {
      calls += 1;
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("synthetic aborted request"));
        });
      });
    },
    input: confirmedInput(),
    timeoutMs: 5,
  });
  assert.equal(calls, 1);
  assert.equal(aborted, true);
  assert.deepEqual(result, {
    fallback: "standard_questions",
    ok: false,
    reason: "timeout",
  });
});

test("provider, model, tool-shaped, and malformed failures return only safe fallback", async () => {
  const cases = [
    {
      expectedReason: "provider_unavailable",
      fetchImpl: async () => response({}, { ok: false, status: 429 }),
    },
    {
      expectedReason: "invalid_response",
      fetchImpl: async () => response(providerPayload({ model: "different-model" })),
    },
    {
      expectedReason: "invalid_response",
      fetchImpl: async () => response(providerPayload({
        output: [{ status: "completed", type: "web_search_call" }],
      })),
    },
    {
      expectedReason: "invalid_response",
      fetchImpl: async () => ({
        headers: { get: () => null },
        ok: true,
        async text() {
          return "not-json";
        },
      }),
    },
    {
      expectedReason: "invalid_response",
      fetchImpl: async () => response(providerPayload({
        output: [
          {
            content: [
              {
                text: JSON.stringify({
                  suggestions: [{
                    ...suggestion,
                    suggestedText: "Which systems are used?",
                  }],
                }),
                type: "output_text",
              },
            ],
            role: "assistant",
            status: "completed",
            type: "message",
          },
        ],
      })),
    },
  ];

  for (const entry of cases) {
    let calls = 0;
    const result = await executeOpenAINonConfidentialPilot({
      apiKey: fictionalCredential,
      configuration,
      fetchImpl: async (...args) => {
        calls += 1;
        return entry.fetchImpl(...args);
      },
      input: confirmedInput(),
      timeoutMs: 50,
    });
    assert.equal(calls, 1);
    assert.deepEqual(result, {
      fallback: "standard_questions",
      ok: false,
      reason: entry.expectedReason,
    });
  }
});

test("the server-only transport is injected, content-silent, narrowly wired, and migration-free", async () => {
  const [transport, wrapper, administration, provider, processPage, inquiryPage, journal] =
    await Promise.all([
      read("lib/discovery-assistance-openai-pilot-transport.mjs"),
      read("lib/discovery-assistance-openai-pilot-transport.ts"),
      read("lib/discovery-assistance-administration.ts"),
      read("lib/discovery-assistance-provider.ts"),
      read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
      read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
      read("drizzle/meta/_journal.json"),
    ]);
  assert.match(wrapper, /import "server-only"/);
  assert.match(transport, /fetchImpl/);
  assert.match(transport, /AbortController/);
  assert.doesNotMatch(
    transport,
    /OPENAI_API_KEY|process\.env|console\.|JSON\.stringify\(error/,
  );
  assert.match(administration, /executeOpenAINonConfidentialPilotFromServer/);
  assert.match(administration, /prepareProcessDiscoveryAssistancePilot/);
  assert.match(administration, /prepareInquiryDiscoveryAssistancePilot/);
  assert.match(provider, /key: "mocked_provider"/);
  assert.doesNotMatch(processPage, /openai-pilot-transport/);
  assert.doesNotMatch(inquiryPage, /openai-pilot-transport/);
  assert.match(journal, /"idx": 29/);
  assert.doesNotMatch(journal, /"idx": 30/);
});
