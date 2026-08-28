import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  validateDiscoveryProcessProposalDraft,
} from "../lib/discovery-process-proposal-draft-model.mjs";
import {
  DISCOVERY_PROCESS_PROPOSAL_RESPONSES_ENDPOINT,
  buildDiscoveryProcessProposalRequest,
  executeOpenAIDiscoveryProcessProposal,
} from "../lib/discovery-process-proposal-draft-openai.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const fictionalCredential = "sk-fictional-process-proposal-credential-123456789";
const ids = {
  observation: "a0000000-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  process: "a0000000-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  role: "a0000000-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  step: "a0000000-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
  system: "a0000000-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
  exception: "a0000000-aaaa-4aaa-8aaa-aaaaaaaaaaa6",
};
const validationContext = {
  exceptionIds: [ids.exception],
  observationIds: [ids.observation],
  processIds: [ids.process],
  roleIds: [ids.role],
  stepIds: [ids.step],
  systemIds: [ids.system],
};
const draft = {
  changes: [
    {
      action: "add_process_step",
      dependencyDescription: null,
      dependencyDirection: null,
      dependencyType: null,
      exceptionCondition: null,
      exceptionId: null,
      exceptionName: null,
      exceptionResponse: null,
      ownerRoleId: null,
      processStepId: null,
      proposedPurpose: null,
      proposedStepInstructions: "The Fictional Finance Role records the batch after the handoff.",
      proposedStepPosition: 2,
      proposedStepTitle: "Record the batch",
      rationale: "The selected evidence identifies a downstream recording Step after the handoff.",
      relatedProcessId: null,
      responsibleRoleId: ids.role,
      sourceObservationIds: [ids.observation],
      systemId: null,
      systemUsage: null,
      title: "Add the downstream recording Step",
      unresolvedQuestion: null,
    },
  ],
  clear: ["The batch moves to Fictional Finance after the initial entry."],
  conflicts: ["The evidence names two possible completion boundaries."],
  needsValidation: ["Confirm whether deposit or approval happens first."],
  process: {
    dependencies: ["Fictional Finance completes downstream recording."],
    endBoundary: null,
    exceptions: [],
    handoffs: ["The batch moves from Advancement to Fictional Finance."],
    ownerRole: null,
    participants: ["Advancement", "Fictional Finance"],
    purpose: "Record and route fictional gifts.",
    steps: [
      {
        description: "Advancement records the fictional gift.",
        responsibleRole: "Advancement Role",
        sequence: 1,
        systems: ["Fictional Gift System"],
        title: "Record the gift",
      },
      {
        description: "Fictional Finance records the batch after the handoff.",
        responsibleRole: "Fictional Finance Role",
        sequence: 2,
        systems: [],
        title: "Record the batch",
      },
    ],
    trigger: "A fictional gift arrives.",
  },
  summary: "Advancement records a fictional gift and hands the batch to Fictional Finance for downstream recording. The final completion boundary still needs validation.",
};
const context = {
  currentMappingItems: [],
  documentedProcess: {
    process: { name: "Fictional Gift Processing", purpose: null },
    steps: [],
  },
  interview: {
    observations: [
      {
        disposition: "use_in_proposal",
        epistemicState: "known",
        id: ids.observation,
        promptText: "What happens after the handoff?",
        responseText: "Fictional Finance records the batch.",
      },
    ],
    scopeStatement: "Understand fictional gift handling.",
  },
  processName: "Fictional Gift Processing",
  targetCatalog: {
    exceptions: [],
    processes: [{ id: ids.process, name: "Fictional Finance Processing" }],
    roles: [{ id: ids.role, name: "Fictional Finance Role" }],
    steps: [{ id: ids.step, position: 1, title: "Record the gift" }],
    systems: [{ id: ids.system, name: "Fictional Gift System" }],
  },
};

function response(payload) {
  const body = JSON.stringify(payload);
  return {
    headers: { get: () => String(body.length) },
    ok: true,
    async text() { return body; },
  };
}

test("LAD-068 validates a readable Process draft and exact evidence-linked candidate", () => {
  assert.deepEqual(
    validateDiscoveryProcessProposalDraft(draft, validationContext),
    draft,
  );
  assert.equal(
    validateDiscoveryProcessProposalDraft({
      ...draft,
      changes: [{
        ...draft.changes[0],
        sourceObservationIds: ["b0000000-bbbb-4bbb-8bbb-bbbbbbbbbbb9"],
      }],
    }, validationContext),
    null,
  );
  assert.equal(
    validateDiscoveryProcessProposalDraft({
      ...draft,
      changes: [{
        ...draft.changes[0],
        responsibleRoleId: "b0000000-bbbb-4bbb-8bbb-bbbbbbbbbbb9",
      }],
    }, validationContext),
    null,
  );
});

test("the proposal draft uses one foreground stateless tool-free request", async () => {
  let calls = 0;
  let captured;
  const providerPayload = {
    model: "gpt-5.6-terra",
    output: [{
      content: [{ text: JSON.stringify(draft), type: "output_text" }],
      role: "assistant",
      status: "completed",
      type: "message",
    }],
    status: "completed",
    usage: {
      input_tokens: 800,
      input_tokens_details: { cached_tokens: 200 },
      output_tokens: 500,
      total_tokens: 1300,
    },
  };
  const result = await executeOpenAIDiscoveryProcessProposal({
    apiKey: fictionalCredential,
    context,
    fetchImpl: async (url, init) => {
      calls += 1;
      captured = { init, url };
      return response(providerPayload);
    },
    providerProjectId: "proj_fictional_process_proposal",
    timeoutMs: 100,
    validationContext,
  });
  assert.equal(calls, 1);
  assert.equal(captured.url, DISCOVERY_PROCESS_PROPOSAL_RESPONSES_ENDPOINT);
  const request = JSON.parse(captured.init.body);
  assert.equal(request.model, "gpt-5.6-terra");
  assert.equal(request.store, false);
  assert.equal(request.background, false);
  assert.equal(request.tool_choice, "none");
  assert.deepEqual(request.tools, []);
  assert.equal("conversation" in request, false);
  assert.equal("previous_response_id" in request, false);
  assert.equal(result.ok, true);
  assert.deepEqual(result.draft, draft);
  assert.equal(result.providerMetadata.requestCount, 1);
});

test("the request includes reviewed Process context but no authority or hidden runtime context", () => {
  const request = buildDiscoveryProcessProposalRequest(context);
  const serialized = JSON.stringify(request);
  assert.match(serialized, /Fictional Gift Processing/);
  assert.match(serialized, /use_in_proposal/);
  assert.match(serialized, new RegExp(ids.observation));
  assert.doesNotMatch(serialized, /databaseUrl|actorIdentifier|apiKey|password/);
});

test("LAD-068 keeps generation temporary and requires an explicit human mapping save", async () => {
  const [decisions, actions, controls, draftUi, route, roadmap] = await Promise.all([
    read("ARCHITECTURE_DECISIONS.md"),
    read("app/studio/discovery/actions.ts"),
    read("app/studio/discovery/discovery-mapping-controls.tsx"),
    read("app/studio/discovery/discovery-process-proposal-draft.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/reconcile/page.tsx"),
    read("PRODUCT_ROADMAP.md"),
  ]);
  assert.match(decisions, /LAD-068 — AI may draft an evidence-linked Process proposal/);
  assert.match(decisions, /requires no migration/);
  assert.match(actions, /draftDiscoveryProcessProposalAction/);
  assert.match(actions, /saveAIDiscoveryMappingCandidateAction/);
  assert.match(actions, /saveDiscoveryMappingItemFromForm/);
  assert.match(controls, /AI-assisted draft:/);
  assert.match(draftUi, /Nothing is saved automatically/);
  assert.match(draftUi, /review, edit, and save/);
  assert.match(route, /Include as evidence for a proposed update/);
  assert.match(route, /does not rewrite or change the Process/);
  assert.match(roadmap, /only a human save may create/);
  assert.doesNotMatch(
    actions,
    /(?:insert into|update|delete from) (?:processes|process_steps|systems|exceptions|operating_model_changes)/i,
  );
});
