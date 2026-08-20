CREATE TYPE "public"."discovery_inquiry_review_outcome_kind" AS ENUM('connect_existing_process', 'possible_new_process', 'spans_multiple_processes', 'additional_validation_required', 'no_separate_process_needed');--> statement-breakpoint
CREATE TABLE "discovery_inquiry_reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_inquiry_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" integer NOT NULL,
	"inquiry_stable_key" uuid NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"review_sequence" integer NOT NULL,
	"reviewed_session_revision" integer NOT NULL,
	"supersedes_review_stable_key" uuid,
	"review_note" text,
	"actor_identifier" varchar(128) NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_inquiry_reviews_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_inquiry_reviews_context_unique" UNIQUE("stable_key","session_id","organization_id"),
	CONSTRAINT "discovery_inquiry_reviews_identity_context_unique" UNIQUE("id","organization_id","stable_key","session_id","session_stable_key"),
	CONSTRAINT "discovery_inquiry_reviews_session_sequence_unique" UNIQUE("session_id","review_sequence"),
	CONSTRAINT "discovery_inquiry_reviews_sequence_positive_check" CHECK ("discovery_inquiry_reviews"."review_sequence" >= 1),
	CONSTRAINT "discovery_inquiry_reviews_revision_positive_check" CHECK ("discovery_inquiry_reviews"."reviewed_session_revision" >= 1),
	CONSTRAINT "discovery_inquiry_reviews_supersedes_distinct_check" CHECK ("discovery_inquiry_reviews"."supersedes_review_stable_key" is null or "discovery_inquiry_reviews"."supersedes_review_stable_key" <> "discovery_inquiry_reviews"."stable_key"),
	CONSTRAINT "discovery_inquiry_reviews_note_shape_check" CHECK ("discovery_inquiry_reviews"."review_note" is null or (char_length(trim("discovery_inquiry_reviews"."review_note")) > 0 and char_length("discovery_inquiry_reviews"."review_note") <= 2000)),
	CONSTRAINT "discovery_inquiry_reviews_actor_not_blank_check" CHECK (char_length(trim("discovery_inquiry_reviews"."actor_identifier")) > 0)
);
--> statement-breakpoint
CREATE TABLE "discovery_inquiry_review_outcomes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_inquiry_review_outcomes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"review_id" integer NOT NULL,
	"review_stable_key" uuid NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"outcome_kind" "discovery_inquiry_review_outcome_kind" NOT NULL,
	"process_id" integer,
	"process_stable_key" uuid,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_inquiry_review_outcomes_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_inquiry_review_outcomes_identity_context_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "discovery_inquiry_review_outcomes_review_kind_unique" UNIQUE("review_id","outcome_kind"),
	CONSTRAINT "discovery_inquiry_review_outcomes_target_shape_check" CHECK (("discovery_inquiry_review_outcomes"."outcome_kind" = 'connect_existing_process' and "discovery_inquiry_review_outcomes"."process_id" is not null and "discovery_inquiry_review_outcomes"."process_stable_key" is not null) or ("discovery_inquiry_review_outcomes"."outcome_kind" <> 'connect_existing_process' and "discovery_inquiry_review_outcomes"."process_id" is null and "discovery_inquiry_review_outcomes"."process_stable_key" is null)),
	CONSTRAINT "discovery_inquiry_review_outcomes_explanation_shape_check" CHECK ("discovery_inquiry_review_outcomes"."explanation" is null or (char_length(trim("discovery_inquiry_review_outcomes"."explanation")) > 0 and char_length("discovery_inquiry_review_outcomes"."explanation") <= 2000)),
	CONSTRAINT "discovery_inquiry_review_outcomes_required_explanation_check" CHECK ("discovery_inquiry_review_outcomes"."outcome_kind" not in ('possible_new_process', 'spans_multiple_processes', 'additional_validation_required') or "discovery_inquiry_review_outcomes"."explanation" is not null)
);
--> statement-breakpoint
CREATE TABLE "discovery_inquiry_review_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_inquiry_review_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"review_id" integer NOT NULL,
	"review_stable_key" uuid NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"observation_stable_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_inquiry_review_sources_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_inquiry_review_sources_identity_context_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "discovery_inquiry_review_sources_review_observation_unique" UNIQUE("review_id","observation_stable_key")
);
--> statement-breakpoint
ALTER TABLE "discovery_inquiry_reviews" ADD CONSTRAINT "discovery_inquiry_reviews_session_context_fk" FOREIGN KEY ("session_id","organization_id","session_stable_key","inquiry_id","inquiry_stable_key") REFERENCES "public"."discovery_inquiry_sessions"("id","organization_id","stable_key","inquiry_id","inquiry_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_reviews" ADD CONSTRAINT "discovery_inquiry_reviews_supersedes_fk" FOREIGN KEY ("supersedes_review_stable_key","session_id","organization_id") REFERENCES "public"."discovery_inquiry_reviews"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_review_outcomes" ADD CONSTRAINT "discovery_inquiry_review_outcomes_review_context_fk" FOREIGN KEY ("review_id","organization_id","review_stable_key","session_id","session_stable_key") REFERENCES "public"."discovery_inquiry_reviews"("id","organization_id","stable_key","session_id","session_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_review_outcomes" ADD CONSTRAINT "discovery_inquiry_review_outcomes_process_context_fk" FOREIGN KEY ("process_id","organization_id","process_stable_key") REFERENCES "public"."processes"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_review_sources" ADD CONSTRAINT "discovery_inquiry_review_sources_review_context_fk" FOREIGN KEY ("review_id","organization_id","review_stable_key","session_id","session_stable_key") REFERENCES "public"."discovery_inquiry_reviews"("id","organization_id","stable_key","session_id","session_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_review_sources" ADD CONSTRAINT "discovery_inquiry_review_sources_observation_context_fk" FOREIGN KEY ("observation_stable_key","session_id","organization_id") REFERENCES "public"."discovery_inquiry_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_inquiry_reviews_org_session_sequence_idx" ON "discovery_inquiry_reviews" USING btree ("organization_id","session_stable_key","review_sequence");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_review_outcomes_org_review_idx" ON "discovery_inquiry_review_outcomes" USING btree ("organization_id","review_stable_key");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_review_outcomes_org_process_idx" ON "discovery_inquiry_review_outcomes" USING btree ("organization_id","process_stable_key");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_review_sources_org_review_idx" ON "discovery_inquiry_review_sources" USING btree ("organization_id","review_stable_key");--> statement-breakpoint
CREATE FUNCTION protect_discovery_inquiry_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	session_status discovery_session_status;
	session_revision integer;
	latest_review discovery_inquiry_reviews%ROWTYPE;
	active_observation_count integer;
BEGIN
	IF TG_OP <> 'INSERT' THEN
		RAISE EXCEPTION 'discovery inquiry reviews are append-only';
	END IF;

	SELECT session.status, session.revision
	INTO session_status, session_revision
	FROM discovery_inquiry_sessions session
	WHERE session.id = NEW.session_id
		AND session.organization_id = NEW.organization_id
		AND session.stable_key = NEW.session_stable_key
		AND session.inquiry_id = NEW.inquiry_id
		AND session.inquiry_stable_key = NEW.inquiry_stable_key;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'discovery inquiry review session context was not found';
	END IF;

	SELECT review.*
	INTO latest_review
	FROM discovery_inquiry_reviews review
	WHERE review.organization_id = NEW.organization_id
		AND review.session_id = NEW.session_id
	ORDER BY review.review_sequence DESC
	LIMIT 1;

	IF NEW.review_sequence = 1 THEN
		IF latest_review.id IS NOT NULL
			OR NEW.supersedes_review_stable_key IS NOT NULL
			OR session_status <> 'ready_for_review'::discovery_session_status
			OR session_revision <> NEW.reviewed_session_revision THEN
			RAISE EXCEPTION 'first discovery inquiry review requires the current review-ready evidence';
		END IF;
	ELSE
		IF latest_review.id IS NULL
			OR NEW.review_sequence <> latest_review.review_sequence + 1
			OR NEW.supersedes_review_stable_key IS DISTINCT FROM latest_review.stable_key
			OR NEW.reviewed_session_revision <> latest_review.reviewed_session_revision
			OR session_status <> 'closed'::discovery_session_status
			OR session_revision <> NEW.reviewed_session_revision + 1 THEN
			RAISE EXCEPTION 'superseding discovery inquiry review must follow the latest frozen review';
		END IF;
	END IF;

	SELECT count(*)::integer
	INTO active_observation_count
	FROM discovery_inquiry_observations observation
	WHERE observation.organization_id = NEW.organization_id
		AND observation.session_id = NEW.session_id
		AND NOT EXISTS (
			SELECT 1
			FROM discovery_inquiry_observations later
			WHERE later.organization_id = observation.organization_id
				AND later.session_id = observation.session_id
				AND later.supersedes_observation_stable_key = observation.stable_key
		);

	IF active_observation_count < 1 THEN
		RAISE EXCEPTION 'discovery inquiry review requires active evidence';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_inquiry_reviews_guard_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "discovery_inquiry_reviews"
FOR EACH ROW
EXECUTE FUNCTION protect_discovery_inquiry_review();--> statement-breakpoint
CREATE FUNCTION prevent_discovery_inquiry_review_child_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery inquiry review sources and outcomes are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_inquiry_review_sources_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_inquiry_review_sources"
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_inquiry_review_child_mutation();--> statement-breakpoint
CREATE TRIGGER "discovery_inquiry_review_outcomes_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_inquiry_review_outcomes"
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_inquiry_review_child_mutation();--> statement-breakpoint
CREATE FUNCTION validate_discovery_inquiry_review_package()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	session_status discovery_session_status;
	session_revision integer;
	source_count integer;
	active_observation_count integer;
	outcome_count integer;
BEGIN
	SELECT session.status, session.revision
	INTO session_status, session_revision
	FROM discovery_inquiry_sessions session
	WHERE session.id = NEW.session_id
		AND session.organization_id = NEW.organization_id
		AND session.stable_key = NEW.session_stable_key;

	IF session_status <> 'closed'::discovery_session_status
		OR session_revision <> NEW.reviewed_session_revision + 1 THEN
		RAISE EXCEPTION 'completed discovery inquiry review must close its exact evidence session';
	END IF;

	SELECT count(*)::integer
	INTO source_count
	FROM discovery_inquiry_review_sources source
	WHERE source.review_id = NEW.id
		AND source.organization_id = NEW.organization_id;

	SELECT count(*)::integer
	INTO active_observation_count
	FROM discovery_inquiry_observations observation
	WHERE observation.organization_id = NEW.organization_id
		AND observation.session_id = NEW.session_id
		AND NOT EXISTS (
			SELECT 1
			FROM discovery_inquiry_observations later
			WHERE later.organization_id = observation.organization_id
				AND later.session_id = observation.session_id
				AND later.supersedes_observation_stable_key = observation.stable_key
		);

	IF source_count <> active_observation_count OR EXISTS (
		SELECT 1
		FROM discovery_inquiry_review_sources source
		WHERE source.review_id = NEW.id
			AND source.organization_id = NEW.organization_id
			AND EXISTS (
				SELECT 1
				FROM discovery_inquiry_observations later
				WHERE later.organization_id = source.organization_id
					AND later.session_id = source.session_id
					AND later.supersedes_observation_stable_key = source.observation_stable_key
			)
	) THEN
		RAISE EXCEPTION 'discovery inquiry review must preserve the exact active evidence set';
	END IF;

	SELECT count(*)::integer
	INTO outcome_count
	FROM discovery_inquiry_review_outcomes outcome
	WHERE outcome.review_id = NEW.id
		AND outcome.organization_id = NEW.organization_id;

	IF outcome_count < 1 THEN
		RAISE EXCEPTION 'discovery inquiry review requires at least one human outcome';
	END IF;

	RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "discovery_inquiry_reviews_complete_trigger"
AFTER INSERT ON "discovery_inquiry_reviews"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_discovery_inquiry_review_package();
