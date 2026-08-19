CREATE TYPE "public"."process_family_relationship_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."process_family_relationship_type" AS ENUM('broader_narrower');--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'add_process_family_relationship';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'end_process_family_relationship';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_entity_type" ADD VALUE 'process_family_relationship';--> statement-breakpoint
CREATE TABLE "process_family_relationships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "process_family_relationships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"relationship_type" "process_family_relationship_type" DEFAULT 'broader_narrower' NOT NULL,
	"broader_family_id" integer NOT NULL,
	"narrower_family_id" integer NOT NULL,
	"status" "process_family_relationship_status" DEFAULT 'active' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_family_relationships_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "process_family_relationships_identity_context_unique" UNIQUE("id","organization_id","stable_key","broader_family_id","narrower_family_id"),
	CONSTRAINT "process_family_relationships_id_org_stable_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "process_family_relationships_distinct_families_check" CHECK ("process_family_relationships"."broader_family_id" <> "process_family_relationships"."narrower_family_id"),
	CONSTRAINT "process_family_relationships_effective_shape_check" CHECK (("process_family_relationships"."status" = 'active' and "process_family_relationships"."effective_until" is null) or ("process_family_relationships"."status" = 'ended' and "process_family_relationships"."effective_until" is not null and "process_family_relationships"."effective_until" >= "process_family_relationships"."effective_from"))
);
--> statement-breakpoint
ALTER TABLE "operating_model_changes" DROP CONSTRAINT "operating_model_changes_target_shape_check";--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_family_relationship_id" integer;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_family_relationship_stable_key" uuid;--> statement-breakpoint
ALTER TABLE "process_family_relationships" ADD CONSTRAINT "process_family_relationships_broader_org_fk" FOREIGN KEY ("broader_family_id","organization_id") REFERENCES "public"."process_families"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_family_relationships" ADD CONSTRAINT "process_family_relationships_narrower_org_fk" FOREIGN KEY ("narrower_family_id","organization_id") REFERENCES "public"."process_families"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "process_family_relationships_active_pair_unique" ON "process_family_relationships" USING btree ("organization_id","relationship_type","broader_family_id","narrower_family_id") WHERE "process_family_relationships"."status" = 'active';--> statement-breakpoint
CREATE INDEX "process_family_relationships_org_broader_status_idx" ON "process_family_relationships" USING btree ("organization_id","broader_family_id","status");--> statement-breakpoint
CREATE INDEX "process_family_relationships_org_narrower_status_idx" ON "process_family_relationships" USING btree ("organization_id","narrower_family_id","status");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_family_relationship_context_fk" FOREIGN KEY ("process_family_relationship_id","organization_id","process_family_relationship_stable_key") REFERENCES "public"."process_family_relationships"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operating_model_changes_family_relationship_created_idx" ON "operating_model_changes" USING btree ("organization_id","process_family_relationship_stable_key","created_at");--> statement-breakpoint
CREATE FUNCTION protect_process_family_relationship()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	broader_status active_inactive_status;
	narrower_status active_inactive_status;
BEGIN
	IF TG_OP = 'UPDATE' THEN
		IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
			 OR NEW.stable_key IS DISTINCT FROM OLD.stable_key
			 OR NEW.relationship_type IS DISTINCT FROM OLD.relationship_type
			 OR NEW.broader_family_id IS DISTINCT FROM OLD.broader_family_id
			 OR NEW.narrower_family_id IS DISTINCT FROM OLD.narrower_family_id
			 OR NEW.effective_from IS DISTINCT FROM OLD.effective_from THEN
			RAISE EXCEPTION 'process family relationship identity and effective start are immutable';
		END IF;

		IF OLD.status = 'ended' THEN
			RAISE EXCEPTION 'ended process family relationships are immutable';
		END IF;
	END IF;

	SELECT family.status
	INTO broader_status
	FROM process_families family
	WHERE family.id = NEW.broader_family_id
		AND family.organization_id = NEW.organization_id;

	SELECT family.status
	INTO narrower_status
	FROM process_families family
	WHERE family.id = NEW.narrower_family_id
		AND family.organization_id = NEW.organization_id;

	IF broader_status IS DISTINCT FROM 'active'::active_inactive_status
		 OR narrower_status IS DISTINCT FROM 'active'::active_inactive_status THEN
		RAISE EXCEPTION 'process family relationship requires two active families';
	END IF;

	IF NEW.status = 'active' AND EXISTS (
		WITH RECURSIVE descendants(family_id) AS (
			SELECT relationship.narrower_family_id
			FROM process_family_relationships relationship
			WHERE relationship.organization_id = NEW.organization_id
				AND relationship.relationship_type = NEW.relationship_type
				AND relationship.status = 'active'
				AND relationship.broader_family_id = NEW.narrower_family_id
				AND relationship.id <> COALESCE(NEW.id, -1)
			UNION
			SELECT relationship.narrower_family_id
			FROM process_family_relationships relationship
			JOIN descendants
				ON descendants.family_id = relationship.broader_family_id
			WHERE relationship.organization_id = NEW.organization_id
				AND relationship.relationship_type = NEW.relationship_type
				AND relationship.status = 'active'
				AND relationship.id <> COALESCE(NEW.id, -1)
		)
		SELECT 1
		FROM descendants
		WHERE descendants.family_id = NEW.broader_family_id
	) THEN
		RAISE EXCEPTION 'process family relationship would create a cycle';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER process_family_relationships_guard_trigger
BEFORE INSERT OR UPDATE ON process_family_relationships
FOR EACH ROW
EXECUTE FUNCTION protect_process_family_relationship();--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_process_family_identity_and_status()
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

	IF OLD.status = 'active' AND NEW.status = 'inactive' AND (
		EXISTS (
			SELECT 1
			FROM process_family_memberships membership
			WHERE membership.process_family_id = OLD.id
				AND membership.organization_id = OLD.organization_id
				AND membership.status = 'active'
		)
		OR EXISTS (
			SELECT 1
			FROM process_family_relationships relationship
			WHERE relationship.organization_id = OLD.organization_id
				AND relationship.status = 'active'
				AND (
					relationship.broader_family_id = OLD.id
					OR relationship.narrower_family_id = OLD.id
				)
		)
	) THEN
		RAISE EXCEPTION 'process family with active memberships or relationships cannot be deactivated';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
ALTER TABLE "operating_model_changes"
ADD CONSTRAINT "operating_model_changes_target_shape_check"
CHECK (
	CASE "entity_type"
		WHEN 'process' THEN
			"process_id" IS NOT NULL AND "process_stable_key" IS NOT NULL
			AND "process_step_id" IS NULL AND "process_step_stable_key" IS NULL
			AND "system_id" IS NULL AND "system_stable_key" IS NULL
			AND "exception_id" IS NULL AND "exception_stable_key" IS NULL
			AND "process_dependency_id" IS NULL AND "process_dependency_stable_key" IS NULL
			AND "process_family_id" IS NULL AND "process_family_stable_key" IS NULL
			AND "process_family_membership_id" IS NULL AND "process_family_membership_stable_key" IS NULL
			AND "process_family_relationship_id" IS NULL AND "process_family_relationship_stable_key" IS NULL
		WHEN 'process_step' THEN
			"process_id" IS NOT NULL AND "process_stable_key" IS NOT NULL
			AND "process_step_id" IS NOT NULL AND "process_step_stable_key" IS NOT NULL
			AND "system_id" IS NULL AND "system_stable_key" IS NULL
			AND "exception_id" IS NULL AND "exception_stable_key" IS NULL
			AND "process_dependency_id" IS NULL AND "process_dependency_stable_key" IS NULL
			AND "process_family_id" IS NULL AND "process_family_stable_key" IS NULL
			AND "process_family_membership_id" IS NULL AND "process_family_membership_stable_key" IS NULL
			AND "process_family_relationship_id" IS NULL AND "process_family_relationship_stable_key" IS NULL
		WHEN 'system' THEN
			"process_id" IS NULL AND "process_stable_key" IS NULL
			AND "process_step_id" IS NULL AND "process_step_stable_key" IS NULL
			AND "system_id" IS NOT NULL AND "system_stable_key" IS NOT NULL
			AND "exception_id" IS NULL AND "exception_stable_key" IS NULL
			AND "process_dependency_id" IS NULL AND "process_dependency_stable_key" IS NULL
			AND "process_family_id" IS NULL AND "process_family_stable_key" IS NULL
			AND "process_family_membership_id" IS NULL AND "process_family_membership_stable_key" IS NULL
			AND "process_family_relationship_id" IS NULL AND "process_family_relationship_stable_key" IS NULL
		WHEN 'process_system' THEN
			"process_id" IS NOT NULL AND "process_stable_key" IS NOT NULL
			AND "process_step_id" IS NULL AND "process_step_stable_key" IS NULL
			AND "system_id" IS NOT NULL AND "system_stable_key" IS NOT NULL
			AND "exception_id" IS NULL AND "exception_stable_key" IS NULL
			AND "process_dependency_id" IS NULL AND "process_dependency_stable_key" IS NULL
			AND "process_family_id" IS NULL AND "process_family_stable_key" IS NULL
			AND "process_family_membership_id" IS NULL AND "process_family_membership_stable_key" IS NULL
			AND "process_family_relationship_id" IS NULL AND "process_family_relationship_stable_key" IS NULL
		WHEN 'exception' THEN
			"process_id" IS NOT NULL AND "process_stable_key" IS NOT NULL
			AND "process_step_id" IS NULL AND "process_step_stable_key" IS NULL
			AND "system_id" IS NULL AND "system_stable_key" IS NULL
			AND "exception_id" IS NOT NULL AND "exception_stable_key" IS NOT NULL
			AND "process_dependency_id" IS NULL AND "process_dependency_stable_key" IS NULL
			AND "process_family_id" IS NULL AND "process_family_stable_key" IS NULL
			AND "process_family_membership_id" IS NULL AND "process_family_membership_stable_key" IS NULL
			AND "process_family_relationship_id" IS NULL AND "process_family_relationship_stable_key" IS NULL
		WHEN 'process_dependency' THEN
			"process_id" IS NOT NULL AND "process_stable_key" IS NOT NULL
			AND "process_step_id" IS NULL AND "process_step_stable_key" IS NULL
			AND "system_id" IS NULL AND "system_stable_key" IS NULL
			AND "exception_id" IS NULL AND "exception_stable_key" IS NULL
			AND "process_dependency_id" IS NOT NULL AND "process_dependency_stable_key" IS NOT NULL
			AND "process_family_id" IS NULL AND "process_family_stable_key" IS NULL
			AND "process_family_membership_id" IS NULL AND "process_family_membership_stable_key" IS NULL
			AND "process_family_relationship_id" IS NULL AND "process_family_relationship_stable_key" IS NULL
		WHEN 'process_family' THEN
			"process_id" IS NULL AND "process_stable_key" IS NULL
			AND "process_step_id" IS NULL AND "process_step_stable_key" IS NULL
			AND "system_id" IS NULL AND "system_stable_key" IS NULL
			AND "exception_id" IS NULL AND "exception_stable_key" IS NULL
			AND "process_dependency_id" IS NULL AND "process_dependency_stable_key" IS NULL
			AND "process_family_id" IS NOT NULL AND "process_family_stable_key" IS NOT NULL
			AND "process_family_membership_id" IS NULL AND "process_family_membership_stable_key" IS NULL
			AND "process_family_relationship_id" IS NULL AND "process_family_relationship_stable_key" IS NULL
		WHEN 'process_family_membership' THEN
			"process_id" IS NOT NULL AND "process_stable_key" IS NOT NULL
			AND "process_step_id" IS NULL AND "process_step_stable_key" IS NULL
			AND "system_id" IS NULL AND "system_stable_key" IS NULL
			AND "exception_id" IS NULL AND "exception_stable_key" IS NULL
			AND "process_dependency_id" IS NULL AND "process_dependency_stable_key" IS NULL
			AND "process_family_id" IS NOT NULL AND "process_family_stable_key" IS NOT NULL
			AND "process_family_membership_id" IS NOT NULL AND "process_family_membership_stable_key" IS NOT NULL
			AND "process_family_relationship_id" IS NULL AND "process_family_relationship_stable_key" IS NULL
		WHEN 'process_family_relationship' THEN
			"process_id" IS NULL AND "process_stable_key" IS NULL
			AND "process_step_id" IS NULL AND "process_step_stable_key" IS NULL
			AND "system_id" IS NULL AND "system_stable_key" IS NULL
			AND "exception_id" IS NULL AND "exception_stable_key" IS NULL
			AND "process_dependency_id" IS NULL AND "process_dependency_stable_key" IS NULL
			AND "process_family_id" IS NULL AND "process_family_stable_key" IS NULL
			AND "process_family_membership_id" IS NULL AND "process_family_membership_stable_key" IS NULL
			AND "process_family_relationship_id" IS NOT NULL AND "process_family_relationship_stable_key" IS NOT NULL
		ELSE FALSE
	END
);
