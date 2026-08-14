CREATE TYPE "public"."proposal_review_disposition" AS ENUM('approve', 'reject', 'needs_validation');--> statement-breakpoint
CREATE TYPE "public"."proposal_review_status" AS ENUM('in_review', 'approved_for_application', 'approved_in_part', 'needs_validation', 'not_approved');--> statement-breakpoint
CREATE TABLE "operating_model_proposal_reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operating_model_proposal_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"mapping_id" integer NOT NULL,
	"mapping_stable_key" uuid NOT NULL,
	"mapping_revision" integer NOT NULL,
	"proposal_id" integer NOT NULL,
	"proposal_stable_key" uuid NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"process_id" integer NOT NULL,
	"process_stable_key" uuid NOT NULL,
	"documented_process_fingerprint" varchar(64) NOT NULL,
	"status" "proposal_review_status" DEFAULT 'in_review' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"started_by_actor" varchar(128) NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by_actor" varchar(128),
	"completion_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_reviews_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "proposal_reviews_mapping_unique" UNIQUE("mapping_id"),
	CONSTRAINT "proposal_reviews_identity_mapping_unique" UNIQUE("id","organization_id","stable_key","mapping_id","mapping_stable_key"),
	CONSTRAINT "proposal_reviews_mapping_revision_positive_check" CHECK ("operating_model_proposal_reviews"."mapping_revision" >= 1),
	CONSTRAINT "proposal_reviews_revision_positive_check" CHECK ("operating_model_proposal_reviews"."revision" >= 1),
	CONSTRAINT "proposal_reviews_fingerprint_check" CHECK ("operating_model_proposal_reviews"."documented_process_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "proposal_reviews_actor_not_blank_check" CHECK (char_length(trim("operating_model_proposal_reviews"."started_by_actor")) > 0 and ("operating_model_proposal_reviews"."completed_by_actor" is null or char_length(trim("operating_model_proposal_reviews"."completed_by_actor")) > 0)),
	CONSTRAINT "proposal_reviews_completion_state_check" CHECK (("operating_model_proposal_reviews"."status" = 'in_review' and "operating_model_proposal_reviews"."completed_at" is null and "operating_model_proposal_reviews"."completed_by_actor" is null and "operating_model_proposal_reviews"."completion_note" is null) or ("operating_model_proposal_reviews"."status" <> 'in_review' and "operating_model_proposal_reviews"."completed_at" is not null and "operating_model_proposal_reviews"."completed_by_actor" is not null and "operating_model_proposal_reviews"."completion_note" is not null and char_length(trim("operating_model_proposal_reviews"."completion_note")) > 0))
);
--> statement-breakpoint
CREATE TABLE "operating_model_proposal_review_decisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operating_model_proposal_review_decisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"review_id" integer NOT NULL,
	"review_stable_key" uuid NOT NULL,
	"mapping_id" integer NOT NULL,
	"mapping_stable_key" uuid NOT NULL,
	"item_revision_id" integer NOT NULL,
	"item_revision_stable_key" uuid NOT NULL,
	"item_stable_key" uuid NOT NULL,
	"item_sequence" integer NOT NULL,
	"decision_sequence" integer NOT NULL,
	"disposition" "proposal_review_disposition" NOT NULL,
	"review_note" text,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_review_decisions_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "proposal_review_decisions_item_sequence_unique" UNIQUE("review_id","item_stable_key","decision_sequence"),
	CONSTRAINT "proposal_review_decisions_item_sequence_positive_check" CHECK ("operating_model_proposal_review_decisions"."item_sequence" >= 1),
	CONSTRAINT "proposal_review_decisions_sequence_positive_check" CHECK ("operating_model_proposal_review_decisions"."decision_sequence" >= 1),
	CONSTRAINT "proposal_review_decisions_note_check" CHECK (("operating_model_proposal_review_decisions"."disposition" = 'approve' and ("operating_model_proposal_review_decisions"."review_note" is null or char_length(trim("operating_model_proposal_review_decisions"."review_note")) > 0)) or ("operating_model_proposal_review_decisions"."disposition" <> 'approve' and "operating_model_proposal_review_decisions"."review_note" is not null and char_length(trim("operating_model_proposal_review_decisions"."review_note")) > 0)),
	CONSTRAINT "proposal_review_decisions_actor_not_blank_check" CHECK (char_length(trim("operating_model_proposal_review_decisions"."actor_identifier")) > 0)
);
--> statement-breakpoint
ALTER TABLE "discovery_proposal_mappings" ADD CONSTRAINT "discovery_mappings_review_context_unique" UNIQUE("id","organization_id","stable_key","proposal_id","proposal_stable_key","session_id","session_stable_key","process_id","process_stable_key");--> statement-breakpoint
ALTER TABLE "operating_model_proposal_reviews" ADD CONSTRAINT "proposal_reviews_mapping_context_fk" FOREIGN KEY ("mapping_id","organization_id","mapping_stable_key","proposal_id","proposal_stable_key","session_id","session_stable_key","process_id","process_stable_key") REFERENCES "public"."discovery_proposal_mappings"("id","organization_id","stable_key","proposal_id","proposal_stable_key","session_id","session_stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_review_decisions" ADD CONSTRAINT "proposal_review_decisions_review_fk" FOREIGN KEY ("review_id","organization_id","review_stable_key","mapping_id","mapping_stable_key") REFERENCES "public"."operating_model_proposal_reviews"("id","organization_id","stable_key","mapping_id","mapping_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_model_proposal_review_decisions" ADD CONSTRAINT "proposal_review_decisions_item_revision_fk" FOREIGN KEY ("item_revision_id","organization_id","item_revision_stable_key","mapping_id","mapping_stable_key") REFERENCES "public"."discovery_mapping_items"("id","organization_id","stable_key","mapping_id","mapping_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_reviews_org_status_updated_idx" ON "operating_model_proposal_reviews" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "proposal_review_decisions_review_created_idx" ON "operating_model_proposal_review_decisions" USING btree ("organization_id","review_stable_key","created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_operating_model_proposal_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	valid_context_count integer;
BEGIN
	SELECT count(*)::integer INTO valid_context_count
	FROM discovery_proposal_mappings mapping
	JOIN discovery_proposals proposal
		ON proposal.id = mapping.proposal_id
		AND proposal.organization_id = mapping.organization_id
		AND proposal.stable_key = mapping.proposal_stable_key
	WHERE mapping.id = NEW.mapping_id
		AND mapping.organization_id = NEW.organization_id
		AND mapping.stable_key = NEW.mapping_stable_key
		AND mapping.proposal_id = NEW.proposal_id
		AND mapping.proposal_stable_key = NEW.proposal_stable_key
		AND mapping.session_id = NEW.session_id
		AND mapping.session_stable_key = NEW.session_stable_key
		AND mapping.process_id = NEW.process_id
		AND mapping.process_stable_key = NEW.process_stable_key
		AND mapping.status = 'ready_for_proposal_review'
		AND mapping.revision = NEW.mapping_revision
		AND proposal.status = 'ready_for_review'
		AND proposal.documented_process_fingerprint = NEW.documented_process_fingerprint
		AND EXISTS (
			SELECT 1
			FROM discovery_mapping_items item
			WHERE item.mapping_id = mapping.id
				AND item.organization_id = mapping.organization_id
				AND item.mapping_stable_key = mapping.stable_key
				AND item.state = 'active'
				AND item.action <> 'preserve_unresolved'
				AND NOT EXISTS (
					SELECT 1
					FROM discovery_mapping_items later
					WHERE later.mapping_id = item.mapping_id
						AND later.item_stable_key = item.item_stable_key
						AND later.item_sequence > item.item_sequence
				)
		);

	IF valid_context_count <> 1 THEN
		RAISE EXCEPTION 'proposal review requires one finished mapping with a structured change';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_reviews_insert_guard_trigger"
BEFORE INSERT ON "operating_model_proposal_reviews"
FOR EACH ROW
EXECUTE FUNCTION validate_operating_model_proposal_review();--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_operating_model_proposal_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	item_count integer;
	decision_count integer;
	approved_count integer;
	rejected_count integer;
	validation_count integer;
	expected_status proposal_review_status;
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'proposal reviews cannot be deleted';
	END IF;
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key
		OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
		OR NEW.mapping_id IS DISTINCT FROM OLD.mapping_id
		OR NEW.mapping_stable_key IS DISTINCT FROM OLD.mapping_stable_key
		OR NEW.mapping_revision IS DISTINCT FROM OLD.mapping_revision
		OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
		OR NEW.proposal_stable_key IS DISTINCT FROM OLD.proposal_stable_key
		OR NEW.session_id IS DISTINCT FROM OLD.session_id
		OR NEW.session_stable_key IS DISTINCT FROM OLD.session_stable_key
		OR NEW.process_id IS DISTINCT FROM OLD.process_id
		OR NEW.process_stable_key IS DISTINCT FROM OLD.process_stable_key
		OR NEW.documented_process_fingerprint IS DISTINCT FROM OLD.documented_process_fingerprint
		OR NEW.started_by_actor IS DISTINCT FROM OLD.started_by_actor
		OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
		RAISE EXCEPTION 'proposal review source context is immutable';
	END IF;
	IF NEW.revision <> OLD.revision + 1 THEN
		RAISE EXCEPTION 'proposal review revision must advance by exactly one';
	END IF;
	IF OLD.status <> 'in_review' THEN
		RAISE EXCEPTION 'finished proposal reviews cannot be changed';
	END IF;

	IF NEW.status <> 'in_review' THEN
		WITH current_items AS (
			SELECT DISTINCT ON (item.item_stable_key)
				item.item_stable_key, item.state, item.action
			FROM discovery_mapping_items item
			WHERE item.mapping_id = OLD.mapping_id
				AND item.organization_id = OLD.organization_id
			ORDER BY item.item_stable_key, item.item_sequence DESC
		), review_items AS (
			SELECT item_stable_key
			FROM current_items
			WHERE state = 'active' AND action <> 'preserve_unresolved'
		), current_decisions AS (
			SELECT DISTINCT ON (decision.item_stable_key)
				decision.item_stable_key, decision.disposition
			FROM operating_model_proposal_review_decisions decision
			WHERE decision.review_id = OLD.id
				AND decision.organization_id = OLD.organization_id
			ORDER BY decision.item_stable_key, decision.decision_sequence DESC
		)
		SELECT count(*)::integer,
			count(decision.item_stable_key)::integer,
			count(*) FILTER (WHERE decision.disposition = 'approve')::integer,
			count(*) FILTER (WHERE decision.disposition = 'reject')::integer,
			count(*) FILTER (WHERE decision.disposition = 'needs_validation')::integer
		INTO item_count, decision_count, approved_count, rejected_count,
			validation_count
		FROM review_items item
		LEFT JOIN current_decisions decision USING (item_stable_key);

		IF item_count < 1 OR decision_count <> item_count THEN
			RAISE EXCEPTION 'every structured proposal item requires a current review decision';
		END IF;

		expected_status := CASE
			WHEN validation_count > 0 THEN 'needs_validation'::proposal_review_status
			WHEN approved_count = item_count THEN 'approved_for_application'::proposal_review_status
			WHEN approved_count > 0 AND rejected_count > 0 THEN 'approved_in_part'::proposal_review_status
			ELSE 'not_approved'::proposal_review_status
		END;
		IF NEW.status IS DISTINCT FROM expected_status THEN
			RAISE EXCEPTION 'proposal review result must match its current item decisions';
		END IF;
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_reviews_context_guard_trigger"
BEFORE UPDATE OR DELETE ON "operating_model_proposal_reviews"
FOR EACH ROW
EXECUTE FUNCTION protect_operating_model_proposal_review();--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_proposal_review_decision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	valid_item_count integer;
	expected_sequence integer;
BEGIN
	SELECT count(*)::integer INTO valid_item_count
	FROM operating_model_proposal_reviews review
	JOIN discovery_mapping_items item
		ON item.id = NEW.item_revision_id
		AND item.organization_id = NEW.organization_id
		AND item.stable_key = NEW.item_revision_stable_key
		AND item.mapping_id = NEW.mapping_id
		AND item.mapping_stable_key = NEW.mapping_stable_key
	WHERE review.id = NEW.review_id
		AND review.organization_id = NEW.organization_id
		AND review.stable_key = NEW.review_stable_key
		AND review.mapping_id = NEW.mapping_id
		AND review.mapping_stable_key = NEW.mapping_stable_key
		AND review.status = 'in_review'
		AND item.item_stable_key = NEW.item_stable_key
		AND item.item_sequence = NEW.item_sequence
		AND item.state = 'active'
		AND item.action <> 'preserve_unresolved'
		AND NOT EXISTS (
			SELECT 1
			FROM discovery_mapping_items later
			WHERE later.mapping_id = item.mapping_id
				AND later.item_stable_key = item.item_stable_key
				AND later.item_sequence > item.item_sequence
		);
	IF valid_item_count <> 1 THEN
		RAISE EXCEPTION 'proposal review decision must target a current structured item in its review';
	END IF;

	SELECT coalesce(max(decision_sequence), 0) + 1
	INTO expected_sequence
	FROM operating_model_proposal_review_decisions
	WHERE review_id = NEW.review_id
		AND item_stable_key = NEW.item_stable_key;
	IF NEW.decision_sequence <> expected_sequence THEN
		RAISE EXCEPTION 'proposal review decision sequence must advance by exactly one';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_review_decisions_insert_guard_trigger"
BEFORE INSERT ON "operating_model_proposal_review_decisions"
FOR EACH ROW
EXECUTE FUNCTION validate_proposal_review_decision();--> statement-breakpoint
CREATE OR REPLACE FUNCTION advance_proposal_review_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	UPDATE operating_model_proposal_reviews
	SET revision = revision + 1,
		updated_at = transaction_timestamp()
	WHERE id = NEW.review_id
		AND organization_id = NEW.organization_id
		AND stable_key = NEW.review_stable_key
		AND status = 'in_review';
	IF NOT FOUND THEN
		RAISE EXCEPTION 'proposal review is no longer open';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_review_decisions_advance_trigger"
AFTER INSERT ON "operating_model_proposal_review_decisions"
FOR EACH ROW
EXECUTE FUNCTION advance_proposal_review_revision();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_proposal_review_decision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'proposal review decisions are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposal_review_decisions_immutable_trigger"
BEFORE UPDATE OR DELETE ON "operating_model_proposal_review_decisions"
FOR EACH ROW
EXECUTE FUNCTION prevent_proposal_review_decision_mutation();
