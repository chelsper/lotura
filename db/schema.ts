import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
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
