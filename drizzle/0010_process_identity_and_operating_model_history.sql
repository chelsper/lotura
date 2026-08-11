CREATE TYPE "public"."operating_model_change_action" AS ENUM('create_draft', 'update_definition', 'change_owner');--> statement-breakpoint
CREATE TYPE "public"."operating_model_change_entity_type" AS ENUM('process');--> statement-breakpoint
CREATE TYPE "public"."operating_model_change_kind" AS ENUM('correction', 'organizational_change');--> statement-breakpoint
CREATE TABLE "operating_model_changes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operating_model_changes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"process_id" integer NOT NULL,
	"process_stable_key" uuid NOT NULL,
	"entity_type" "operating_model_change_entity_type" NOT NULL,
	"target_reference" varchar(255) NOT NULL,
	"change_kind" "operating_model_change_kind" NOT NULL,
	"change_action" "operating_model_change_action" NOT NULL,
	"before_state" jsonb NOT NULL,
	"after_state" jsonb NOT NULL,
	"reason" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operating_model_changes_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "operating_model_changes_target_not_blank_check" CHECK (char_length(trim("operating_model_changes"."target_reference")) > 0),
	CONSTRAINT "operating_model_changes_reason_not_blank_check" CHECK (char_length(trim("operating_model_changes"."reason")) > 0),
	CONSTRAINT "operating_model_changes_actor_not_blank_check" CHECK (char_length(trim("operating_model_changes"."actor_identifier")) > 0),
	CONSTRAINT "operating_model_changes_json_objects_check" CHECK (jsonb_typeof("operating_model_changes"."before_state") = 'object' and jsonb_typeof("operating_model_changes"."after_state") = 'object'),
	CONSTRAINT "operating_model_changes_effective_at_check" CHECK ("operating_model_changes"."effective_at" <= "operating_model_changes"."created_at")
);
--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_stable_key_unique" UNIQUE("stable_key");--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_id_org_stable_key_unique" UNIQUE("id","organization_id","stable_key");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_process_org_stable_fk" FOREIGN KEY ("process_id","organization_id","process_stable_key") REFERENCES "public"."processes"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operating_model_changes_org_created_idx" ON "operating_model_changes" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "operating_model_changes_process_created_idx" ON "operating_model_changes" USING btree ("organization_id","process_stable_key","created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_process_stable_key_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
		RAISE EXCEPTION 'process stable keys are immutable';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "processes_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "processes"
FOR EACH ROW
EXECUTE FUNCTION prevent_process_stable_key_change();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_operating_model_change_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'operating model change records are immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "operating_model_changes_immutable_trigger"
BEFORE UPDATE OR DELETE ON "operating_model_changes"
FOR EACH ROW
EXECUTE FUNCTION prevent_operating_model_change_mutation();
