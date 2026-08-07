CREATE TYPE "public"."process_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."system_type" AS ENUM('software', 'external_service', 'manual_record', 'other');--> statement-breakpoint
CREATE TABLE "exceptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exceptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"process_id" integer NOT NULL,
	"process_step_id" integer,
	"name" varchar(255) NOT NULL,
	"condition" text NOT NULL,
	"response" text NOT NULL,
	"status" "active_inactive_status" DEFAULT 'active' NOT NULL,
	"owner_role_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exceptions_name_not_blank_check" CHECK (char_length(trim("exceptions"."name")) > 0),
	CONSTRAINT "exceptions_condition_not_blank_check" CHECK (char_length(trim("exceptions"."condition")) > 0),
	CONSTRAINT "exceptions_response_not_blank_check" CHECK (char_length(trim("exceptions"."response")) > 0)
);
--> statement-breakpoint
CREATE TABLE "process_steps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "process_steps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"process_id" integer NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"instructions" text NOT NULL,
	"responsible_role_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_steps_process_id_position_unique" UNIQUE("process_id","position"),
	CONSTRAINT "process_steps_id_process_id_organization_id_unique" UNIQUE("id","process_id","organization_id"),
	CONSTRAINT "process_steps_position_positive_check" CHECK ("process_steps"."position" >= 1)
);
--> statement-breakpoint
CREATE TABLE "systems" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "systems_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"system_type" "system_type" NOT NULL,
	"url" text,
	"owner_role_id" integer,
	"status" "active_inactive_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "systems_organization_id_name_unique" UNIQUE("organization_id","name"),
	CONSTRAINT "systems_id_organization_id_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "processes" DROP CONSTRAINT "processes_organization_id_organizations_id_fk";
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "processes"
		WHERE "organization_id" IS NULL
	) THEN
		RAISE EXCEPTION 'Cannot require processes.organization_id while existing processes have no organization';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "processes" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "owner_role_id" integer;--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "status" "process_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_process_organization_fk" FOREIGN KEY ("process_id","organization_id") REFERENCES "public"."processes"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_process_step_process_organization_fk" FOREIGN KEY ("process_step_id","process_id","organization_id") REFERENCES "public"."process_steps"("id","process_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_owner_role_organization_fk" FOREIGN KEY ("owner_role_id","organization_id") REFERENCES "public"."roles"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_process_organization_fk" FOREIGN KEY ("process_id","organization_id") REFERENCES "public"."processes"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_responsible_role_organization_fk" FOREIGN KEY ("responsible_role_id","organization_id") REFERENCES "public"."roles"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_owner_role_organization_fk" FOREIGN KEY ("owner_role_id","organization_id") REFERENCES "public"."roles"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exceptions_process_id_idx" ON "exceptions" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "exceptions_process_step_id_idx" ON "exceptions" USING btree ("process_step_id");--> statement-breakpoint
CREATE INDEX "exceptions_owner_role_id_idx" ON "exceptions" USING btree ("owner_role_id");--> statement-breakpoint
CREATE INDEX "exceptions_organization_id_status_idx" ON "exceptions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "process_steps_responsible_role_id_idx" ON "process_steps" USING btree ("responsible_role_id");--> statement-breakpoint
CREATE INDEX "systems_owner_role_id_idx" ON "systems" USING btree ("owner_role_id");--> statement-breakpoint
CREATE INDEX "systems_organization_id_status_idx" ON "systems" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_owner_role_organization_fk" FOREIGN KEY ("owner_role_id","organization_id") REFERENCES "public"."roles"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "processes_owner_role_id_idx" ON "processes" USING btree ("owner_role_id");--> statement-breakpoint
CREATE INDEX "processes_organization_id_status_idx" ON "processes" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_id_organization_id_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_owner_required_unless_draft_check" CHECK ("processes"."status" = 'draft' or "processes"."owner_role_id" is not null);
