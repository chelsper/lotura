import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readRepositoryFile = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration0004 = readRepositoryFile(
  "drizzle/0004_structural_identity_and_current_organization_context.sql",
);
const migration0005 = readRepositoryFile(
  "drizzle/0005_occupancy_and_reporting_structure.sql",
);
const migration0006 = readRepositoryFile(
  "drizzle/0006_operating_model_responsibility_bridge.sql",
);
const schema = readRepositoryFile("db/schema.ts");
const migrations = `${migration0004}\n${migration0005}\n${migration0006}`;

const createdTables = [...migrations.matchAll(/CREATE TABLE "([^"]+)"/g)].map(
  ([, tableName]) => tableName,
);

test("migrations 0004-0006 create only the eight approved structure tables", () => {
  assert.deepEqual(createdTables.sort(), [
    "organization_structure_imports",
    "organization_units",
    "people",
    "position_assignments",
    "position_reporting_relationships",
    "positions",
    "role_coverages",
    "role_mandates",
  ]);

  assert.doesNotMatch(
    migrations,
    /(?:ALTER|DROP|TRUNCATE|DELETE FROM|UPDATE|INSERT INTO) "(?:role_assignments|processes|process_steps|exceptions|systems|process_systems|process_dependencies)"/,
  );
});

test("each migration keeps its approved entity and enum boundary", () => {
  assert.match(migration0004, /CREATE TYPE .*"structural_lifecycle_status"/);
  assert.match(migration0004, /CREATE TABLE "organization_structure_imports"/);
  assert.match(migration0004, /CREATE TABLE "people"/);
  assert.match(migration0004, /CREATE TABLE "organization_units"/);
  assert.match(migration0004, /CREATE TABLE "positions"/);
  assert.doesNotMatch(
    migration0004,
    /"(?:effective_record_status|position_assignment_type|reporting_relationship_type|role_mandate_type|role_coverage_type)" AS ENUM/,
  );

  for (const typeName of [
    "effective_record_status",
    "position_assignment_type",
    "reporting_relationship_type",
  ]) {
    assert.match(migration0005, new RegExp(`CREATE TYPE .*"${typeName}"`));
  }
  assert.match(migration0005, /CREATE TABLE "position_assignments"/);
  assert.match(
    migration0005,
    /CREATE TABLE "position_reporting_relationships"/,
  );

  for (const typeName of ["role_mandate_type", "role_coverage_type"]) {
    assert.match(migration0006, new RegExp(`CREATE TYPE .*"${typeName}"`));
  }
  assert.match(migration0006, /CREATE TABLE "role_mandates"/);
  assert.match(migration0006, /CREATE TABLE "role_coverages"/);
});

test("canonical structural identities receive random immutable UUID keys", () => {
  for (const tableName of [
    "organization_structure_imports",
    "people",
    "organization_units",
    "positions",
  ]) {
    const tableStart = migration0004.indexOf(`CREATE TABLE "${tableName}"`);
    assert.notEqual(tableStart, -1);
    const tableEnd = migration0004.indexOf(");", tableStart);
    const tableSql = migration0004.slice(tableStart, tableEnd);
    assert.match(tableSql, /"stable_key" uuid DEFAULT gen_random_uuid\(\) NOT NULL/);
    assert.match(
      migration0004,
      new RegExp(`CREATE TRIGGER "${tableName}_stable_key_immutable_trigger"`),
    );
  }

  assert.match(schema, /uuid\("stable_key"\)\.defaultRandom\(\)\.notNull\(\)/);
  assert.match(migration0004, /lotura_prevent_stable_key_update/);
});

test("same-organization relationships use composite restrictive foreign keys", () => {
  const expectedForeignKeys = [
    "people_membership_organization_fk",
    "people_introduced_by_import_organization_fk",
    "organization_units_parent_organization_fk",
    "organization_units_introduced_by_import_organization_fk",
    "positions_organization_unit_organization_fk",
    "positions_introduced_by_import_organization_fk",
    "position_assignments_position_organization_fk",
    "position_assignments_person_organization_fk",
    "position_reporting_relationships_subordinate_organization_fk",
    "position_reporting_relationships_manager_organization_fk",
    "role_mandates_position_organization_fk",
    "role_mandates_role_organization_fk",
    "role_coverages_role_mandate_organization_fk",
    "role_coverages_person_organization_fk",
  ];

  for (const constraintName of expectedForeignKeys) {
    assert.match(
      migrations,
      new RegExp(
        `ADD CONSTRAINT "${constraintName}" FOREIGN KEY \\([^;]+ON DELETE restrict`,
      ),
    );
  }
});

test("partial uniqueness preserves approved current-state semantics", () => {
  for (const indexName of [
    "organization_structure_imports_one_current_per_org_idx",
    "position_assignments_one_active_incumbent_per_position_idx",
    "position_reporting_one_active_primary_per_subordinate_idx",
    "role_mandates_one_active_primary_per_role_idx",
  ]) {
    assert.match(migrations, new RegExp(`CREATE UNIQUE INDEX "${indexName}"`));
  }

  assert.match(
    migrations,
    /"position_assignments"\."status" = 'active' and "position_assignments"\."assignment_type" = 'incumbent'/,
  );
  assert.match(
    migrations,
    /"role_mandates"\."status" = 'active' and "role_mandates"\."mandate_type" = 'primary'/,
  );
  assert.doesNotMatch(migration0006, /one_active.*role_coverages/i);
});

test("effective and lifecycle checks preserve temporary and historical records", () => {
  for (const constraintName of [
    "organization_structure_imports_counts_nonnegative_check",
    "organization_structure_imports_timestamp_order_check",
    "organization_units_effective_window_check",
    "organization_units_retired_has_effective_until_check",
    "positions_effective_window_check",
    "positions_retired_has_effective_until_check",
    "position_assignments_non_incumbent_reason_check",
    "position_reporting_relationships_effective_window_check",
    "position_reporting_relationships_ended_until_check",
    "role_mandates_shared_scope_check",
    "role_coverages_non_permanent_reason_check",
  ]) {
    assert.match(migrations, new RegExp(`CONSTRAINT "${constraintName}" CHECK`));
  }
});

test("cycle protection is deferred and reporting cycles are effective-period aware", () => {
  assert.match(
    migration0004,
    /CREATE CONSTRAINT TRIGGER "organization_units_parent_cycle_constraint_trigger"[\s\S]*DEFERRABLE INITIALLY DEFERRED/,
  );
  assert.match(
    migration0005,
    /CREATE CONSTRAINT TRIGGER "position_reporting_primary_cycle_constraint_trigger"[\s\S]*DEFERRABLE INITIALLY DEFERRED/,
  );
  assert.match(migration0005, /tstzrange\(/);
  assert.match(migration0005, /overlapping_period && tstzrange\(/);
  assert.match(migration0005, /overlapping_period \* tstzrange\(/);
  assert.match(
    migration0005,
    /relationship_type = 'primary'[\s\S]*status <> 'cancelled'/,
  );
});

test("schema keeps legacy RoleAssignment and the operating model unchanged", () => {
  assert.match(schema, /export const roleAssignment = pgTable\(/);
  assert.match(schema, /export const process = pgTable\(/);
  assert.match(schema, /export const processStep = pgTable\(/);
  assert.match(schema, /export const exception = pgTable\(/);
  assert.match(schema, /export const system = pgTable\(/);
  assert.match(schema, /export const processSystem = pgTable\(/);
  assert.match(schema, /export const processDependency = pgTable\(/);
});
