CREATE TYPE "public"."process_version_kind" AS ENUM('baseline', 'approved_application');--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_action" ADD VALUE 'create_dependency';--> statement-breakpoint
ALTER TYPE "public"."operating_model_change_entity_type" ADD VALUE 'process_dependency';--> statement-breakpoint
CREATE TABLE "operating_model_proposal_applications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operating_model_proposal_applications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"process_id" integer NOT NULL,
	"process_stable_key" uuid NOT NULL,
	"review_id" integer NOT NULL,
	"review_stable_key" uuid NOT NULL,
	"mapping_id" integer NOT NULL,
	"mapping_stable_key" uuid NOT NULL,
	"mapping_revision" integer NOT NULL,
	"documented_process_fingerprint" varchar(64) NOT NULL,
	"before_version_id" integer NOT NULL,
	"before_version_stable_key" uuid NOT NULL,
	"after_version_id" integer NOT NULL,
	"after_version_stable_key" uuid NOT NULL,
	"reason" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_applications_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "proposal_applications_review_unique" UNIQUE("review_id"),
	CONSTRAINT "proposal_applications_identity_review_unique" UNIQUE("id","organization_id","stable_key","review_id","review_stable_key","mapping_id","mapping_stable_key"),
	CONSTRAINT "proposal_applications_mapping_revision_check" CHECK ("operating_model_proposal_applications"."mapping_revision" >= 1),
	CONSTRAINT "proposal_applications_fingerprint_check" CHECK ("operating_model_proposal_applications"."documented_process_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "proposal_applications_reason_actor_check" CHECK (char_length(trim("operating_model_proposal_applications"."reason")) > 0 and char_length(trim("operating_model_proposal_applications"."actor_identifier")) > 0),
	CONSTRAINT "proposal_applications_effective_at_check" CHECK ("operating_model_proposal_applications"."effective_at" <= "operating_model_proposal_applications"."created_at")
);
--> statement-breakpoint
CREATE TABLE "operating_model_proposal_application_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operating_model_proposal_application_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"application_id" integer NOT NULL,
	"application_stable_key" uuid NOT NULL,
	"review_id" integer NOT NULL,
	"review_stable_key" uuid NOT NULL,
	"mapping_id" integer NOT NULL,
	"mapping_stable_key" uuid NOT NULL,
	"review_decision_id" integer NOT NULL,
	"review_decision_stable_key" uuid NOT NULL,
	"item_revision_id" integer NOT NULL,
	"item_revision_stable_key" uuid NOT NULL,
	"item_stable_key" uuid NOT NULL,
	"application_sequence" integer NOT NULL,
	"action" "discovery_mapping_action" NOT NULL,
	"change_kind" "operating_model_change_kind" NOT NULL,
	"before_state" jsonb NOT NULL,
	"after_state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_application_items_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "proposal_application_items_item_unique" UNIQUE("application_id","item_stable_key"),
	CONSTRAINT "proposal_application_items_sequence_unique" UNIQUE("application_id","application_sequence"),
	CONSTRAINT "proposal_application_items_sequence_check" CHECK ("operating_model_proposal_application_items"."application_sequence" >= 1),
	CONSTRAINT "proposal_application_items_action_check" CHECK ("operating_model_proposal_application_items"."action" <> 'preserve_unresolved'),
	CONSTRAINT "proposal_application_items_state_check" CHECK (jsonb_typeof("operating_model_proposal_application_items"."before_state") = 'object' and jsonb_typeof("operating_model_proposal_application_items"."after_state") = 'object')
);
--> statement-breakpoint
CREATE TABLE "process_versions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "process_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"process_id" integer NOT NULL,
	"process_stable_key" uuid NOT NULL,
	"version_sequence" integer NOT NULL,
	"predecessor_version_id" integer,
	"predecessor_version_stable_key" uuid,
	"version_kind" "process_version_kind" NOT NULL,
	"snapshot_format_version" integer DEFAULT 1 NOT NULL,
	"documented_process_snapshot" jsonb NOT NULL,
	"documented_process_fingerprint" varchar(64) NOT NULL,
	"effective_at" timestamp with time zone,
	"recorded_by_actor" varchar(128) NOT NULL,
	"source_review_id" integer,
	"source_review_stable_key" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_versions_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "process_versions_process_sequence_unique" UNIQUE("process_id","version_sequence"),
	CONSTRAINT "process_versions_identity_process_unique" UNIQUE("id","organization_id","stable_key","process_id","process_stable_key"),
	CONSTRAINT "process_versions_sequence_positive_check" CHECK ("process_versions"."version_sequence" >= 1),
	CONSTRAINT "process_versions_predecessor_pair_check" CHECK ((("process_versions"."predecessor_version_id" is null) = ("process_versions"."predecessor_version_stable_key" is null))),
	CONSTRAINT "process_versions_source_review_pair_check" CHECK ((("process_versions"."source_review_id" is null) = ("process_versions"."source_review_stable_key" is null))),
	CONSTRAINT "process_versions_kind_shape_check" CHECK (("process_versions"."version_kind" = 'baseline' and "process_versions"."version_sequence" = 1 and "process_versions"."predecessor_version_id" is null and "process_versions"."effective_at" is null and "process_versions"."source_review_id" is null) or ("process_versions"."version_kind" = 'approved_application' and "process_versions"."version_sequence" > 1 and "process_versions"."predecessor_version_id" is not null and "process_versions"."effective_at" is not null and "process_versions"."source_review_id" is not null)),
	CONSTRAINT "process_versions_snapshot_check" CHECK ("process_versions"."snapshot_format_version" = 1 and jsonb_typeof("process_versions"."documented_process_snapshot") = 'object'),
	CONSTRAINT "process_versions_fingerprint_check" CHECK ("process_versions"."documented_process_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "process_versions_effective_at_check" CHECK ("process_versions"."effective_at" is null or "process_versions"."effective_at" <= "process_versions"."created_at"),
	CONSTRAINT "process_versions_actor_not_blank_check" CHECK (char_length(trim("process_versions"."recorded_by_actor")) > 0)
);
--> statement-breakpoint
ALTER TABLE "operating_model_changes" DROP CONSTRAINT "operating_model_changes_target_shape_check";--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_dependency_id" integer;--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD COLUMN "process_dependency_stable_key" uuid;--> statement-breakpoint
ALTER TABLE "process_dependencies" ADD COLUMN "stable_key" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_reviews" ADD CONSTRAINT "proposal_reviews_identity_process_unique" UNIQUE("id","organization_id","stable_key","process_id","process_stable_key");--> statement-breakpoint
ALTER TABLE "operating_model_proposal_review_decisions" ADD CONSTRAINT "proposal_review_decisions_application_identity_unique" UNIQUE("id","organization_id","stable_key","review_id","item_revision_id");--> statement-breakpoint
ALTER TABLE "process_dependencies" ADD CONSTRAINT "process_dependencies_stable_key_unique" UNIQUE("stable_key");--> statement-breakpoint
ALTER TABLE "process_dependencies" ADD CONSTRAINT "process_dependencies_id_org_stable_unique" UNIQUE("id","organization_id","stable_key");--> statement-breakpoint
ALTER TABLE "operating_model_proposal_applications" ADD CONSTRAINT "proposal_applications_mapping_process_fk" FOREIGN KEY ("mapping_id","organization_id","mapping_stable_key","process_id","process_stable_key") REFERENCES "public"."discovery_proposal_mappings"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_applications" ADD CONSTRAINT "proposal_applications_review_fk" FOREIGN KEY ("review_id","organization_id","review_stable_key","mapping_id","mapping_stable_key") REFERENCES "public"."operating_model_proposal_reviews"("id","organization_id","stable_key","mapping_id","mapping_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_applications" ADD CONSTRAINT "proposal_applications_before_version_fk" FOREIGN KEY ("before_version_id","organization_id","before_version_stable_key","process_id","process_stable_key") REFERENCES "public"."process_versions"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_applications" ADD CONSTRAINT "proposal_applications_after_version_fk" FOREIGN KEY ("after_version_id","organization_id","after_version_stable_key","process_id","process_stable_key") REFERENCES "public"."process_versions"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_application_items" ADD CONSTRAINT "proposal_application_items_application_fk" FOREIGN KEY ("application_id","organization_id","application_stable_key","review_id","review_stable_key","mapping_id","mapping_stable_key") REFERENCES "public"."operating_model_proposal_applications"("id","organization_id","stable_key","review_id","review_stable_key","mapping_id","mapping_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_application_items" ADD CONSTRAINT "proposal_application_items_decision_fk" FOREIGN KEY ("review_decision_id","organization_id","review_decision_stable_key","review_id","item_revision_id") REFERENCES "public"."operating_model_proposal_review_decisions"("id","organization_id","stable_key","review_id","item_revision_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_application_items" ADD CONSTRAINT "proposal_application_items_item_revision_fk" FOREIGN KEY ("item_revision_id","organization_id","item_revision_stable_key","mapping_id","mapping_stable_key") REFERENCES "public"."discovery_mapping_items"("id","organization_id","stable_key","mapping_id","mapping_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_process_fk" FOREIGN KEY ("process_id","organization_id","process_stable_key") REFERENCES "public"."processes"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_predecessor_fk" FOREIGN KEY ("predecessor_version_id","organization_id","predecessor_version_stable_key","process_id","process_stable_key") REFERENCES "public"."process_versions"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_source_review_fk" FOREIGN KEY ("source_review_id","organization_id","source_review_stable_key","process_id","process_stable_key") REFERENCES "public"."operating_model_proposal_reviews"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_applications_org_process_created_idx" ON "operating_model_proposal_applications" USING btree ("organization_id","process_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "proposal_application_items_org_application_idx" ON "operating_model_proposal_application_items" USING btree ("organization_id","application_stable_key","application_sequence");--> statement-breakpoint
CREATE INDEX "process_versions_org_process_created_idx" ON "process_versions" USING btree ("organization_id","process_stable_key","created_at");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_dependency_org_stable_fk" FOREIGN KEY ("process_dependency_id","organization_id","process_dependency_stable_key") REFERENCES "public"."process_dependencies"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operating_model_changes_dependency_created_idx" ON "operating_model_changes" USING btree ("organization_id","process_dependency_stable_key","created_at");--> statement-breakpoint
ALTER TABLE "operating_model_changes" ADD CONSTRAINT "operating_model_changes_target_shape_check" CHECK (("operating_model_changes"."entity_type" = 'process' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_step' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is not null and "operating_model_changes"."process_step_stable_key" is not null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'system' and "operating_model_changes"."process_id" is null and "operating_model_changes"."process_stable_key" is null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is not null and "operating_model_changes"."system_stable_key" is not null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_system' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is not null and "operating_model_changes"."system_stable_key" is not null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'exception' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is not null and "operating_model_changes"."exception_stable_key" is not null and "operating_model_changes"."process_dependency_id" is null and "operating_model_changes"."process_dependency_stable_key" is null) or ("operating_model_changes"."entity_type" = 'process_dependency' and "operating_model_changes"."process_id" is not null and "operating_model_changes"."process_stable_key" is not null and "operating_model_changes"."process_step_id" is null and "operating_model_changes"."process_step_stable_key" is null and "operating_model_changes"."system_id" is null and "operating_model_changes"."system_stable_key" is null and "operating_model_changes"."exception_id" is null and "operating_model_changes"."exception_stable_key" is null and "operating_model_changes"."process_dependency_id" is not null and "operating_model_changes"."process_dependency_stable_key" is not null));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_process_dependency_stable_key_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
		RAISE EXCEPTION 'process dependency stable keys are immutable';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "process_dependencies_stable_key_immutable_trigger"
BEFORE UPDATE OF "stable_key" ON "process_dependencies"
FOR EACH ROW
EXECUTE FUNCTION prevent_process_dependency_stable_key_change();--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_process_version_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	previous_version process_versions%ROWTYPE;
	valid_review_count integer;
BEGIN
	SELECT * INTO previous_version
	FROM process_versions
	WHERE organization_id = NEW.organization_id
		AND process_id = NEW.process_id
		AND process_stable_key = NEW.process_stable_key
	ORDER BY version_sequence DESC
	LIMIT 1;

	IF NEW.version_kind = 'baseline' THEN
		IF FOUND THEN
			RAISE EXCEPTION 'a Process baseline version already exists';
		END IF;
		RETURN NEW;
	END IF;

	IF NOT FOUND
		OR NEW.version_sequence <> previous_version.version_sequence + 1
		OR NEW.predecessor_version_id IS DISTINCT FROM previous_version.id
		OR NEW.predecessor_version_stable_key IS DISTINCT FROM previous_version.stable_key THEN
		RAISE EXCEPTION 'Process versions must append to the exact current predecessor';
	END IF;
	IF previous_version.effective_at IS NOT NULL
		AND NEW.effective_at < previous_version.effective_at THEN
		RAISE EXCEPTION 'Process version effective time cannot move backward';
	END IF;

	SELECT count(*)::integer INTO valid_review_count
	FROM operating_model_proposal_reviews review
	WHERE review.id = NEW.source_review_id
		AND review.organization_id = NEW.organization_id
		AND review.stable_key = NEW.source_review_stable_key
		AND review.process_id = NEW.process_id
		AND review.process_stable_key = NEW.process_stable_key
		AND review.status <> 'in_review';
	IF valid_review_count <> 1 THEN
		RAISE EXCEPTION 'approved Process versions require one exact finished review';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "process_versions_insert_guard_trigger"
BEFORE INSERT ON "process_versions"
FOR EACH ROW
EXECUTE FUNCTION validate_process_version_insert();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_process_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Process versions are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "process_versions_immutable_trigger"
BEFORE UPDATE OR DELETE ON "process_versions"
FOR EACH ROW
EXECUTE FUNCTION prevent_process_version_mutation();--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_proposal_application_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	valid_context_count integer;
BEGIN
	SELECT count(*)::integer INTO valid_context_count
	FROM operating_model_proposal_reviews review
	JOIN discovery_proposal_mappings mapping
		ON mapping.id = review.mapping_id
		AND mapping.organization_id = review.organization_id
		AND mapping.stable_key = review.mapping_stable_key
	JOIN process_versions before_version
		ON before_version.id = NEW.before_version_id
		AND before_version.organization_id = NEW.organization_id
		AND before_version.stable_key = NEW.before_version_stable_key
		AND before_version.process_id = NEW.process_id
		AND before_version.process_stable_key = NEW.process_stable_key
	JOIN process_versions after_version
		ON after_version.id = NEW.after_version_id
		AND after_version.organization_id = NEW.organization_id
		AND after_version.stable_key = NEW.after_version_stable_key
		AND after_version.process_id = NEW.process_id
		AND after_version.process_stable_key = NEW.process_stable_key
	WHERE review.id = NEW.review_id
		AND review.organization_id = NEW.organization_id
		AND review.stable_key = NEW.review_stable_key
		AND review.mapping_id = NEW.mapping_id
		AND review.mapping_stable_key = NEW.mapping_stable_key
		AND review.process_id = NEW.process_id
		AND review.process_stable_key = NEW.process_stable_key
		AND review.status <> 'in_review'
		AND review.mapping_revision = NEW.mapping_revision
		AND review.documented_process_fingerprint = NEW.documented_process_fingerprint
		AND mapping.revision = NEW.mapping_revision
		AND before_version.version_sequence + 1 = after_version.version_sequence
		AND after_version.predecessor_version_id = before_version.id
		AND after_version.predecessor_version_stable_key = before_version.stable_key
		AND after_version.version_kind = 'approved_application'
		AND after_version.source_review_id = review.id
		AND after_version.source_review_stable_key = review.stable_key
		AND after_version.effective_at = NEW.effective_at;
	IF valid_context_count <> 1 THEN
		RAISE EXCEPTION 'proposal application requires one exact finished review and successor version';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_applications_insert_guard_trigger"
BEFORE INSERT ON "operating_model_proposal_applications"
FOR EACH ROW
EXECUTE FUNCTION validate_proposal_application_insert();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_proposal_application_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'proposal applications are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_applications_immutable_trigger"
BEFORE UPDATE OR DELETE ON "operating_model_proposal_applications"
FOR EACH ROW
EXECUTE FUNCTION prevent_proposal_application_mutation();--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_proposal_application_item_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	valid_item_count integer;
BEGIN
	SELECT count(*)::integer INTO valid_item_count
	FROM operating_model_proposal_applications application
	JOIN operating_model_proposal_reviews review
		ON review.id = application.review_id
		AND review.organization_id = application.organization_id
		AND review.stable_key = application.review_stable_key
	JOIN discovery_mapping_items item
		ON item.id = NEW.item_revision_id
		AND item.organization_id = NEW.organization_id
		AND item.stable_key = NEW.item_revision_stable_key
		AND item.mapping_id = NEW.mapping_id
		AND item.mapping_stable_key = NEW.mapping_stable_key
	JOIN operating_model_proposal_review_decisions decision
		ON decision.id = NEW.review_decision_id
		AND decision.organization_id = NEW.organization_id
		AND decision.stable_key = NEW.review_decision_stable_key
		AND decision.review_id = NEW.review_id
		AND decision.item_revision_id = NEW.item_revision_id
	WHERE application.id = NEW.application_id
		AND application.organization_id = NEW.organization_id
		AND application.stable_key = NEW.application_stable_key
		AND application.review_id = NEW.review_id
		AND application.review_stable_key = NEW.review_stable_key
		AND application.mapping_id = NEW.mapping_id
		AND application.mapping_stable_key = NEW.mapping_stable_key
		AND review.status <> 'in_review'
		AND item.item_stable_key = NEW.item_stable_key
		AND item.state = 'active'
		AND item.action = NEW.action
		AND item.action <> 'preserve_unresolved'
		AND decision.item_stable_key = item.item_stable_key
		AND decision.item_sequence = item.item_sequence
		AND decision.disposition = 'approve'
		AND NOT EXISTS (
			SELECT 1 FROM discovery_mapping_items later
			WHERE later.mapping_id = item.mapping_id
				AND later.item_stable_key = item.item_stable_key
				AND later.item_sequence > item.item_sequence
		)
		AND NOT EXISTS (
			SELECT 1 FROM operating_model_proposal_review_decisions later
			WHERE later.review_id = decision.review_id
				AND later.item_stable_key = decision.item_stable_key
				AND later.decision_sequence > decision.decision_sequence
		);
	IF valid_item_count <> 1 THEN
		RAISE EXCEPTION 'application item requires one exact current approved decision';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_application_items_insert_guard_trigger"
BEFORE INSERT ON "operating_model_proposal_application_items"
FOR EACH ROW
EXECUTE FUNCTION validate_proposal_application_item_insert();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_proposal_application_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'proposal application items are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_application_items_immutable_trigger"
BEFORE UPDATE OR DELETE ON "operating_model_proposal_application_items"
FOR EACH ROW
EXECUTE FUNCTION prevent_proposal_application_item_mutation();--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_proposal_application_completeness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	approved_count integer;
	applied_count integer;
	invalid_count integer;
BEGIN
	WITH current_items AS (
		SELECT DISTINCT ON (item.item_stable_key)
			item.id, item.stable_key, item.item_stable_key, item.item_sequence,
			item.state, item.action
		FROM discovery_mapping_items item
		WHERE item.mapping_id = NEW.mapping_id
			AND item.organization_id = NEW.organization_id
		ORDER BY item.item_stable_key, item.item_sequence DESC
	), current_decisions AS (
		SELECT DISTINCT ON (decision.item_stable_key)
			decision.id, decision.stable_key, decision.item_stable_key,
			decision.item_revision_id, decision.disposition
		FROM operating_model_proposal_review_decisions decision
		WHERE decision.review_id = NEW.review_id
			AND decision.organization_id = NEW.organization_id
		ORDER BY decision.item_stable_key, decision.decision_sequence DESC
	), approved AS (
		SELECT item.id, item.stable_key, item.item_stable_key,
			decision.id AS decision_id, decision.stable_key AS decision_stable_key
		FROM current_items item
		JOIN current_decisions decision USING (item_stable_key)
		WHERE item.state = 'active'
			AND item.action <> 'preserve_unresolved'
			AND decision.disposition = 'approve'
			AND decision.item_revision_id = item.id
	)
	SELECT count(*)::integer,
		(SELECT count(*)::integer
		 FROM operating_model_proposal_application_items applied
		 WHERE applied.application_id = NEW.id
			AND applied.organization_id = NEW.organization_id),
		(SELECT count(*)::integer
		 FROM operating_model_proposal_application_items applied
		 LEFT JOIN approved
			ON approved.id = applied.item_revision_id
			AND approved.stable_key = applied.item_revision_stable_key
			AND approved.item_stable_key = applied.item_stable_key
			AND approved.decision_id = applied.review_decision_id
			AND approved.decision_stable_key = applied.review_decision_stable_key
		 WHERE applied.application_id = NEW.id
			AND applied.organization_id = NEW.organization_id
			AND approved.id IS NULL)
	INTO approved_count, applied_count, invalid_count
	FROM approved;

	IF approved_count < 1 OR applied_count <> approved_count OR invalid_count <> 0 THEN
		RAISE EXCEPTION 'proposal application must include every and only current approved item';
	END IF;
	RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "proposal_applications_completeness_trigger"
AFTER INSERT ON "operating_model_proposal_applications"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_proposal_application_completeness();
