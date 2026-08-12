ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'create_system';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'update_system';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'deactivate_system';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'link_system';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'update_system_usage';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'unlink_system';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'create_exception';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'update_exception';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'deactivate_exception';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_entity_type" ADD VALUE 'system';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_entity_type" ADD VALUE 'process_system';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_entity_type" ADD VALUE 'exception';--> statement-breakpoint
ALTER TABLE "operating_model_changes" DROP CONSTRAINT "operating_model_changes_target_shape_check";--> statement-breakpoint
ALTER TABLE "operating_model_changes" ALTER COLUMN "process_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ALTER COLUMN "process_stable_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exceptions" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "system_id" integer;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "system_stable_key" uuid;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "exception_id" integer;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "exception_stable_key" uuid;--> statement-breakpoint
ALTER TABLE "systems" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_stable_key_unique" UNIQUE("stable_key");--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_id_process_org_stable_unique" UNIQUE("id","process_id","organization_id","stable_key");--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_stable_key_unique" UNIQUE("stable_key");--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_id_org_stable_unique" UNIQUE("id","organization_id","stable_key");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_system_org_stable_fk" FOREIGN KEY ("system_id","organization_id","system_stable_key") REFERENCES "public"."systems"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_exception_org_stable_fk" FOREIGN KEY ("exception_id","process_id","organization_id","exception_stable_key") REFERENCES "public"."exceptions"("id","process_id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operating_model_changes_system_created_idx" ON "operating_model_changes" USING btree ("organization_id","system_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "operating_model_changes_exception_created_idx" ON "operating_model_changes" USING btree ("organization_id","exception_stable_key","created_at");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_target_shape_check" CHECK (("operating_model_changes"."entity_type" = 'process' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_step' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is not null and "operating_model_changes"."process_step_stable_key" is not null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null) or ("operating_model_changes"."entity_type" = 'system' and "operating_model_changes"."process_id" is null and "operating_model_changes"."process_stable_key" is null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is not null and "operating_model_changes"."system_stable_key" is not null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_system' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is not null and "operating_model_changes"."system_stable_key" is not null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null) or ("operating_model_changes"."entity_type" = 'exception' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is not null and "operating_model_changes"."exception_stable_key" is not null));--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_name_not_blank_check" CHECK (char_length(trim("systems"."name")) > 0);--> statement-breakpoint
ALTER TABLE "process_systems" ADD CONSTRAINT "process_systems_usage_not_blank_check" CHECK (char_length(trim("process_systems"."usage")) > 0);--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_system_stable_key_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
		RAISE EXCEPTION 'system stable keys are immutable';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "systems_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "systems"
FOR EACH ROW
EXECUTE FUNCTION prevent_system_stable_key_change();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_exception_stable_key_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
		RAISE EXCEPTION 'exception stable keys are immutable';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "exceptions_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "exceptions"
FOR EACH ROW
EXECUTE FUNCTION prevent_exception_stable_key_change();
