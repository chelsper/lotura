export const OPENAI_GPT_5_6_TERRA_STANDARD_COST_BASIS =
  "openai-gpt-5.6-terra-standard-2026-08-26-v1";

const INPUT_MICROUSD_PER_TOKEN = 2;
const CACHED_INPUT_MICROUSD_PER_TOKEN = 0.2;
const OUTPUT_MICROUSD_PER_TOKEN = 12;

function validTokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function estimateOpenAIGpt56TerraStandardCostMicrousd(input) {
  if (
    !input
    || !validTokenCount(input.inputTokens)
    || !validTokenCount(input.cachedInputTokens)
    || !validTokenCount(input.outputTokens)
    || input.cachedInputTokens > input.inputTokens
  ) {
    throw new Error("OpenAI token usage is invalid for cost estimation.");
  }

  const uncachedInputTokens = input.inputTokens - input.cachedInputTokens;
  return Math.round(
    uncachedInputTokens * INPUT_MICROUSD_PER_TOKEN
      + input.cachedInputTokens * CACHED_INPUT_MICROUSD_PER_TOKEN
      + input.outputTokens * OUTPUT_MICROUSD_PER_TOKEN,
  );
}
