CREATE TYPE "public"."role_coverage_type" AS ENUM('permanent', 'interim', 'acting', 'delegated', 'backup');--> statement-breakpoint
CREATE TYPE "public"."role_mandate_type" AS ENUM('primary', 'shared');--> statement-breakpoint
CREATE TABLE "role_coverages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "role_coverages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"role_mandate_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"coverage_type" "role_coverage_type" NOT NULL,
	"status" "effective_record_status" NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"reason" text,
	"introduced_by_import_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_coverages_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "role_coverages_exact_record_unique" UNIQUE("role_mandate_id","person_id","coverage_type","effective_from"),
	CONSTRAINT "role_coverages_effective_window_check" CHECK ("role_coverages"."effective_until" is null or "role_coverages"."effective_until" > "role_coverages"."effective_from"),
	CONSTRAINT "role_coverages_ended_has_effective_until_check" CHECK ("role_coverages"."status" <> 'ended' or "role_coverages"."effective_until" is not null),
	CONSTRAINT "role_coverages_non_permanent_reason_check" CHECK ("role_coverages"."coverage_type" = 'permanent' or char_length(trim(coalesce("role_coverages"."reason", ''))) > 0)
);
--> statement-breakpoint
CREATE TABLE "role_mandates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "role_mandates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"position_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"mandate_type" "role_mandate_type" NOT NULL,
	"scope" text,
	"status" "effective_record_status" NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"reason" text,
	"introduced_by_import_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_mandates_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "role_mandates_exact_record_unique" UNIQUE("position_id","role_id","mandate_type","effective_from"),
	CONSTRAINT "role_mandates_effective_window_check" CHECK ("role_mandates"."effective_until" is null or "role_mandates"."effective_until" > "role_mandates"."effective_from"),
	CONSTRAINT "role_mandates_ended_has_effective_until_check" CHECK ("role_mandates"."status" <> 'ended' or "role_mandates"."effective_until" is not null),
	CONSTRAINT "role_mandates_shared_scope_check" CHECK ("role_mandates"."mandate_type" <> 'shared' or char_length(trim(coalesce("role_mandates"."scope", ''))) > 0)
);
--> statement-breakpoint
ALTER TABLE "role_coverages" ADD CONSTRAINT "role_coverages_role_mandate_organization_fk" FOREIGN KEY ("role_mandate_id","organization_id") REFERENCES "public"."role_mandates"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_coverages" ADD CONSTRAINT "role_coverages_person_organization_fk" FOREIGN KEY ("person_id","organization_id") REFERENCES "public"."people"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_coverages" ADD CONSTRAINT "role_coverages_introduced_by_import_organization_fk" FOREIGN KEY ("introduced_by_import_id","organization_id") REFERENCES "public"."organization_structure_imports"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_mandates" ADD CONSTRAINT "role_mandates_position_organization_fk" FOREIGN KEY ("position_id","organization_id") REFERENCES "public"."positions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_mandates" ADD CONSTRAINT "role_mandates_role_organization_fk" FOREIGN KEY ("role_id","organization_id") REFERENCES "public"."roles"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_mandates" ADD CONSTRAINT "role_mandates_introduced_by_import_organization_fk" FOREIGN KEY ("introduced_by_import_id","organization_id") REFERENCES "public"."organization_structure_imports"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_coverages_role_mandate_id_idx" ON "role_coverages" USING btree ("role_mandate_id");--> statement-breakpoint
CREATE INDEX "role_coverages_person_id_idx" ON "role_coverages" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "role_coverages_organization_id_status_idx" ON "role_coverages" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "role_coverages_mandate_status_type_idx" ON "role_coverages" USING btree ("role_mandate_id","status","coverage_type");--> statement-breakpoint
CREATE INDEX "role_coverages_introduced_by_import_id_idx" ON "role_coverages" USING btree ("introduced_by_import_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_mandates_one_active_primary_per_role_idx" ON "role_mandates" USING btree ("role_id") WHERE "role_mandates"."status" = 'active' and "role_mandates"."mandate_type" = 'primary';--> statement-breakpoint
CREATE INDEX "role_mandates_position_id_idx" ON "role_mandates" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "role_mandates_role_id_idx" ON "role_mandates" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_mandates_organization_id_status_idx" ON "role_mandates" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "role_mandates_introduced_by_import_id_idx" ON "role_mandates" USING btree ("introduced_by_import_id");
