import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ProcessAcquisitionConfigurationError,
  resolveProcessAcquisitionConfiguration,
} from "../lib/process-acquisition-policy.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const privateRuntime = {
  authentication: {
    adminIdentifier: "fictional-admin",
    mode: "temporary-password",
  },
  operatingModel: {
    databaseUrl: "postgresql://runtime:secret@ep-example.test/demo",
    mode: "neon",
    organizationId: 7,
  },
};

test("Process Acquisition is disabled by default", () => {
  assert.deepEqual(
    resolveProcessAcquisitionConfiguration({}, privateRuntime),
    { enabled: false },
  );
});

test("public and fixture workspaces cannot enable Process Acquisition", () => {
  assert.throws(
    () =>
      resolveProcessAcquisitionConfiguration(
        {
          LOTURA_PROCESS_ACQUISITION_MODE: "enabled",
          LOTURA_PROCESS_ADMIN_DATABASE_URL:
            "postgresql://process:secret@ep-example.test/demo",
        },
        {
          authentication: { mode: "public" },
          operatingModel: { mode: "demo" },
        },
      ),
    ProcessAcquisitionConfigurationError,
  );
});

test("the Process credential is distinct and target-bound", () => {
  const configuration = resolveProcessAcquisitionConfiguration(
    {
      DATABASE_URL: "postgresql://runtime:secret@ep-example-pooler.test/demo",
      LOTURA_PROCESS_ACQUISITION_MODE: "enabled",
      LOTURA_PROCESS_ADMIN_DATABASE_URL:
        "postgresql://process:secret@ep-example.test/demo",
    },
    privateRuntime,
  );
  assert.equal(configuration.enabled, true);
  assert.equal(configuration.organizationId, 7);
  assert.equal(configuration.actorIdentifier, "fictional-admin");

  for (const reusedVariable of [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "LOTURA_STRUCTURE_ADMIN_DATABASE_URL",
  ]) {
    assert.throws(
      () =>
        resolveProcessAcquisitionConfiguration(
          {
            DATABASE_URL: "postgresql://runtime:secret@ep-example.test/demo",
            LOTURA_PROCESS_ACQUISITION_MODE: "enabled",
            LOTURA_PROCESS_ADMIN_DATABASE_URL:
              "postgresql://runtime:other@ep-example.test/demo",
            [reusedVariable]:
              "postgresql://runtime:secret@ep-example.test/demo",
          },
          privateRuntime,
        ),
      ProcessAcquisitionConfigurationError,
    );
  }
});

test("the acquisition route exposes only the approved manual boundary", async () => {
  const [page, form] = await Promise.all([
    read("app/process-acquisition/page.tsx"),
    read("app/process-acquisition/process-acquisition-form.tsx"),
  ]);
  assert.match(page, /How would you like to document this Process\?/);
  assert.match(page, /Interview me/);
  assert.match(page, /Next milestone/);
  assert.match(page, /Upload existing documentation/);
  assert.match(page, /Future/);
  assert.match(page, /Start from scratch/);
  assert.match(form, /Create Draft Process/);
  assert.match(form, /Not assigned yet/);
  assert.match(form, /Starting from a Role does not assign/);
  assert.doesNotMatch(page, /input[^>]+type=["']file/);
});

test("Role context is verified and never becomes implicit ownership", async () => {
  const [page, form, administration] = await Promise.all([
    read("app/process-acquisition/page.tsx"),
    read("app/process-acquisition/process-acquisition-form.tsx"),
    read("lib/process-acquisition-administration.ts"),
  ]);
  assert.match(page, /position\.mandates\.some/);
  assert.match(page, /will not[\s\S]+become Process ownership unless you select and confirm/);
  assert.match(form, /useState\(""\)/);
  assert.match(form, /ownerConfirmed/);
  assert.match(administration, /if \(ownerRoleId && !input\.ownerConfirmed\)/);
  assert.doesNotMatch(administration, /position|mandate|coverage|reporting/i);
});

test("Draft creation is authenticated, tenant-scoped, and insert-only", async () => {
  const administration = await read("lib/process-acquisition-administration.ts");
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /configuration\.organizationId/);
  assert.match(administration, /where organization_id = \$1/);
  assert.match(administration, /and status = 'active'/);
  assert.match(administration, /insert into processes/);
  assert.match(administration, /'draft'/);
  assert.match(administration, /isolationLevel: "Serializable"/);
  assert.doesNotMatch(administration, /update processes|delete from processes/i);
  assert.doesNotMatch(administration, /DATABASE_URL(?:_UNPOOLED)?/);
});

test("duplicate Process names are rejected inside the insertion statement", async () => {
  const administration = await read("lib/process-acquisition-administration.ts");
  assert.match(administration, /duplicate_process as/);
  assert.match(administration, /lower\(btrim\(name\)\) = lower\(\$3\)/);
  assert.match(administration, /not exists \(select 1 from duplicate_process\)/);
  assert.match(administration, /A Process with this name already exists/);
});

test("public UI entry points render only when Process Acquisition is enabled", async () => {
  const [explorer, position] = await Promise.all([
    read("app/explorer/page.tsx"),
    read("app/organization/position-detail.tsx"),
  ]);
  assert.match(explorer, /processAcquisition\.enabled/);
  assert.match(position, /processAcquisitionEnabled \?/);
  assert.match(explorer, /href="\/process-acquisition"/);
  assert.match(position, /\/process-acquisition\?position=/);
});

test("the least-privilege contract excludes edits and unrelated writes", async () => {
  const documentation = await read("docs/PROCESS_ACQUISITION_ADMINISTRATION.md");
  assert.match(documentation, /LOTURA_PROCESS_ADMIN_DATABASE_URL/);
  assert.match(documentation, /GRANT SELECT ON TABLE roles, processes/);
  assert.match(documentation, /GRANT INSERT \([\s\S]+ON processes/);
  assert.match(documentation, /GRANT USAGE ON SEQUENCE processes_id_seq/);
  assert.match(documentation, /no `UPDATE`, `DELETE`, `TRUNCATE`/);
  assert.match(documentation, /Public Northstar remains fixture-backed and read-only/);
});

test("Milestone C changes no schema or migration", async () => {
  const documentation = await read("docs/PROCESS_ACQUISITION_ADMINISTRATION.md");
  assert.match(documentation, /current schema does not persist acquisition evidence/);
  assert.match(documentation, /creates only the minimal Draft shell/);
});
