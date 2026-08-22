import { readFile } from "node:fs/promises";

import { evaluateDiscoveryAssistanceCandidate } from "../lib/discovery-assistance-evaluation.mjs";

const fixtureUrl = new URL(
  "../tests/fixtures/ai-assisted-discovery-slice-c.json",
  import.meta.url,
);
const fixtures = JSON.parse(await readFile(fixtureUrl, "utf8"));
const results = fixtures.map((fixture) => {
  const outputText = fixture.malformedOutput ?? JSON.stringify(fixture.candidate);
  const result = evaluateDiscoveryAssistanceCandidate({
    humanReview: fixture.humanReview,
    input: fixture.input,
    outputText,
  });
  return {
    expectedPass: fixture.expectedPass,
    id: fixture.id,
    matchedExpectation: result.passesReleaseGate === fixture.expectedPass,
    passesReleaseGate: result.passesReleaseGate,
  };
});
const mismatches = results.filter((result) => !result.matchedExpectation);

console.log(JSON.stringify({
  cases: results.length,
  matchedExpectations: results.length - mismatches.length,
  releasePassingCases: results.filter((result) => result.passesReleaseGate).length,
  result: mismatches.length === 0 ? "passed" : "failed",
}, null, 2));

if (mismatches.length > 0) {
  console.error(JSON.stringify(mismatches, null, 2));
  process.exitCode = 1;
}
