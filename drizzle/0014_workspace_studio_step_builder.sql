ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'create_step';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'update_step';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'reorder_steps';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'change_step_responsibility';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_entity_type" ADD VALUE 'process_step';--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_step_id" integer;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_step_stable_key" uuid;--> statement-breakpoint
ALTER TABLE "process_steps" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_stable_key_unique" UNIQUE("stable_key");--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_id_process_org_stable_unique" UNIQUE("id","process_id","organization_id","stable_key");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_step_org_stable_fk" FOREIGN KEY ("process_step_id","process_id","organization_id","process_step_stable_key") REFERENCES "public"."process_steps"("id","process_id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operating_model_changes_step_created_idx" ON "operating_model_changes" USING btree ("organization_id","process_step_stable_key","created_at");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_target_shape_check" CHECK (("operating_model_changes"."entity_type" = 'process' and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_step' and "operating_model_changes"."process_step_id" is not null and "operating_model_changes"."process_step_stable_key" is not null));--> statement-breakpoint
ALTER TABLE "process_steps" DROP CONSTRAINT "process_steps_process_id_position_unique";--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_process_id_position_unique" UNIQUE("process_id","position") DEFERRABLE INITIALLY IMMEDIATE;--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_process_step_stable_key_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
		RAISE EXCEPTION 'process step stable keys are immutable';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "process_steps_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "process_steps"
FOR EACH ROW
EXECUTE FUNCTION prevent_process_step_stable_key_change();
