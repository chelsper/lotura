import {
  NON_CONFIDENTIAL_PILOT_CONTRACT,
  authorizeNonConfidentialPilotRequest,
  nonConfidentialPilotFallback,
  parseNonConfidentialPilotOutput,
} from "./discovery-assistance-non-confidential-pilot.mjs";

export const OPENAI_RESPONSES_ENDPOINT =
  "https://api.openai.com/v1/responses";

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_CHARACTERS = 100_000;
const TIMEOUT_MARKER = "lotura_openai_pilot_timeout";

function validateTransportOptions(options) {
  if (!options || typeof options.fetchImpl !== "function") {
    throw new Error("The OpenAI pilot transport requires an injected fetch implementation.");
  }
  if (!/^sk-[A-Za-z0-9_-]{16,}$/.test(String(options.apiKey ?? ""))) {
    throw new Error("The OpenAI pilot credential is unavailable or invalid.");
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new Error("The OpenAI pilot timeout is outside the approved bound.");
  }
  return timeoutMs;
}

function extractOutputText(payload) {
  if (
    !payload
    || payload.status !== "completed"
    || payload.model !== NON_CONFIDENTIAL_PILOT_CONTRACT.modelIdentifier
    || !Array.isArray(payload.output)
    || payload.output.length < 1
    || payload.output.length > 2
  ) {
    throw new Error("invalid_response");
  }
  const reasoningItems = payload.output.filter(
    (item) => item?.type === "reasoning",
  );
  const messages = payload.output.filter((item) => item?.type === "message");
  if (
    reasoningItems.length > 1
    || messages.length !== 1
    || reasoningItems.length + messages.length !== payload.output.length
  ) {
    throw new Error("invalid_response");
  }
  const [message] = messages;
  if (
    message?.type !== "message"
    || message.role !== "assistant"
    || message.status !== "completed"
    || !Array.isArray(message.content)
    || message.content.length !== 1
    || message.content[0]?.type !== "output_text"
    || typeof message.content[0].text !== "string"
  ) {
    throw new Error("invalid_response");
  }
  return message.content[0].text;
}

function safeTokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export async function executeOpenAINonConfidentialPilot(options) {
  const timeoutMs = validateTransportOptions(options);
  const authorization = authorizeNonConfidentialPilotRequest(
    options.input,
    options.configuration,
  );
  const controller = new AbortController();
  let timeoutHandle;
  let timedOut = false;
  const requestStartedAt = Date.now();

  try {
    const timeout = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error(TIMEOUT_MARKER));
      }, timeoutMs);
    });
    const providerResponse = await Promise.race([
      options.fetchImpl(OPENAI_RESPONSES_ENDPOINT, {
        body: JSON.stringify(authorization.request),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Project": options.configuration.providerProjectId,
        },
        method: "POST",
        redirect: "error",
        signal: controller.signal,
      }),
      timeout,
    ]);

    if (!providerResponse?.ok) {
      return nonConfidentialPilotFallback("provider_unavailable");
    }
    const declaredLength = Number(providerResponse.headers?.get?.("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_CHARACTERS) {
      return nonConfidentialPilotFallback("invalid_response");
    }
    const responseText = await Promise.race([
      providerResponse.text(),
      timeout,
    ]);
    if (responseText.length > MAX_RESPONSE_CHARACTERS) {
      return nonConfidentialPilotFallback("invalid_response");
    }

    let payload;
    try {
      payload = JSON.parse(responseText);
      const outputText = extractOutputText(payload);
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
      ) {
        throw new Error("invalid_response");
      }
      return {
        ok: true,
        providerMetadata: {
          cachedInputTokens,
          durationMs: Math.min(30_000, Math.max(0, Date.now() - requestStartedAt)),
          inputTokens,
          model: payload.model,
          outputTokens,
          promptPolicyVersion:
            NON_CONFIDENTIAL_PILOT_CONTRACT.promptPolicyVersion,
          providerProjectId: options.configuration.providerProjectId,
          requestCount: 1,
          status: payload.status,
          totalTokens,
        },
        suggestions: parseNonConfidentialPilotOutput(
          options.input,
          outputText,
        ),
      };
    } catch {
      return nonConfidentialPilotFallback("invalid_response");
    }
  } catch (error) {
    return nonConfidentialPilotFallback(
      timedOut || (error instanceof Error && error.message === TIMEOUT_MARKER)
        ? "timeout"
        : "provider_unavailable",
    );
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
