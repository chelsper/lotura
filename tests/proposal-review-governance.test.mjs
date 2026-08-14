import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  currentProposalReviewDecisions,
  proposalReviewSummary,
} from "../lib/proposal-review-model.mjs";
import {
  ProposalReviewConfigurationError,
  resolveProposalReviewConfiguration,
} from "../lib/proposal-review-policy.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const privateRuntime = {
  authentication: {
    adminIdentifier: "fictional-proposal-reviewer",
    mode: "temporary-password",
  },
  operatingModel: {
    mode: "neon",
    organizationId: 17,
  },
};

function item(itemId, action = "update_process_purpose") {
  return { action, itemId, state: "active" };
}

function decision(itemId, disposition, decisionSequence = 1) {
  return { decisionSequence, disposition, itemId };
}

test("review outcomes are derived from the latest append-only item decisions", () => {
  const items = [item("purpose"), item("step", "add_process_step")];
  const decisions = [
    decision("purpose", "approve"),
    decision("purpose", "reject", 2),
    decision("step", "approve"),
  ];
  const latest = currentProposalReviewDecisions(decisions);
  assert.equal(latest.get("purpose").disposition, "reject");
  assert.deepEqual(proposalReviewSummary(items, decisions), {
    approved: 1,
    canFinish: true,
    decided: 2,
    needsValidation: 0,
    rejected: 1,
    remaining: 0,
    status: "approved_in_part",
    total: 2,
  });
});

test("unresolved knowledge remains context rather than an approvable change", () => {
  const summary = proposalReviewSummary(
    [item("question", "preserve_unresolved")],
    [],
  );
  assert.equal(summary.total, 0);
  assert.equal(summary.canFinish, false);
  assert.equal(summary.status, null);
});

test("validation blocks completion until every structured item has a decision", () => {
  const items = [item("purpose"), item("step", "revise_process_step")];
  assert.deepEqual(
    proposalReviewSummary(items, [decision("purpose", "needs_validation")]),
    {
      approved: 0,
      canFinish: false,
      decided: 1,
      needsValidation: 1,
      rejected: 0,
      remaining: 1,
      status: null,
      total: 2,
    },
  );
  assert.equal(
    proposalReviewSummary(items, [
      decision("purpose", "needs_validation"),
      decision("step", "reject"),
    ]).status,
    "needs_validation",
  );
});

test("Proposal Review is disabled by default, private-only, target-bound, and credential-distinct", () => {
  assert.deepEqual(resolveProposalReviewConfiguration({}, privateRuntime), {
    enabled: false,
  });

  const base = {
    DATABASE_URL:
      "postgresql://runtime:secret@ep-fictional-pooler.test/fictional_workspace",
    LOTURA_PROPOSAL_REVIEW_DATABASE_URL:
      "postgresql://review:secret@ep-fictional.test/fictional_workspace",
    LOTURA_PROPOSAL_REVIEW_MODE: "enabled",
  };
  const resolved = resolveProposalReviewConfiguration(base, privateRuntime);
  assert.equal(resolved.enabled, true);
  assert.equal(resolved.organizationId, 17);
  assert.equal(resolved.actorIdentifier, "fictional-proposal-reviewer");

  assert.throws(
    () => resolveProposalReviewConfiguration(base, {
      authentication: { mode: "public" },
      operatingModel: { mode: "demo", organizationId: null },
    }),
    ProposalReviewConfigurationError,
  );
  assert.throws(
    () => resolveProposalReviewConfiguration({
      ...base,
      LOTURA_PROPOSAL_REVIEW_DATABASE_URL:
        "postgresql://review:secret@ep-other.test/fictional_workspace",
    }, privateRuntime),
    ProposalReviewConfigurationError,
  );

  for (const variable of [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "LOTURA_STRUCTURE_ADMIN_DATABASE_URL",
    "LOTURA_PROCESS_ADMIN_DATABASE_URL",
    "LOTURA_DISCOVERY_DATABASE_URL",
  ]) {
    assert.throws(
      () => resolveProposalReviewConfiguration({
        ...base,
        LOTURA_PROPOSAL_REVIEW_DATABASE_URL:
          "postgresql://reused:secret@ep-fictional.test/fictional_workspace",
        [variable]:
          "postgresql://reused:different@ep-fictional.test/fictional_workspace",
      }, privateRuntime),
      ProposalReviewConfigurationError,
    );
  }
});

test("migration 0020 is additive, tenant-safe, append-only, and grants no canonical authority", async () => {
  const migration = await read("drizzle/0020_proposal_review_governance.sql");
  assert.match(migration, /CREATE TABLE "operating_model_proposal_reviews"/);
  assert.match(migration, /CREATE TABLE "operating_model_proposal_review_decisions"/);
  assert.match(migration, /proposal_reviews_mapping_context_fk/);
  assert.match(migration, /proposal_review_decisions_item_revision_fk/);
  assert.match(migration, /mapping\.status = 'ready_for_proposal_review'/);
  assert.match(migration, /item\.action <> 'preserve_unresolved'/);
  assert.match(migration, /proposal review revision must advance by exactly one/);
  assert.match(migration, /proposal review decisions are append-only/);
  assert.match(migration, /finished proposal reviews cannot be changed/);
  assert.ok(
    migration.indexOf("discovery_mappings_review_context_unique") <
      migration.indexOf("proposal_reviews_mapping_context_fk"),
  );
  assert.doesNotMatch(
    migration,
    /(?:INSERT INTO|UPDATE|DELETE FROM) "?(?:processes|process_steps|roles|systems|exceptions|process_dependencies|operating_model_changes)"?/i,
  );
  for (const identifier of migration.matchAll(/"([^"]+)"/g)) {
    assert.ok(
      Buffer.byteLength(identifier[1]) <= 63,
      `PostgreSQL identifier exceeds 63 bytes: ${identifier[1]}`,
    );
  }
});

test("review writes reauthorize, derive scope, use CAS, and never mutate the operating model", async () => {
  const [actions, administration, page] = await Promise.all([
    read("app/studio/discovery/actions.ts"),
    read("lib/proposal-review-administration.ts"),
    read("app/studio/discovery/interviews/[sessionId]/proposal-review/page.tsx"),
  ]);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveProposalReviewConfiguration/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.match(administration, /review\.revision = \$3::integer/);
  assert.match(administration, /for update/);
  assert.match(administration, /documented_process_fingerprint = \$4::varchar\(64\)/);
  assert.doesNotMatch(actions, /organizationId.*formData|formData.*organizationId/);
  assert.doesNotMatch(
    administration,
    /(?:insert into|update|delete from) (?:processes|process_steps|roles|systems|exceptions|process_systems|process_dependencies|operating_model_changes)/i,
  );
  assert.match(page, /This review decides what may move forward/);
  assert.match(page, /Process Steward<\/p>[\s\S]*Not assigned/);
  assert.match(page, /Version application<\/p>[\s\S]*Not configured/);
  assert.match(page, /No Process version was created/);
  assert.match(page, /if \(!experience\.proposalReview\.enabled\) notFound\(\)/);
});

test("LAD-052 and deployment documentation preserve the separate review boundary", async () => {
  const [decisions, contract, guidance, roadmap] = await Promise.all([
    read("ARCHITECTURE_DECISIONS.md"),
    read("docs/WORKSPACE_DEPLOYMENT_CONTRACT.md"),
    read("docs/PROPOSAL_REVIEW_AND_GOVERNANCE.md"),
    read("PRODUCT_ROADMAP.md"),
  ]);
  assert.match(decisions, /LAD-052 — Proposal review authorizes exact proposed items/);
  assert.match(decisions, /writes no Process, Step, Role,\s+System, Exception, dependency/);
  assert.match(guidance, /LOTURA_PROPOSAL_REVIEW_DATABASE_URL/);
  assert.match(guidance, /GRANT INSERT \([\s\S]*operating_model_proposal_review_decisions/);
  assert.match(guidance, /no mutation privilege on\s+Discovery evidence, mappings, Processes, Steps, Roles, Systems, Exceptions/);
  assert.match(contract, /LOTURA_PROPOSAL_REVIEW_MODE=enabled/);
  assert.match(roadmap, /eligible for later governed application/);
});
