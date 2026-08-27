import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("external assistance uses a two-step authenticated Server Action boundary", async () => {
  const [actions, administration, requestForm, authorization] =
    await Promise.all([
      read("app/studio/discovery/actions.ts"),
      read("lib/discovery-assistance-administration.ts"),
      read("app/studio/discovery/discovery-assistance-request-form.tsx"),
      read("app/studio/discovery/discovery-assistance-pilot-authorization.tsx"),
    ]);

  assert.match(actions, /prepareProcessDiscoveryAssistancePilot\(request\)/);
  assert.match(actions, /prepareInquiryDiscoveryAssistancePilot\(request\)/);
  assert.match(actions, /preparation\.mode === "external_review"/);
  assert.match(actions, /confirmProcessOpenAIDiscoveryAssistanceAction/);
  assert.match(actions, /confirmInquiryOpenAIDiscoveryAssistanceAction/);
  assert.match(actions, /nonConfidentialAuthorized.*=== "yes"/s);
  assert.match(actions, /providerRetentionAccepted.*=== "yes"/s);

  assert.match(administration, /buildNonConfidentialPilotPreview/);
  assert.match(administration, /confirmedContextFingerprint/);
  assert.match(administration, /executeOpenAINonConfidentialPilotFromServer/);
  assert.match(administration, /contextFingerprint: input\.confirmedContextFingerprint/);
  assert.match(administration, /provider: externalProviderAttribution\(external\.providerMetadata\)/);
  assert.doesNotMatch(administration, /console\.log|JSON\.stringify\(error/);

  assert.match(requestForm, /DiscoveryAssistancePilotAuthorization/);
  assert.match(requestForm, /Continue with OpenAI/);
  assert.match(requestForm, /Nothing is sent until you select both confirmations/);
  assert.match(authorization, /confirmedContextFingerprint/);
  assert.match(authorization, /required/);
  assert.doesNotMatch(
    requestForm + authorization,
    /OPENAI_API_KEY|Authorization:\s*`Bearer|api\.openai\.com/,
  );
});

test("the disabled route preserves the deterministic mock and manual fallback", async () => {
  const [administration, provider, environment, processPage, inquiryPage] =
    await Promise.all([
      read("lib/discovery-assistance-administration.ts"),
      read("lib/discovery-assistance-provider.ts"),
      read(".env.example"),
      read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
      read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
    ]);

  assert.match(administration, /if \(!configuration\.enabled\) return \{ mode: "mocked", ok: true \}/);
  assert.match(administration, /provider: discoveryAssistanceProvider/);
  assert.match(provider, /key: "mocked_provider"/);
  assert.match(environment, /LOTURA_AI_ASSISTANCE_PILOT_MODE="disabled"/);
  assert.match(environment, /LOTURA_AI_ASSISTANCE_PILOT_KILL_SWITCH="on"/);
  assert.match(processPage, /regular interview question remains available/i);
  assert.match(inquiryPage, /regular interview question remain available/i);
});
