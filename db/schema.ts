import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const activeInactiveStatus = pgEnum("active_inactive_status", [
  "active",
  "inactive",
]);

export const membershipAccessLevel = pgEnum("membership_access_level", [
  "owner",
  "admin",
  "member",
]);

export const roleAssignmentType = pgEnum("role_assignment_type", [
  "permanent",
  "interim",
  "acting",
  "backup",
]);

export const roleAssignmentStatus = pgEnum("role_assignment_status", [
  "scheduled",
  "active",
  "ended",
  "cancelled",
]);

export const processStatus = pgEnum("process_status", [
  "draft",
  "active",
  "archived",
]);

export const systemType = pgEnum("system_type", [
  "software",
  "external_service",
  "manual_record",
  "other",
]);

export const processDependencyType = pgEnum("process_dependency_type", [
  "requires",
  "receives_from",
  "provides_to",
  "triggers",
]);

export const structuralLifecycleStatus = pgEnum(
  "structural_lifecycle_status",
  ["active", "inactive", "retired"],
);

export const effectiveRecordStatus = pgEnum("effective_record_status", [
  "scheduled",
  "active",
  "ended",
  "cancelled",
]);

export const positionAssignmentType = pgEnum("position_assignment_type", [
  "incumbent",
  "job_share",
  "interim",
  "acting",
  "backup",
]);

export const reportingRelationshipType = pgEnum(
  "reporting_relationship_type",
  ["primary", "dotted_line", "functional"],
);

export const roleMandateType = pgEnum("role_mandate_type", [
  "primary",
  "shared",
]);

export const roleCoverageType = pgEnum("role_coverage_type", [
  "permanent",
  "interim",
  "acting",
  "delegated",
  "backup",
]);

export const organizationStructureChangeKind = pgEnum(
  "organization_structure_change_kind",
  ["correction", "organizational_change"],
);

export const organizationStructureChangeAction = pgEnum(
  "organization_structure_change_action",
  [
    "update",
    "remove_from_current_structure",
    "end_assignment",
    "replace_assignment",
    "end_reporting_relationship",
    "correct_reporting_relationship",
    "establish_reporting_relationship",
    "replace_reporting_relationship",
    "establish_role_mandate",
    "end_role_mandate",
    "establish_role_coverage",
    "end_role_coverage",
    "create",
    "establish_assignment",
  ],
);

export const organizationStructureChangeEntityType = pgEnum(
  "organization_structure_change_entity_type",
  ["organization_unit", "position", "person"],
);

export const operatingModelChangeKind = pgEnum(
  "operating_model_change_kind",
  ["correction", "organizational_change"],
);

export const operatingModelChangeEntityType = pgEnum(
  "operating_model_change_entity_type",
  ["process"],
);

export const operatingModelChangeAction = pgEnum(
  "operating_model_change_action",
  ["create_draft", "update_definition", "change_owner"],
);

export const organization = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const user = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("users_email_unique").on(table.email)],
);

export const membership = pgTable(
  "memberships",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    userId: integer("user_id").notNull(),
    accessLevel: membershipAccessLevel("access_level").notNull(),
    status: activeInactiveStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "memberships_organization_id_organizations_id_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "memberships_user_id_users_id_fk",
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete("restrict"),
    unique("memberships_organization_id_user_id_unique").on(
      table.organizationId,
      table.userId,
    ),
    unique("memberships_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const role = pgTable(
  "roles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: activeInactiveStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "roles_organization_id_organizations_id_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    unique("roles_organization_id_name_unique").on(
      table.organizationId,
      table.name,
    ),
    unique("roles_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    index("roles_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const roleAssignment = pgTable(
  "role_assignments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    roleId: integer("role_id").notNull(),
    membershipId: integer("membership_id").notNull(),
    assignmentType: roleAssignmentType("assignment_type").notNull(),
    status: roleAssignmentStatus("status").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "role_assignments_role_organization_fk",
      columns: [table.roleId, table.organizationId],
      foreignColumns: [role.id, role.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "role_assignments_membership_organization_fk",
      columns: [table.membershipId, table.organizationId],
      foreignColumns: [membership.id, membership.organizationId],
    }).onDelete("restrict"),
    check(
      "role_assignments_effective_window_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
    check(
      "role_assignments_ended_has_effective_until_check",
      sql`${table.status} <> 'ended' or ${table.effectiveUntil} is not null`,
    ),
    uniqueIndex("role_assignments_one_active_primary_per_role_idx")
      .on(table.roleId)
      .where(
        sql`${table.status} = 'active' and ${table.assignmentType} in ('permanent', 'interim', 'acting')`,
      ),
    index("role_assignments_role_id_idx").on(table.roleId),
    index("role_assignments_membership_id_idx").on(table.membershipId),
    index("role_assignments_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const process = pgTable(
  "processes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    purpose: text("purpose"),
    ownerRoleId: integer("owner_role_id"),
    status: processStatus("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "processes_organization_id_organizations_id_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "processes_owner_role_organization_fk",
      columns: [table.ownerRoleId, table.organizationId],
      foreignColumns: [role.id, role.organizationId],
    }).onDelete("restrict"),
    unique("processes_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("processes_stable_key_unique").on(table.stableKey),
    unique("processes_id_org_stable_key_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    check(
      "processes_owner_required_unless_draft_check",
      sql`${table.status} = 'draft' or ${table.ownerRoleId} is not null`,
    ),
    index("processes_organization_id_idx").on(table.organizationId),
    index("processes_owner_role_id_idx").on(table.ownerRoleId),
    index("processes_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const operatingModelChange = pgTable(
  "operating_model_changes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    processId: integer("process_id").notNull(),
    processStableKey: uuid("process_stable_key").notNull(),
    entityType: operatingModelChangeEntityType("entity_type").notNull(),
    targetReference: varchar("target_reference", { length: 255 }).notNull(),
    changeKind: operatingModelChangeKind("change_kind").notNull(),
    changeAction: operatingModelChangeAction("change_action").notNull(),
    beforeState: jsonb("before_state").notNull(),
    afterState: jsonb("after_state").notNull(),
    reason: text("reason").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "operating_model_changes_process_org_stable_fk",
      columns: [
        table.processId,
        table.organizationId,
        table.processStableKey,
      ],
      foreignColumns: [
        process.id,
        process.organizationId,
        process.stableKey,
      ],
    }).onDelete("restrict"),
    unique("operating_model_changes_stable_key_unique").on(
      table.stableKey,
    ),
    check(
      "operating_model_changes_target_not_blank_check",
      sql`char_length(trim(${table.targetReference})) > 0`,
    ),
    check(
      "operating_model_changes_reason_not_blank_check",
      sql`char_length(trim(${table.reason})) > 0`,
    ),
    check(
      "operating_model_changes_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "operating_model_changes_json_objects_check",
      sql`jsonb_typeof(${table.beforeState}) = 'object' and jsonb_typeof(${table.afterState}) = 'object'`,
    ),
    check(
      "operating_model_changes_effective_at_check",
      sql`${table.effectiveAt} <= ${table.createdAt}`,
    ),
    index("operating_model_changes_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("operating_model_changes_process_created_idx").on(
      table.organizationId,
      table.processStableKey,
      table.createdAt,
    ),
  ],
);

export const processStep = pgTable(
  "process_steps",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    processId: integer("process_id").notNull(),
    position: integer("position").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    instructions: text("instructions").notNull(),
    responsibleRoleId: integer("responsible_role_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "process_steps_process_organization_fk",
      columns: [table.processId, table.organizationId],
      foreignColumns: [process.id, process.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "process_steps_responsible_role_organization_fk",
      columns: [table.responsibleRoleId, table.organizationId],
      foreignColumns: [role.id, role.organizationId],
    }).onDelete("restrict"),
    unique("process_steps_process_id_position_unique").on(
      table.processId,
      table.position,
    ),
    unique("process_steps_id_process_id_organization_id_unique").on(
      table.id,
      table.processId,
      table.organizationId,
    ),
    check(
      "process_steps_position_positive_check",
      sql`${table.position} >= 1`,
    ),
    index("process_steps_responsible_role_id_idx").on(
      table.responsibleRoleId,
    ),
  ],
);

export const exception = pgTable(
  "exceptions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    processId: integer("process_id").notNull(),
    processStepId: integer("process_step_id"),
    name: varchar("name", { length: 255 }).notNull(),
    condition: text("condition").notNull(),
    response: text("response").notNull(),
    status: activeInactiveStatus("status").default("active").notNull(),
    ownerRoleId: integer("owner_role_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "exceptions_process_organization_fk",
      columns: [table.processId, table.organizationId],
      foreignColumns: [process.id, process.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "exceptions_process_step_process_organization_fk",
      columns: [
        table.processStepId,
        table.processId,
        table.organizationId,
      ],
      foreignColumns: [
        processStep.id,
        processStep.processId,
        processStep.organizationId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "exceptions_owner_role_organization_fk",
      columns: [table.ownerRoleId, table.organizationId],
      foreignColumns: [role.id, role.organizationId],
    }).onDelete("restrict"),
    check(
      "exceptions_name_not_blank_check",
      sql`char_length(trim(${table.name})) > 0`,
    ),
    check(
      "exceptions_condition_not_blank_check",
      sql`char_length(trim(${table.condition})) > 0`,
    ),
    check(
      "exceptions_response_not_blank_check",
      sql`char_length(trim(${table.response})) > 0`,
    ),
    index("exceptions_process_id_idx").on(table.processId),
    index("exceptions_process_step_id_idx").on(table.processStepId),
    index("exceptions_owner_role_id_idx").on(table.ownerRoleId),
    index("exceptions_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const system = pgTable(
  "systems",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    systemType: systemType("system_type").notNull(),
    url: text("url"),
    ownerRoleId: integer("owner_role_id"),
    status: activeInactiveStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "systems_organization_id_organizations_id_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "systems_owner_role_organization_fk",
      columns: [table.ownerRoleId, table.organizationId],
      foreignColumns: [role.id, role.organizationId],
    }).onDelete("restrict"),
    unique("systems_organization_id_name_unique").on(
      table.organizationId,
      table.name,
    ),
    unique("systems_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    index("systems_owner_role_id_idx").on(table.ownerRoleId),
    index("systems_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const processSystem = pgTable(
  "process_systems",
  {
    organizationId: integer("organization_id").notNull(),
    processId: integer("process_id").notNull(),
    systemId: integer("system_id").notNull(),
    usage: text("usage").notNull(),
  },
  (table) => [
    primaryKey({
      name: "process_systems_process_id_system_id_pk",
      columns: [table.processId, table.systemId],
    }),
    foreignKey({
      name: "process_systems_process_organization_fk",
      columns: [table.processId, table.organizationId],
      foreignColumns: [process.id, process.organizationId],
    }).onDelete("cascade"),
    foreignKey({
      name: "process_systems_system_organization_fk",
      columns: [table.systemId, table.organizationId],
      foreignColumns: [system.id, system.organizationId],
    }).onDelete("restrict"),
    index("process_systems_system_id_idx").on(table.systemId),
    index("process_systems_organization_id_idx").on(table.organizationId),
  ],
);

export const processDependency = pgTable(
  "process_dependencies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    sourceProcessId: integer("source_process_id").notNull(),
    targetProcessId: integer("target_process_id").notNull(),
    dependencyType: processDependencyType("dependency_type").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "process_dependencies_source_process_organization_fk",
      columns: [table.sourceProcessId, table.organizationId],
      foreignColumns: [process.id, process.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "process_dependencies_target_process_organization_fk",
      columns: [table.targetProcessId, table.organizationId],
      foreignColumns: [process.id, process.organizationId],
    }).onDelete("restrict"),
    unique("process_dependencies_source_target_type_unique").on(
      table.sourceProcessId,
      table.targetProcessId,
      table.dependencyType,
    ),
    check(
      "process_dependencies_distinct_processes_check",
      sql`${table.sourceProcessId} <> ${table.targetProcessId}`,
    ),
    index("process_dependencies_target_process_id_idx").on(
      table.targetProcessId,
    ),
    index("process_dependencies_organization_id_type_idx").on(
      table.organizationId,
      table.dependencyType,
    ),
  ],
);

export const organizationStructureImport = pgTable(
  "organization_structure_imports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    sourceFingerprint: varchar("source_fingerprint", { length: 64 }).notNull(),
    approvedBasisFingerprint: varchar("approved_basis_fingerprint", {
      length: 64,
    }).notNull(),
    sourceAsOf: timestamp("source_as_of", { withTimezone: true }).notNull(),
    isPartial: boolean("is_partial").default(true).notNull(),
    vacancyEvidenceComplete: boolean("vacancy_evidence_complete")
      .default(false)
      .notNull(),
    personCount: integer("person_count").notNull(),
    organizationUnitCount: integer("organization_unit_count").notNull(),
    positionCount: integer("position_count").notNull(),
    positionAssignmentCount: integer("position_assignment_count").notNull(),
    reportingRelationshipCount: integer(
      "reporting_relationship_count",
    ).notNull(),
    roleMandateCount: integer("role_mandate_count").notNull(),
    roleCoverageCount: integer("role_coverage_count").notNull(),
    approvedForImportAt: timestamp("approved_for_import_at", {
      withTimezone: true,
    }).notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    currentForPilotUseAt: timestamp("current_for_pilot_use_at", {
      withTimezone: true,
    }),
    endedForPilotUseAt: timestamp("ended_for_pilot_use_at", {
      withTimezone: true,
    }),
    applicationVersion: varchar("application_version", {
      length: 64,
    }).notNull(),
    schemaVersion: varchar("schema_version", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "organization_structure_imports_org_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    unique("organization_structure_imports_stable_key_unique").on(
      table.stableKey,
    ),
    unique("organization_structure_imports_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique(
      "organization_structure_imports_org_approved_basis_unique",
    ).on(table.organizationId, table.approvedBasisFingerprint),
    check(
      "organization_structure_imports_source_fingerprint_check",
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "organization_structure_imports_approved_basis_fingerprint_check",
      sql`${table.approvedBasisFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "organization_structure_imports_counts_nonnegative_check",
      sql`${table.personCount} >= 0 and ${table.organizationUnitCount} >= 0 and ${table.positionCount} >= 0 and ${table.positionAssignmentCount} >= 0 and ${table.reportingRelationshipCount} >= 0 and ${table.roleMandateCount} >= 0 and ${table.roleCoverageCount} >= 0`,
    ),
    check(
      "organization_structure_imports_timestamp_order_check",
      sql`${table.importedAt} >= ${table.approvedForImportAt} and (${table.currentForPilotUseAt} is null or ${table.currentForPilotUseAt} >= ${table.importedAt}) and (${table.endedForPilotUseAt} is null or (${table.currentForPilotUseAt} is not null and ${table.endedForPilotUseAt} > ${table.currentForPilotUseAt}))`,
    ),
    uniqueIndex("organization_structure_imports_one_current_per_org_idx")
      .on(table.organizationId)
      .where(
        sql`${table.currentForPilotUseAt} is not null and ${table.endedForPilotUseAt} is null`,
      ),
    index("organization_structure_imports_organization_imported_at_idx").on(
      table.organizationId,
      table.importedAt,
    ),
    index("organization_structure_imports_organization_source_as_of_idx").on(
      table.organizationId,
      table.sourceAsOf,
    ),
  ],
);

export const person = pgTable(
  "people",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    membershipId: integer("membership_id"),
    authoritativeIdAuthority: varchar("authoritative_id_authority", {
      length: 255,
    }),
    authoritativeId: varchar("authoritative_id", { length: 255 }),
    status: activeInactiveStatus("status").default("active").notNull(),
    introducedByImportId: integer("introduced_by_import_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "people_organization_id_organizations_id_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "people_membership_organization_fk",
      columns: [table.membershipId, table.organizationId],
      foreignColumns: [membership.id, membership.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "people_introduced_by_import_organization_fk",
      columns: [table.introducedByImportId, table.organizationId],
      foreignColumns: [
        organizationStructureImport.id,
        organizationStructureImport.organizationId,
      ],
    }).onDelete("restrict"),
    unique("people_stable_key_unique").on(table.stableKey),
    unique("people_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("people_id_org_stable_key_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    check(
      "people_display_name_not_blank_check",
      sql`char_length(trim(${table.displayName})) > 0`,
    ),
    check(
      "people_authoritative_id_pair_check",
      sql`(${table.authoritativeIdAuthority} is null and ${table.authoritativeId} is null) or (${table.authoritativeIdAuthority} is not null and ${table.authoritativeId} is not null)`,
    ),
    uniqueIndex("people_organization_authoritative_id_unique_idx")
      .on(
        table.organizationId,
        table.authoritativeIdAuthority,
        table.authoritativeId,
      )
      .where(
        sql`${table.authoritativeIdAuthority} is not null and ${table.authoritativeId} is not null`,
      ),
    uniqueIndex("people_membership_id_unique_idx")
      .on(table.membershipId)
      .where(sql`${table.membershipId} is not null`),
    index("people_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("people_organization_id_display_name_idx").on(
      table.organizationId,
      table.displayName,
    ),
    index("people_membership_id_idx").on(table.membershipId),
    index("people_introduced_by_import_id_idx").on(
      table.introducedByImportId,
    ),
  ],
);

export const organizationUnit = pgTable(
  "organization_units",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    parentOrganizationUnitId: integer("parent_organization_unit_id"),
    isProvisional: boolean("is_provisional").default(true).notNull(),
    authoritativeIdAuthority: varchar("authoritative_id_authority", {
      length: 255,
    }),
    authoritativeId: varchar("authoritative_id", { length: 255 }),
    status: structuralLifecycleStatus("status").default("active").notNull(),
    statusReason: text("status_reason"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    introducedByImportId: integer("introduced_by_import_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "organization_units_organization_id_organizations_id_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "organization_units_parent_organization_fk",
      columns: [table.parentOrganizationUnitId, table.organizationId],
      foreignColumns: [table.id, table.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "organization_units_introduced_by_import_organization_fk",
      columns: [table.introducedByImportId, table.organizationId],
      foreignColumns: [
        organizationStructureImport.id,
        organizationStructureImport.organizationId,
      ],
    }).onDelete("restrict"),
    unique("organization_units_stable_key_unique").on(table.stableKey),
    unique("organization_units_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("organization_units_id_org_stable_key_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    check(
      "organization_units_name_not_blank_check",
      sql`char_length(trim(${table.name})) > 0`,
    ),
    check(
      "organization_units_distinct_parent_check",
      sql`${table.parentOrganizationUnitId} is null or ${table.parentOrganizationUnitId} <> ${table.id}`,
    ),
    check(
      "organization_units_authoritative_id_pair_check",
      sql`(${table.authoritativeIdAuthority} is null and ${table.authoritativeId} is null) or (${table.authoritativeIdAuthority} is not null and ${table.authoritativeId} is not null)`,
    ),
    check(
      "organization_units_effective_window_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
    check(
      "organization_units_retired_has_effective_until_check",
      sql`${table.status} <> 'retired' or ${table.effectiveUntil} is not null`,
    ),
    check(
      "organization_units_status_reason_check",
      sql`${table.status} = 'active' or char_length(trim(coalesce(${table.statusReason}, ''))) > 0`,
    ),
    uniqueIndex("organization_units_organization_authoritative_id_unique_idx")
      .on(
        table.organizationId,
        table.authoritativeIdAuthority,
        table.authoritativeId,
      )
      .where(
        sql`${table.authoritativeIdAuthority} is not null and ${table.authoritativeId} is not null`,
      ),
    index("organization_units_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("organization_units_organization_id_name_idx").on(
      table.organizationId,
      table.name,
    ),
    index("organization_units_parent_organization_unit_id_idx").on(
      table.parentOrganizationUnitId,
    ),
    index("organization_units_introduced_by_import_id_idx").on(
      table.introducedByImportId,
    ),
  ],
);

export const position = pgTable(
  "positions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    organizationUnitId: integer("organization_unit_id"),
    title: varchar("title", { length: 255 }).notNull(),
    authoritativeIdAuthority: varchar("authoritative_id_authority", {
      length: 255,
    }),
    authoritativeId: varchar("authoritative_id", { length: 255 }),
    status: structuralLifecycleStatus("status").default("active").notNull(),
    statusReason: text("status_reason"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    introducedByImportId: integer("introduced_by_import_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "positions_organization_id_organizations_id_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "positions_organization_unit_organization_fk",
      columns: [table.organizationUnitId, table.organizationId],
      foreignColumns: [organizationUnit.id, organizationUnit.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "positions_introduced_by_import_organization_fk",
      columns: [table.introducedByImportId, table.organizationId],
      foreignColumns: [
        organizationStructureImport.id,
        organizationStructureImport.organizationId,
      ],
    }).onDelete("restrict"),
    unique("positions_stable_key_unique").on(table.stableKey),
    unique("positions_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("positions_id_org_stable_key_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    check(
      "positions_title_not_blank_check",
      sql`char_length(trim(${table.title})) > 0`,
    ),
    check(
      "positions_authoritative_id_pair_check",
      sql`(${table.authoritativeIdAuthority} is null and ${table.authoritativeId} is null) or (${table.authoritativeIdAuthority} is not null and ${table.authoritativeId} is not null)`,
    ),
    check(
      "positions_effective_window_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
    check(
      "positions_retired_has_effective_until_check",
      sql`${table.status} <> 'retired' or ${table.effectiveUntil} is not null`,
    ),
    check(
      "positions_status_reason_check",
      sql`${table.status} = 'active' or char_length(trim(coalesce(${table.statusReason}, ''))) > 0`,
    ),
    uniqueIndex("positions_organization_authoritative_id_unique_idx")
      .on(
        table.organizationId,
        table.authoritativeIdAuthority,
        table.authoritativeId,
      )
      .where(
        sql`${table.authoritativeIdAuthority} is not null and ${table.authoritativeId} is not null`,
      ),
    index("positions_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("positions_organization_id_title_idx").on(
      table.organizationId,
      table.title,
    ),
    index("positions_organization_unit_id_idx").on(table.organizationUnitId),
    index("positions_introduced_by_import_id_idx").on(
      table.introducedByImportId,
    ),
  ],
);

export const positionAssignment = pgTable(
  "position_assignments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    positionId: integer("position_id").notNull(),
    personId: integer("person_id").notNull(),
    assignmentType: positionAssignmentType("assignment_type").notNull(),
    status: effectiveRecordStatus("status").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    reason: text("reason"),
    introducedByImportId: integer("introduced_by_import_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "position_assignments_position_organization_fk",
      columns: [table.positionId, table.organizationId],
      foreignColumns: [position.id, position.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "position_assignments_person_organization_fk",
      columns: [table.personId, table.organizationId],
      foreignColumns: [person.id, person.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "position_assignments_introduced_by_import_organization_fk",
      columns: [table.introducedByImportId, table.organizationId],
      foreignColumns: [
        organizationStructureImport.id,
        organizationStructureImport.organizationId,
      ],
    }).onDelete("restrict"),
    unique("position_assignments_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("position_assignments_exact_record_unique").on(
      table.positionId,
      table.personId,
      table.assignmentType,
      table.effectiveFrom,
    ),
    check(
      "position_assignments_effective_window_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
    check(
      "position_assignments_ended_has_effective_until_check",
      sql`${table.status} <> 'ended' or ${table.effectiveUntil} is not null`,
    ),
    check(
      "position_assignments_non_incumbent_reason_check",
      sql`${table.assignmentType} = 'incumbent' or char_length(trim(coalesce(${table.reason}, ''))) > 0`,
    ),
    uniqueIndex("position_assignments_one_active_incumbent_per_position_idx")
      .on(table.positionId)
      .where(
        sql`${table.status} = 'active' and ${table.assignmentType} = 'incumbent'`,
      ),
    index("position_assignments_position_id_idx").on(table.positionId),
    index("position_assignments_person_id_idx").on(table.personId),
    index("position_assignments_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("position_assignments_position_status_type_idx").on(
      table.positionId,
      table.status,
      table.assignmentType,
    ),
    index("position_assignments_introduced_by_import_id_idx").on(
      table.introducedByImportId,
    ),
  ],
);

export const positionReportingRelationship = pgTable(
  "position_reporting_relationships",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    subordinatePositionId: integer("subordinate_position_id").notNull(),
    managerPositionId: integer("manager_position_id").notNull(),
    relationshipType:
      reportingRelationshipType("relationship_type").notNull(),
    status: effectiveRecordStatus("status").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    reason: text("reason"),
    introducedByImportId: integer("introduced_by_import_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "position_reporting_relationships_subordinate_organization_fk",
      columns: [table.subordinatePositionId, table.organizationId],
      foreignColumns: [position.id, position.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "position_reporting_relationships_manager_organization_fk",
      columns: [table.managerPositionId, table.organizationId],
      foreignColumns: [position.id, position.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "position_reporting_relationships_import_organization_fk",
      columns: [table.introducedByImportId, table.organizationId],
      foreignColumns: [
        organizationStructureImport.id,
        organizationStructureImport.organizationId,
      ],
    }).onDelete("restrict"),
    unique("position_reporting_relationships_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("position_reporting_relationships_exact_record_unique").on(
      table.subordinatePositionId,
      table.managerPositionId,
      table.relationshipType,
      table.effectiveFrom,
    ),
    check(
      "position_reporting_relationships_distinct_positions_check",
      sql`${table.subordinatePositionId} <> ${table.managerPositionId}`,
    ),
    check(
      "position_reporting_relationships_effective_window_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
    check(
      "position_reporting_relationships_ended_until_check",
      sql`${table.status} <> 'ended' or ${table.effectiveUntil} is not null`,
    ),
    uniqueIndex(
      "position_reporting_one_active_primary_per_subordinate_idx",
    )
      .on(table.subordinatePositionId)
      .where(
        sql`${table.status} = 'active' and ${table.relationshipType} = 'primary'`,
      ),
    index("position_reporting_relationships_subordinate_position_id_idx").on(
      table.subordinatePositionId,
    ),
    index("position_reporting_relationships_manager_position_id_idx").on(
      table.managerPositionId,
    ),
    index("position_reporting_relationships_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("position_reporting_relationships_organization_id_type_idx").on(
      table.organizationId,
      table.relationshipType,
    ),
    index("position_reporting_relationships_introduced_by_import_id_idx").on(
      table.introducedByImportId,
    ),
  ],
);

export const roleMandate = pgTable(
  "role_mandates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    positionId: integer("position_id").notNull(),
    roleId: integer("role_id").notNull(),
    mandateType: roleMandateType("mandate_type").notNull(),
    scope: text("scope"),
    status: effectiveRecordStatus("status").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    reason: text("reason"),
    introducedByImportId: integer("introduced_by_import_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "role_mandates_position_organization_fk",
      columns: [table.positionId, table.organizationId],
      foreignColumns: [position.id, position.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "role_mandates_role_organization_fk",
      columns: [table.roleId, table.organizationId],
      foreignColumns: [role.id, role.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "role_mandates_introduced_by_import_organization_fk",
      columns: [table.introducedByImportId, table.organizationId],
      foreignColumns: [
        organizationStructureImport.id,
        organizationStructureImport.organizationId,
      ],
    }).onDelete("restrict"),
    unique("role_mandates_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("role_mandates_exact_record_unique").on(
      table.positionId,
      table.roleId,
      table.mandateType,
      table.effectiveFrom,
    ),
    check(
      "role_mandates_effective_window_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
    check(
      "role_mandates_ended_has_effective_until_check",
      sql`${table.status} <> 'ended' or ${table.effectiveUntil} is not null`,
    ),
    check(
      "role_mandates_shared_scope_check",
      sql`${table.mandateType} <> 'shared' or char_length(trim(coalesce(${table.scope}, ''))) > 0`,
    ),
    uniqueIndex("role_mandates_one_active_primary_per_role_idx")
      .on(table.roleId)
      .where(
        sql`${table.status} = 'active' and ${table.mandateType} = 'primary'`,
      ),
    index("role_mandates_position_id_idx").on(table.positionId),
    index("role_mandates_role_id_idx").on(table.roleId),
    index("role_mandates_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("role_mandates_introduced_by_import_id_idx").on(
      table.introducedByImportId,
    ),
  ],
);

export const roleCoverage = pgTable(
  "role_coverages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    roleMandateId: integer("role_mandate_id").notNull(),
    personId: integer("person_id").notNull(),
    coverageType: roleCoverageType("coverage_type").notNull(),
    status: effectiveRecordStatus("status").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    reason: text("reason"),
    introducedByImportId: integer("introduced_by_import_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "role_coverages_role_mandate_organization_fk",
      columns: [table.roleMandateId, table.organizationId],
      foreignColumns: [roleMandate.id, roleMandate.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "role_coverages_person_organization_fk",
      columns: [table.personId, table.organizationId],
      foreignColumns: [person.id, person.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "role_coverages_introduced_by_import_organization_fk",
      columns: [table.introducedByImportId, table.organizationId],
      foreignColumns: [
        organizationStructureImport.id,
        organizationStructureImport.organizationId,
      ],
    }).onDelete("restrict"),
    unique("role_coverages_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("role_coverages_exact_record_unique").on(
      table.roleMandateId,
      table.personId,
      table.coverageType,
      table.effectiveFrom,
    ),
    check(
      "role_coverages_effective_window_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
    check(
      "role_coverages_ended_has_effective_until_check",
      sql`${table.status} <> 'ended' or ${table.effectiveUntil} is not null`,
    ),
    check(
      "role_coverages_non_permanent_reason_check",
      sql`${table.coverageType} = 'permanent' or char_length(trim(coalesce(${table.reason}, ''))) > 0`,
    ),
    index("role_coverages_role_mandate_id_idx").on(table.roleMandateId),
    index("role_coverages_person_id_idx").on(table.personId),
    index("role_coverages_organization_id_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("role_coverages_mandate_status_type_idx").on(
      table.roleMandateId,
      table.status,
      table.coverageType,
    ),
    index("role_coverages_introduced_by_import_id_idx").on(
      table.introducedByImportId,
    ),
  ],
);

export const organizationStructureChange = pgTable(
  "organization_structure_changes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    entityType:
      organizationStructureChangeEntityType("entity_type").notNull(),
    targetStableKey: uuid("target_stable_key").notNull(),
    organizationUnitId: integer("organization_unit_id"),
    positionId: integer("position_id"),
    personId: integer("person_id"),
    changeKind: organizationStructureChangeKind("change_kind").notNull(),
    changeAction:
      organizationStructureChangeAction("change_action").notNull(),
    beforeState: jsonb("before_state").notNull(),
    afterState: jsonb("after_state").notNull(),
    reason: text("reason").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "organization_structure_changes_org_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "organization_structure_changes_unit_org_fk",
      columns: [
        table.organizationUnitId,
        table.organizationId,
        table.targetStableKey,
      ],
      foreignColumns: [
        organizationUnit.id,
        organizationUnit.organizationId,
        organizationUnit.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "organization_structure_changes_position_org_fk",
      columns: [table.positionId, table.organizationId, table.targetStableKey],
      foreignColumns: [position.id, position.organizationId, position.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "organization_structure_changes_person_org_fk",
      columns: [table.personId, table.organizationId, table.targetStableKey],
      foreignColumns: [person.id, person.organizationId, person.stableKey],
    }).onDelete("restrict"),
    unique("organization_structure_changes_stable_key_unique").on(
      table.stableKey,
    ),
    check(
      "organization_structure_changes_target_check",
      sql`(${table.entityType} = 'organization_unit' and ${table.organizationUnitId} is not null and ${table.positionId} is null and ${table.personId} is null) or (${table.entityType} = 'position' and ${table.organizationUnitId} is null and ${table.positionId} is not null and ${table.personId} is null) or (${table.entityType} = 'person' and ${table.organizationUnitId} is null and ${table.positionId} is null and ${table.personId} is not null)`,
    ),
    check(
      "organization_structure_changes_reason_not_blank_check",
      sql`char_length(trim(${table.reason})) > 0`,
    ),
    check(
      "organization_structure_changes_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "organization_structure_changes_json_objects_check",
      sql`jsonb_typeof(${table.beforeState}) = 'object' and jsonb_typeof(${table.afterState}) = 'object'`,
    ),
    check(
      "organization_structure_changes_effective_at_check",
      sql`${table.effectiveAt} <= ${table.createdAt}`,
    ),
    index("organization_structure_changes_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("organization_structure_changes_target_created_idx").on(
      table.organizationId,
      table.entityType,
      table.targetStableKey,
      table.createdAt,
    ),
    index("organization_structure_changes_unit_created_idx").on(
      table.organizationUnitId,
      table.createdAt,
    ),
    index("organization_structure_changes_position_created_idx").on(
      table.positionId,
      table.createdAt,
    ),
    index("organization_structure_changes_person_created_idx").on(
      table.personId,
      table.createdAt,
    ),
  ],
);
