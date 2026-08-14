import assert from "node:assert/strict";
import test from "node:test";

import {
  OperatingModelAuthoringConfigurationError,
  resolveOperatingModelAuthoringConfiguration,
} from "../lib/operating-model-authoring-policy.mjs";

const privateRuntime = {
  authentication: {
    adminIdentifier: "fictional-admin",
    mode: "temporary-password",
  },
  operatingModel: {
    databaseUrl: "postgresql://runtime:secret@ep-fictional.test/demo",
    mode: "neon",
    organizationId: 7,
  },
};

test("Operating Model Authoring is disabled by default", () => {
  assert.deepEqual(
    resolveOperatingModelAuthoringConfiguration({}, privateRuntime),
    { enabled: false },
  );
});

test("public and fixture workspaces cannot enable authoring", () => {
  assert.throws(
    () =>
      resolveOperatingModelAuthoringConfiguration(
        {
          DATABASE_URL: "postgresql://runtime:secret@ep-fictional.test/demo",
          LOTURA_OPERATING_MODEL_AUTHORING_MODE: "enabled",
          LOTURA_PROCESS_ADMIN_DATABASE_URL:
            "postgresql://author:secret@ep-fictional.test/demo",
        },
        {
          authentication: { mode: "public" },
          operatingModel: { mode: "demo" },
        },
      ),
    OperatingModelAuthoringConfigurationError,
  );
});

test("the Process administration credential is target-bound and distinct", () => {
  const enabled = resolveOperatingModelAuthoringConfiguration(
    {
      DATABASE_URL:
        "postgresql://runtime:secret@ep-fictional-pooler.test/demo",
      LOTURA_OPERATING_MODEL_AUTHORING_MODE: "enabled",
      LOTURA_PROCESS_ADMIN_DATABASE_URL:
        "postgresql://author:secret@ep-fictional.test/demo",
    },
    privateRuntime,
  );
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.organizationId, 7);
  assert.equal(enabled.actorIdentifier, "fictional-admin");

  for (const reusedVariable of [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "LOTURA_STRUCTURE_ADMIN_DATABASE_URL",
    "LOTURA_DISCOVERY_DATABASE_URL",
    "LOTURA_PROPOSAL_REVIEW_DATABASE_URL",
  ]) {
    assert.throws(
      () =>
        resolveOperatingModelAuthoringConfiguration(
          {
            DATABASE_URL:
              "postgresql://runtime:secret@ep-fictional.test/demo",
            LOTURA_OPERATING_MODEL_AUTHORING_MODE: "enabled",
            LOTURA_PROCESS_ADMIN_DATABASE_URL:
              "postgresql://runtime:different-secret@ep-fictional.test/demo",
            [reusedVariable]:
              "postgresql://runtime:secret@ep-fictional.test/demo",
          },
          privateRuntime,
        ),
      OperatingModelAuthoringConfigurationError,
    );
  }
});

test("invalid and missing authoring configuration fails closed", () => {
  assert.throws(
    () =>
      resolveOperatingModelAuthoringConfiguration(
        { LOTURA_OPERATING_MODEL_AUTHORING_MODE: "yes" },
        privateRuntime,
      ),
    OperatingModelAuthoringConfigurationError,
  );
  assert.throws(
    () =>
      resolveOperatingModelAuthoringConfiguration(
        { LOTURA_OPERATING_MODEL_AUTHORING_MODE: "enabled" },
        privateRuntime,
      ),
    OperatingModelAuthoringConfigurationError,
  );
});
