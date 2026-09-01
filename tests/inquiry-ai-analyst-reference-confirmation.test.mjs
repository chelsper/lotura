import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildDiscoveryAnalystRequest } from "../lib/discovery-analyst-openai.mjs";
import {
  buildDiscoveryReferenceCandidates,
  fingerprintDiscoveryReferenceMention,
  parseDiscoveryReferenceTargetKey,
} from "../lib/discovery-reference-matching.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const observation = {
  id: "69000000-0000-4000-8000-000000000001",
  responseText:
    "Chelsea Santoro works with Student Financial Services in Raiser’s Edge NXT. Gift Acceptance Policy still needs review.",
  sequence: 1,
};

const catalog = [
  {
    aliases: ["Student Accounts"],
    context: "Current Organization Unit",
    kind: "organization_unit",
    label: "Student Financial Services",
    stableKey: "69000000-0000-4000-8000-000000000002",
  },
  {
    aliases: ["RE NXT"],
    context: "Current System",
    kind: "system",
    label: "Raiser’s Edge NXT",
    stableKey: "69000000-0000-4000-8000-000000000003",
  },
  {
    aliases: [],
    context: "Person currently assigned to Director of Advancement Services in University Advancement with Gift Processing Owner Role context",
    kind: "person_capacity",
    label: "Chelsea Santoro",
    personStableKey: "69000000-0000-4000-8000-000000000004",
    positionStableKey: "69000000-0000-4000-8000-000000000005",
    roleStableKey: "69000000-0000-4000-8000-000000000006",
  },
];

test("local inquiry matching keeps source wording and requires policy/person confirmation", () => {
  const candidates = buildDiscoveryReferenceCandidates({ catalog, observations: [observation] });
  assert.equal(candidates.some((candidate) =>
    candidate.kind === "organization_unit"
    && candidate.mentionText === "Student Financial Services"), true);
  const person = candidates.find((candidate) => candidate.kind === "person_capacity");
  assert.equal(person.mentionText, "Chelsea Santoro");
  assert.match(person.options[0].context, /Director of Advancement Services/);
  assert.match(person.options[0].context, /Role context/);
  const policy = candidates.find((candidate) => candidate.kind === "policy");
  assert.equal(policy.mentionText, "Gift Acceptance Policy");
  assert.equal(policy.suggestedTargetKey, null);
  assert.deepEqual(policy.options, []);
});

test("reference matching does not turn ordinary words into people or embedded short names", () => {
  const candidates = buildDiscoveryReferenceCandidates({
    catalog: [
      {
        aliases: [],
        context: "Person currently assigned to Admissions Counselor",
        kind: "person_capacity",
        label: "Alvarez, Michael",
        personStableKey: "69000000-0000-4000-8000-000000000010",
        positionStableKey: "69000000-0000-4000-8000-000000000011",
        roleStableKey: null,
      },
      {
        aliases: [],
        context: "Person currently assigned to Clinical Assistant Professor",
        kind: "person_capacity",
        label: "Bilalovic, Erica",
        personStableKey: "69000000-0000-4000-8000-000000000012",
        positionStableKey: "69000000-0000-4000-8000-000000000013",
        roleStableKey: null,
      },
      {
        aliases: [],
        context: "Person currently assigned to Professor",
        kind: "person_capacity",
        label: "Indelicato, Natalie",
        personStableKey: "69000000-0000-4000-8000-000000000014",
        positionStableKey: "69000000-0000-4000-8000-000000000015",
        roleStableKey: null,
      },
      {
        aliases: [],
        context: "Person currently assigned to Professor",
        kind: "person_capacity",
        label: "Oldakowski, Raymond",
        personStableKey: "69000000-0000-4000-8000-000000000016",
        positionStableKey: "69000000-0000-4000-8000-000000000017",
        roleStableKey: null,
      },
      {
        aliases: [],
        context: "Current System",
        kind: "system",
        label: "IT",
        stableKey: "69000000-0000-4000-8000-000000000018",
      },
      {
        aliases: [],
        context: "Current Process Family",
        kind: "process_family",
        label: "Gift Processing",
        stableKey: "69000000-0000-4000-8000-000000000022",
      },
    ],
    observations: [{
      id: "69000000-0000-4000-8000-000000000019",
      responseText: "I am trying to understand how gifts may be accepted, declined, or escalated in Gift Acceptance Policy and then move into Gift Processing.",
      sequence: 1,
    }],
  });

  assert.equal(candidates.some((candidate) => candidate.kind === "person_capacity"), false);
  assert.equal(candidates.some((candidate) => candidate.kind === "system"), false);
  assert.deepEqual(
    candidates.map((candidate) => [candidate.kind, candidate.mentionText]),
    [
      ["process_family", "Gift Processing"],
      ["policy", "Gift Acceptance Policy"],
    ],
  );
});

test("non-person references may still use distinctive acronyms", () => {
  const candidates = buildDiscoveryReferenceCandidates({
    catalog: [{
      aliases: [],
      context: "Current Operational Role",
      kind: "operational_role",
      label: "Gift Acceptance Committee",
      stableKey: "69000000-0000-4000-8000-000000000020",
    }],
    observations: [{
      id: "69000000-0000-4000-8000-000000000021",
      responseText: "The GAC reviews the request.",
      sequence: 1,
    }],
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].mentionText, "GAC");
  assert.equal(candidates[0].kind, "operational_role");
});

test("reference target and source identities are deterministic and typed", () => {
  const target = parseDiscoveryReferenceTargetKey(
    "person_capacity:69000000-0000-4000-8000-000000000004:69000000-0000-4000-8000-000000000005:69000000-0000-4000-8000-000000000006",
  );
  assert.deepEqual(target, {
    kind: "person_capacity",
    personStableKey: "69000000-0000-4000-8000-000000000004",
    positionStableKey: "69000000-0000-4000-8000-000000000005",
    roleStableKey: "69000000-0000-4000-8000-000000000006",
  });
  const fingerprint = fingerprintDiscoveryReferenceMention({
    mentionSequence: 1,
    mentionText: "Chelsea Santoro",
    referenceKind: "person_capacity",
    sourceObservationId: observation.id,
  });
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(fingerprint, fingerprintDiscoveryReferenceMention({
    mentionSequence: 1,
    mentionText: "Chelsea Santoro",
    referenceKind: "person_capacity",
    sourceObservationId: observation.id,
  }));
});

test("the provider sees bounded inquiry evidence but no organizational catalog", () => {
  const request = buildDiscoveryAnalystRequest({
    latestSynthesis: null,
    observations: [{
      epistemicState: "known",
      promptKey: "purpose",
      promptText: "What prompted this question?",
      responseText: "We want to understand Gift Acceptance Policy.",
      sequence: 1,
      topic: "purpose",
    }],
    process: {
      dependencies: [],
      exceptions: [],
      name: "How does Gift Acceptance Policy work?",
      ownerRole: null,
      purpose: "Explore policy and connected work.",
      status: "inquiry",
      steps: [],
      systems: [],
    },
    scopeStatement: "Explore policy and connected work.",
    sessionKind: "inquiry",
  });
  const serialized = JSON.stringify(request);
  const suppliedContext = JSON.parse(request.input[1].content[0].text);
  assert.equal(suppliedContext.interview.sessionKind, "inquiry");
  assert.match(serialized, /do not assume the subject is one Process/i);
  assert.doesNotMatch(serialized, /organizationCatalog|peopleCatalog|unitCatalog/);
});

test("LAD-069 implementation preserves inquiry evidence and canonical boundaries", async () => {
  const [decision, documentation, migration, administration, page, reviewPage, table] = await Promise.all([
    read("ARCHITECTURE_DECISIONS.md"),
    read("docs/INQUIRY_AI_ANALYST_REFERENCE_CONFIRMATION_ALPHA.md"),
    read("drizzle/0032_inquiry_ai_analyst_reference_confirmation.sql"),
    read("lib/discovery-inquiry-analyst-administration.ts"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/review/page.tsx"),
    read("app/studio/discovery/discovery-reference-confirmation-table.tsx"),
  ]);
  assert.match(decision, /LAD-069 — Inquiry-first AI analysis/);
  assert.match(decision, /Status:\*\* Accepted — implementation authorized/);
  assert.match(documentation, /GRANT UPDATE \([\s\S]*analyst_enabled[\s\S]*ON discovery_inquiry_sessions/);
  assert.match(documentation, /GRANT INSERT \([\s\S]*ON discovery_reference_confirmations/);
  assert.match(documentation, /GRANT SELECT ON discovery_reference_confirmations TO <runtime_role>/);
  assert.doesNotMatch(documentation, /GRANT (?:UPDATE|DELETE|TRUNCATE)[^\n]*discovery_reference_confirmations/);
  assert.match(migration, /discovery_inquiry_sessions.*analyst_enabled/s);
  assert.match(migration, /analyst assistance requires an authorized interview/);
  assert.match(migration, /reference confirmations are append-only/);
  assert.match(migration, /reference confirmation differs from its Inquiry Analyst run/);
  assert.match(migration, /supersedes_observation_stable_key = NEW\.source_observation_stable_key/);
  assert.match(administration, /insert into discovery_inquiry_observations/);
  assert.match(administration, /insert into discovery_assistance_runs/);
  assert.match(administration, /insert into discovery_reference_confirmations/);
  assert.match(administration, /run\.session_kind = 'inquiry'/);
  assert.doesNotMatch(
    administration,
    /(?:insert into|update|delete from) (?:processes|process_families|roles|organization_units|positions|people|systems|operating_model_changes)/i,
  );
  assert.match(page, /DiscoveryAnalystStartForm/);
  assert.match(page, /DiscoveryAnalystInterview/);
  assert.match(page, /DiscoveryReferenceConfirmationTable/);
  assert.match(reviewPage, /References carried into review/);
  assert.match(reviewPage, /do not establish a[\s\S]*relationship/);
  assert.match(table, /References to confirm/);
  assert.match(table, /Keep unresolved/);
  assert.match(table, /silently replace a person with a Role/);
});

test("all migration 0032 identifiers fit PostgreSQL's 63-byte limit", async () => {
  const migration = await read(
    "drizzle/0032_inquiry_ai_analyst_reference_confirmation.sql",
  );
  const identifiers = [
    ...migration.matchAll(
      /(?:CONSTRAINT|INDEX|TRIGGER|FUNCTION|TABLE)\s+"?([a-z0-9_]+)"?/gi,
    ),
  ].map((match) => match[1]);
  for (const identifier of identifiers) {
    assert.ok(
      Buffer.byteLength(identifier, "utf8") <= 63,
      `${identifier} exceeds PostgreSQL's identifier limit`,
    );
  }
});
