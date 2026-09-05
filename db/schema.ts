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

export const processFamilyMembershipStatus = pgEnum(
  "process_family_membership_status",
  ["active", "ended"],
);

export const processFamilyRelationshipType = pgEnum(
  "process_family_relationship_type",
  ["broader_narrower"],
);

export const processFamilyRelationshipStatus = pgEnum(
  "process_family_relationship_status",
  ["active", "ended"],
);

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
    "merge_unit",
    "retire_unit_and_move_contents",
  ],
);

export const organizationStructureChangeEntityType = pgEnum(
  "organization_structure_change_entity_type",
  ["organization_unit", "position", "person", "operational_role"],
);

export const operatingModelChangeKind = pgEnum(
  "operating_model_change_kind",
  ["correction", "organizational_change"],
);

export const operatingModelChangeEntityType = pgEnum(
  "operating_model_change_entity_type",
  [
    "process",
    "process_step",
    "system",
    "process_system",
    "exception",
    "process_dependency",
    "process_family",
    "process_family_membership",
    "process_family_relationship",
  ],
);

export const operatingModelChangeAction = pgEnum(
  "operating_model_change_action",
  [
    "create_draft",
    "update_definition",
    "change_owner",
    "create_step",
    "update_step",
    "reorder_steps",
    "change_step_responsibility",
    "create_system",
    "update_system",
    "deactivate_system",
    "link_system",
    "update_system_usage",
    "unlink_system",
    "create_exception",
    "update_exception",
    "deactivate_exception",
    "create_dependency",
    "create_process_family",
    "update_process_family",
    "deactivate_process_family",
    "add_process_family_membership",
    "end_process_family_membership",
    "add_process_family_relationship",
    "end_process_family_relationship",
  ],
);

export const discoverySessionStatus = pgEnum("discovery_session_status", [
  "in_progress",
  "paused",
  "ready_for_review",
  "closed",
]);

export const discoveryInquiryStatus = pgEnum("discovery_inquiry_status", [
  "open",
  "waiting_for_information",
  "routed",
  "closed_for_now",
]);

export const discoveryInquiryRouteKind = pgEnum(
  "discovery_inquiry_route_kind",
  [
    "review_process",
    "review_process_family",
    "start_guided_interview",
    "start_inquiry_exploration",
    "wait_for_source",
    "finish_for_now",
  ],
);

export const discoveryObservationState = pgEnum(
  "discovery_observation_state",
  [
    "known",
    "assumed",
    "unknown",
    "needs_validation",
    "conflicting_observation",
  ],
);

export const discoveryObservationTopic = pgEnum(
  "discovery_observation_topic",
  [
    "purpose",
    "boundary",
    "participants_responsibility",
    "sequence",
    "systems",
    "exceptions",
    "dependencies_handoffs",
    "unresolved_questions",
  ],
);

export const discoveryAssistanceSessionKind = pgEnum(
  "discovery_assistance_session_kind",
  ["process", "inquiry"],
);

export const discoveryAssistanceKind = pgEnum(
  "discovery_assistance_kind",
  ["question_suggestions", "clarity_draft"],
);

export const discoveryAssistanceSourceKind = pgEnum(
  "discovery_assistance_source_kind",
  [
    "process_snapshot",
    "process_observation",
    "inquiry_context",
    "inquiry_observation",
  ],
);

export const discoveryAssistanceSuggestionKind = pgEnum(
  "discovery_assistance_suggestion_kind",
  ["follow_up_question", "clarity_draft"],
);

export const discoveryAssistanceDisposition = pgEnum(
  "discovery_assistance_disposition",
  ["used_as_written", "edited", "skipped", "rejected"],
);

export const discoveryReferenceKind = pgEnum(
  "discovery_reference_kind",
  [
    "organization_unit",
    "operational_role",
    "person_capacity",
    "system",
    "process",
    "process_family",
    "policy",
    "other",
  ],
);

export const discoveryReferenceDisposition = pgEnum(
  "discovery_reference_disposition",
  ["confirmed", "rejected", "unresolved"],
);

export const discoveryInquiryReviewOutcomeKind = pgEnum(
  "discovery_inquiry_review_outcome_kind",
  [
    "connect_existing_process",
    "possible_new_process",
    "possible_new_process_family",
    "possible_policy",
    "spans_multiple_processes",
    "additional_validation_required",
    "no_separate_process_needed",
  ],
);

export const discoveryProposalStatus = pgEnum("discovery_proposal_status", [
  "draft",
  "ready_for_review",
]);

export const discoveryProposalDisposition = pgEnum(
  "discovery_proposal_disposition",
  ["use_in_proposal", "keep_documented", "leave_for_later"],
);

export const discoveryMappingStatus = pgEnum("discovery_mapping_status", [
  "draft",
  "ready_for_proposal_review",
]);

export const discoveryMappingAction = pgEnum("discovery_mapping_action", [
  "update_process_purpose",
  "change_process_owner",
  "add_process_step",
  "revise_process_step",
  "change_step_responsibility",
  "link_existing_system",
  "add_process_exception",
  "revise_process_exception",
  "add_process_dependency",
  "preserve_unresolved",
]);

export const discoveryMappingItemState = pgEnum(
  "discovery_mapping_item_state",
  ["active", "withdrawn"],
);

export const proposalReviewStatus = pgEnum("proposal_review_status", [
  "in_review",
  "approved_for_application",
  "approved_in_part",
  "needs_validation",
  "not_approved",
]);

export const proposalReviewDisposition = pgEnum(
  "proposal_review_disposition",
  ["approve", "reject", "needs_validation"],
);

export const processVersionKind = pgEnum("process_version_kind", [
  "baseline",
  "approved_application",
]);

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
    stableKey: uuid("stable_key").defaultRandom().notNull(),
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
    unique("roles_stable_key_unique").on(table.stableKey),
    unique("roles_id_org_stable_key_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
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

export const processFamily = pgTable(
  "process_families",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
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
      name: "process_families_organization_id_organizations_id_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    unique("process_families_id_organization_id_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("process_families_stable_key_unique").on(table.stableKey),
    unique("process_families_id_org_stable_key_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    uniqueIndex("process_families_organization_name_unique").on(
      table.organizationId,
      sql`lower(btrim(${table.name}))`,
    ),
    check(
      "process_families_name_not_blank_check",
      sql`char_length(btrim(${table.name})) > 0`,
    ),
    index("process_families_organization_status_name_idx").on(
      table.organizationId,
      table.status,
      table.name,
    ),
  ],
);

export const processFamilyMembership = pgTable(
  "process_family_memberships",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    processFamilyId: integer("process_family_id").notNull(),
    processId: integer("process_id").notNull(),
    status: processFamilyMembershipStatus("status")
      .default("active")
      .notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "process_family_memberships_family_organization_fk",
      columns: [table.processFamilyId, table.organizationId],
      foreignColumns: [processFamily.id, processFamily.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "process_family_memberships_process_organization_fk",
      columns: [table.processId, table.organizationId],
      foreignColumns: [process.id, process.organizationId],
    }).onDelete("restrict"),
    unique("process_family_memberships_stable_key_unique").on(
      table.stableKey,
    ),
    unique("process_family_memberships_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.processFamilyId,
      table.processId,
    ),
    uniqueIndex("process_family_memberships_active_pair_unique")
      .on(table.processFamilyId, table.processId)
      .where(sql`${table.status} = 'active'`),
    check(
      "process_family_memberships_effective_shape_check",
      sql`(${table.status} = 'active' and ${table.effectiveUntil} is null) or (${table.status} = 'ended' and ${table.effectiveUntil} is not null and ${table.effectiveUntil} >= ${table.effectiveFrom})`,
    ),
    index("process_family_memberships_organization_family_status_idx").on(
      table.organizationId,
      table.processFamilyId,
      table.status,
    ),
    index("process_family_memberships_organization_process_status_idx").on(
      table.organizationId,
      table.processId,
      table.status,
    ),
  ],
);

export const processFamilyRelationship = pgTable(
  "process_family_relationships",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    relationshipType: processFamilyRelationshipType("relationship_type")
      .default("broader_narrower")
      .notNull(),
    broaderFamilyId: integer("broader_family_id").notNull(),
    narrowerFamilyId: integer("narrower_family_id").notNull(),
    status: processFamilyRelationshipStatus("status")
      .default("active")
      .notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "process_family_relationships_broader_org_fk",
      columns: [table.broaderFamilyId, table.organizationId],
      foreignColumns: [processFamily.id, processFamily.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "process_family_relationships_narrower_org_fk",
      columns: [table.narrowerFamilyId, table.organizationId],
      foreignColumns: [processFamily.id, processFamily.organizationId],
    }).onDelete("restrict"),
    unique("process_family_relationships_stable_key_unique").on(
      table.stableKey,
    ),
    unique("process_family_relationships_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.broaderFamilyId,
      table.narrowerFamilyId,
    ),
    unique("process_family_relationships_id_org_stable_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    uniqueIndex("process_family_relationships_active_pair_unique")
      .on(
        table.organizationId,
        table.relationshipType,
        table.broaderFamilyId,
        table.narrowerFamilyId,
      )
      .where(sql`${table.status} = 'active'`),
    check(
      "process_family_relationships_distinct_families_check",
      sql`${table.broaderFamilyId} <> ${table.narrowerFamilyId}`,
    ),
    check(
      "process_family_relationships_effective_shape_check",
      sql`(${table.status} = 'active' and ${table.effectiveUntil} is null) or (${table.status} = 'ended' and ${table.effectiveUntil} is not null and ${table.effectiveUntil} >= ${table.effectiveFrom})`,
    ),
    index("process_family_relationships_org_broader_status_idx").on(
      table.organizationId,
      table.broaderFamilyId,
      table.status,
    ),
    index("process_family_relationships_org_narrower_status_idx").on(
      table.organizationId,
      table.narrowerFamilyId,
      table.status,
    ),
  ],
);

export const discoveryInquiry = pgTable(
  "discovery_inquiries",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    questionText: text("question_text").notNull(),
    status: discoveryInquiryStatus("status").default("open").notNull(),
    revision: integer("revision").default(1).notNull(),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_inquiries_organization_fk",
      columns: [table.organizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    unique("discovery_inquiries_stable_key_unique").on(table.stableKey),
    unique("discovery_inquiries_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    check(
      "discovery_inquiries_question_shape_check",
      sql`char_length(trim(${table.questionText})) > 0 and char_length(${table.questionText}) <= 2000`,
    ),
    check(
      "discovery_inquiries_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "discovery_inquiries_revision_positive_check",
      sql`${table.revision} >= 1`,
    ),
    index("discovery_inquiries_org_status_updated_idx").on(
      table.organizationId,
      table.status,
      table.updatedAt,
    ),
    index("discovery_inquiries_org_actor_created_idx").on(
      table.organizationId,
      table.actorIdentifier,
      table.createdAt,
    ),
  ],
);

export const discoverySession = pgTable(
  "discovery_sessions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    processId: integer("process_id").notNull(),
    processStableKey: uuid("process_stable_key").notNull(),
    scopeStatement: text("scope_statement").notNull(),
    status: discoverySessionStatus("status").default("in_progress").notNull(),
    currentQuestionKey: varchar("current_question_key", { length: 64 })
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    analystEnabled: boolean("analyst_enabled").default(false).notNull(),
    analystAuthorizedAt: timestamp("analyst_authorized_at", {
      withTimezone: true,
    }),
    analystAuthorizationVersion: varchar("analyst_authorization_version", {
      length: 64,
    }),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_sessions_process_org_stable_fk",
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
    unique("discovery_sessions_stable_key_unique").on(table.stableKey),
    unique("discovery_sessions_id_org_stable_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    unique("discovery_sessions_identity_process_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.processId,
      table.processStableKey,
    ),
    check(
      "discovery_sessions_scope_not_blank_check",
      sql`char_length(trim(${table.scopeStatement})) > 0`,
    ),
    check(
      "discovery_sessions_question_not_blank_check",
      sql`char_length(trim(${table.currentQuestionKey})) > 0`,
    ),
    check(
      "discovery_sessions_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "discovery_sessions_revision_positive_check",
      sql`${table.revision} >= 1`,
    ),
    check(
      "discovery_sessions_analyst_authorization_shape_check",
      sql`(${table.analystEnabled} = false and ${table.analystAuthorizedAt} is null and ${table.analystAuthorizationVersion} is null) or (${table.analystEnabled} = true and ${table.analystAuthorizedAt} is not null and ${table.analystAuthorizationVersion} is not null and char_length(trim(${table.analystAuthorizationVersion})) > 0)`,
    ),
    index("discovery_sessions_org_status_updated_idx").on(
      table.organizationId,
      table.status,
      table.updatedAt,
    ),
    index("discovery_sessions_process_updated_idx").on(
      table.organizationId,
      table.processStableKey,
      table.updatedAt,
    ),
  ],
);

export const discoveryInquirySession = pgTable(
  "discovery_inquiry_sessions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    inquiryId: integer("inquiry_id").notNull(),
    inquiryStableKey: uuid("inquiry_stable_key").notNull(),
    scopeStatement: text("scope_statement").notNull(),
    status: discoverySessionStatus("status").default("in_progress").notNull(),
    currentQuestionKey: varchar("current_question_key", { length: 64 })
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    analystEnabled: boolean("analyst_enabled").default(false).notNull(),
    analystAuthorizedAt: timestamp("analyst_authorized_at", {
      withTimezone: true,
    }),
    analystAuthorizationVersion: varchar("analyst_authorization_version", {
      length: 64,
    }),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_inquiry_sessions_inquiry_context_fk",
      columns: [
        table.inquiryId,
        table.organizationId,
        table.inquiryStableKey,
      ],
      foreignColumns: [
        discoveryInquiry.id,
        discoveryInquiry.organizationId,
        discoveryInquiry.stableKey,
      ],
    }).onDelete("restrict"),
    unique("discovery_inquiry_sessions_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_inquiry_sessions_id_org_stable_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    unique("discovery_inquiry_sessions_inquiry_unique").on(table.inquiryId),
    unique("discovery_inquiry_sessions_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.inquiryId,
      table.inquiryStableKey,
    ),
    check(
      "discovery_inquiry_sessions_scope_not_blank_check",
      sql`char_length(trim(${table.scopeStatement})) > 0 and char_length(${table.scopeStatement}) <= 2000`,
    ),
    check(
      "discovery_inquiry_sessions_question_not_blank_check",
      sql`char_length(trim(${table.currentQuestionKey})) > 0`,
    ),
    check(
      "discovery_inquiry_sessions_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "discovery_inquiry_sessions_revision_positive_check",
      sql`${table.revision} >= 1`,
    ),
    check(
      "discovery_inquiry_sessions_analyst_authorization_shape_check",
      sql`(${table.analystEnabled} = false and ${table.analystAuthorizedAt} is null and ${table.analystAuthorizationVersion} is null) or (${table.analystEnabled} = true and ${table.analystAuthorizedAt} is not null and ${table.analystAuthorizationVersion} is not null and char_length(trim(${table.analystAuthorizationVersion})) > 0)`,
    ),
    index("discovery_inquiry_sessions_org_status_updated_idx").on(
      table.organizationId,
      table.status,
      table.updatedAt,
    ),
    index("discovery_inquiry_sessions_inquiry_updated_idx").on(
      table.organizationId,
      table.inquiryStableKey,
      table.updatedAt,
    ),
  ],
);

export const discoveryInquiryRoute = pgTable(
  "discovery_inquiry_routes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    inquiryId: integer("inquiry_id").notNull(),
    inquiryStableKey: uuid("inquiry_stable_key").notNull(),
    routeSequence: integer("route_sequence").notNull(),
    routeKind: discoveryInquiryRouteKind("route_kind").notNull(),
    processId: integer("process_id"),
    processStableKey: uuid("process_stable_key"),
    processFamilyId: integer("process_family_id"),
    processFamilyStableKey: uuid("process_family_stable_key"),
    discoverySessionId: integer("discovery_session_id"),
    discoverySessionStableKey: uuid("discovery_session_stable_key"),
    discoveryInquirySessionId: integer("discovery_inquiry_session_id"),
    discoveryInquirySessionStableKey: uuid(
      "discovery_inquiry_session_stable_key",
    ),
    routeNote: text("route_note"),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_inquiry_routes_inquiry_context_fk",
      columns: [
        table.inquiryId,
        table.organizationId,
        table.inquiryStableKey,
      ],
      foreignColumns: [
        discoveryInquiry.id,
        discoveryInquiry.organizationId,
        discoveryInquiry.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_inquiry_routes_process_context_fk",
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
    foreignKey({
      name: "discovery_inquiry_routes_family_context_fk",
      columns: [
        table.processFamilyId,
        table.organizationId,
        table.processFamilyStableKey,
      ],
      foreignColumns: [
        processFamily.id,
        processFamily.organizationId,
        processFamily.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_inquiry_routes_session_context_fk",
      columns: [
        table.discoverySessionId,
        table.organizationId,
        table.discoverySessionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoverySession.id,
        discoverySession.organizationId,
        discoverySession.stableKey,
        discoverySession.processId,
        discoverySession.processStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_inquiry_routes_inquiry_session_fk",
      columns: [
        table.discoveryInquirySessionId,
        table.organizationId,
        table.discoveryInquirySessionStableKey,
        table.inquiryId,
        table.inquiryStableKey,
      ],
      foreignColumns: [
        discoveryInquirySession.id,
        discoveryInquirySession.organizationId,
        discoveryInquirySession.stableKey,
        discoveryInquirySession.inquiryId,
        discoveryInquirySession.inquiryStableKey,
      ],
    }).onDelete("restrict"),
    unique("discovery_inquiry_routes_stable_key_unique").on(table.stableKey),
    unique("discovery_inquiry_routes_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.inquiryId,
      table.inquiryStableKey,
    ),
    unique("discovery_inquiry_routes_inquiry_sequence_unique").on(
      table.inquiryId,
      table.routeSequence,
    ),
    check(
      "discovery_inquiry_routes_sequence_positive_check",
      sql`${table.routeSequence} >= 1`,
    ),
    check(
      "discovery_inquiry_routes_note_shape_check",
      sql`${table.routeNote} is null or (char_length(trim(${table.routeNote})) > 0 and char_length(${table.routeNote}) <= 2000)`,
    ),
    check(
      "discovery_inquiry_routes_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "discovery_inquiry_routes_target_shape_check",
      sql`(
        ${table.routeKind} = 'review_process'
        and ${table.processId} is not null
        and ${table.processStableKey} is not null
        and ${table.processFamilyId} is null
        and ${table.processFamilyStableKey} is null
        and ${table.discoverySessionId} is null
        and ${table.discoverySessionStableKey} is null
        and ${table.discoveryInquirySessionId} is null
        and ${table.discoveryInquirySessionStableKey} is null
      ) or (
        ${table.routeKind} = 'review_process_family'
        and ${table.processId} is null
        and ${table.processStableKey} is null
        and ${table.processFamilyId} is not null
        and ${table.processFamilyStableKey} is not null
        and ${table.discoverySessionId} is null
        and ${table.discoverySessionStableKey} is null
        and ${table.discoveryInquirySessionId} is null
        and ${table.discoveryInquirySessionStableKey} is null
      ) or (
        ${table.routeKind} = 'start_guided_interview'
        and ${table.processId} is not null
        and ${table.processStableKey} is not null
        and ${table.processFamilyId} is null
        and ${table.processFamilyStableKey} is null
        and ${table.discoverySessionId} is not null
        and ${table.discoverySessionStableKey} is not null
        and ${table.discoveryInquirySessionId} is null
        and ${table.discoveryInquirySessionStableKey} is null
      ) or (
        ${table.routeKind} = 'start_inquiry_exploration'
        and ${table.processId} is null
        and ${table.processStableKey} is null
        and ${table.processFamilyId} is null
        and ${table.processFamilyStableKey} is null
        and ${table.discoverySessionId} is null
        and ${table.discoverySessionStableKey} is null
        and ${table.discoveryInquirySessionId} is not null
        and ${table.discoveryInquirySessionStableKey} is not null
      ) or (
        ${table.routeKind} in ('wait_for_source', 'finish_for_now')
        and ${table.processId} is null
        and ${table.processStableKey} is null
        and ${table.processFamilyId} is null
        and ${table.processFamilyStableKey} is null
        and ${table.discoverySessionId} is null
        and ${table.discoverySessionStableKey} is null
        and ${table.discoveryInquirySessionId} is null
        and ${table.discoveryInquirySessionStableKey} is null
      )`,
    ),
    index("discovery_inquiry_routes_org_inquiry_sequence_idx").on(
      table.organizationId,
      table.inquiryStableKey,
      table.routeSequence,
    ),
    index("discovery_inquiry_routes_org_process_created_idx").on(
      table.organizationId,
      table.processStableKey,
      table.createdAt,
    ),
    index("discovery_inquiry_routes_org_family_created_idx").on(
      table.organizationId,
      table.processFamilyStableKey,
      table.createdAt,
    ),
    index("discovery_inquiry_routes_org_inquiry_session_idx").on(
      table.organizationId,
      table.discoveryInquirySessionStableKey,
      table.createdAt,
    ),
  ],
);

export const discoveryInquiryObservation = pgTable(
  "discovery_inquiry_observations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    sequence: integer("sequence").notNull(),
    promptKey: varchar("prompt_key", { length: 64 }).notNull(),
    promptText: text("prompt_text").notNull(),
    topic: discoveryObservationTopic("topic").notNull(),
    responseText: text("response_text"),
    epistemicState: discoveryObservationState("epistemic_state").notNull(),
    supersedesObservationStableKey: uuid(
      "supersedes_observation_stable_key",
    ),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_inquiry_observations_session_context_fk",
      columns: [
        table.sessionId,
        table.organizationId,
        table.sessionStableKey,
      ],
      foreignColumns: [
        discoveryInquirySession.id,
        discoveryInquirySession.organizationId,
        discoveryInquirySession.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_inquiry_observations_supersedes_fk",
      columns: [
        table.supersedesObservationStableKey,
        table.sessionId,
        table.organizationId,
      ],
      foreignColumns: [table.stableKey, table.sessionId, table.organizationId],
    }).onDelete("restrict"),
    unique("discovery_inquiry_observations_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_inquiry_observations_context_unique").on(
      table.stableKey,
      table.sessionId,
      table.organizationId,
    ),
    unique("discovery_inquiry_observations_sequence_unique").on(
      table.sessionId,
      table.sequence,
    ),
    check(
      "discovery_inquiry_observations_sequence_positive_check",
      sql`${table.sequence} >= 1`,
    ),
    check(
      "discovery_inquiry_observations_prompt_key_check",
      sql`char_length(trim(${table.promptKey})) > 0`,
    ),
    check(
      "discovery_inquiry_observations_prompt_text_check",
      sql`char_length(trim(${table.promptText})) > 0`,
    ),
    check(
      "discovery_inquiry_observations_response_state_check",
      sql`(${table.epistemicState} = 'unknown' and (${table.responseText} is null or char_length(trim(${table.responseText})) > 0)) or (${table.epistemicState} <> 'unknown' and ${table.responseText} is not null and char_length(trim(${table.responseText})) > 0)`,
    ),
    check(
      "discovery_inquiry_observations_supersedes_distinct_check",
      sql`${table.supersedesObservationStableKey} is null or ${table.supersedesObservationStableKey} <> ${table.stableKey}`,
    ),
    check(
      "discovery_inquiry_observations_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    index("discovery_inquiry_observations_session_sequence_idx").on(
      table.organizationId,
      table.sessionStableKey,
      table.sequence,
    ),
    index("discovery_inquiry_observations_org_state_idx").on(
      table.organizationId,
      table.epistemicState,
      table.createdAt,
    ),
  ],
);

export const discoveryInquiryReview = pgTable(
  "discovery_inquiry_reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    inquiryId: integer("inquiry_id").notNull(),
    inquiryStableKey: uuid("inquiry_stable_key").notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    reviewSequence: integer("review_sequence").notNull(),
    reviewedSessionRevision: integer("reviewed_session_revision").notNull(),
    supersedesReviewStableKey: uuid("supersedes_review_stable_key"),
    reviewNote: text("review_note"),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_inquiry_reviews_session_context_fk",
      columns: [
        table.sessionId,
        table.organizationId,
        table.sessionStableKey,
        table.inquiryId,
        table.inquiryStableKey,
      ],
      foreignColumns: [
        discoveryInquirySession.id,
        discoveryInquirySession.organizationId,
        discoveryInquirySession.stableKey,
        discoveryInquirySession.inquiryId,
        discoveryInquirySession.inquiryStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_inquiry_reviews_supersedes_fk",
      columns: [
        table.supersedesReviewStableKey,
        table.sessionId,
        table.organizationId,
      ],
      foreignColumns: [
        table.stableKey,
        table.sessionId,
        table.organizationId,
      ],
    }).onDelete("restrict"),
    unique("discovery_inquiry_reviews_stable_key_unique").on(table.stableKey),
    unique("discovery_inquiry_reviews_context_unique").on(
      table.stableKey,
      table.sessionId,
      table.organizationId,
    ),
    unique("discovery_inquiry_reviews_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.sessionId,
      table.sessionStableKey,
    ),
    unique("discovery_inquiry_reviews_session_sequence_unique").on(
      table.sessionId,
      table.reviewSequence,
    ),
    check(
      "discovery_inquiry_reviews_sequence_positive_check",
      sql`${table.reviewSequence} >= 1`,
    ),
    check(
      "discovery_inquiry_reviews_revision_positive_check",
      sql`${table.reviewedSessionRevision} >= 1`,
    ),
    check(
      "discovery_inquiry_reviews_supersedes_distinct_check",
      sql`${table.supersedesReviewStableKey} is null or ${table.supersedesReviewStableKey} <> ${table.stableKey}`,
    ),
    check(
      "discovery_inquiry_reviews_note_shape_check",
      sql`${table.reviewNote} is null or (char_length(trim(${table.reviewNote})) > 0 and char_length(${table.reviewNote}) <= 2000)`,
    ),
    check(
      "discovery_inquiry_reviews_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    index("discovery_inquiry_reviews_org_session_sequence_idx").on(
      table.organizationId,
      table.sessionStableKey,
      table.reviewSequence,
    ),
  ],
);

export const discoveryInquiryReviewSource = pgTable(
  "discovery_inquiry_review_sources",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    reviewId: integer("review_id").notNull(),
    reviewStableKey: uuid("review_stable_key").notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    observationStableKey: uuid("observation_stable_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_inquiry_review_sources_review_context_fk",
      columns: [
        table.reviewId,
        table.organizationId,
        table.reviewStableKey,
        table.sessionId,
        table.sessionStableKey,
      ],
      foreignColumns: [
        discoveryInquiryReview.id,
        discoveryInquiryReview.organizationId,
        discoveryInquiryReview.stableKey,
        discoveryInquiryReview.sessionId,
        discoveryInquiryReview.sessionStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_inquiry_review_sources_observation_context_fk",
      columns: [
        table.observationStableKey,
        table.sessionId,
        table.organizationId,
      ],
      foreignColumns: [
        discoveryInquiryObservation.stableKey,
        discoveryInquiryObservation.sessionId,
        discoveryInquiryObservation.organizationId,
      ],
    }).onDelete("restrict"),
    unique("discovery_inquiry_review_sources_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_inquiry_review_sources_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    unique("discovery_inquiry_review_sources_review_observation_unique").on(
      table.reviewId,
      table.observationStableKey,
    ),
    index("discovery_inquiry_review_sources_org_review_idx").on(
      table.organizationId,
      table.reviewStableKey,
    ),
  ],
);

export const discoveryInquiryReviewOutcome = pgTable(
  "discovery_inquiry_review_outcomes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    reviewId: integer("review_id").notNull(),
    reviewStableKey: uuid("review_stable_key").notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    outcomeKind: discoveryInquiryReviewOutcomeKind("outcome_kind").notNull(),
    processId: integer("process_id"),
    processStableKey: uuid("process_stable_key"),
    explanation: text("explanation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_inquiry_review_outcomes_review_context_fk",
      columns: [
        table.reviewId,
        table.organizationId,
        table.reviewStableKey,
        table.sessionId,
        table.sessionStableKey,
      ],
      foreignColumns: [
        discoveryInquiryReview.id,
        discoveryInquiryReview.organizationId,
        discoveryInquiryReview.stableKey,
        discoveryInquiryReview.sessionId,
        discoveryInquiryReview.sessionStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_inquiry_review_outcomes_process_context_fk",
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
    unique("discovery_inquiry_review_outcomes_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_inquiry_review_outcomes_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    unique("discovery_inquiry_review_outcomes_review_kind_unique").on(
      table.reviewId,
      table.outcomeKind,
    ),
    check(
      "discovery_inquiry_review_outcomes_target_shape_check",
      sql`(${table.outcomeKind} = 'connect_existing_process' and ${table.processId} is not null and ${table.processStableKey} is not null) or (${table.outcomeKind} <> 'connect_existing_process' and ${table.processId} is null and ${table.processStableKey} is null)`,
    ),
    check(
      "discovery_inquiry_review_outcomes_explanation_shape_check",
      sql`${table.explanation} is null or (char_length(trim(${table.explanation})) > 0 and char_length(${table.explanation}) <= 2000)`,
    ),
    check(
      "discovery_inquiry_review_outcomes_required_explanation_check",
      sql`${table.outcomeKind} not in ('possible_new_process', 'possible_new_process_family', 'possible_policy', 'spans_multiple_processes', 'additional_validation_required') or ${table.explanation} is not null`,
    ),
    index("discovery_inquiry_review_outcomes_org_review_idx").on(
      table.organizationId,
      table.reviewStableKey,
    ),
    index("discovery_inquiry_review_outcomes_org_process_idx").on(
      table.organizationId,
      table.processStableKey,
    ),
  ],
);

export const discoveryObservation = pgTable(
  "discovery_observations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    sequence: integer("sequence").notNull(),
    promptKey: varchar("prompt_key", { length: 64 }).notNull(),
    promptText: text("prompt_text").notNull(),
    topic: discoveryObservationTopic("topic").notNull(),
    responseText: text("response_text"),
    epistemicState: discoveryObservationState("epistemic_state").notNull(),
    supersedesObservationStableKey: uuid(
      "supersedes_observation_stable_key",
    ),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_observations_session_org_stable_fk",
      columns: [
        table.sessionId,
        table.organizationId,
        table.sessionStableKey,
      ],
      foreignColumns: [
        discoverySession.id,
        discoverySession.organizationId,
        discoverySession.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_observations_supersedes_session_fk",
      columns: [
        table.supersedesObservationStableKey,
        table.sessionId,
        table.organizationId,
      ],
      foreignColumns: [
        table.stableKey,
        table.sessionId,
        table.organizationId,
      ],
    }).onDelete("restrict"),
    unique("discovery_observations_stable_key_unique").on(table.stableKey),
    unique("discovery_observations_key_session_org_unique").on(
      table.stableKey,
      table.sessionId,
      table.organizationId,
    ),
    unique("discovery_observations_prompt_context_unique").on(
      table.stableKey,
      table.sessionId,
      table.organizationId,
      table.promptKey,
    ),
    unique("discovery_observations_session_sequence_unique").on(
      table.sessionId,
      table.sequence,
    ),
    check(
      "discovery_observations_sequence_positive_check",
      sql`${table.sequence} >= 1`,
    ),
    check(
      "discovery_observations_prompt_key_not_blank_check",
      sql`char_length(trim(${table.promptKey})) > 0`,
    ),
    check(
      "discovery_observations_prompt_text_not_blank_check",
      sql`char_length(trim(${table.promptText})) > 0`,
    ),
    check(
      "discovery_observations_response_state_check",
      sql`(${table.epistemicState} = 'unknown' and (${table.responseText} is null or char_length(trim(${table.responseText})) > 0)) or (${table.epistemicState} <> 'unknown' and ${table.responseText} is not null and char_length(trim(${table.responseText})) > 0)`,
    ),
    check(
      "discovery_observations_supersedes_distinct_check",
      sql`${table.supersedesObservationStableKey} is null or ${table.supersedesObservationStableKey} <> ${table.stableKey}`,
    ),
    check(
      "discovery_observations_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    index("discovery_observations_session_sequence_idx").on(
      table.organizationId,
      table.sessionStableKey,
      table.sequence,
    ),
    index("discovery_observations_org_state_idx").on(
      table.organizationId,
      table.epistemicState,
      table.createdAt,
    ),
  ],
);

export const discoveryObservationConfirmation = pgTable(
  "discovery_observation_confirmations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    processId: integer("process_id").notNull(),
    processStableKey: uuid("process_stable_key").notNull(),
    confirmationSessionId: integer("confirmation_session_id").notNull(),
    confirmationSessionStableKey: uuid(
      "confirmation_session_stable_key",
    ).notNull(),
    confirmationObservationStableKey: uuid(
      "confirmation_observation_stable_key",
    ).notNull(),
    sourceSessionId: integer("source_session_id").notNull(),
    sourceSessionStableKey: uuid("source_session_stable_key").notNull(),
    sourceObservationStableKey: uuid(
      "source_observation_stable_key",
    ).notNull(),
    promptKey: varchar("prompt_key", { length: 64 }).notNull(),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_confirmation_current_session_fk",
      columns: [
        table.confirmationSessionId,
        table.organizationId,
        table.confirmationSessionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoverySession.id,
        discoverySession.organizationId,
        discoverySession.stableKey,
        discoverySession.processId,
        discoverySession.processStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_confirmation_source_session_fk",
      columns: [
        table.sourceSessionId,
        table.organizationId,
        table.sourceSessionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoverySession.id,
        discoverySession.organizationId,
        discoverySession.stableKey,
        discoverySession.processId,
        discoverySession.processStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_confirmation_current_observation_fk",
      columns: [
        table.confirmationObservationStableKey,
        table.confirmationSessionId,
        table.organizationId,
        table.promptKey,
      ],
      foreignColumns: [
        discoveryObservation.stableKey,
        discoveryObservation.sessionId,
        discoveryObservation.organizationId,
        discoveryObservation.promptKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_confirmation_source_observation_fk",
      columns: [
        table.sourceObservationStableKey,
        table.sourceSessionId,
        table.organizationId,
        table.promptKey,
      ],
      foreignColumns: [
        discoveryObservation.stableKey,
        discoveryObservation.sessionId,
        discoveryObservation.organizationId,
        discoveryObservation.promptKey,
      ],
    }).onDelete("restrict"),
    unique("discovery_observation_confirmations_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_confirmation_observation_unique").on(
      table.confirmationObservationStableKey,
    ),
    check(
      "discovery_confirmation_sessions_distinct_check",
      sql`${table.confirmationSessionId} <> ${table.sourceSessionId}`,
    ),
    check(
      "discovery_confirmation_observations_distinct_check",
      sql`${table.confirmationObservationStableKey} <> ${table.sourceObservationStableKey}`,
    ),
    check(
      "discovery_confirmation_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "discovery_confirmation_prompt_not_blank_check",
      sql`char_length(trim(${table.promptKey})) > 0`,
    ),
    index("discovery_confirmation_current_session_idx").on(
      table.organizationId,
      table.confirmationSessionStableKey,
      table.createdAt,
    ),
    index("discovery_confirmation_source_observation_idx").on(
      table.organizationId,
      table.sourceObservationStableKey,
    ),
  ],
);

export const discoveryAssistanceRun = pgTable(
  "discovery_assistance_runs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    sessionKind: discoveryAssistanceSessionKind("session_kind").notNull(),
    discoverySessionId: integer("discovery_session_id"),
    discoverySessionStableKey: uuid("discovery_session_stable_key"),
    inquirySessionId: integer("inquiry_session_id"),
    inquirySessionStableKey: uuid("inquiry_session_stable_key"),
    requestedSessionRevision: integer("requested_session_revision").notNull(),
    promptKey: varchar("prompt_key", { length: 64 }).notNull(),
    assistanceKind: discoveryAssistanceKind("assistance_kind").notNull(),
    providerKey: varchar("provider_key", { length: 64 }).notNull(),
    modelIdentifier: varchar("model_identifier", { length: 128 }).notNull(),
    promptPolicyVersion: varchar("prompt_policy_version", { length: 64 })
      .notNull(),
    contextFingerprint: varchar("context_fingerprint", { length: 64 })
      .notNull(),
    participantFocus: text("participant_focus"),
    analystTurn: boolean("analyst_turn").default(false).notNull(),
    analysisSnapshot: jsonb("analysis_snapshot"),
    providerProjectIdentifier: varchar("provider_project_identifier", {
      length: 128,
    }),
    providerRequestStatus: varchar("provider_request_status", { length: 32 }),
    providerRequestCount: integer("provider_request_count"),
    providerInputTokens: integer("provider_input_tokens"),
    providerCachedInputTokens: integer("provider_cached_input_tokens"),
    providerOutputTokens: integer("provider_output_tokens"),
    providerTotalTokens: integer("provider_total_tokens"),
    providerDurationMs: integer("provider_duration_ms"),
    estimatedCostMicrousd: integer("estimated_cost_microusd"),
    costBasisKey: varchar("cost_basis_key", { length: 64 }),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_assistance_runs_process_session_fk",
      columns: [
        table.discoverySessionId,
        table.organizationId,
        table.discoverySessionStableKey,
      ],
      foreignColumns: [
        discoverySession.id,
        discoverySession.organizationId,
        discoverySession.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_runs_inquiry_session_fk",
      columns: [
        table.inquirySessionId,
        table.organizationId,
        table.inquirySessionStableKey,
      ],
      foreignColumns: [
        discoveryInquirySession.id,
        discoveryInquirySession.organizationId,
        discoveryInquirySession.stableKey,
      ],
    }).onDelete("restrict"),
    unique("discovery_assistance_runs_stable_key_unique").on(table.stableKey),
    unique("discovery_assistance_runs_source_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    unique("discovery_assistance_runs_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.sessionKind,
    ),
    check(
      "discovery_assistance_runs_session_shape_check",
      sql`(${table.sessionKind} = 'process' and ${table.discoverySessionId} is not null and ${table.discoverySessionStableKey} is not null and ${table.inquirySessionId} is null and ${table.inquirySessionStableKey} is null) or (${table.sessionKind} = 'inquiry' and ${table.discoverySessionId} is null and ${table.discoverySessionStableKey} is null and ${table.inquirySessionId} is not null and ${table.inquirySessionStableKey} is not null)`,
    ),
    check(
      "discovery_assistance_runs_revision_positive_check",
      sql`${table.requestedSessionRevision} >= 1`,
    ),
    check(
      "discovery_assistance_runs_prompt_not_blank_check",
      sql`char_length(trim(${table.promptKey})) > 0`,
    ),
    check(
      "discovery_assistance_runs_provider_shape_check",
      sql`char_length(trim(${table.providerKey})) > 0 and char_length(trim(${table.modelIdentifier})) > 0 and char_length(trim(${table.promptPolicyVersion})) > 0`,
    ),
    check(
      "discovery_assistance_runs_analysis_snapshot_shape_check",
      sql`(${table.analystTurn} = true and ${table.assistanceKind} = 'question_suggestions' and ${table.analysisSnapshot} is not null and jsonb_typeof(${table.analysisSnapshot}) = 'object') or (${table.analystTurn} = false and ${table.analysisSnapshot} is null)`,
    ),
    check(
      "discovery_assistance_runs_fingerprint_check",
      sql`${table.contextFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "discovery_assistance_runs_focus_shape_check",
      sql`${table.participantFocus} is null or (char_length(trim(${table.participantFocus})) > 0 and char_length(${table.participantFocus}) <= 2000)`,
    ),
    check(
      "discovery_assistance_runs_request_metadata_shape_check",
      sql`(
        ${table.providerProjectIdentifier} is null
        and ${table.providerRequestStatus} is null
        and ${table.providerRequestCount} is null
        and ${table.providerInputTokens} is null
        and ${table.providerCachedInputTokens} is null
        and ${table.providerOutputTokens} is null
        and ${table.providerTotalTokens} is null
        and ${table.providerDurationMs} is null
        and ${table.estimatedCostMicrousd} is null
        and ${table.costBasisKey} is null
      ) or (
        ${table.providerKey} = 'openai'
        and ${table.providerProjectIdentifier} is not null
        and char_length(trim(${table.providerProjectIdentifier})) > 0
        and ${table.providerRequestStatus} is not null
        and ${table.providerRequestStatus} = 'completed'
        and ${table.providerRequestCount} is not null
        and ${table.providerRequestCount} = 1
        and ${table.providerInputTokens} is not null
        and ${table.providerInputTokens} >= 0
        and ${table.providerCachedInputTokens} is not null
        and ${table.providerCachedInputTokens} >= 0
        and ${table.providerCachedInputTokens} <= ${table.providerInputTokens}
        and ${table.providerOutputTokens} is not null
        and ${table.providerOutputTokens} >= 0
        and ${table.providerTotalTokens} is not null
        and ${table.providerTotalTokens} = ${table.providerInputTokens} + ${table.providerOutputTokens}
        and ${table.providerDurationMs} is not null
        and ${table.providerDurationMs} >= 0
        and ${table.providerDurationMs} <= 30000
        and ${table.estimatedCostMicrousd} is not null
        and ${table.estimatedCostMicrousd} >= 0
        and ${table.costBasisKey} is not null
        and char_length(trim(${table.costBasisKey})) > 0
      )`,
    ),
    check(
      "discovery_assistance_runs_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    index("discovery_assistance_runs_process_idx").on(
      table.organizationId,
      table.discoverySessionStableKey,
      table.requestedSessionRevision,
      table.createdAt,
    ),
    index("discovery_assistance_runs_inquiry_idx").on(
      table.organizationId,
      table.inquirySessionStableKey,
      table.requestedSessionRevision,
      table.createdAt,
    ),
  ],
);

export const discoveryAssistanceSource = pgTable(
  "discovery_assistance_sources",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    runId: integer("run_id").notNull(),
    runStableKey: uuid("run_stable_key").notNull(),
    sourceSequence: integer("source_sequence").notNull(),
    sourceKind: discoveryAssistanceSourceKind("source_kind").notNull(),
    processId: integer("process_id"),
    processStableKey: uuid("process_stable_key"),
    discoverySessionId: integer("discovery_session_id"),
    discoverySessionStableKey: uuid("discovery_session_stable_key"),
    discoveryObservationStableKey: uuid("discovery_observation_stable_key"),
    inquiryId: integer("inquiry_id"),
    inquiryStableKey: uuid("inquiry_stable_key"),
    inquirySessionId: integer("inquiry_session_id"),
    inquirySessionStableKey: uuid("inquiry_session_stable_key"),
    inquiryObservationStableKey: uuid(
      "inquiry_observation_stable_key",
    ),
    sourceSnapshot: jsonb("source_snapshot").notNull(),
    sourceFingerprint: varchar("source_fingerprint", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_assistance_sources_run_fk",
      columns: [table.runId, table.organizationId, table.runStableKey],
      foreignColumns: [
        discoveryAssistanceRun.id,
        discoveryAssistanceRun.organizationId,
        discoveryAssistanceRun.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_sources_process_fk",
      columns: [table.processId, table.organizationId, table.processStableKey],
      foreignColumns: [process.id, process.organizationId, process.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_sources_process_session_fk",
      columns: [
        table.discoverySessionId,
        table.organizationId,
        table.discoverySessionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoverySession.id,
        discoverySession.organizationId,
        discoverySession.stableKey,
        discoverySession.processId,
        discoverySession.processStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_sources_process_observation_fk",
      columns: [
        table.discoveryObservationStableKey,
        table.discoverySessionId,
        table.organizationId,
      ],
      foreignColumns: [
        discoveryObservation.stableKey,
        discoveryObservation.sessionId,
        discoveryObservation.organizationId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_sources_inquiry_session_fk",
      columns: [
        table.inquirySessionId,
        table.organizationId,
        table.inquirySessionStableKey,
        table.inquiryId,
        table.inquiryStableKey,
      ],
      foreignColumns: [
        discoveryInquirySession.id,
        discoveryInquirySession.organizationId,
        discoveryInquirySession.stableKey,
        discoveryInquirySession.inquiryId,
        discoveryInquirySession.inquiryStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_sources_inquiry_observation_fk",
      columns: [
        table.inquiryObservationStableKey,
        table.inquirySessionId,
        table.organizationId,
      ],
      foreignColumns: [
        discoveryInquiryObservation.stableKey,
        discoveryInquiryObservation.sessionId,
        discoveryInquiryObservation.organizationId,
      ],
    }).onDelete("restrict"),
    unique("discovery_assistance_sources_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_assistance_sources_run_sequence_unique").on(
      table.runId,
      table.sourceSequence,
    ),
    check(
      "discovery_assistance_sources_sequence_positive_check",
      sql`${table.sourceSequence} >= 1`,
    ),
    check(
      "discovery_assistance_sources_shape_check",
      sql`(
        ${table.sourceKind} = 'process_snapshot'
        and ${table.processId} is not null and ${table.processStableKey} is not null
        and ${table.discoverySessionId} is null and ${table.discoverySessionStableKey} is null
        and ${table.discoveryObservationStableKey} is null
        and ${table.inquiryId} is null and ${table.inquiryStableKey} is null
        and ${table.inquirySessionId} is null and ${table.inquirySessionStableKey} is null
        and ${table.inquiryObservationStableKey} is null
      ) or (
        ${table.sourceKind} = 'process_observation'
        and ${table.processId} is not null and ${table.processStableKey} is not null
        and ${table.discoverySessionId} is not null and ${table.discoverySessionStableKey} is not null
        and ${table.discoveryObservationStableKey} is not null
        and ${table.inquiryId} is null and ${table.inquiryStableKey} is null
        and ${table.inquirySessionId} is null and ${table.inquirySessionStableKey} is null
        and ${table.inquiryObservationStableKey} is null
      ) or (
        ${table.sourceKind} = 'inquiry_context'
        and ${table.processId} is null and ${table.processStableKey} is null
        and ${table.discoverySessionId} is null and ${table.discoverySessionStableKey} is null
        and ${table.discoveryObservationStableKey} is null
        and ${table.inquiryId} is not null and ${table.inquiryStableKey} is not null
        and ${table.inquirySessionId} is not null and ${table.inquirySessionStableKey} is not null
        and ${table.inquiryObservationStableKey} is null
      ) or (
        ${table.sourceKind} = 'inquiry_observation'
        and ${table.processId} is null and ${table.processStableKey} is null
        and ${table.discoverySessionId} is null and ${table.discoverySessionStableKey} is null
        and ${table.discoveryObservationStableKey} is null
        and ${table.inquiryId} is not null and ${table.inquiryStableKey} is not null
        and ${table.inquirySessionId} is not null and ${table.inquirySessionStableKey} is not null
        and ${table.inquiryObservationStableKey} is not null
      )`,
    ),
    check(
      "discovery_assistance_sources_snapshot_shape_check",
      sql`jsonb_typeof(${table.sourceSnapshot}) = 'object'`,
    ),
    check(
      "discovery_assistance_sources_fingerprint_check",
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    index("discovery_assistance_sources_run_idx").on(
      table.organizationId,
      table.runStableKey,
      table.sourceSequence,
    ),
  ],
);

export const discoveryAssistanceSuggestion = pgTable(
  "discovery_assistance_suggestions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    runId: integer("run_id").notNull(),
    runStableKey: uuid("run_stable_key").notNull(),
    suggestionSequence: integer("suggestion_sequence").notNull(),
    suggestionKind: discoveryAssistanceSuggestionKind("suggestion_kind")
      .notNull(),
    promptKey: varchar("prompt_key", { length: 64 }).notNull(),
    topic: discoveryObservationTopic("topic").notNull(),
    suggestedText: text("suggested_text").notNull(),
    rationale: text("rationale").notNull(),
    originalText: text("original_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_assistance_suggestions_run_fk",
      columns: [table.runId, table.organizationId, table.runStableKey],
      foreignColumns: [
        discoveryAssistanceRun.id,
        discoveryAssistanceRun.organizationId,
        discoveryAssistanceRun.stableKey,
      ],
    }).onDelete("restrict"),
    unique("discovery_assistance_suggestions_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_assistance_suggestions_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.runId,
      table.runStableKey,
    ),
    unique("discovery_assistance_suggestions_run_sequence_unique").on(
      table.runId,
      table.suggestionSequence,
    ),
    check(
      "discovery_assistance_suggestions_sequence_positive_check",
      sql`${table.suggestionSequence} >= 1`,
    ),
    check(
      "discovery_assistance_suggestions_prompt_not_blank_check",
      sql`char_length(trim(${table.promptKey})) > 0`,
    ),
    check(
      "discovery_assistance_suggestions_text_shape_check",
      sql`char_length(trim(${table.suggestedText})) > 0 and char_length(${table.suggestedText}) <= 2000 and char_length(trim(${table.rationale})) > 0 and char_length(${table.rationale}) <= 1000`,
    ),
    check(
      "discovery_assistance_suggestions_original_shape_check",
      sql`(${table.suggestionKind} = 'follow_up_question' and ${table.originalText} is null) or (${table.suggestionKind} = 'clarity_draft' and ${table.originalText} is not null and char_length(trim(${table.originalText})) > 0 and char_length(${table.originalText}) <= 10000)`,
    ),
    index("discovery_assistance_suggestions_run_idx").on(
      table.organizationId,
      table.runStableKey,
      table.suggestionSequence,
    ),
  ],
);

export const discoveryAssistanceDecision = pgTable(
  "discovery_assistance_decisions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    runId: integer("run_id").notNull(),
    runStableKey: uuid("run_stable_key").notNull(),
    suggestionId: integer("suggestion_id").notNull(),
    suggestionStableKey: uuid("suggestion_stable_key").notNull(),
    sessionKind: discoveryAssistanceSessionKind("session_kind").notNull(),
    disposition: discoveryAssistanceDisposition("disposition").notNull(),
    selectedText: text("selected_text"),
    discoverySessionId: integer("discovery_session_id"),
    discoveryObservationStableKey: uuid("discovery_observation_stable_key"),
    inquirySessionId: integer("inquiry_session_id"),
    inquiryObservationStableKey: uuid(
      "inquiry_observation_stable_key",
    ),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_assistance_decisions_run_fk",
      columns: [
        table.runId,
        table.organizationId,
        table.runStableKey,
        table.sessionKind,
      ],
      foreignColumns: [
        discoveryAssistanceRun.id,
        discoveryAssistanceRun.organizationId,
        discoveryAssistanceRun.stableKey,
        discoveryAssistanceRun.sessionKind,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_decisions_suggestion_fk",
      columns: [
        table.suggestionId,
        table.organizationId,
        table.suggestionStableKey,
        table.runId,
        table.runStableKey,
      ],
      foreignColumns: [
        discoveryAssistanceSuggestion.id,
        discoveryAssistanceSuggestion.organizationId,
        discoveryAssistanceSuggestion.stableKey,
        discoveryAssistanceSuggestion.runId,
        discoveryAssistanceSuggestion.runStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_decisions_process_observation_fk",
      columns: [
        table.discoveryObservationStableKey,
        table.discoverySessionId,
        table.organizationId,
      ],
      foreignColumns: [
        discoveryObservation.stableKey,
        discoveryObservation.sessionId,
        discoveryObservation.organizationId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_assistance_decisions_inquiry_observation_fk",
      columns: [
        table.inquiryObservationStableKey,
        table.inquirySessionId,
        table.organizationId,
      ],
      foreignColumns: [
        discoveryInquiryObservation.stableKey,
        discoveryInquiryObservation.sessionId,
        discoveryInquiryObservation.organizationId,
      ],
    }).onDelete("restrict"),
    unique("discovery_assistance_decisions_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_assistance_decisions_suggestion_unique").on(
      table.suggestionStableKey,
    ),
    unique("discovery_assistance_decisions_process_observation_unique").on(
      table.discoveryObservationStableKey,
    ),
    unique("discovery_assistance_decisions_inquiry_observation_unique").on(
      table.inquiryObservationStableKey,
    ),
    check(
      "discovery_assistance_decisions_shape_check",
      sql`(
        ${table.disposition} in ('used_as_written', 'edited')
        and ${table.selectedText} is not null and char_length(trim(${table.selectedText})) > 0
        and (
          (${table.sessionKind} = 'process' and ${table.discoverySessionId} is not null and ${table.discoveryObservationStableKey} is not null and ${table.inquirySessionId} is null and ${table.inquiryObservationStableKey} is null)
          or (${table.sessionKind} = 'inquiry' and ${table.discoverySessionId} is null and ${table.discoveryObservationStableKey} is null and ${table.inquirySessionId} is not null and ${table.inquiryObservationStableKey} is not null)
        )
      ) or (
        ${table.disposition} in ('skipped', 'rejected')
        and ${table.selectedText} is null
        and ${table.discoverySessionId} is null and ${table.discoveryObservationStableKey} is null
        and ${table.inquirySessionId} is null and ${table.inquiryObservationStableKey} is null
      )`,
    ),
    check(
      "discovery_assistance_decisions_selected_text_check",
      sql`${table.selectedText} is null or char_length(${table.selectedText}) <= 10000`,
    ),
    check(
      "discovery_assistance_decisions_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    index("discovery_assistance_decisions_run_idx").on(
      table.organizationId,
      table.runStableKey,
      table.createdAt,
    ),
  ],
);

export const discoveryProposal = pgTable(
  "discovery_proposals",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    processId: integer("process_id").notNull(),
    processStableKey: uuid("process_stable_key").notNull(),
    documentedProcessSnapshot: jsonb("documented_process_snapshot").notNull(),
    documentedProcessFingerprint: varchar("documented_process_fingerprint", {
      length: 64,
    }).notNull(),
    status: discoveryProposalStatus("status").default("draft").notNull(),
    revision: integer("revision").default(1).notNull(),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    readyByActor: varchar("ready_by_actor", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_proposals_session_process_fk",
      columns: [
        table.sessionId,
        table.organizationId,
        table.sessionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoverySession.id,
        discoverySession.organizationId,
        discoverySession.stableKey,
        discoverySession.processId,
        discoverySession.processStableKey,
      ],
    }).onDelete("restrict"),
    unique("discovery_proposals_stable_key_unique").on(table.stableKey),
    unique("discovery_proposals_session_unique").on(table.sessionId),
    unique("discovery_proposals_identity_session_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.sessionId,
      table.sessionStableKey,
    ),
    unique("discovery_proposals_full_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.sessionId,
      table.sessionStableKey,
      table.processId,
      table.processStableKey,
    ),
    check(
      "discovery_proposals_snapshot_object_check",
      sql`jsonb_typeof(${table.documentedProcessSnapshot}) = 'object'`,
    ),
    check(
      "discovery_proposals_fingerprint_check",
      sql`${table.documentedProcessFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "discovery_proposals_revision_positive_check",
      sql`${table.revision} >= 1`,
    ),
    check(
      "discovery_proposals_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "discovery_proposals_ready_state_check",
      sql`(${table.status} = 'draft' and ${table.readyAt} is null and ${table.readyByActor} is null) or (${table.status} = 'ready_for_review' and ${table.readyAt} is not null and ${table.readyByActor} is not null and char_length(trim(${table.readyByActor})) > 0)`,
    ),
    index("discovery_proposals_org_status_updated_idx").on(
      table.organizationId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const discoveryProposalDecision = pgTable(
  "discovery_proposal_decisions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    proposalId: integer("proposal_id").notNull(),
    proposalStableKey: uuid("proposal_stable_key").notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    observationStableKey: uuid("observation_stable_key").notNull(),
    decisionSequence: integer("decision_sequence").notNull(),
    disposition: discoveryProposalDisposition("disposition").notNull(),
    reviewNote: text("review_note"),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_proposal_decisions_proposal_fk",
      columns: [
        table.proposalId,
        table.organizationId,
        table.proposalStableKey,
        table.sessionId,
        table.sessionStableKey,
      ],
      foreignColumns: [
        discoveryProposal.id,
        discoveryProposal.organizationId,
        discoveryProposal.stableKey,
        discoveryProposal.sessionId,
        discoveryProposal.sessionStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_proposal_decisions_observation_fk",
      columns: [
        table.observationStableKey,
        table.sessionId,
        table.organizationId,
      ],
      foreignColumns: [
        discoveryObservation.stableKey,
        discoveryObservation.sessionId,
        discoveryObservation.organizationId,
      ],
    }).onDelete("restrict"),
    unique("discovery_proposal_decisions_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_proposal_decisions_observation_sequence_unique").on(
      table.proposalId,
      table.observationStableKey,
      table.decisionSequence,
    ),
    check(
      "discovery_proposal_decisions_sequence_positive_check",
      sql`${table.decisionSequence} >= 1`,
    ),
    check(
      "discovery_proposal_decisions_note_not_blank_check",
      sql`${table.reviewNote} is null or char_length(trim(${table.reviewNote})) > 0`,
    ),
    check(
      "discovery_proposal_decisions_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    index("discovery_proposal_decisions_proposal_created_idx").on(
      table.organizationId,
      table.proposalStableKey,
      table.createdAt,
    ),
    index("discovery_proposal_decisions_observation_idx").on(
      table.organizationId,
      table.observationStableKey,
      table.decisionSequence,
    ),
  ],
);

export const discoveryProposalMapping = pgTable(
  "discovery_proposal_mappings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    proposalId: integer("proposal_id").notNull(),
    proposalStableKey: uuid("proposal_stable_key").notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    processId: integer("process_id").notNull(),
    processStableKey: uuid("process_stable_key").notNull(),
    status: discoveryMappingStatus("status").default("draft").notNull(),
    revision: integer("revision").default(1).notNull(),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    readyByActor: varchar("ready_by_actor", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_mappings_proposal_context_fk",
      columns: [
        table.proposalId,
        table.organizationId,
        table.proposalStableKey,
        table.sessionId,
        table.sessionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoveryProposal.id,
        discoveryProposal.organizationId,
        discoveryProposal.stableKey,
        discoveryProposal.sessionId,
        discoveryProposal.sessionStableKey,
        discoveryProposal.processId,
        discoveryProposal.processStableKey,
      ],
    }).onDelete("restrict"),
    unique("discovery_mappings_stable_key_unique").on(table.stableKey),
    unique("discovery_mappings_proposal_unique").on(table.proposalId),
    unique("discovery_mappings_identity_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    unique("discovery_mappings_identity_session_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.sessionId,
      table.sessionStableKey,
    ),
    unique("discovery_mappings_identity_process_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.processId,
      table.processStableKey,
    ),
    unique("discovery_mappings_review_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.proposalId,
      table.proposalStableKey,
      table.sessionId,
      table.sessionStableKey,
      table.processId,
      table.processStableKey,
    ),
    check(
      "discovery_mappings_revision_positive_check",
      sql`${table.revision} >= 1`,
    ),
    check(
      "discovery_mappings_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "discovery_mappings_ready_state_check",
      sql`(${table.status} = 'draft' and ${table.readyAt} is null and ${table.readyByActor} is null) or (${table.status} = 'ready_for_proposal_review' and ${table.readyAt} is not null and ${table.readyByActor} is not null and char_length(trim(${table.readyByActor})) > 0)`,
    ),
    index("discovery_mappings_org_status_updated_idx").on(
      table.organizationId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const discoveryProposalMappingItem = pgTable(
  "discovery_mapping_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    mappingId: integer("mapping_id").notNull(),
    mappingStableKey: uuid("mapping_stable_key").notNull(),
    itemStableKey: uuid("item_stable_key").defaultRandom().notNull(),
    itemSequence: integer("item_sequence").notNull(),
    state: discoveryMappingItemState("state").default("active").notNull(),
    action: discoveryMappingAction("action").notNull(),
    ownerRoleId: integer("owner_role_id"),
    ownerRoleStableKey: uuid("owner_role_stable_key"),
    processId: integer("process_id"),
    processStableKey: uuid("process_stable_key"),
    processStepId: integer("process_step_id"),
    processStepStableKey: uuid("process_step_stable_key"),
    responsibleRoleId: integer("responsible_role_id"),
    responsibleRoleStableKey: uuid("responsible_role_stable_key"),
    systemId: integer("system_id"),
    systemStableKey: uuid("system_stable_key"),
    exceptionId: integer("exception_id"),
    exceptionStableKey: uuid("exception_stable_key"),
    relatedProcessId: integer("related_process_id"),
    relatedProcessStableKey: uuid("related_process_stable_key"),
    beforeState: jsonb("before_state").notNull(),
    proposedState: jsonb("proposed_state").notNull(),
    rationale: text("rationale").notNull(),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_mapping_items_mapping_fk",
      columns: [
        table.mappingId,
        table.organizationId,
        table.mappingStableKey,
      ],
      foreignColumns: [
        discoveryProposalMapping.id,
        discoveryProposalMapping.organizationId,
        discoveryProposalMapping.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_mapping_items_owner_role_fk",
      columns: [
        table.ownerRoleId,
        table.organizationId,
        table.ownerRoleStableKey,
      ],
      foreignColumns: [role.id, role.organizationId, role.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_items_mapping_process_fk",
      columns: [
        table.mappingId,
        table.organizationId,
        table.mappingStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoveryProposalMapping.id,
        discoveryProposalMapping.organizationId,
        discoveryProposalMapping.stableKey,
        discoveryProposalMapping.processId,
        discoveryProposalMapping.processStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_items_process_step_fk",
      columns: [
        table.processStepId,
        table.processId,
        table.organizationId,
        table.processStepStableKey,
      ],
      foreignColumns: [
        processStep.id,
        processStep.processId,
        processStep.organizationId,
        processStep.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_items_responsible_role_fk",
      columns: [
        table.responsibleRoleId,
        table.organizationId,
        table.responsibleRoleStableKey,
      ],
      foreignColumns: [role.id, role.organizationId, role.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_items_system_fk",
      columns: [table.systemId, table.organizationId, table.systemStableKey],
      foreignColumns: [system.id, system.organizationId, system.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_items_exception_fk",
      columns: [
        table.exceptionId,
        table.processId,
        table.organizationId,
        table.exceptionStableKey,
      ],
      foreignColumns: [
        exception.id,
        exception.processId,
        exception.organizationId,
        exception.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_items_related_process_fk",
      columns: [
        table.relatedProcessId,
        table.organizationId,
        table.relatedProcessStableKey,
      ],
      foreignColumns: [process.id, process.organizationId, process.stableKey],
    }).onDelete("restrict"),
    unique("discovery_mapping_items_stable_key_unique").on(table.stableKey),
    unique("discovery_mapping_items_item_sequence_unique").on(
      table.mappingId,
      table.itemStableKey,
      table.itemSequence,
    ),
    unique("discovery_mapping_items_revision_identity_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.mappingId,
      table.mappingStableKey,
    ),
    check(
      "discovery_mapping_items_sequence_positive_check",
      sql`${table.itemSequence} >= 1`,
    ),
    check(
      "discovery_mapping_items_states_object_check",
      sql`jsonb_typeof(${table.beforeState}) = 'object' and jsonb_typeof(${table.proposedState}) = 'object'`,
    ),
    check(
      "discovery_mapping_items_rationale_not_blank_check",
      sql`char_length(trim(${table.rationale})) > 0`,
    ),
    check(
      "discovery_mapping_items_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "discovery_mapping_items_owner_role_pair_check",
      sql`(${table.ownerRoleId} is null and ${table.ownerRoleStableKey} is null) or (${table.ownerRoleId} is not null and ${table.ownerRoleStableKey} is not null)`,
    ),
    check(
      "discovery_items_typed_target_pairs_check",
      sql`((${table.processId} is null) = (${table.processStableKey} is null)) and ((${table.processStepId} is null) = (${table.processStepStableKey} is null)) and ((${table.responsibleRoleId} is null) = (${table.responsibleRoleStableKey} is null)) and ((${table.systemId} is null) = (${table.systemStableKey} is null)) and ((${table.exceptionId} is null) = (${table.exceptionStableKey} is null)) and ((${table.relatedProcessId} is null) = (${table.relatedProcessStableKey} is null))`,
    ),
    check(
      "discovery_items_related_process_distinct_check",
      sql`${table.relatedProcessId} is null or ${table.processId} is null or ${table.relatedProcessId} <> ${table.processId}`,
    ),
    check(
      "discovery_mapping_items_target_shape_check",
      sql`(${table.action} = 'change_process_owner' and ${table.processId} is null and ${table.processStepId} is null and ${table.responsibleRoleId} is null and ${table.systemId} is null and ${table.exceptionId} is null and ${table.relatedProcessId} is null) or (${table.action} in ('update_process_purpose', 'preserve_unresolved') and ${table.ownerRoleId} is null and ${table.processId} is null and ${table.processStepId} is null and ${table.responsibleRoleId} is null and ${table.systemId} is null and ${table.exceptionId} is null and ${table.relatedProcessId} is null) or (${table.action} = 'add_process_step' and ${table.ownerRoleId} is null and ${table.processId} is not null and ${table.processStepId} is null and ${table.systemId} is null and ${table.exceptionId} is null and ${table.relatedProcessId} is null) or (${table.action} = 'revise_process_step' and ${table.ownerRoleId} is null and ${table.processId} is not null and ${table.processStepId} is not null and ${table.responsibleRoleId} is null and ${table.systemId} is null and ${table.exceptionId} is null and ${table.relatedProcessId} is null) or (${table.action} = 'change_step_responsibility' and ${table.ownerRoleId} is null and ${table.processId} is not null and ${table.processStepId} is not null and ${table.systemId} is null and ${table.exceptionId} is null and ${table.relatedProcessId} is null) or (${table.action} = 'link_existing_system' and ${table.ownerRoleId} is null and ${table.processId} is not null and ${table.processStepId} is null and ${table.responsibleRoleId} is null and ${table.systemId} is not null and ${table.exceptionId} is null and ${table.relatedProcessId} is null) or (${table.action} = 'add_process_exception' and ${table.ownerRoleId} is null and ${table.processId} is not null and ${table.responsibleRoleId} is null and ${table.systemId} is null and ${table.exceptionId} is null and ${table.relatedProcessId} is null) or (${table.action} = 'revise_process_exception' and ${table.ownerRoleId} is null and ${table.processId} is not null and ${table.processStepId} is null and ${table.responsibleRoleId} is null and ${table.systemId} is null and ${table.exceptionId} is not null and ${table.relatedProcessId} is null) or (${table.action} = 'add_process_dependency' and ${table.ownerRoleId} is null and ${table.processId} is not null and ${table.processStepId} is null and ${table.responsibleRoleId} is null and ${table.systemId} is null and ${table.exceptionId} is null and ${table.relatedProcessId} is not null)`,
    ),
    check(
      "discovery_mapping_items_payload_shape_check",
      sql`(${table.action} = 'update_process_purpose' and ${table.beforeState} ? 'purpose' and ${table.proposedState} ? 'purpose') or (${table.action} = 'change_process_owner' and ${table.beforeState} ? 'ownerRoleStableKey' and ${table.proposedState} ? 'ownerRoleStableKey') or (${table.action} = 'preserve_unresolved' and ${table.proposedState} ? 'question') or (${table.action} = 'add_process_step' and ${table.proposedState} ?& array['title','instructions','position','responsibleRoleStableKey']) or (${table.action} = 'revise_process_step' and ${table.beforeState} ?& array['title','instructions'] and ${table.proposedState} ?& array['title','instructions']) or (${table.action} = 'change_step_responsibility' and ${table.beforeState} ? 'responsibleRoleStableKey' and ${table.proposedState} ? 'responsibleRoleStableKey') or (${table.action} = 'link_existing_system' and ${table.proposedState} ?& array['systemStableKey','usage']) or (${table.action} = 'add_process_exception' and ${table.proposedState} ?& array['name','condition','response','processStepStableKey']) or (${table.action} = 'revise_process_exception' and ${table.beforeState} ?& array['name','condition','response'] and ${table.proposedState} ?& array['name','condition','response']) or (${table.action} = 'add_process_dependency' and ${table.proposedState} ?& array['relatedProcessStableKey','direction','dependencyType','description'])`,
    ),
    index("discovery_mapping_items_mapping_created_idx").on(
      table.organizationId,
      table.mappingStableKey,
      table.createdAt,
    ),
    index("discovery_mapping_items_owner_role_idx").on(table.ownerRoleId),
    index("discovery_items_process_step_idx").on(table.processStepId),
    index("discovery_items_responsible_role_idx").on(table.responsibleRoleId),
    index("discovery_items_system_idx").on(table.systemId),
    index("discovery_items_exception_idx").on(table.exceptionId),
    index("discovery_items_related_process_idx").on(table.relatedProcessId),
  ],
);

export const discoveryProposalMappingSource = pgTable(
  "discovery_mapping_sources",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    mappingId: integer("mapping_id").notNull(),
    mappingStableKey: uuid("mapping_stable_key").notNull(),
    itemRevisionId: integer("item_revision_id").notNull(),
    itemRevisionStableKey: uuid("item_revision_stable_key").notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    observationStableKey: uuid("observation_stable_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_mapping_sources_mapping_session_fk",
      columns: [
        table.mappingId,
        table.organizationId,
        table.mappingStableKey,
        table.sessionId,
        table.sessionStableKey,
      ],
      foreignColumns: [
        discoveryProposalMapping.id,
        discoveryProposalMapping.organizationId,
        discoveryProposalMapping.stableKey,
        discoveryProposalMapping.sessionId,
        discoveryProposalMapping.sessionStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_mapping_sources_item_revision_fk",
      columns: [
        table.itemRevisionId,
        table.organizationId,
        table.itemRevisionStableKey,
        table.mappingId,
        table.mappingStableKey,
      ],
      foreignColumns: [
        discoveryProposalMappingItem.id,
        discoveryProposalMappingItem.organizationId,
        discoveryProposalMappingItem.stableKey,
        discoveryProposalMappingItem.mappingId,
        discoveryProposalMappingItem.mappingStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_mapping_sources_observation_fk",
      columns: [
        table.observationStableKey,
        table.sessionId,
        table.organizationId,
      ],
      foreignColumns: [
        discoveryObservation.stableKey,
        discoveryObservation.sessionId,
        discoveryObservation.organizationId,
      ],
    }).onDelete("restrict"),
    unique("discovery_mapping_sources_stable_key_unique").on(table.stableKey),
    unique("discovery_mapping_sources_item_observation_unique").on(
      table.itemRevisionId,
      table.observationStableKey,
    ),
    index("discovery_mapping_sources_observation_idx").on(
      table.organizationId,
      table.observationStableKey,
    ),
  ],
);

export const operatingModelProposalReview = pgTable(
  "operating_model_proposal_reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    mappingId: integer("mapping_id").notNull(),
    mappingStableKey: uuid("mapping_stable_key").notNull(),
    mappingRevision: integer("mapping_revision").notNull(),
    proposalId: integer("proposal_id").notNull(),
    proposalStableKey: uuid("proposal_stable_key").notNull(),
    sessionId: integer("session_id").notNull(),
    sessionStableKey: uuid("session_stable_key").notNull(),
    processId: integer("process_id").notNull(),
    processStableKey: uuid("process_stable_key").notNull(),
    documentedProcessFingerprint: varchar("documented_process_fingerprint", {
      length: 64,
    }).notNull(),
    status: proposalReviewStatus("status").default("in_review").notNull(),
    revision: integer("revision").default(1).notNull(),
    startedByActor: varchar("started_by_actor", { length: 128 }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByActor: varchar("completed_by_actor", { length: 128 }),
    completionNote: text("completion_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "proposal_reviews_mapping_context_fk",
      columns: [
        table.mappingId,
        table.organizationId,
        table.mappingStableKey,
        table.proposalId,
        table.proposalStableKey,
        table.sessionId,
        table.sessionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoveryProposalMapping.id,
        discoveryProposalMapping.organizationId,
        discoveryProposalMapping.stableKey,
        discoveryProposalMapping.proposalId,
        discoveryProposalMapping.proposalStableKey,
        discoveryProposalMapping.sessionId,
        discoveryProposalMapping.sessionStableKey,
        discoveryProposalMapping.processId,
        discoveryProposalMapping.processStableKey,
      ],
    }).onDelete("restrict"),
    unique("proposal_reviews_stable_key_unique").on(table.stableKey),
    unique("proposal_reviews_mapping_unique").on(table.mappingId),
    unique("proposal_reviews_identity_mapping_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.mappingId,
      table.mappingStableKey,
    ),
    unique("proposal_reviews_identity_process_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.processId,
      table.processStableKey,
    ),
    check(
      "proposal_reviews_mapping_revision_positive_check",
      sql`${table.mappingRevision} >= 1`,
    ),
    check(
      "proposal_reviews_revision_positive_check",
      sql`${table.revision} >= 1`,
    ),
    check(
      "proposal_reviews_fingerprint_check",
      sql`${table.documentedProcessFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "proposal_reviews_actor_not_blank_check",
      sql`char_length(trim(${table.startedByActor})) > 0 and (${table.completedByActor} is null or char_length(trim(${table.completedByActor})) > 0)`,
    ),
    check(
      "proposal_reviews_completion_state_check",
      sql`(${table.status} = 'in_review' and ${table.completedAt} is null and ${table.completedByActor} is null and ${table.completionNote} is null) or (${table.status} <> 'in_review' and ${table.completedAt} is not null and ${table.completedByActor} is not null and ${table.completionNote} is not null and char_length(trim(${table.completionNote})) > 0)`,
    ),
    index("proposal_reviews_org_status_updated_idx").on(
      table.organizationId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const operatingModelProposalReviewDecision = pgTable(
  "operating_model_proposal_review_decisions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    reviewId: integer("review_id").notNull(),
    reviewStableKey: uuid("review_stable_key").notNull(),
    mappingId: integer("mapping_id").notNull(),
    mappingStableKey: uuid("mapping_stable_key").notNull(),
    itemRevisionId: integer("item_revision_id").notNull(),
    itemRevisionStableKey: uuid("item_revision_stable_key").notNull(),
    itemStableKey: uuid("item_stable_key").notNull(),
    itemSequence: integer("item_sequence").notNull(),
    decisionSequence: integer("decision_sequence").notNull(),
    disposition: proposalReviewDisposition("disposition").notNull(),
    reviewNote: text("review_note"),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "proposal_review_decisions_review_fk",
      columns: [
        table.reviewId,
        table.organizationId,
        table.reviewStableKey,
        table.mappingId,
        table.mappingStableKey,
      ],
      foreignColumns: [
        operatingModelProposalReview.id,
        operatingModelProposalReview.organizationId,
        operatingModelProposalReview.stableKey,
        operatingModelProposalReview.mappingId,
        operatingModelProposalReview.mappingStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "proposal_review_decisions_item_revision_fk",
      columns: [
        table.itemRevisionId,
        table.organizationId,
        table.itemRevisionStableKey,
        table.mappingId,
        table.mappingStableKey,
      ],
      foreignColumns: [
        discoveryProposalMappingItem.id,
        discoveryProposalMappingItem.organizationId,
        discoveryProposalMappingItem.stableKey,
        discoveryProposalMappingItem.mappingId,
        discoveryProposalMappingItem.mappingStableKey,
      ],
    }).onDelete("restrict"),
    unique("proposal_review_decisions_stable_key_unique").on(table.stableKey),
    unique("proposal_review_decisions_application_identity_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.reviewId,
      table.itemRevisionId,
    ),
    unique("proposal_review_decisions_item_sequence_unique").on(
      table.reviewId,
      table.itemStableKey,
      table.decisionSequence,
    ),
    check(
      "proposal_review_decisions_item_sequence_positive_check",
      sql`${table.itemSequence} >= 1`,
    ),
    check(
      "proposal_review_decisions_sequence_positive_check",
      sql`${table.decisionSequence} >= 1`,
    ),
    check(
      "proposal_review_decisions_note_check",
      sql`(${table.disposition} = 'approve' and (${table.reviewNote} is null or char_length(trim(${table.reviewNote})) > 0)) or (${table.disposition} <> 'approve' and ${table.reviewNote} is not null and char_length(trim(${table.reviewNote})) > 0)`,
    ),
    check(
      "proposal_review_decisions_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    index("proposal_review_decisions_review_created_idx").on(
      table.organizationId,
      table.reviewStableKey,
      table.createdAt,
    ),
  ],
);

export const processVersion = pgTable(
  "process_versions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    processId: integer("process_id").notNull(),
    processStableKey: uuid("process_stable_key").notNull(),
    versionSequence: integer("version_sequence").notNull(),
    predecessorVersionId: integer("predecessor_version_id"),
    predecessorVersionStableKey: uuid("predecessor_version_stable_key"),
    versionKind: processVersionKind("version_kind").notNull(),
    snapshotFormatVersion: integer("snapshot_format_version")
      .default(1)
      .notNull(),
    documentedProcessSnapshot: jsonb("documented_process_snapshot").notNull(),
    documentedProcessFingerprint: varchar("documented_process_fingerprint", {
      length: 64,
    }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    recordedByActor: varchar("recorded_by_actor", { length: 128 }).notNull(),
    sourceReviewId: integer("source_review_id"),
    sourceReviewStableKey: uuid("source_review_stable_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "process_versions_process_fk",
      columns: [table.processId, table.organizationId, table.processStableKey],
      foreignColumns: [process.id, process.organizationId, process.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "process_versions_source_review_fk",
      columns: [
        table.sourceReviewId,
        table.organizationId,
        table.sourceReviewStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        operatingModelProposalReview.id,
        operatingModelProposalReview.organizationId,
        operatingModelProposalReview.stableKey,
        operatingModelProposalReview.processId,
        operatingModelProposalReview.processStableKey,
      ],
    }).onDelete("restrict"),
    unique("process_versions_stable_key_unique").on(table.stableKey),
    unique("process_versions_process_sequence_unique").on(
      table.processId,
      table.versionSequence,
    ),
    unique("process_versions_identity_process_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.processId,
      table.processStableKey,
    ),
    check(
      "process_versions_sequence_positive_check",
      sql`${table.versionSequence} >= 1`,
    ),
    check(
      "process_versions_predecessor_pair_check",
      sql`((${table.predecessorVersionId} is null) = (${table.predecessorVersionStableKey} is null))`,
    ),
    check(
      "process_versions_source_review_pair_check",
      sql`((${table.sourceReviewId} is null) = (${table.sourceReviewStableKey} is null))`,
    ),
    check(
      "process_versions_kind_shape_check",
      sql`(${table.versionKind} = 'baseline' and ${table.versionSequence} = 1 and ${table.predecessorVersionId} is null and ${table.effectiveAt} is null and ${table.sourceReviewId} is null) or (${table.versionKind} = 'approved_application' and ${table.versionSequence} > 1 and ${table.predecessorVersionId} is not null and ${table.effectiveAt} is not null and ${table.sourceReviewId} is not null)`,
    ),
    check(
      "process_versions_snapshot_check",
      sql`${table.snapshotFormatVersion} = 1 and jsonb_typeof(${table.documentedProcessSnapshot}) = 'object'`,
    ),
    check(
      "process_versions_fingerprint_check",
      sql`${table.documentedProcessFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "process_versions_effective_at_check",
      sql`${table.effectiveAt} is null or ${table.effectiveAt} <= ${table.createdAt}`,
    ),
    check(
      "process_versions_actor_not_blank_check",
      sql`char_length(trim(${table.recordedByActor})) > 0`,
    ),
    index("process_versions_org_process_created_idx").on(
      table.organizationId,
      table.processStableKey,
      table.createdAt,
    ),
  ],
);

export const operatingModelProposalApplication = pgTable(
  "operating_model_proposal_applications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    processId: integer("process_id").notNull(),
    processStableKey: uuid("process_stable_key").notNull(),
    reviewId: integer("review_id").notNull(),
    reviewStableKey: uuid("review_stable_key").notNull(),
    mappingId: integer("mapping_id").notNull(),
    mappingStableKey: uuid("mapping_stable_key").notNull(),
    mappingRevision: integer("mapping_revision").notNull(),
    documentedProcessFingerprint: varchar("documented_process_fingerprint", {
      length: 64,
    }).notNull(),
    beforeVersionId: integer("before_version_id").notNull(),
    beforeVersionStableKey: uuid("before_version_stable_key").notNull(),
    afterVersionId: integer("after_version_id").notNull(),
    afterVersionStableKey: uuid("after_version_stable_key").notNull(),
    reason: text("reason").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "proposal_applications_mapping_process_fk",
      columns: [
        table.mappingId,
        table.organizationId,
        table.mappingStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        discoveryProposalMapping.id,
        discoveryProposalMapping.organizationId,
        discoveryProposalMapping.stableKey,
        discoveryProposalMapping.processId,
        discoveryProposalMapping.processStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "proposal_applications_review_fk",
      columns: [
        table.reviewId,
        table.organizationId,
        table.reviewStableKey,
        table.mappingId,
        table.mappingStableKey,
      ],
      foreignColumns: [
        operatingModelProposalReview.id,
        operatingModelProposalReview.organizationId,
        operatingModelProposalReview.stableKey,
        operatingModelProposalReview.mappingId,
        operatingModelProposalReview.mappingStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "proposal_applications_before_version_fk",
      columns: [
        table.beforeVersionId,
        table.organizationId,
        table.beforeVersionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        processVersion.id,
        processVersion.organizationId,
        processVersion.stableKey,
        processVersion.processId,
        processVersion.processStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "proposal_applications_after_version_fk",
      columns: [
        table.afterVersionId,
        table.organizationId,
        table.afterVersionStableKey,
        table.processId,
        table.processStableKey,
      ],
      foreignColumns: [
        processVersion.id,
        processVersion.organizationId,
        processVersion.stableKey,
        processVersion.processId,
        processVersion.processStableKey,
      ],
    }).onDelete("restrict"),
    unique("proposal_applications_stable_key_unique").on(table.stableKey),
    unique("proposal_applications_review_unique").on(table.reviewId),
    unique("proposal_applications_identity_review_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
      table.reviewId,
      table.reviewStableKey,
      table.mappingId,
      table.mappingStableKey,
    ),
    check(
      "proposal_applications_mapping_revision_check",
      sql`${table.mappingRevision} >= 1`,
    ),
    check(
      "proposal_applications_fingerprint_check",
      sql`${table.documentedProcessFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "proposal_applications_reason_actor_check",
      sql`char_length(trim(${table.reason})) > 0 and char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    check(
      "proposal_applications_effective_at_check",
      sql`${table.effectiveAt} <= ${table.createdAt}`,
    ),
    index("proposal_applications_org_process_created_idx").on(
      table.organizationId,
      table.processStableKey,
      table.createdAt,
    ),
  ],
);

export const operatingModelProposalApplicationItem = pgTable(
  "operating_model_proposal_application_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    applicationId: integer("application_id").notNull(),
    applicationStableKey: uuid("application_stable_key").notNull(),
    reviewId: integer("review_id").notNull(),
    reviewStableKey: uuid("review_stable_key").notNull(),
    mappingId: integer("mapping_id").notNull(),
    mappingStableKey: uuid("mapping_stable_key").notNull(),
    reviewDecisionId: integer("review_decision_id").notNull(),
    reviewDecisionStableKey: uuid("review_decision_stable_key").notNull(),
    itemRevisionId: integer("item_revision_id").notNull(),
    itemRevisionStableKey: uuid("item_revision_stable_key").notNull(),
    itemStableKey: uuid("item_stable_key").notNull(),
    applicationSequence: integer("application_sequence").notNull(),
    action: discoveryMappingAction("action").notNull(),
    changeKind: operatingModelChangeKind("change_kind").notNull(),
    beforeState: jsonb("before_state").notNull(),
    afterState: jsonb("after_state").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "proposal_application_items_application_fk",
      columns: [
        table.applicationId,
        table.organizationId,
        table.applicationStableKey,
        table.reviewId,
        table.reviewStableKey,
        table.mappingId,
        table.mappingStableKey,
      ],
      foreignColumns: [
        operatingModelProposalApplication.id,
        operatingModelProposalApplication.organizationId,
        operatingModelProposalApplication.stableKey,
        operatingModelProposalApplication.reviewId,
        operatingModelProposalApplication.reviewStableKey,
        operatingModelProposalApplication.mappingId,
        operatingModelProposalApplication.mappingStableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "proposal_application_items_decision_fk",
      columns: [
        table.reviewDecisionId,
        table.organizationId,
        table.reviewDecisionStableKey,
        table.reviewId,
        table.itemRevisionId,
      ],
      foreignColumns: [
        operatingModelProposalReviewDecision.id,
        operatingModelProposalReviewDecision.organizationId,
        operatingModelProposalReviewDecision.stableKey,
        operatingModelProposalReviewDecision.reviewId,
        operatingModelProposalReviewDecision.itemRevisionId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "proposal_application_items_item_revision_fk",
      columns: [
        table.itemRevisionId,
        table.organizationId,
        table.itemRevisionStableKey,
        table.mappingId,
        table.mappingStableKey,
      ],
      foreignColumns: [
        discoveryProposalMappingItem.id,
        discoveryProposalMappingItem.organizationId,
        discoveryProposalMappingItem.stableKey,
        discoveryProposalMappingItem.mappingId,
        discoveryProposalMappingItem.mappingStableKey,
      ],
    }).onDelete("restrict"),
    unique("proposal_application_items_stable_key_unique").on(table.stableKey),
    unique("proposal_application_items_item_unique").on(
      table.applicationId,
      table.itemStableKey,
    ),
    unique("proposal_application_items_sequence_unique").on(
      table.applicationId,
      table.applicationSequence,
    ),
    check(
      "proposal_application_items_sequence_check",
      sql`${table.applicationSequence} >= 1`,
    ),
    check(
      "proposal_application_items_action_check",
      sql`${table.action} <> 'preserve_unresolved'`,
    ),
    check(
      "proposal_application_items_state_check",
      sql`jsonb_typeof(${table.beforeState}) = 'object' and jsonb_typeof(${table.afterState}) = 'object'`,
    ),
    index("proposal_application_items_org_application_idx").on(
      table.organizationId,
      table.applicationStableKey,
      table.applicationSequence,
    ),
  ],
);

export const processStep = pgTable(
  "process_steps",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
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
    unique("process_steps_stable_key_unique").on(table.stableKey),
    unique("process_steps_id_process_org_stable_unique").on(
      table.id,
      table.processId,
      table.organizationId,
      table.stableKey,
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

export const operatingModelChange = pgTable(
  "operating_model_changes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    processId: integer("process_id"),
    processStableKey: uuid("process_stable_key"),
    processStepId: integer("process_step_id"),
    processStepStableKey: uuid("process_step_stable_key"),
    systemId: integer("system_id"),
    systemStableKey: uuid("system_stable_key"),
    exceptionId: integer("exception_id"),
    exceptionStableKey: uuid("exception_stable_key"),
    processDependencyId: integer("process_dependency_id"),
    processDependencyStableKey: uuid("process_dependency_stable_key"),
    processFamilyId: integer("process_family_id"),
    processFamilyStableKey: uuid("process_family_stable_key"),
    processFamilyMembershipId: integer("process_family_membership_id"),
    processFamilyMembershipStableKey: uuid(
      "process_family_membership_stable_key",
    ),
    processFamilyRelationshipId: integer("process_family_relationship_id"),
    processFamilyRelationshipStableKey: uuid(
      "process_family_relationship_stable_key",
    ),
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
    foreignKey({
      name: "operating_model_changes_step_org_stable_fk",
      columns: [
        table.processStepId,
        table.processId,
        table.organizationId,
        table.processStepStableKey,
      ],
      foreignColumns: [
        processStep.id,
        processStep.processId,
        processStep.organizationId,
        processStep.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "operating_model_changes_system_org_stable_fk",
      columns: [
        table.systemId,
        table.organizationId,
        table.systemStableKey,
      ],
      foreignColumns: [system.id, system.organizationId, system.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "operating_model_changes_exception_org_stable_fk",
      columns: [
        table.exceptionId,
        table.processId,
        table.organizationId,
        table.exceptionStableKey,
      ],
      foreignColumns: [
        exception.id,
        exception.processId,
        exception.organizationId,
        exception.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "operating_model_changes_dependency_org_stable_fk",
      columns: [
        table.processDependencyId,
        table.organizationId,
        table.processDependencyStableKey,
      ],
      foreignColumns: [
        processDependency.id,
        processDependency.organizationId,
        processDependency.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "operating_model_changes_family_org_stable_fk",
      columns: [
        table.processFamilyId,
        table.organizationId,
        table.processFamilyStableKey,
      ],
      foreignColumns: [
        processFamily.id,
        processFamily.organizationId,
        processFamily.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "operating_model_changes_family_membership_context_fk",
      columns: [
        table.processFamilyMembershipId,
        table.organizationId,
        table.processFamilyMembershipStableKey,
        table.processFamilyId,
        table.processId,
      ],
      foreignColumns: [
        processFamilyMembership.id,
        processFamilyMembership.organizationId,
        processFamilyMembership.stableKey,
        processFamilyMembership.processFamilyId,
        processFamilyMembership.processId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "operating_model_changes_family_relationship_context_fk",
      columns: [
        table.processFamilyRelationshipId,
        table.organizationId,
        table.processFamilyRelationshipStableKey,
      ],
      foreignColumns: [
        processFamilyRelationship.id,
        processFamilyRelationship.organizationId,
        processFamilyRelationship.stableKey,
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
    check(
      "operating_model_changes_target_shape_check",
      sql`case ${table.entityType}
        when 'process' then
          ${table.processId} is not null and ${table.processStableKey} is not null
          and ${table.processStepId} is null and ${table.processStepStableKey} is null
          and ${table.systemId} is null and ${table.systemStableKey} is null
          and ${table.exceptionId} is null and ${table.exceptionStableKey} is null
          and ${table.processDependencyId} is null and ${table.processDependencyStableKey} is null
          and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null
          and ${table.processFamilyMembershipId} is null and ${table.processFamilyMembershipStableKey} is null
          and ${table.processFamilyRelationshipId} is null and ${table.processFamilyRelationshipStableKey} is null
        when 'process_step' then
          ${table.processId} is not null and ${table.processStableKey} is not null
          and ${table.processStepId} is not null and ${table.processStepStableKey} is not null
          and ${table.systemId} is null and ${table.systemStableKey} is null
          and ${table.exceptionId} is null and ${table.exceptionStableKey} is null
          and ${table.processDependencyId} is null and ${table.processDependencyStableKey} is null
          and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null
          and ${table.processFamilyMembershipId} is null and ${table.processFamilyMembershipStableKey} is null
          and ${table.processFamilyRelationshipId} is null and ${table.processFamilyRelationshipStableKey} is null
        when 'system' then
          ${table.processId} is null and ${table.processStableKey} is null
          and ${table.processStepId} is null and ${table.processStepStableKey} is null
          and ${table.systemId} is not null and ${table.systemStableKey} is not null
          and ${table.exceptionId} is null and ${table.exceptionStableKey} is null
          and ${table.processDependencyId} is null and ${table.processDependencyStableKey} is null
          and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null
          and ${table.processFamilyMembershipId} is null and ${table.processFamilyMembershipStableKey} is null
          and ${table.processFamilyRelationshipId} is null and ${table.processFamilyRelationshipStableKey} is null
        when 'process_system' then
          ${table.processId} is not null and ${table.processStableKey} is not null
          and ${table.processStepId} is null and ${table.processStepStableKey} is null
          and ${table.systemId} is not null and ${table.systemStableKey} is not null
          and ${table.exceptionId} is null and ${table.exceptionStableKey} is null
          and ${table.processDependencyId} is null and ${table.processDependencyStableKey} is null
          and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null
          and ${table.processFamilyMembershipId} is null and ${table.processFamilyMembershipStableKey} is null
          and ${table.processFamilyRelationshipId} is null and ${table.processFamilyRelationshipStableKey} is null
        when 'exception' then
          ${table.processId} is not null and ${table.processStableKey} is not null
          and ${table.processStepId} is null and ${table.processStepStableKey} is null
          and ${table.systemId} is null and ${table.systemStableKey} is null
          and ${table.exceptionId} is not null and ${table.exceptionStableKey} is not null
          and ${table.processDependencyId} is null and ${table.processDependencyStableKey} is null
          and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null
          and ${table.processFamilyMembershipId} is null and ${table.processFamilyMembershipStableKey} is null
          and ${table.processFamilyRelationshipId} is null and ${table.processFamilyRelationshipStableKey} is null
        when 'process_dependency' then
          ${table.processId} is not null and ${table.processStableKey} is not null
          and ${table.processStepId} is null and ${table.processStepStableKey} is null
          and ${table.systemId} is null and ${table.systemStableKey} is null
          and ${table.exceptionId} is null and ${table.exceptionStableKey} is null
          and ${table.processDependencyId} is not null and ${table.processDependencyStableKey} is not null
          and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null
          and ${table.processFamilyMembershipId} is null and ${table.processFamilyMembershipStableKey} is null
          and ${table.processFamilyRelationshipId} is null and ${table.processFamilyRelationshipStableKey} is null
        when 'process_family' then
          ${table.processId} is null and ${table.processStableKey} is null
          and ${table.processStepId} is null and ${table.processStepStableKey} is null
          and ${table.systemId} is null and ${table.systemStableKey} is null
          and ${table.exceptionId} is null and ${table.exceptionStableKey} is null
          and ${table.processDependencyId} is null and ${table.processDependencyStableKey} is null
          and ${table.processFamilyId} is not null and ${table.processFamilyStableKey} is not null
          and ${table.processFamilyMembershipId} is null and ${table.processFamilyMembershipStableKey} is null
          and ${table.processFamilyRelationshipId} is null and ${table.processFamilyRelationshipStableKey} is null
        when 'process_family_membership' then
          ${table.processId} is not null and ${table.processStableKey} is not null
          and ${table.processStepId} is null and ${table.processStepStableKey} is null
          and ${table.systemId} is null and ${table.systemStableKey} is null
          and ${table.exceptionId} is null and ${table.exceptionStableKey} is null
          and ${table.processDependencyId} is null and ${table.processDependencyStableKey} is null
          and ${table.processFamilyId} is not null and ${table.processFamilyStableKey} is not null
          and ${table.processFamilyMembershipId} is not null and ${table.processFamilyMembershipStableKey} is not null
          and ${table.processFamilyRelationshipId} is null and ${table.processFamilyRelationshipStableKey} is null
        when 'process_family_relationship' then
          ${table.processId} is null and ${table.processStableKey} is null
          and ${table.processStepId} is null and ${table.processStepStableKey} is null
          and ${table.systemId} is null and ${table.systemStableKey} is null
          and ${table.exceptionId} is null and ${table.exceptionStableKey} is null
          and ${table.processDependencyId} is null and ${table.processDependencyStableKey} is null
          and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null
          and ${table.processFamilyMembershipId} is null and ${table.processFamilyMembershipStableKey} is null
          and ${table.processFamilyRelationshipId} is not null and ${table.processFamilyRelationshipStableKey} is not null
        else false
      end`,
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
    index("operating_model_changes_step_created_idx").on(
      table.organizationId,
      table.processStepStableKey,
      table.createdAt,
    ),
    index("operating_model_changes_system_created_idx").on(
      table.organizationId,
      table.systemStableKey,
      table.createdAt,
    ),
    index("operating_model_changes_exception_created_idx").on(
      table.organizationId,
      table.exceptionStableKey,
      table.createdAt,
    ),
    index("operating_model_changes_dependency_created_idx").on(
      table.organizationId,
      table.processDependencyStableKey,
      table.createdAt,
    ),
    index("operating_model_changes_family_created_idx").on(
      table.organizationId,
      table.processFamilyStableKey,
      table.createdAt,
    ),
    index("operating_model_changes_family_membership_created_idx").on(
      table.organizationId,
      table.processFamilyMembershipStableKey,
      table.createdAt,
    ),
    index("operating_model_changes_family_relationship_created_idx").on(
      table.organizationId,
      table.processFamilyRelationshipStableKey,
      table.createdAt,
    ),
  ],
);

export const exception = pgTable(
  "exceptions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
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
    unique("exceptions_stable_key_unique").on(table.stableKey),
    unique("exceptions_id_process_org_stable_unique").on(
      table.id,
      table.processId,
      table.organizationId,
      table.stableKey,
    ),
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
    stableKey: uuid("stable_key").defaultRandom().notNull(),
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
    unique("systems_stable_key_unique").on(table.stableKey),
    unique("systems_id_org_stable_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    check(
      "systems_name_not_blank_check",
      sql`char_length(trim(${table.name})) > 0`,
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
    check(
      "process_systems_usage_not_blank_check",
      sql`char_length(trim(${table.usage})) > 0`,
    ),
    index("process_systems_system_id_idx").on(table.systemId),
    index("process_systems_organization_id_idx").on(table.organizationId),
  ],
);

export const processDependency = pgTable(
  "process_dependencies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
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
    unique("process_dependencies_stable_key_unique").on(table.stableKey),
    unique("process_dependencies_id_org_stable_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
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
    roleId: integer("role_id"),
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
    foreignKey({
      name: "organization_structure_changes_role_org_fk",
      columns: [table.roleId, table.organizationId, table.targetStableKey],
      foreignColumns: [role.id, role.organizationId, role.stableKey],
    }).onDelete("restrict"),
    unique("organization_structure_changes_stable_key_unique").on(
      table.stableKey,
    ),
    check(
      "organization_structure_changes_target_check",
      sql`(${table.entityType} = 'organization_unit' and ${table.organizationUnitId} is not null and ${table.positionId} is null and ${table.personId} is null and ${table.roleId} is null) or (${table.entityType} = 'position' and ${table.organizationUnitId} is null and ${table.positionId} is not null and ${table.personId} is null and ${table.roleId} is null) or (${table.entityType} = 'person' and ${table.organizationUnitId} is null and ${table.positionId} is null and ${table.personId} is not null and ${table.roleId} is null) or (${table.entityType} = 'operational_role' and ${table.organizationUnitId} is null and ${table.positionId} is null and ${table.personId} is null and ${table.roleId} is not null)`,
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
    index("organization_structure_changes_role_created_idx").on(
      table.roleId,
      table.createdAt,
    ),
  ],
);

export const discoveryReferenceConfirmation = pgTable(
  "discovery_reference_confirmations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").notNull(),
    stableKey: uuid("stable_key").defaultRandom().notNull(),
    inquirySessionId: integer("inquiry_session_id").notNull(),
    inquirySessionStableKey: uuid("inquiry_session_stable_key").notNull(),
    runId: integer("run_id").notNull(),
    runStableKey: uuid("run_stable_key").notNull(),
    sourceObservationStableKey: uuid("source_observation_stable_key")
      .notNull(),
    mentionSequence: integer("mention_sequence").notNull(),
    mentionText: text("mention_text").notNull(),
    referenceKind: discoveryReferenceKind("reference_kind").notNull(),
    sourceFingerprint: varchar("source_fingerprint", { length: 64 }).notNull(),
    disposition: discoveryReferenceDisposition("disposition").notNull(),
    organizationUnitId: integer("organization_unit_id"),
    organizationUnitStableKey: uuid("organization_unit_stable_key"),
    roleId: integer("role_id"),
    roleStableKey: uuid("role_stable_key"),
    personId: integer("person_id"),
    personStableKey: uuid("person_stable_key"),
    positionId: integer("position_id"),
    positionStableKey: uuid("position_stable_key"),
    systemId: integer("system_id"),
    systemStableKey: uuid("system_stable_key"),
    processId: integer("process_id"),
    processStableKey: uuid("process_stable_key"),
    processFamilyId: integer("process_family_id"),
    processFamilyStableKey: uuid("process_family_stable_key"),
    supersedesConfirmationId: integer("supersedes_confirmation_id"),
    supersedesConfirmationStableKey: uuid(
      "supersedes_confirmation_stable_key",
    ),
    actorIdentifier: varchar("actor_identifier", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "discovery_reference_confirmations_inquiry_session_fk",
      columns: [
        table.inquirySessionId,
        table.organizationId,
        table.inquirySessionStableKey,
      ],
      foreignColumns: [
        discoveryInquirySession.id,
        discoveryInquirySession.organizationId,
        discoveryInquirySession.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_run_fk",
      columns: [table.runId, table.organizationId, table.runStableKey],
      foreignColumns: [
        discoveryAssistanceRun.id,
        discoveryAssistanceRun.organizationId,
        discoveryAssistanceRun.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_observation_fk",
      columns: [
        table.sourceObservationStableKey,
        table.inquirySessionId,
        table.organizationId,
      ],
      foreignColumns: [
        discoveryInquiryObservation.stableKey,
        discoveryInquiryObservation.sessionId,
        discoveryInquiryObservation.organizationId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_unit_fk",
      columns: [
        table.organizationUnitId,
        table.organizationId,
        table.organizationUnitStableKey,
      ],
      foreignColumns: [
        organizationUnit.id,
        organizationUnit.organizationId,
        organizationUnit.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_role_fk",
      columns: [table.roleId, table.organizationId, table.roleStableKey],
      foreignColumns: [role.id, role.organizationId, role.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_person_fk",
      columns: [table.personId, table.organizationId, table.personStableKey],
      foreignColumns: [person.id, person.organizationId, person.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_position_fk",
      columns: [
        table.positionId,
        table.organizationId,
        table.positionStableKey,
      ],
      foreignColumns: [
        position.id,
        position.organizationId,
        position.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_system_fk",
      columns: [table.systemId, table.organizationId, table.systemStableKey],
      foreignColumns: [system.id, system.organizationId, system.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_process_fk",
      columns: [table.processId, table.organizationId, table.processStableKey],
      foreignColumns: [process.id, process.organizationId, process.stableKey],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_family_fk",
      columns: [
        table.processFamilyId,
        table.organizationId,
        table.processFamilyStableKey,
      ],
      foreignColumns: [
        processFamily.id,
        processFamily.organizationId,
        processFamily.stableKey,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "discovery_reference_confirmations_supersedes_fk",
      columns: [
        table.supersedesConfirmationId,
        table.organizationId,
        table.supersedesConfirmationStableKey,
      ],
      foreignColumns: [table.id, table.organizationId, table.stableKey],
    }).onDelete("restrict"),
    unique("discovery_reference_confirmations_stable_key_unique").on(
      table.stableKey,
    ),
    unique("discovery_reference_confirmations_identity_context_unique").on(
      table.id,
      table.organizationId,
      table.stableKey,
    ),
    check(
      "discovery_reference_confirmations_mention_seq_positive_check",
      sql`${table.mentionSequence} >= 1`,
    ),
    check(
      "discovery_reference_confirmations_mention_not_blank_check",
      sql`char_length(trim(${table.mentionText})) > 0 and char_length(${table.mentionText}) <= 500`,
    ),
    check(
      "discovery_reference_confirmations_source_fingerprint_check",
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "discovery_reference_confirmations_supersedes_pair_check",
      sql`(${table.supersedesConfirmationId} is null and ${table.supersedesConfirmationStableKey} is null) or (${table.supersedesConfirmationId} is not null and ${table.supersedesConfirmationStableKey} is not null)`,
    ),
    check(
      "discovery_reference_confirmations_target_shape_check",
      sql`(
        ${table.disposition} in ('rejected', 'unresolved')
        and ${table.organizationUnitId} is null and ${table.organizationUnitStableKey} is null
        and ${table.roleId} is null and ${table.roleStableKey} is null
        and ${table.personId} is null and ${table.personStableKey} is null
        and ${table.positionId} is null and ${table.positionStableKey} is null
        and ${table.systemId} is null and ${table.systemStableKey} is null
        and ${table.processId} is null and ${table.processStableKey} is null
        and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null
      ) or (
        ${table.disposition} = 'confirmed' and (
          (${table.referenceKind} = 'organization_unit' and ${table.organizationUnitId} is not null and ${table.organizationUnitStableKey} is not null and ${table.roleId} is null and ${table.roleStableKey} is null and ${table.personId} is null and ${table.personStableKey} is null and ${table.positionId} is null and ${table.positionStableKey} is null and ${table.systemId} is null and ${table.systemStableKey} is null and ${table.processId} is null and ${table.processStableKey} is null and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null)
          or (${table.referenceKind} = 'operational_role' and ${table.organizationUnitId} is null and ${table.organizationUnitStableKey} is null and ${table.roleId} is not null and ${table.roleStableKey} is not null and ${table.personId} is null and ${table.personStableKey} is null and ${table.positionId} is null and ${table.positionStableKey} is null and ${table.systemId} is null and ${table.systemStableKey} is null and ${table.processId} is null and ${table.processStableKey} is null and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null)
          or (${table.referenceKind} = 'person_capacity' and ${table.organizationUnitId} is null and ${table.organizationUnitStableKey} is null and (${table.roleId} is null) = (${table.roleStableKey} is null) and ${table.personId} is not null and ${table.personStableKey} is not null and ${table.positionId} is not null and ${table.positionStableKey} is not null and ${table.systemId} is null and ${table.systemStableKey} is null and ${table.processId} is null and ${table.processStableKey} is null and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null)
          or (${table.referenceKind} = 'system' and ${table.organizationUnitId} is null and ${table.organizationUnitStableKey} is null and ${table.roleId} is null and ${table.roleStableKey} is null and ${table.personId} is null and ${table.personStableKey} is null and ${table.positionId} is null and ${table.positionStableKey} is null and ${table.systemId} is not null and ${table.systemStableKey} is not null and ${table.processId} is null and ${table.processStableKey} is null and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null)
          or (${table.referenceKind} = 'process' and ${table.organizationUnitId} is null and ${table.organizationUnitStableKey} is null and ${table.roleId} is null and ${table.roleStableKey} is null and ${table.personId} is null and ${table.personStableKey} is null and ${table.positionId} is null and ${table.positionStableKey} is null and ${table.systemId} is null and ${table.systemStableKey} is null and ${table.processId} is not null and ${table.processStableKey} is not null and ${table.processFamilyId} is null and ${table.processFamilyStableKey} is null)
          or (${table.referenceKind} = 'process_family' and ${table.organizationUnitId} is null and ${table.organizationUnitStableKey} is null and ${table.roleId} is null and ${table.roleStableKey} is null and ${table.personId} is null and ${table.personStableKey} is null and ${table.positionId} is null and ${table.positionStableKey} is null and ${table.systemId} is null and ${table.systemStableKey} is null and ${table.processId} is null and ${table.processStableKey} is null and ${table.processFamilyId} is not null and ${table.processFamilyStableKey} is not null)
        )
      )`,
    ),
    check(
      "discovery_reference_confirmations_actor_not_blank_check",
      sql`char_length(trim(${table.actorIdentifier})) > 0`,
    ),
    index("discovery_reference_confirmations_session_source_idx").on(
      table.organizationId,
      table.inquirySessionStableKey,
      table.sourceObservationStableKey,
      table.mentionSequence,
      table.createdAt,
    ),
    index("discovery_reference_confirmations_run_idx").on(
      table.organizationId,
      table.runStableKey,
      table.createdAt,
    ),
  ],
);
