import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const processes = pgTable(
  "processes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer("organization_id").references(
      () => organizations.id,
    ),
    name: varchar("name", { length: 255 }).notNull(),
    purpose: text("purpose"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("processes_organization_id_idx").on(table.organizationId),
  ],
);
