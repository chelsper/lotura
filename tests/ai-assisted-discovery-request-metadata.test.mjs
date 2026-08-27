import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  estimateOpenAIGpt56TerraStandardCostMicrousd,
  OPENAI_GPT_5_6_TERRA_STANDARD_COST_BASIS,
} from "../lib/discovery-assistance-provider-cost.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("the recorded GPT-5.6 Terra rate produces a versioned micro-dollar estimate", () => {
  assert.equal(
    OPENAI_GPT_5_6_TERRA_STANDARD_COST_BASIS,
    "openai-gpt-5.6-terra-standard-2026-08-26-v1",
  );
  assert.equal(
    estimateOpenAIGpt56TerraStandardCostMicrousd({
      cachedInputTokens: 100,
      inputTokens: 400,
      outputTokens: 80,
    }),
    1_580,
  );
  assert.throws(
    () => estimateOpenAIGpt56TerraStandardCostMicrousd({
      cachedInputTokens: 401,
      inputTokens: 400,
      outputTokens: 80,
    }),
    /token usage is invalid/,
  );
});

test("migration 0030 adds complete-or-empty typed request metadata only", async () => {
  const migration = await read("drizzle/0030_ai_assistance_request_metadata.sql");
  for (const column of [
    "provider_project_identifier",
    "provider_request_status",
    "provider_request_count",
    "provider_input_tokens",
    "provider_cached_input_tokens",
    "provider_output_tokens",
    "provider_total_tokens",
    "provider_duration_ms",
    "estimated_cost_microusd",
    "cost_basis_key",
  ]) {
    assert.match(migration, new RegExp(`ADD COLUMN "${column}"`));
  }
  assert.match(migration, /discovery_assistance_runs_request_metadata_shape_check/);
  assert.match(migration, /provider_request_count" = 1/);
  assert.match(migration, /provider_request_status" = 'completed'/);
  assert.match(migration, /provider_cached_input_tokens" <= "discovery_assistance_runs"\."provider_input_tokens/);
  assert.match(migration, /provider_total_tokens" = "discovery_assistance_runs"\."provider_input_tokens" \+ "discovery_assistance_runs"\."provider_output_tokens/);
  assert.doesNotMatch(migration, /prompt_text|response_text|suggested_text|provider_response|response_id/);
});

test("successful external runs persist only allowlisted non-content request facts", async () => {
  const administration = await read("lib/discovery-assistance-administration.ts");
  const processStart = administration.indexOf("async function persistProcessRun");
  const inquiryStart = administration.indexOf("async function persistInquiryRun");
  const requestStart = administration.indexOf("export async function requestProcessDiscoveryAssistance");
  for (const operation of [
    administration.slice(processStart, inquiryStart),
    administration.slice(inquiryStart, requestStart),
  ]) {
    assert.match(operation, /provider_project_identifier/);
    assert.match(operation, /provider_cached_input_tokens/);
    assert.match(operation, /estimated_cost_microusd/);
    assert.match(operation, /JSON\.stringify\(input\.provider\.requestMetadata \?\? null\)/);
    assert.doesNotMatch(operation, /providerResponse|outputText|responseId/);
  }
  assert.match(administration, /estimateOpenAIGpt56TerraStandardCostMicrousd/);
  assert.match(administration, /externalProviderAttribution\(external\.providerMetadata\)/);
});

test("authenticated interview pages show collapsed plain-language request details", async () => {
  const [component, processPage, inquiryPage, data] = await Promise.all([
    read("app/studio/discovery/discovery-assistance-request-details.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
    read("lib/discovery-assistance-data.ts"),
  ]);
  assert.match(component, /<details/);
  assert.match(component, /AI request details/);
  assert.match(component, /Estimated cost/);
  assert.match(component, /Provider billing is the final source/);
  assert.match(component, /Prompts and answers are not copied/);
  assert.doesNotMatch(component, /defaultOpen|open=/);
  for (const page of [processPage, inquiryPage]) {
    assert.match(page, /<DiscoveryAssistanceRequestDetails assistance=\{assistance\} \/>/);
  }
  assert.match(data, /requestMetadata: requestMetadata\(row\)/);
});
