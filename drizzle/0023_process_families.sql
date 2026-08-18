CREATE TYPE "public"."process_family_membership_status" AS ENUM('active', 'ended');--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'create_process_family';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'update_process_family';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'deactivate_process_family';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'add_process_family_membership';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'end_process_family_membership';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_entity_type" ADD VALUE 'process_family';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_entity_type" ADD VALUE 'process_family_membership';--> statement-breakpoint
CREATE TABLE "process_families" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "process_families_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "active_inactive_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_families_id_organization_id_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "process_families_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "process_families_id_org_stable_key_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "process_families_name_not_blank_check" CHECK (char_length(btrim("process_families"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "process_family_memberships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "process_family_memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"process_family_id" integer NOT NULL,
	"process_id" integer NOT NULL,
	"status" "process_family_membership_status" DEFAULT 'active' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_family_memberships_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "process_family_memberships_identity_context_unique" UNIQUE("id","organization_id","stable_key","process_family_id","process_id"),
	CONSTRAINT "process_family_memberships_effective_shape_check" CHECK (("process_family_memberships"."status" = 'active' and "process_family_memberships"."effective_until" is null) or ("process_family_memberships"."status" = 'ended' and "process_family_memberships"."effective_until" is not null and "process_family_memberships"."effective_until" >= "process_family_memberships"."effective_from"))
);
--> statement-breakpoint
ALTER TABLE "operating_model_changes" DROP CONSTRAINT "operating_model_changes_target_shape_check";--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_family_id" integer;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_family_stable_key" uuid;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_family_membership_id" integer;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_family_membership_stable_key" uuid;--> statement-breakpoint
ALTER TABLE "process_families" ADD CONSTRAINT "process_families_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_family_memberships" ADD CONSTRAINT "process_family_memberships_family_organization_fk" FOREIGN KEY ("process_family_id","organization_id") REFERENCES "public"."process_families"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_family_memberships" ADD CONSTRAINT "process_family_memberships_process_organization_fk" FOREIGN KEY ("process_id","organization_id") REFERENCES "public"."processes"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "process_families_organization_name_unique" ON "process_families" USING btree ("organization_id",lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "process_families_organization_status_name_idx" ON "process_families" USING btree ("organization_id","status","name");--> statement-breakpoint
CREATE UNIQUE INDEX "process_family_memberships_active_pair_unique" ON "process_family_memberships" USING btree ("process_family_id","process_id") WHERE "process_family_memberships"."status" = 'active';--> statement-breakpoint
CREATE INDEX "process_family_memberships_organization_family_status_idx" ON "process_family_memberships" USING btree ("organization_id","process_family_id","status");--> statement-breakpoint
CREATE INDEX "process_family_memberships_organization_process_status_idx" ON "process_family_memberships" USING btree ("organization_id","process_id","status");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_family_org_stable_fk" FOREIGN KEY ("process_family_id","organization_id","process_family_stable_key") REFERENCES "public"."process_families"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_family_membership_context_fk" FOREIGN KEY ("process_family_membership_id","organization_id","process_family_membership_stable_key","process_family_id","process_id") REFERENCES "public"."process_family_memberships"("id","organization_id","stable_key","process_family_id","process_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operating_model_changes_family_created_idx" ON "operating_model_changes" USING btree ("organization_id","process_family_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "operating_model_changes_family_membership_created_idx" ON "operating_model_changes" USING btree ("organization_id","process_family_membership_stable_key","created_at");--> statement-breakpoint
CREATE FUNCTION protect_process_family_identity_and_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
		 OR NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
		RAISE EXCEPTION 'process family organization and stable identity are immutable';
	END IF;

	IF OLD.status = 'inactive' AND NEW.status <> OLD.status THEN
		RAISE EXCEPTION 'inactive process families cannot be reactivated';
	END IF;

	IF OLD.status = 'active' AND NEW.status = 'inactive' AND EXISTS (
		SELECT 1
		FROM process_family_memberships membership
		WHERE membership.process_family_id = OLD.id
			AND membership.organization_id = OLD.organization_id
			AND membership.status = 'active'
	) THEN
		RAISE EXCEPTION 'process family with active memberships cannot be deactivated';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER process_families_identity_status_trigger
BEFORE UPDATE ON process_families
FOR EACH ROW
EXECUTE FUNCTION protect_process_family_identity_and_status();--> statement-breakpoint
CREATE FUNCTION protect_process_family_membership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	family_status active_inactive_status;
BEGIN
	IF TG_OP = 'UPDATE' THEN
		IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
			 OR NEW.stable_key IS DISTINCT FROM OLD.stable_key
			 OR NEW.process_family_id IS DISTINCT FROM OLD.process_family_id
			 OR NEW.process_id IS DISTINCT FROM OLD.process_id
			 OR NEW.effective_from IS DISTINCT FROM OLD.effective_from THEN
			RAISE EXCEPTION 'process family membership identity and effective start are immutable';
		END IF;

		IF OLD.status = 'ended' THEN
			RAISE EXCEPTION 'ended process family memberships are immutable';
		END IF;
	END IF;

	SELECT family.status
	INTO family_status
	FROM process_families family
	WHERE family.id = NEW.process_family_id
		AND family.organization_id = NEW.organization_id;

	IF family_status IS DISTINCT FROM 'active'::active_inactive_status THEN
		RAISE EXCEPTION 'process family membership requires an active family';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER process_family_memberships_guard_trigger
BEFORE INSERT OR UPDATE ON process_family_memberships
FOR EACH ROW
EXECUTE FUNCTION protect_process_family_membership();--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_target_shape_check" CHECK (((("operating_model_changes"."entity_type" = 'process' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_step' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is not null and "operating_model_changes"."process_step_stable_key" is not null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'system' and "operating_model_changes"."process_id" is null and "operating_model_changes"."process_stable_key" is null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is not null and "operating_model_changes"."system_stable_key" is not null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_system' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is not null and "operating_model_changes"."system_stable_key" is not null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'exception' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is not null and "operating_model_changes"."exception_stable_key" is not null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_dependency' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is not null and "operating_model_changes"."process_dependency_stable_key" is not null)) and "operating_model_changes"."process_family_id" is null and "operating_model_changes"."process_family_stable_key" is null and "operating_model_changes"."process_family_membership_id" is null and "operating_model_changes"."process_family_membership_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_family' and "operating_model_changes"."process_id" is null and "operating_model_changes"."process_stable_key" is null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null and "operating_model_changes"."process_family_id" is not null and "operating_model_changes"."process_family_stable_key" is not null and "operating_model_changes"."process_family_membership_id" is null and "operating_model_changes"."process_family_membership_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_family_membership' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null and "operating_model_changes"."process_family_id" is not null and "operating_model_changes"."process_family_stable_key" is not null and "operating_model_changes"."process_family_membership_id" is not null and "operating_model_changes"."process_family_membership_stable_key" is not null));
