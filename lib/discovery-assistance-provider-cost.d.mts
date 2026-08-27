export const OPENAI_GPT_5_6_TERRA_STANDARD_COST_BASIS:
  "openai-gpt-5.6-terra-standard-2026-08-26-v1";

export function estimateOpenAIGpt56TerraStandardCostMicrousd(input: {
  cachedInputTokens: number;
  inputTokens: number;
  outputTokens: number;
}): number;
