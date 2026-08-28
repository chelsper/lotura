import {
  assertNonConfidentialPilotContent,
} from "./discovery-assistance-non-confidential-pilot.mjs";
import {
  DISCOVERY_PROCESS_PROPOSAL_PROMPT_POLICY_VERSION,
  validateDiscoveryProcessProposalDraft,
} from "./discovery-process-proposal-draft-model.mjs";

export const DISCOVERY_PROCESS_PROPOSAL_MODEL = "gpt-5.6-terra";
export const DISCOVERY_PROCESS_PROPOSAL_RESPONSES_ENDPOINT =
  "https://api.openai.com/v1/responses";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_CHARACTERS = 240_000;

const TEXT_ARRAY = {
  items: { maxLength: 1200, minLength: 1, type: "string" },
  maxItems: 30,
  type: "array",
};

const NULLABLE_TEXT = { type: ["string", "null"] };
const NULLABLE_UUID = {
  pattern: "^[0-9a-fA-F-]{36}$",
  type: ["string", "null"],
};

const CHANGE_PROPERTIES = {
  action: {
    enum: [
      "update_process_purpose",
      "change_process_owner",
      "preserve_unresolved",
      "add_process_step",
      "revise_process_step",
      "change_step_responsibility",
      "link_existing_system",
      "add_process_exception",
      "revise_process_exception",
      "add_process_dependency",
    ],
    type: "string",
  },
  dependencyDescription: NULLABLE_TEXT,
  dependencyDirection: {
    enum: ["upstream", "downstream", null],
    type: ["string", "null"],
  },
  dependencyType: {
    enum: ["requires", "receives_from", "provides_to", "triggers", null],
    type: ["string", "null"],
  },
  exceptionCondition: NULLABLE_TEXT,
  exceptionId: NULLABLE_UUID,
  exceptionName: NULLABLE_TEXT,
  exceptionResponse: NULLABLE_TEXT,
  ownerRoleId: NULLABLE_UUID,
  processStepId: NULLABLE_UUID,
  proposedPurpose: NULLABLE_TEXT,
  proposedStepInstructions: NULLABLE_TEXT,
  proposedStepPosition: { minimum: 1, type: ["integer", "null"] },
  proposedStepTitle: NULLABLE_TEXT,
  rationale: { maxLength: 2000, minLength: 1, type: "string" },
  relatedProcessId: NULLABLE_UUID,
  responsibleRoleId: NULLABLE_UUID,
  sourceObservationIds: {
    items: { pattern: "^[0-9a-fA-F-]{36}$", type: "string" },
    maxItems: 50,
    minItems: 1,
    type: "array",
  },
  systemId: NULLABLE_UUID,
  systemUsage: NULLABLE_TEXT,
  title: { maxLength: 255, minLength: 1, type: "string" },
  unresolvedQuestion: NULLABLE_TEXT,
};

const RESPONSE_SCHEMA = {
  additionalProperties: false,
  properties: {
    changes: {
      items: {
        additionalProperties: false,
        properties: CHANGE_PROPERTIES,
        required: Object.keys(CHANGE_PROPERTIES),
        type: "object",
      },
      maxItems: 20,
      type: "array",
    },
    clear: { ...TEXT_ARRAY, maxItems: 20 },
    conflicts: { ...TEXT_ARRAY, maxItems: 20 },
    needsValidation: { ...TEXT_ARRAY, maxItems: 20 },
    process: {
      additionalProperties: false,
      properties: {
        dependencies: TEXT_ARRAY,
        endBoundary: NULLABLE_TEXT,
        exceptions: TEXT_ARRAY,
        handoffs: TEXT_ARRAY,
        ownerRole: NULLABLE_TEXT,
        participants: {
          items: { maxLength: 500, minLength: 1, type: "string" },
          maxItems: 30,
          type: "array",
        },
        purpose: NULLABLE_TEXT,
        steps: {
          items: {
            additionalProperties: false,
            properties: {
              description: { maxLength: 2000, minLength: 1, type: "string" },
              responsibleRole: NULLABLE_TEXT,
              sequence: { minimum: 1, type: "integer" },
              systems: {
                items: { maxLength: 500, minLength: 1, type: "string" },
                maxItems: 12,
                type: "array",
              },
              title: { maxLength: 255, minLength: 1, type: "string" },
            },
            required: [
              "description",
              "responsibleRole",
              "sequence",
              "systems",
              "title",
            ],
            type: "object",
          },
          maxItems: 40,
          type: "array",
        },
        trigger: NULLABLE_TEXT,
      },
      required: [
        "dependencies",
        "endBoundary",
        "exceptions",
        "handoffs",
        "ownerRole",
        "participants",
        "purpose",
        "steps",
        "trigger",
      ],
      type: "object",
    },
    summary: { maxLength: 6000, minLength: 1, type: "string" },
  },
  required: [
    "changes",
    "clear",
    "conflicts",
    "needsValidation",
    "process",
    "summary",
  ],
  type: "object",
};

const INSTRUCTIONS = `You are Lotura's AI Process Synthesis and Proposal Draft Analyst.

Create the clearest evidence-supported description of how the Process actually works today. Organize the information into a readable sequence; do not dump interview answers or database fields. Improve wording and placement without changing meaning. Never optimize the Process into an imagined ideal state, invent facts, infer authority, or silently resolve uncertainty.

The documented Process is the current trusted destination. Interview observations are evidence. Human review dispositions say which observations may support a documented change. Only observations whose disposition is use_in_proposal may be cited in a candidate change. Observations kept as documented may inform the readable synthesis. Observations left for later may inform needsValidation or conflicts but must not become candidate changes.

Return:
1. A concise normal-language summary.
2. A readable current-state Process structure with purpose, trigger, end boundary, participants, owner Role, ordered Steps, Systems, handoffs, Exceptions, and dependencies. Use null or empty arrays when evidence does not establish a field.
3. Separate clear information, validation needs, and conflicts.
4. Zero or more candidate typed changes using only the supplied action vocabulary and exact supplied identifiers.

For each candidate change:
- cite one or more exact selected observation IDs;
- use exact supplied target IDs for existing Steps, Roles, Systems, Exceptions, or related Processes;
- decompose a single observation into multiple candidates when it contains distinct changes;
- place a new Step at the best evidence-supported numeric position;
- preserve an unresolved question when evidence cannot support a documented fact;
- omit any candidate that cannot be safely targeted;
- do not duplicate a current mapping item.

The draft is noncanonical and will be edited by a human. Do not approve, apply, or claim that the documented Process changed. Return only the required structured response. You have no tools.`;

function extractOutputText(payload) {
  if (
    !payload
    || payload.status !== "completed"
    || payload.model !== DISCOVERY_PROCESS_PROPOSAL_MODEL
    || !Array.isArray(payload.output)
  ) return null;
  const messages = payload.output.filter((item) => item?.type === "message");
  if (messages.length !== 1) return null;
  const [message] = messages;
  if (
    message.role !== "assistant"
    || message.status !== "completed"
    || !Array.isArray(message.content)
    || message.content.length !== 1
    || message.content[0]?.type !== "output_text"
    || typeof message.content[0].text !== "string"
  ) return null;
  return message.content[0].text;
}

function safeTokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function buildDiscoveryProcessProposalRequest(context) {
  const serializedContext = assertNonConfidentialPilotContent(
    {
      dataClassification: "non_confidential_test",
      proposalContext: context,
    },
    "AI Process proposal context",
  );
  return {
    background: false,
    input: [
      {
        content: [{ text: INSTRUCTIONS, type: "input_text" }],
        role: "developer",
      },
      {
        content: [{ text: serializedContext, type: "input_text" }],
        role: "user",
      },
    ],
    max_output_tokens: 8000,
    model: DISCOVERY_PROCESS_PROPOSAL_MODEL,
    reasoning: { effort: "medium" },
    store: false,
    text: {
      format: {
        name: "lotura_process_proposal_lad_068_alpha_v1",
        schema: RESPONSE_SCHEMA,
        strict: true,
        type: "json_schema",
      },
      verbosity: "low",
    },
    tool_choice: "none",
    tools: [],
  };
}

export async function executeOpenAIDiscoveryProcessProposal(options) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (
    typeof options.fetchImpl !== "function"
    || !/^sk-[A-Za-z0-9_-]{16,512}$/.test(String(options.apiKey ?? ""))
    || !/^proj_[A-Za-z0-9_-]{8,}$/.test(String(options.providerProjectId ?? ""))
    || !Number.isSafeInteger(timeoutMs)
    || timeoutMs < 1
    || timeoutMs > 30_000
  ) return { ok: false, reason: "invalid_configuration" };

  let request;
  try {
    request = buildDiscoveryProcessProposalRequest(options.context);
  } catch {
    return { ok: false, reason: "prohibited_or_oversized_context" };
  }

  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await options.fetchImpl(
      DISCOVERY_PROCESS_PROPOSAL_RESPONSES_ENDPOINT,
      {
        body: JSON.stringify(request),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Project": options.providerProjectId,
        },
        method: "POST",
        redirect: "error",
        signal: controller.signal,
      },
    );
    if (!response.ok) return { ok: false, reason: "provider_unavailable" };
    const declaredLength = Number(response.headers?.get?.("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_CHARACTERS) {
      return { ok: false, reason: "invalid_response" };
    }
    const responseText = await response.text();
    if (responseText.length > MAX_RESPONSE_CHARACTERS) {
      return { ok: false, reason: "invalid_response" };
    }
    const payload = JSON.parse(responseText);
    const outputText = extractOutputText(payload);
    if (!outputText) return { ok: false, reason: "invalid_response" };
    const draft = validateDiscoveryProcessProposalDraft(
      JSON.parse(outputText),
      options.validationContext,
    );
    if (!draft) return { ok: false, reason: "invalid_response" };
    assertNonConfidentialPilotContent(draft, "AI Process proposal output");

    const inputTokens = safeTokenCount(payload.usage?.input_tokens);
    const cachedInputTokens =
      safeTokenCount(payload.usage?.input_tokens_details?.cached_tokens) ?? 0;
    const outputTokens = safeTokenCount(payload.usage?.output_tokens);
    const totalTokens = safeTokenCount(payload.usage?.total_tokens);
    if (
      inputTokens === null
      || outputTokens === null
      || totalTokens === null
      || cachedInputTokens > inputTokens
      || totalTokens !== inputTokens + outputTokens
    ) return { ok: false, reason: "invalid_response" };
    return {
      draft,
      ok: true,
      providerMetadata: {
        cachedInputTokens,
        durationMs: Math.min(30_000, Date.now() - startedAt),
        inputTokens,
        model: DISCOVERY_PROCESS_PROPOSAL_MODEL,
        outputTokens,
        promptPolicyVersion: DISCOVERY_PROCESS_PROPOSAL_PROMPT_POLICY_VERSION,
        providerProjectId: options.providerProjectId,
        requestCount: 1,
        status: "completed",
        totalTokens,
      },
    };
  } catch {
    return {
      ok: false,
      reason: controller.signal.aborted ? "timeout" : "provider_unavailable",
    };
  } finally {
    clearTimeout(timeout);
  }
}
