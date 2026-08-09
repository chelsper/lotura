CREATE TYPE "public"."effective_record_status" AS ENUM('scheduled', 'active', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."position_assignment_type" AS ENUM('incumbent', 'job_share', 'interim', 'acting', 'backup');--> statement-breakpoint
CREATE TYPE "public"."reporting_relationship_type" AS ENUM('primary', 'dotted_line', 'functional');--> statement-breakpoint
CREATE TABLE "position_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "position_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"position_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"assignment_type" "position_assignment_type" NOT NULL,
	"status" "effective_record_status" NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"reason" text,
	"introduced_by_import_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "position_assignments_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "position_assignments_exact_record_unique" UNIQUE("position_id","person_id","assignment_type","effective_from"),
	CONSTRAINT "position_assignments_effective_window_check" CHECK ("position_assignments"."effective_until" is null or "position_assignments"."effective_until" > "position_assignments"."effective_from"),
	CONSTRAINT "position_assignments_ended_has_effective_until_check" CHECK ("position_assignments"."status" <> 'ended' or "position_assignments"."effective_until" is not null),
	CONSTRAINT "position_assignments_non_incumbent_reason_check" CHECK ("position_assignments"."assignment_type" = 'incumbent' or char_length(trim(coalesce("position_assignments"."reason", ''))) > 0)
);
--> statement-breakpoint
CREATE TABLE "position_reporting_relationships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "position_reporting_relationships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"subordinate_position_id" integer NOT NULL,
	"manager_position_id" integer NOT NULL,
	"relationship_type" "reporting_relationship_type" NOT NULL,
	"status" "effective_record_status" NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"reason" text,
	"introduced_by_import_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "position_reporting_relationships_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "position_reporting_relationships_exact_record_unique" UNIQUE("subordinate_position_id","manager_position_id","relationship_type","effective_from"),
	CONSTRAINT "position_reporting_relationships_distinct_positions_check" CHECK ("position_reporting_relationships"."subordinate_position_id" <> "position_reporting_relationships"."manager_position_id"),
	CONSTRAINT "position_reporting_relationships_effective_window_check" CHECK ("position_reporting_relationships"."effective_until" is null or "position_reporting_relationships"."effective_until" > "position_reporting_relationships"."effective_from"),
	CONSTRAINT "position_reporting_relationships_ended_until_check" CHECK ("position_reporting_relationships"."status" <> 'ended' or "position_reporting_relationships"."effective_until" is not null)
);
--> statement-breakpoint
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_position_organization_fk" FOREIGN KEY ("position_id","organization_id") REFERENCES "public"."positions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_person_organization_fk" FOREIGN KEY ("person_id","organization_id") REFERENCES "public"."people"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_assignments" ADD CONSTRAINT "position_assignments_introduced_by_import_organization_fk" FOREIGN KEY ("introduced_by_import_id","organization_id") REFERENCES "public"."organization_structure_imports"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_reporting_relationships" ADD CONSTRAINT "position_reporting_relationships_subordinate_organization_fk" FOREIGN KEY ("subordinate_position_id","organization_id") REFERENCES "public"."positions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_reporting_relationships" ADD CONSTRAINT "position_reporting_relationships_manager_organization_fk" FOREIGN KEY ("manager_position_id","organization_id") REFERENCES "public"."positions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_reporting_relationships" ADD CONSTRAINT "position_reporting_relationships_import_organization_fk" FOREIGN KEY ("introduced_by_import_id","organization_id") REFERENCES "public"."organization_structure_imports"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "position_assignments_one_active_incumbent_per_position_idx" ON "position_assignments" USING btree ("position_id") WHERE "position_assignments"."status" = 'active' and "position_assignments"."assignment_type" = 'incumbent';--> statement-breakpoint
CREATE INDEX "position_assignments_position_id_idx" ON "position_assignments" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "position_assignments_person_id_idx" ON "position_assignments" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "position_assignments_organization_id_status_idx" ON "position_assignments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "position_assignments_position_status_type_idx" ON "position_assignments" USING btree ("position_id","status","assignment_type");--> statement-breakpoint
CREATE INDEX "position_assignments_introduced_by_import_id_idx" ON "position_assignments" USING btree ("introduced_by_import_id");--> statement-breakpoint
CREATE UNIQUE INDEX "position_reporting_one_active_primary_per_subordinate_idx" ON "position_reporting_relationships" USING btree ("subordinate_position_id") WHERE "position_reporting_relationships"."status" = 'active' and "position_reporting_relationships"."relationship_type" = 'primary';--> statement-breakpoint
CREATE INDEX "position_reporting_relationships_subordinate_position_id_idx" ON "position_reporting_relationships" USING btree ("subordinate_position_id");--> statement-breakpoint
CREATE INDEX "position_reporting_relationships_manager_position_id_idx" ON "position_reporting_relationships" USING btree ("manager_position_id");--> statement-breakpoint
CREATE INDEX "position_reporting_relationships_organization_id_status_idx" ON "position_reporting_relationships" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "position_reporting_relationships_organization_id_type_idx" ON "position_reporting_relationships" USING btree ("organization_id","relationship_type");--> statement-breakpoint
CREATE INDEX "position_reporting_relationships_introduced_by_import_id_idx" ON "position_reporting_relationships" USING btree ("introduced_by_import_id");--> statement-breakpoint
CREATE FUNCTION "public"."lotura_check_primary_position_reporting_cycle"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
	checked_organization_id integer;
	checked_subordinate_id integer;
	checked_manager_id integer;
	checked_relationship_type public.reporting_relationship_type;
	checked_status public.effective_record_status;
	checked_effective_from timestamp with time zone;
	checked_effective_until timestamp with time zone;
	cycle_found boolean;
BEGIN
	SELECT
		organization_id,
		subordinate_position_id,
		manager_position_id,
		relationship_type,
		status,
		effective_from,
		effective_until
	INTO
		checked_organization_id,
		checked_subordinate_id,
		checked_manager_id,
		checked_relationship_type,
		checked_status,
		checked_effective_from,
		checked_effective_until
	FROM public.position_reporting_relationships
	WHERE id = NEW.id;

	IF NOT FOUND
		OR checked_relationship_type <> 'primary'
		OR checked_status = 'cancelled' THEN
		RETURN NULL;
	END IF;

	WITH RECURSIVE primary_paths AS (
		SELECT
			checked_manager_id AS current_position_id,
			ARRAY[checked_subordinate_id, checked_manager_id]::integer[] AS visited_position_ids,
			tstzrange(
				checked_effective_from,
				checked_effective_until,
				'[)'
			) AS overlapping_period

		UNION ALL

		SELECT
			next_relationship.manager_position_id,
			primary_paths.visited_position_ids || next_relationship.manager_position_id,
			primary_paths.overlapping_period * tstzrange(
				next_relationship.effective_from,
				next_relationship.effective_until,
				'[)'
			)
		FROM primary_paths
		JOIN public.position_reporting_relationships AS next_relationship
			ON next_relationship.organization_id = checked_organization_id
			AND next_relationship.subordinate_position_id = primary_paths.current_position_id
			AND next_relationship.relationship_type = 'primary'
			AND next_relationship.status <> 'cancelled'
		WHERE primary_paths.overlapping_period && tstzrange(
			next_relationship.effective_from,
			next_relationship.effective_until,
			'[)'
		)
		AND (
			next_relationship.manager_position_id = checked_subordinate_id
			OR NOT next_relationship.manager_position_id = ANY(primary_paths.visited_position_ids)
		)
	)
	SELECT EXISTS (
		SELECT 1
		FROM primary_paths
		WHERE current_position_id = checked_subordinate_id
	)
	INTO cycle_found;

	IF cycle_found THEN
		RAISE EXCEPTION 'primary position reporting relationships create a cycle during an overlapping effective period'
			USING ERRCODE = '23514', CONSTRAINT = 'position_reporting_relationships_primary_cycle_check';
	END IF;

	RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "position_reporting_primary_cycle_constraint_trigger"
AFTER INSERT OR UPDATE ON "position_reporting_relationships"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."lotura_check_primary_position_reporting_cycle"();
