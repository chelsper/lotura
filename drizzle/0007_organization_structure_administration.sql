CREATE TYPE "public"."organization_structure_change_action" AS ENUM('update', 'remove_from_current_structure', 'end_assignment', 'replace_assignment', 'end_reporting_relationship', 'correct_reporting_relationship');--> statement-breakpoint
CREATE TYPE "public"."organization_structure_change_entity_type" AS ENUM('organization_unit', 'position', 'person');--> statement-breakpoint
CREATE TYPE "public"."organization_structure_change_kind" AS ENUM('correction', 'organizational_change');--> statement-breakpoint
CREATE TABLE "organization_structure_changes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_structure_changes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "organization_structure_change_entity_type" NOT NULL,
	"target_stable_key" uuid NOT NULL,
	"organization_unit_id" integer,
	"position_id" integer,
	"person_id" integer,
	"change_kind" "organization_structure_change_kind" NOT NULL,
	"change_action" "organization_structure_change_action" NOT NULL,
	"before_state" jsonb NOT NULL,
	"after_state" jsonb NOT NULL,
	"reason" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_structure_changes_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "organization_structure_changes_target_check" CHECK (("organization_structure_changes"."entity_type" = 'organization_unit' and "organization_structure_changes"."organization_unit_id" is not null and "organization_structure_changes"."position_id" is null and "organization_structure_changes"."person_id" is null) or ("organization_structure_changes"."entity_type" = 'position' and "organization_structure_changes"."organization_unit_id" is null and "organization_structure_changes"."position_id" is not null and "organization_structure_changes"."person_id" is null) or ("organization_structure_changes"."entity_type" = 'person' and "organization_structure_changes"."organization_unit_id" is null and "organization_structure_changes"."position_id" is null and "organization_structure_changes"."person_id" is not null)),
	CONSTRAINT "organization_structure_changes_reason_not_blank_check" CHECK (char_length(trim("organization_structure_changes"."reason")) > 0),
	CONSTRAINT "organization_structure_changes_actor_not_blank_check" CHECK (char_length(trim("organization_structure_changes"."actor_identifier")) > 0),
	CONSTRAINT "organization_structure_changes_json_objects_check" CHECK (jsonb_typeof("organization_structure_changes"."before_state") = 'object' and jsonb_typeof("organization_structure_changes"."after_state") = 'object'),
	CONSTRAINT "organization_structure_changes_effective_at_check" CHECK ("organization_structure_changes"."effective_at" <= "organization_structure_changes"."created_at")
);
--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_id_org_stable_key_unique" UNIQUE("id","organization_id","stable_key");--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_id_org_stable_key_unique" UNIQUE("id","organization_id","stable_key");--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_id_org_stable_key_unique" UNIQUE("id","organization_id","stable_key");--> statement-breakpoint
ALTER TABLE "organization_structure_changes" ADD CONSTRAINT "organization_structure_changes_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_structure_changes" ADD CONSTRAINT "organization_structure_changes_unit_org_fk" FOREIGN KEY ("organization_unit_id","organization_id","target_stable_key") REFERENCES "public"."organization_units"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_structure_changes" ADD CONSTRAINT "organization_structure_changes_position_org_fk" FOREIGN KEY ("position_id","organization_id","target_stable_key") REFERENCES "public"."positions"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_structure_changes" ADD CONSTRAINT "organization_structure_changes_person_org_fk" FOREIGN KEY ("person_id","organization_id","target_stable_key") REFERENCES "public"."people"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_structure_changes_org_created_idx" ON "organization_structure_changes" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "organization_structure_changes_target_created_idx" ON "organization_structure_changes" USING btree ("organization_id","entity_type","target_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "organization_structure_changes_unit_created_idx" ON "organization_structure_changes" USING btree ("organization_unit_id","created_at");--> statement-breakpoint
CREATE INDEX "organization_structure_changes_position_created_idx" ON "organization_structure_changes" USING btree ("position_id","created_at");--> statement-breakpoint
CREATE INDEX "organization_structure_changes_person_created_idx" ON "organization_structure_changes" USING btree ("person_id","created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_structure_change_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'organization structure change records are immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "organization_structure_changes_immutable_trigger"
BEFORE UPDATE OR DELETE ON "organization_structure_changes"
FOR EACH ROW
EXECUTE FUNCTION prevent_structure_change_mutation();
