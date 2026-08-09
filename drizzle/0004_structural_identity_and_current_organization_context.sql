CREATE TYPE "public"."structural_lifecycle_status" AS ENUM('active', 'inactive', 'retired');--> statement-breakpoint
CREATE TABLE "organization_structure_imports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_structure_imports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"source_fingerprint" varchar(64) NOT NULL,
	"approved_basis_fingerprint" varchar(64) NOT NULL,
	"source_as_of" timestamp with time zone NOT NULL,
	"is_partial" boolean DEFAULT true NOT NULL,
	"vacancy_evidence_complete" boolean DEFAULT false NOT NULL,
	"person_count" integer NOT NULL,
	"organization_unit_count" integer NOT NULL,
	"position_count" integer NOT NULL,
	"position_assignment_count" integer NOT NULL,
	"reporting_relationship_count" integer NOT NULL,
	"role_mandate_count" integer NOT NULL,
	"role_coverage_count" integer NOT NULL,
	"approved_for_import_at" timestamp with time zone NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_for_pilot_use_at" timestamp with time zone,
	"ended_for_pilot_use_at" timestamp with time zone,
	"application_version" varchar(64) NOT NULL,
	"schema_version" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_structure_imports_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "organization_structure_imports_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "organization_structure_imports_org_approved_basis_unique" UNIQUE("organization_id","approved_basis_fingerprint"),
	CONSTRAINT "organization_structure_imports_source_fingerprint_check" CHECK ("organization_structure_imports"."source_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "organization_structure_imports_approved_basis_fingerprint_check" CHECK ("organization_structure_imports"."approved_basis_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "organization_structure_imports_counts_nonnegative_check" CHECK ("organization_structure_imports"."person_count" >= 0 and "organization_structure_imports"."organization_unit_count" >= 0 and "organization_structure_imports"."position_count" >= 0 and "organization_structure_imports"."position_assignment_count" >= 0 and "organization_structure_imports"."reporting_relationship_count" >= 0 and "organization_structure_imports"."role_mandate_count" >= 0 and "organization_structure_imports"."role_coverage_count" >= 0),
	CONSTRAINT "organization_structure_imports_timestamp_order_check" CHECK ("organization_structure_imports"."imported_at" >= "organization_structure_imports"."approved_for_import_at" and ("organization_structure_imports"."current_for_pilot_use_at" is null or "organization_structure_imports"."current_for_pilot_use_at" >= "organization_structure_imports"."imported_at") and ("organization_structure_imports"."ended_for_pilot_use_at" is null or ("organization_structure_imports"."current_for_pilot_use_at" is not null and "organization_structure_imports"."ended_for_pilot_use_at" > "organization_structure_imports"."current_for_pilot_use_at")))
);
--> statement-breakpoint
CREATE TABLE "organization_units" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_organization_unit_id" integer,
	"is_provisional" boolean DEFAULT true NOT NULL,
	"authoritative_id_authority" varchar(255),
	"authoritative_id" varchar(255),
	"status" "structural_lifecycle_status" DEFAULT 'active' NOT NULL,
	"status_reason" text,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"introduced_by_import_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_units_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "organization_units_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "organization_units_name_not_blank_check" CHECK (char_length(trim("organization_units"."name")) > 0),
	CONSTRAINT "organization_units_distinct_parent_check" CHECK ("organization_units"."parent_organization_unit_id" is null or "organization_units"."parent_organization_unit_id" <> "organization_units"."id"),
	CONSTRAINT "organization_units_authoritative_id_pair_check" CHECK (("organization_units"."authoritative_id_authority" is null and "organization_units"."authoritative_id" is null) or ("organization_units"."authoritative_id_authority" is not null and "organization_units"."authoritative_id" is not null)),
	CONSTRAINT "organization_units_effective_window_check" CHECK ("organization_units"."effective_until" is null or "organization_units"."effective_until" > "organization_units"."effective_from"),
	CONSTRAINT "organization_units_retired_has_effective_until_check" CHECK ("organization_units"."status" <> 'retired' or "organization_units"."effective_until" is not null),
	CONSTRAINT "organization_units_status_reason_check" CHECK ("organization_units"."status" = 'active' or char_length(trim(coalesce("organization_units"."status_reason", ''))) > 0)
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "people_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"membership_id" integer,
	"authoritative_id_authority" varchar(255),
	"authoritative_id" varchar(255),
	"status" "active_inactive_status" DEFAULT 'active' NOT NULL,
	"introduced_by_import_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "people_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "people_display_name_not_blank_check" CHECK (char_length(trim("people"."display_name")) > 0),
	CONSTRAINT "people_authoritative_id_pair_check" CHECK (("people"."authoritative_id_authority" is null and "people"."authoritative_id" is null) or ("people"."authoritative_id_authority" is not null and "people"."authoritative_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "positions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"organization_unit_id" integer,
	"title" varchar(255) NOT NULL,
	"authoritative_id_authority" varchar(255),
	"authoritative_id" varchar(255),
	"status" "structural_lifecycle_status" DEFAULT 'active' NOT NULL,
	"status_reason" text,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"introduced_by_import_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "positions_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "positions_title_not_blank_check" CHECK (char_length(trim("positions"."title")) > 0),
	CONSTRAINT "positions_authoritative_id_pair_check" CHECK (("positions"."authoritative_id_authority" is null and "positions"."authoritative_id" is null) or ("positions"."authoritative_id_authority" is not null and "positions"."authoritative_id" is not null)),
	CONSTRAINT "positions_effective_window_check" CHECK ("positions"."effective_until" is null or "positions"."effective_until" > "positions"."effective_from"),
	CONSTRAINT "positions_retired_has_effective_until_check" CHECK ("positions"."status" <> 'retired' or "positions"."effective_until" is not null),
	CONSTRAINT "positions_status_reason_check" CHECK ("positions"."status" = 'active' or char_length(trim(coalesce("positions"."status_reason", ''))) > 0)
);
--> statement-breakpoint
ALTER TABLE "organization_structure_imports" ADD CONSTRAINT "organization_structure_imports_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_parent_organization_fk" FOREIGN KEY ("parent_organization_unit_id","organization_id") REFERENCES "public"."organization_units"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_introduced_by_import_organization_fk" FOREIGN KEY ("introduced_by_import_id","organization_id") REFERENCES "public"."organization_structure_imports"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_membership_organization_fk" FOREIGN KEY ("membership_id","organization_id") REFERENCES "public"."memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_introduced_by_import_organization_fk" FOREIGN KEY ("introduced_by_import_id","organization_id") REFERENCES "public"."organization_structure_imports"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_organization_unit_organization_fk" FOREIGN KEY ("organization_unit_id","organization_id") REFERENCES "public"."organization_units"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_introduced_by_import_organization_fk" FOREIGN KEY ("introduced_by_import_id","organization_id") REFERENCES "public"."organization_structure_imports"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_structure_imports_one_current_per_org_idx" ON "organization_structure_imports" USING btree ("organization_id") WHERE "organization_structure_imports"."current_for_pilot_use_at" is not null and "organization_structure_imports"."ended_for_pilot_use_at" is null;--> statement-breakpoint
CREATE INDEX "organization_structure_imports_organization_imported_at_idx" ON "organization_structure_imports" USING btree ("organization_id","imported_at");--> statement-breakpoint
CREATE INDEX "organization_structure_imports_organization_source_as_of_idx" ON "organization_structure_imports" USING btree ("organization_id","source_as_of");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_units_organization_authoritative_id_unique_idx" ON "organization_units" USING btree ("organization_id","authoritative_id_authority","authoritative_id") WHERE "organization_units"."authoritative_id_authority" is not null and "organization_units"."authoritative_id" is not null;--> statement-breakpoint
CREATE INDEX "organization_units_organization_id_status_idx" ON "organization_units" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "organization_units_organization_id_name_idx" ON "organization_units" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "organization_units_parent_organization_unit_id_idx" ON "organization_units" USING btree ("parent_organization_unit_id");--> statement-breakpoint
CREATE INDEX "organization_units_introduced_by_import_id_idx" ON "organization_units" USING btree ("introduced_by_import_id");--> statement-breakpoint
CREATE UNIQUE INDEX "people_organization_authoritative_id_unique_idx" ON "people" USING btree ("organization_id","authoritative_id_authority","authoritative_id") WHERE "people"."authoritative_id_authority" is not null and "people"."authoritative_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "people_membership_id_unique_idx" ON "people" USING btree ("membership_id") WHERE "people"."membership_id" is not null;--> statement-breakpoint
CREATE INDEX "people_organization_id_status_idx" ON "people" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "people_organization_id_display_name_idx" ON "people" USING btree ("organization_id","display_name");--> statement-breakpoint
CREATE INDEX "people_membership_id_idx" ON "people" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "people_introduced_by_import_id_idx" ON "people" USING btree ("introduced_by_import_id");--> statement-breakpoint
CREATE UNIQUE INDEX "positions_organization_authoritative_id_unique_idx" ON "positions" USING btree ("organization_id","authoritative_id_authority","authoritative_id") WHERE "positions"."authoritative_id_authority" is not null and "positions"."authoritative_id" is not null;--> statement-breakpoint
CREATE INDEX "positions_organization_id_status_idx" ON "positions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "positions_organization_id_title_idx" ON "positions" USING btree ("organization_id","title");--> statement-breakpoint
CREATE INDEX "positions_organization_unit_id_idx" ON "positions" USING btree ("organization_unit_id");--> statement-breakpoint
CREATE INDEX "positions_introduced_by_import_id_idx" ON "positions" USING btree ("introduced_by_import_id");--> statement-breakpoint
CREATE FUNCTION "public"."lotura_prevent_stable_key_update"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
		RAISE EXCEPTION 'stable_key is immutable on %', TG_TABLE_NAME
			USING ERRCODE = '23514', CONSTRAINT = 'lotura_stable_key_immutable';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "organization_structure_imports_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "organization_structure_imports"
FOR EACH ROW
EXECUTE FUNCTION "public"."lotura_prevent_stable_key_update"();--> statement-breakpoint
CREATE TRIGGER "people_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "people"
FOR EACH ROW
EXECUTE FUNCTION "public"."lotura_prevent_stable_key_update"();--> statement-breakpoint
CREATE TRIGGER "organization_units_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "organization_units"
FOR EACH ROW
EXECUTE FUNCTION "public"."lotura_prevent_stable_key_update"();--> statement-breakpoint
CREATE TRIGGER "positions_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "positions"
FOR EACH ROW
EXECUTE FUNCTION "public"."lotura_prevent_stable_key_update"();--> statement-breakpoint
CREATE FUNCTION "public"."lotura_check_organization_unit_parent_cycle"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
	checked_organization_id integer;
	checked_unit_id integer;
	checked_parent_id integer;
	cycle_found boolean;
BEGIN
	SELECT organization_id, id, parent_organization_unit_id
	INTO checked_organization_id, checked_unit_id, checked_parent_id
	FROM public.organization_units
	WHERE id = NEW.id;

	IF NOT FOUND OR checked_parent_id IS NULL THEN
		RETURN NULL;
	END IF;

	WITH RECURSIVE ancestors AS (
		SELECT
			unit.id,
			unit.parent_organization_unit_id,
			ARRAY[unit.id]::integer[] AS visited_unit_ids
		FROM public.organization_units AS unit
		WHERE unit.organization_id = checked_organization_id
			AND unit.id = checked_parent_id

		UNION ALL

		SELECT
			parent.id,
			parent.parent_organization_unit_id,
			ancestors.visited_unit_ids || parent.id
		FROM ancestors
		JOIN public.organization_units AS parent
			ON parent.organization_id = checked_organization_id
			AND parent.id = ancestors.parent_organization_unit_id
		WHERE NOT parent.id = ANY(ancestors.visited_unit_ids)
	)
	SELECT EXISTS (
		SELECT 1
		FROM ancestors
		WHERE id = checked_unit_id
	)
	INTO cycle_found;

	IF cycle_found THEN
		RAISE EXCEPTION 'organization unit parent relationship creates a cycle'
			USING ERRCODE = '23514', CONSTRAINT = 'organization_units_parent_cycle_check';
	END IF;

	RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "organization_units_parent_cycle_constraint_trigger"
AFTER INSERT OR UPDATE ON "organization_units"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."lotura_check_organization_unit_parent_cycle"();
