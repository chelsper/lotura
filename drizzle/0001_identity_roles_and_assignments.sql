CREATE TYPE "public"."active_inactive_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."membership_access_level" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."role_assignment_status" AS ENUM('scheduled', 'active', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role_assignment_type" AS ENUM('permanent', 'interim', 'acting', 'backup');--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"access_level" "membership_access_level" NOT NULL,
	"status" "active_inactive_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_organization_id_user_id_unique" UNIQUE("organization_id","user_id"),
	CONSTRAINT "memberships_id_organization_id_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "active_inactive_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_organization_id_name_unique" UNIQUE("organization_id","name"),
	CONSTRAINT "roles_id_organization_id_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "role_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"membership_id" integer NOT NULL,
	"assignment_type" "role_assignment_type" NOT NULL,
	"status" "role_assignment_status" NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_assignments_effective_window_check" CHECK ("role_assignments"."effective_until" is null or "role_assignments"."effective_until" > "role_assignments"."effective_from"),
	CONSTRAINT "role_assignments_ended_has_effective_until_check" CHECK ("role_assignments"."status" <> 'ended' or "role_assignments"."effective_until" is not null)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(320) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_role_organization_fk" FOREIGN KEY ("role_id","organization_id") REFERENCES "public"."roles"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_membership_organization_fk" FOREIGN KEY ("membership_id","organization_id") REFERENCES "public"."memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_organization_id_status_idx" ON "memberships" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "roles_organization_id_status_idx" ON "roles" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "role_assignments_one_active_primary_per_role_idx" ON "role_assignments" USING btree ("role_id") WHERE "role_assignments"."status" = 'active' and "role_assignments"."assignment_type" in ('permanent', 'interim', 'acting');--> statement-breakpoint
CREATE INDEX "role_assignments_role_id_idx" ON "role_assignments" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_assignments_membership_id_idx" ON "role_assignments" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "role_assignments_organization_id_status_idx" ON "role_assignments" USING btree ("organization_id","status");