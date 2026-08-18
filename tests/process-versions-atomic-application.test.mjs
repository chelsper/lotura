import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildProcessVersionSnapshot,
  fingerprintProcessVersionSnapshot,
} from "../lib/process-version-snapshot.mjs";
import {
  ProcessApplicationConfigurationError,
  resolveProcessApplicationConfiguration,
} from "../lib/process-application-policy.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const privateRuntime = {
  authentication: {
    adminIdentifier: "fictional-process-applicant",
    mode: "temporary-password",
  },
  operatingModel: { mode: "neon", organizationId: 23 },
};

function snapshotInput() {
  return {
    dependencies: [{
      dependencyType: "requires",
      description: "Fictional dependency",
      direction: "downstream",
      sourceProcessName: "Fictional Process",
      sourceProcessStableKey: "10000000-0000-4000-8000-000000000001",
      stableKey: "90000000-0000-4000-8000-000000000001",
      targetProcessName: "Fictional Related Process",
      targetProcessStableKey: "10000000-0000-4000-8000-000000000002",
    }],
    exceptions: [{
      condition: "A fictional alternate path occurs.",
      name: "Fictional alternate path",
      ownerRoleName: null,
      ownerRoleStableKey: null,
      processStepStableKey: "20000000-0000-4000-8000-000000000001",
      processStepTitle: "Fictional Step",
      response: "Use the fictional response.",
      stableKey: "50000000-0000-4000-8000-000000000001",
      status: "active",
    }],
    process: {
      name: "Fictional Process",
      ownerRoleName: "Fictional Owner",
      ownerRoleStableKey: "30000000-0000-4000-8000-000000000001",
      purpose: "Exercise a fictional workflow.",
      stableKey: "10000000-0000-4000-8000-000000000001",
      status: "draft",
    },
    steps: [{
      instructions: "Perform fictional work.",
      position: 1,
      responsibleRoleName: "Fictional Responsible Role",
      responsibleRoleStableKey: "30000000-0000-4000-8000-000000000002",
      stableKey: "20000000-0000-4000-8000-000000000001",
      title: "Fictional Step",
    }],
    systems: [{
      description: "A fictional system.",
      name: "Fictional System",
      stableKey: "40000000-0000-4000-8000-000000000001",
      status: "active",
      type: "software",
      usage: "Supports fictional work.",
    }],
  };
}

test("version snapshot format 1 is stable-key based and deterministic", () => {
  const first = buildProcessVersionSnapshot(snapshotInput());
  const reordered = snapshotInput();
  reordered.steps = [...reordered.steps].reverse();
  reordered.systems = [...reordered.systems].reverse();
  const second = buildProcessVersionSnapshot(reordered);
  assert.deepEqual(first, second);
  assert.equal(fingerprintProcessVersionSnapshot(first).length, 64);
  assert.equal(
    fingerprintProcessVersionSnapshot(first),
    fingerprintProcessVersionSnapshot(second),
  );
  const serialized = JSON.stringify(first);
  assert.match(serialized, /stableKey/);
  assert.doesNotMatch(
    serialized,
    /personStableKey|positionStableKey|membership|RoleCoverage|RoleMandate|reportingRelationship|password|credential/i,
  );
});

test("Process application is private, disabled by default, target-bound, and credential-distinct", () => {
  assert.deepEqual(resolveProcessApplicationConfiguration({}, privateRuntime), {
    enabled: false,
  });
  const base = {
    DATABASE_URL:
      "postgresql://runtime:secret@ep-fictional-pooler.test/fictional_workspace",
    LOTURA_PROCESS_APPLICATION_DATABASE_URL:
      "postgresql://application:secret@ep-fictional.test/fictional_workspace",
    LOTURA_PROCESS_APPLICATION_MODE: "enabled",
  };
  const resolved = resolveProcessApplicationConfiguration(base, privateRuntime);
  assert.equal(resolved.enabled, true);
  assert.equal(resolved.organizationId, 23);
  assert.equal(resolved.actorIdentifier, "fictional-process-applicant");

  assert.throws(
    () => resolveProcessApplicationConfiguration(base, {
      authentication: { mode: "public" },
      operatingModel: { mode: "demo", organizationId: null },
    }),
    ProcessApplicationConfigurationError,
  );
  for (const variable of [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "LOTURA_STRUCTURE_ADMIN_DATABASE_URL",
    "LOTURA_PROCESS_ADMIN_DATABASE_URL",
    "LOTURA_DISCOVERY_DATABASE_URL",
    "LOTURA_PROPOSAL_REVIEW_DATABASE_URL",
  ]) {
    assert.throws(
      () => resolveProcessApplicationConfiguration({
        ...base,
        LOTURA_PROCESS_APPLICATION_DATABASE_URL:
          "postgresql://reused:secret@ep-fictional.test/fictional_workspace",
        [variable]:
          "postgresql://reused:different@ep-fictional.test/fictional_workspace",
      }, privateRuntime),
      ProcessApplicationConfigurationError,
    );
  }
});

test("migration 0021 is additive, tenant-safe, linear, and append-only", async () => {
  const migration = await read(
    "drizzle/0021_process_versions_atomic_application.sql",
  );
  assert.match(migration, /CREATE TABLE "process_versions"/);
  assert.match(migration, /CREATE TABLE "operating_model_proposal_applications"/);
  assert.match(migration, /CREATE TABLE "operating_model_proposal_application_items"/);
  assert.match(migration, /process_dependencies_stable_key_immutable_trigger/);
  assert.match(migration, /process_versions_predecessor_fk/);
  assert.match(migration, /Process versions must append to the exact current predecessor/);
  assert.match(migration, /proposal application must include every and only current approved item/);
  assert.match(migration, /DEFERRABLE INITIALLY DEFERRED/);
  assert.match(migration, /Process versions are append-only/);
  assert.match(migration, /proposal applications are append-only/);
  assert.match(migration, /proposal application items are append-only/);
  assert.match(migration, /'create_dependency'/);
  assert.match(migration, /'process_dependency'/);
  assert.ok(
    migration.indexOf("proposal_reviews_identity_process_unique") <
      migration.indexOf("process_versions_source_review_fk"),
  );
  for (const identifier of migration.matchAll(/"([^"]+)"/g)) {
    assert.ok(
      Buffer.byteLength(identifier[1]) <= 63,
      `PostgreSQL identifier exceeds 63 bytes: ${identifier[1]}`,
    );
  }
});

test("application reauthorizes, locks, applies all approvals atomically, and records exact history", async () => {
  const [actions, administration, page, controls] = await Promise.all([
    read("app/studio/discovery/actions.ts"),
    read("lib/process-application-administration.ts"),
    read("app/studio/discovery/interviews/[sessionId]/proposal-review/apply/page.tsx"),
    read("app/studio/discovery/process-application-controls.tsx"),
  ]);
  assert.match(actions, /await loadWorkspaceExperience\(\)/);
  assert.match(actions, /if \(!experience\.processApplication\.enabled\)/);
  assert.doesNotMatch(actions, /organizationId.*formData|formData.*organizationId/);
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /begin isolation level serializable/i);
  assert.match(administration, /for update of review, mapping, process/i);
  assert.match(administration, /fingerprintDocumentedProcessSnapshot/);
  assert.match(administration, /fingerprintProcessVersionSnapshot/);
  assert.match(administration, /await client\.query\("commit"\)/);
  assert.match(administration, /await client\.query\("rollback"\)/);
  assert.match(administration, /operating_model_changes/);
  assert.match(administration, /operating_model_proposal_application_items/);
  assert.match(administration, /Classify every approved change/);
  assert.match(`${page}\n${controls}`, /All approved changes will be applied together/);
  assert.match(page, /if \(!experience\.processApplication\.enabled\) notFound\(\)/);
  assert.doesNotMatch(page, /AI-generated|automatically approve/i);
});

test("all nine approved typed actions have explicit canonical and history semantics", async () => {
  const administration = await read("lib/process-application-administration.ts");
  const expected = {
    add_process_dependency: "create_dependency",
    add_process_exception: "create_exception",
    add_process_step: "create_step",
    change_process_owner: "change_owner",
    change_step_responsibility: "change_step_responsibility",
    link_existing_system: "link_system",
    revise_process_exception: "update_exception",
    revise_process_step: "update_step",
    update_process_purpose: "update_definition",
  };
  for (const [mappingAction, historyAction] of Object.entries(expected)) {
    assert.match(administration, new RegExp(`item\\.action === "${mappingAction}"`));
    assert.match(administration, new RegExp(`action: "${historyAction}"`));
  }
  assert.doesNotMatch(administration, /item\.action === "preserve_unresolved"/);
  assert.match(administration, /owner && current\.status !== "draft"/);
  assert.match(administration, /where \$2 <> \$3 and not exists/);
});
