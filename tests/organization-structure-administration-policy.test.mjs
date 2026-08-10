import assert from "node:assert/strict";
import test from "node:test";

import {
  OrganizationStructureAdministrationConfigurationError,
  resolveOrganizationStructureAdministrationConfiguration,
} from "../lib/organization-structure-administration-policy.mjs";

const temporaryNeonAccess = {
  authentication: {
    mode: "temporary-password",
    adminIdentifier: "fictional-structure-admin",
  },
  operatingModel: {
    deploymentEnvironment: "production",
    mode: "neon",
    organizationId: 17,
  },
};

const enabledEnvironment = {
  LOTURA_STRUCTURE_ADMIN_MODE: "enabled",
  LOTURA_STRUCTURE_ADMIN_DATABASE_URL:
    "postgresql://fictional_structure_writer:fictional-password@fictional.invalid/fictional_structure",
  DATABASE_URL:
    "postgresql://fictional_runtime:fictional-password@fictional.invalid/fictional_structure",
};

const ownerUrl =
  "postgresql://fictional_owner:fictional-password@fictional.invalid/fictional_structure";

test("structure administration is disabled by default", () => {
  assert.deepEqual(
    resolveOrganizationStructureAdministrationConfiguration(
      {},
      temporaryNeonAccess,
    ),
    { enabled: false },
  );
});

test("enabled administration requires authenticated organization-scoped Neon", () => {
  assert.throws(
    () =>
      resolveOrganizationStructureAdministrationConfiguration(
        enabledEnvironment,
        {
          ...temporaryNeonAccess,
          authentication: { mode: "public" },
        },
      ),
    OrganizationStructureAdministrationConfigurationError,
  );
  assert.throws(
    () =>
      resolveOrganizationStructureAdministrationConfiguration(
        enabledEnvironment,
        {
          ...temporaryNeonAccess,
          operatingModel: {
            deploymentEnvironment: "production",
            mode: "demo",
            organizationId: null,
          },
        },
      ),
    /organization-scoped Neon source/,
  );
});

test("enabled administration uses a dedicated server-only credential", () => {
  const configuration =
    resolveOrganizationStructureAdministrationConfiguration(
      enabledEnvironment,
      temporaryNeonAccess,
    );
  assert.equal(configuration.enabled, true);
  assert.equal(configuration.organizationId, 17);
  assert.equal(configuration.actorIdentifier, "fictional-structure-admin");
  assert.match(configuration.databaseUrl, /^postgresql:\/\//);

  assert.throws(
    () =>
      resolveOrganizationStructureAdministrationConfiguration(
        {
          ...enabledEnvironment,
          LOTURA_STRUCTURE_ADMIN_DATABASE_URL: enabledEnvironment.DATABASE_URL,
        },
        temporaryNeonAccess,
      ),
    /cannot reuse runtime, owner, or migration credentials/,
  );

  assert.throws(
    () =>
      resolveOrganizationStructureAdministrationConfiguration(
        {
          ...enabledEnvironment,
          DATABASE_URL_UNPOOLED: ownerUrl,
          LOTURA_STRUCTURE_ADMIN_DATABASE_URL: ownerUrl.replace(
            "fictional.invalid",
            "fictional-direct.invalid",
          ),
        },
        temporaryNeonAccess,
      ),
    /cannot reuse runtime, owner, or migration credentials/,
  );

  assert.throws(
    () =>
      resolveOrganizationStructureAdministrationConfiguration(
        {
          ...enabledEnvironment,
          LOTURA_STRUCTURE_ADMIN_DATABASE_URL:
            "postgresql://fictional_structure_writer:fictional-password@fictional.invalid/other_database",
        },
        temporaryNeonAccess,
      ),
    /same database as the configured runtime source/,
  );

  assert.throws(
    () =>
      resolveOrganizationStructureAdministrationConfiguration(
        {
          ...enabledEnvironment,
          LOTURA_STRUCTURE_ADMIN_DATABASE_URL:
            "postgresql://fictional_structure_writer:fictional-password@other-endpoint.invalid/fictional_structure",
        },
        temporaryNeonAccess,
      ),
    /same Neon endpoint as the configured runtime source/,
  );

  const pooledEnvironment = {
    ...enabledEnvironment,
    DATABASE_URL:
      "postgresql://fictional_runtime:fictional-password@ep-fictional-pooler.c-4.us-east-2.aws.neon.tech/fictional_structure",
    LOTURA_STRUCTURE_ADMIN_DATABASE_URL:
      "postgresql://fictional_structure_writer:fictional-password@ep-fictional.c-4.us-east-2.aws.neon.tech/fictional_structure",
  };
  assert.equal(
    resolveOrganizationStructureAdministrationConfiguration(
      pooledEnvironment,
      temporaryNeonAccess,
    ).enabled,
    true,
  );
});

test("invalid administration modes and connection URLs fail closed", () => {
  assert.throws(
    () =>
      resolveOrganizationStructureAdministrationConfiguration(
        { LOTURA_STRUCTURE_ADMIN_MODE: "yes" },
        temporaryNeonAccess,
      ),
    /disabled or enabled/,
  );
  assert.throws(
    () =>
      resolveOrganizationStructureAdministrationConfiguration(
        {
          LOTURA_STRUCTURE_ADMIN_MODE: "enabled",
          LOTURA_STRUCTURE_ADMIN_DATABASE_URL: "not-a-url",
        },
        temporaryNeonAccess,
      ),
    /valid PostgreSQL connection URL/,
  );
});
