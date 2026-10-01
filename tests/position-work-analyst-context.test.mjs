import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscoveryAnalystRequest } from "../lib/discovery-analyst-openai.mjs";
import { buildPositionWorkScope } from "../lib/position-work-discovery-model.mjs";

test("work discovery keeps participant text separate from tailored developer guidance", () => {
  const work = "I oversee the printing queue. Approval of priority changes needs clarification.";
  const context = {
    sessionKind: "inquiry",
    scopeStatement: buildPositionWorkScope({ title: "Fictional Printing Coordinator", unitName: "Fictional Campus Services" }),
    process: { name: "Understand this work", status: "inquiry" },
    observations: [{ id: "private-observation-id", sequence: 1, topic: "purpose", promptKey: "work_to_understand", promptText: "What work does this job involve?", responseText: work, epistemicState: "needs_validation" }],
  };
  const request = buildDiscoveryAnalystRequest(context);
  assert.equal(request.input[0].role, "developer");
  assert.match(request.input[0].content[0].text, /Overseeing work is not evidence of Process ownership/);
  assert.match(request.input[0].content[0].text, /Do not turn a list of duties into an invented sequence/);
  assert.doesNotMatch(request.input[0].content[0].text, /I oversee the printing queue/);
  assert.equal(request.input[1].role, "user");
  const sent = JSON.parse(request.input[1].content[0].text);
  assert.equal(sent.interview.observations[0].responseText, work);
  assert.equal(sent.interview.observations[0].epistemicState, "needs_validation");
  assert.equal(sent.interview.observations[0].id, undefined);
  assert.equal(request.store, false);
  assert.equal(request.background, false);
  assert.deepEqual(request.tools, []);
  assert.equal(request.tool_choice, "none");
});

test("ordinary Process and inquiry interviews do not acquire job-description behavior", () => {
  for (const context of [
    { sessionKind: "inquiry", scopeStatement: "Explore a possible policy." },
    { sessionKind: "process", scopeStatement: buildPositionWorkScope({ title: "Coordinator", unitName: null }) },
  ]) {
    assert.doesNotMatch(buildDiscoveryAnalystRequest(context).input[0].content[0].text, /This conversation starts from a job title/);
  }
});
