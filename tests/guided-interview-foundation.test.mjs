import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DiscoveryConfigurationError,
  resolveDiscoveryConfiguration,
} from "../lib/discovery-policy.mjs";
import {
  DISCOVERY_FIRST_QUESTION_KEY,
  DISCOVERY_QUESTIONS,
  DISCOVERY_REVIEW_KEY,
  getDiscoveryQuestion,
  getNextDiscoveryQuestionKey,
} from "../lib/discovery-questions.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const privateRuntime = {
  authentication: {
    adminIdentifier: "fictional-discovery-admin",
    mode: "temporary-password",
  },
  operatingModel: {
    mode: "neon",
    organizationId: 17,
  },
};

test("Guided Discovery is disabled by default and cannot run publicly", () => {
  assert.deepEqual(resolveDiscoveryConfiguration({}, privateRuntime), {
    enabled: false,
  });
  assert.throws(
    () => resolveDiscoveryConfiguration(
      {
        DATABASE_URL: "postgresql://runtime:secret@ep-fictional.test/demo",
        LOTURA_DISCOVERY_DATABASE_URL:
          "postgresql://discovery:secret@ep-fictional.test/demo",
        LOTURA_DISCOVERY_MODE: "enabled",
      },
      {
        authentication: { mode: "public" },
        operatingModel: { mode: "demo", organizationId: null },
      },
    ),
    DiscoveryConfigurationError,
  );
});

test("the Discovery credential is target-bound and distinct from every other credential", () => {
  const base = {
    DATABASE_URL: "postgresql://runtime:secret@ep-fictional-pooler.test/demo",
    LOTURA_DISCOVERY_DATABASE_URL:
      "postgresql://discovery:secret@ep-fictional.test/demo",
    LOTURA_DISCOVERY_MODE: "enabled",
  };
  const resolved = resolveDiscoveryConfiguration(base, privateRuntime);
  assert.equal(resolved.enabled, true);
  assert.equal(resolved.organizationId, 17);
  assert.equal(resolved.actorIdentifier, "fictional-discovery-admin");

  for (const variable of [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "LOTURA_STRUCTURE_ADMIN_DATABASE_URL",
    "LOTURA_PROCESS_ADMIN_DATABASE_URL",
  ]) {
    assert.throws(
      () => resolveDiscoveryConfiguration(
        {
          ...base,
          LOTURA_DISCOVERY_DATABASE_URL:
            "postgresql://reused:secret@ep-fictional.test/demo",
          [variable]: "postgresql://reused:different@ep-fictional.test/demo",
        },
        privateRuntime,
      ),
      DiscoveryConfigurationError,
    );
  }
});

test("the versioned question catalog is bounded and ends in review", () => {
  assert.equal(DISCOVERY_FIRST_QUESTION_KEY, "purpose");
  assert.equal(DISCOVERY_QUESTIONS.length, 9);
  assert.equal(getDiscoveryQuestion("systems")?.topic, "systems");
  assert.equal(
    getNextDiscoveryQuestionKey(DISCOVERY_QUESTIONS.at(-1).key),
    DISCOVERY_REVIEW_KEY,
  );
  assert.equal(getDiscoveryQuestion("untrusted-client-question"), null);
});

test("migration 0016 creates tenant-safe immutable evidence without touching canonical Process facts", async () => {
  const migration = await read("drizzle/0016_guided_interview_foundation.sql");
  assert.match(migration, /CREATE TABLE "discovery_sessions"/);
  assert.match(migration, /CREATE TABLE "discovery_observations"/);
  assert.match(migration, /DEFAULT gen_random_uuid\(\)/);
  assert.match(migration, /discovery_sessions_process_org_stable_fk/);
  assert.match(migration, /discovery_observations_session_org_stable_fk/);
  assert.match(migration, /discovery_observations_supersedes_session_fk/);
  assert.match(migration, /revision must advance by exactly one/);
  assert.match(migration, /discovery observations are append-only/);
  assert.match(migration, /ready_for_review/);
  assert.doesNotMatch(migration, /ALTER TABLE "process_steps"/);
  assert.doesNotMatch(migration, /ALTER TABLE "processes" ADD COLUMN/);
  assert.doesNotMatch(migration, /operating_model_changes/);

  for (const identifier of migration.matchAll(/"([^"]+)"/g)) {
    assert.ok(
      Buffer.byteLength(identifier[1]) <= 63,
      `PostgreSQL identifier exceeds 63 bytes: ${identifier[1]}`,
    );
  }
});

test("Discovery mutations authenticate, derive tenant and actor, and never mutate canonical domains", async () => {
  const administration = await read("lib/discovery-administration.ts");
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveDiscoveryConfiguration/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /configuration\.actorIdentifier/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.match(administration, /insert into discovery_sessions/);
  assert.match(administration, /insert into discovery_observations/);
  assert.match(administration, /for update/);
  assert.match(administration, /revision = \$4/);
  assert.match(administration, /supersedes_observation_stable_key/);
  assert.doesNotMatch(administration, /insert into operating_model_changes/i);
  assert.doesNotMatch(administration, /update (?:processes|process_steps|roles|systems|exceptions)/i);
  assert.doesNotMatch(administration, /DATABASE_URL(?:_UNPOOLED)?/);
});

test("Discovery database diagnostics exclude interview text and raw errors", async () => {
  const administration = await read("lib/discovery-administration.ts");
  assert.match(administration, /logDiscoveryDatabaseFailure/);
  assert.match(administration, /code: safeValue\(details\.code\)/);
  assert.match(administration, /constraint: safeValue\(details\.constraint\)/);
  assert.match(administration, /operation,/);
  assert.doesNotMatch(administration, /message: safeValue\(details\.message\)/);
  assert.doesNotMatch(administration, /stack: safeValue\(details\.stack\)/);
  assert.doesNotMatch(administration, /responseText.*console\.error/s);
});

test("observation capture explicitly types every reused SQL parameter", async () => {
  const administration = await read("lib/discovery-administration.ts");
  assert.match(administration, /organization_id = \$1::integer/);
  assert.match(administration, /actor_identifier = \$3::varchar\(128\)/);
  assert.match(administration, /revision = \$4::integer/);
  assert.match(administration, /current_question_key = \$5::varchar\(64\)/);
  assert.match(administration, /\$8::text, \$9::discovery_observation_state/);
  assert.match(administration, /current_question_key = \$10::varchar\(64\)/);
  assert.match(administration, /\$11::varchar\(64\)/);
});

test("the UI states the evidence, privacy, and no-canonical-write boundary", async () => {
  const [catalog, interview, answer] = await Promise.all([
    read("app/studio/discovery/page.tsx"),
    read("app/studio/discovery/interviews/[sessionId]/page.tsx"),
    read("app/studio/discovery/discovery-answer-form.tsx"),
  ]);
  assert.match(catalog, /evidence, not approved organizational truth/);
  assert.match(catalog, /does not use AI or write canonical Process facts/);
  assert.match(interview, /Review the observations—not a proposed Process/);
  assert.match(interview, /Nothing here has updated, approved, activated, or completed/);
  assert.match(answer, /sanitized operational knowledge only/i);
  assert.match(answer, /Conflicting observation/);
  assert.match(answer, /Unknown/);
  assert.doesNotMatch(catalog, /^import .*discovery-data/m);
  assert.doesNotMatch(interview, /^import .*discovery-data/m);
  assert.match(catalog, /await import\("@\/lib\/discovery-data"\)/);
  assert.match(interview, /await import\("@\/lib\/discovery-data"\)/);
});

test("review corrections append rather than overwrite source observations", async () => {
  const [administration, migration] = await Promise.all([
    read("lib/discovery-administration.ts"),
    read("drizzle/0016_guided_interview_foundation.sql"),
  ]);
  assert.match(administration, /appendDiscoveryCorrection/);
  assert.match(administration, /insert into discovery_observations/);
  assert.match(administration, /prior\.stable_key/);
  assert.match(
    administration,
    /not exists \([\s\S]+supersedes_observation_stable_key = observation\.stable_key/,
  );
  assert.doesNotMatch(administration, /update discovery_observations/i);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON "discovery_observations"/);
});

test("the documented role is least-privilege and public Northstar remains excluded", async () => {
  const documentation = await read("docs/GUIDED_INTERVIEW_FOUNDATION.md");
  assert.match(documentation, /LOTURA_DISCOVERY_DATABASE_URL/);
  assert.match(documentation, /GRANT SELECT ON TABLE processes/);
  assert.match(documentation, /GRANT UPDATE \(status, current_question_key, revision, updated_at\)/);
  assert.match(documentation, /no write privilege on Process, Step, Role, System/);
  assert.match(documentation, /Public Northstar requires neither/);
  assert.match(documentation, /does not use AI/);
});
