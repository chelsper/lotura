ALTER TYPE "public"."discovery_inquiry_route_kind" ADD VALUE 'start_inquiry_exploration' BEFORE 'wait_for_source';--> statement-breakpoint
CREATE TABLE "discovery_inquiry_observations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_inquiry_observations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"prompt_key" varchar(64) NOT NULL,
	"prompt_text" text NOT NULL,
	"topic" "discovery_observation_topic" NOT NULL,
	"response_text" text,
	"epistemic_state" "discovery_observation_state" NOT NULL,
	"supersedes_observation_stable_key" uuid,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_inquiry_observations_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_inquiry_observations_context_unique" UNIQUE("stable_key","session_id","organization_id"),
	CONSTRAINT "discovery_inquiry_observations_sequence_unique" UNIQUE("session_id","sequence"),
	CONSTRAINT "discovery_inquiry_observations_sequence_positive_check" CHECK ("discovery_inquiry_observations"."sequence" >= 1),
	CONSTRAINT "discovery_inquiry_observations_prompt_key_check" CHECK (char_length(trim("discovery_inquiry_observations"."prompt_key")) > 0),
	CONSTRAINT "discovery_inquiry_observations_prompt_text_check" CHECK (char_length(trim("discovery_inquiry_observations"."prompt_text")) > 0),
	CONSTRAINT "discovery_inquiry_observations_response_state_check" CHECK (("discovery_inquiry_observations"."epistemic_state" = 'unknown' and ("discovery_inquiry_observations"."response_text" is null or char_length(trim("discovery_inquiry_observations"."response_text")) > 0)) or ("discovery_inquiry_observations"."epistemic_state" <> 'unknown' and "discovery_inquiry_observations"."response_text" is not null and char_length(trim("discovery_inquiry_observations"."response_text")) > 0)),
	CONSTRAINT "discovery_inquiry_observations_supersedes_distinct_check" CHECK ("discovery_inquiry_observations"."supersedes_observation_stable_key" is null or "discovery_inquiry_observations"."supersedes_observation_stable_key" <> "discovery_inquiry_observations"."stable_key"),
	CONSTRAINT "discovery_inquiry_observations_actor_not_blank_check" CHECK (char_length(trim("discovery_inquiry_observations"."actor_identifier")) > 0)
);
--> statement-breakpoint
CREATE TABLE "discovery_inquiry_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_inquiry_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" integer NOT NULL,
	"inquiry_stable_key" uuid NOT NULL,
	"scope_statement" text NOT NULL,
	"status" "discovery_session_status" DEFAULT 'in_progress' NOT NULL,
	"current_question_key" varchar(64) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_inquiry_sessions_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_inquiry_sessions_id_org_stable_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "discovery_inquiry_sessions_inquiry_unique" UNIQUE("inquiry_id"),
	CONSTRAINT "discovery_inquiry_sessions_identity_context_unique" UNIQUE("id","organization_id","stable_key","inquiry_id","inquiry_stable_key"),
	CONSTRAINT "discovery_inquiry_sessions_scope_not_blank_check" CHECK (char_length(trim("discovery_inquiry_sessions"."scope_statement")) > 0 and char_length("discovery_inquiry_sessions"."scope_statement") <= 2000),
	CONSTRAINT "discovery_inquiry_sessions_question_not_blank_check" CHECK (char_length(trim("discovery_inquiry_sessions"."current_question_key")) > 0),
	CONSTRAINT "discovery_inquiry_sessions_actor_not_blank_check" CHECK (char_length(trim("discovery_inquiry_sessions"."actor_identifier")) > 0),
	CONSTRAINT "discovery_inquiry_sessions_revision_positive_check" CHECK ("discovery_inquiry_sessions"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" DROP CONSTRAINT "discovery_inquiry_routes_target_shape_check";--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" ADD COLUMN "discovery_inquiry_session_id" integer;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" ADD COLUMN "discovery_inquiry_session_stable_key" uuid;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_observations" ADD CONSTRAINT "discovery_inquiry_observations_session_context_fk" FOREIGN KEY ("session_id","organization_id","session_stable_key") REFERENCES "public"."discovery_inquiry_sessions"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_observations" ADD CONSTRAINT "discovery_inquiry_observations_supersedes_fk" FOREIGN KEY ("supersedes_observation_stable_key","session_id","organization_id") REFERENCES "public"."discovery_inquiry_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_sessions" ADD CONSTRAINT "discovery_inquiry_sessions_inquiry_context_fk" FOREIGN KEY ("inquiry_id","organization_id","inquiry_stable_key") REFERENCES "public"."discovery_inquiries"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_inquiry_observations_session_sequence_idx" ON "discovery_inquiry_observations" USING btree ("organization_id","session_stable_key","sequence");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_observations_org_state_idx" ON "discovery_inquiry_observations" USING btree ("organization_id","epistemic_state","created_at");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_sessions_org_status_updated_idx" ON "discovery_inquiry_sessions" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_sessions_inquiry_updated_idx" ON "discovery_inquiry_sessions" USING btree ("organization_id","inquiry_stable_key","updated_at");--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" ADD CONSTRAINT "discovery_inquiry_routes_inquiry_session_fk" FOREIGN KEY ("discovery_inquiry_session_id","organization_id","discovery_inquiry_session_stable_key","inquiry_id","inquiry_stable_key") REFERENCES "public"."discovery_inquiry_sessions"("id","organization_id","stable_key","inquiry_id","inquiry_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_inquiry_routes_org_inquiry_session_idx" ON "discovery_inquiry_routes" USING btree ("organization_id","discovery_inquiry_session_stable_key","created_at");--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" ADD CONSTRAINT "discovery_inquiry_routes_target_shape_check" CHECK ((
        "discovery_inquiry_routes"."route_kind" = 'review_process'
        and "discovery_inquiry_routes"."process_id" is not null
        and "discovery_inquiry_routes"."process_stable_key" is not null
        and "discovery_inquiry_routes"."process_family_id" is null
        and "discovery_inquiry_routes"."process_family_stable_key" is null
        and "discovery_inquiry_routes"."discovery_session_id" is null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is null
        and "discovery_inquiry_routes"."discovery_inquiry_session_id" is null
        and "discovery_inquiry_routes"."discovery_inquiry_session_stable_key" is null
      ) or (
        "discovery_inquiry_routes"."route_kind" = 'review_process_family'
        and "discovery_inquiry_routes"."process_id" is null
        and "discovery_inquiry_routes"."process_stable_key" is null
        and "discovery_inquiry_routes"."process_family_id" is not null
        and "discovery_inquiry_routes"."process_family_stable_key" is not null
        and "discovery_inquiry_routes"."discovery_session_id" is null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is null
        and "discovery_inquiry_routes"."discovery_inquiry_session_id" is null
        and "discovery_inquiry_routes"."discovery_inquiry_session_stable_key" is null
      ) or (
        "discovery_inquiry_routes"."route_kind" = 'start_guided_interview'
        and "discovery_inquiry_routes"."process_id" is not null
        and "discovery_inquiry_routes"."process_stable_key" is not null
        and "discovery_inquiry_routes"."process_family_id" is null
        and "discovery_inquiry_routes"."process_family_stable_key" is null
        and "discovery_inquiry_routes"."discovery_session_id" is not null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is not null
        and "discovery_inquiry_routes"."discovery_inquiry_session_id" is null
        and "discovery_inquiry_routes"."discovery_inquiry_session_stable_key" is null
      ) or (
        "discovery_inquiry_routes"."route_kind" = 'start_inquiry_exploration'
        and "discovery_inquiry_routes"."process_id" is null
        and "discovery_inquiry_routes"."process_stable_key" is null
        and "discovery_inquiry_routes"."process_family_id" is null
        and "discovery_inquiry_routes"."process_family_stable_key" is null
        and "discovery_inquiry_routes"."discovery_session_id" is null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is null
        and "discovery_inquiry_routes"."discovery_inquiry_session_id" is not null
        and "discovery_inquiry_routes"."discovery_inquiry_session_stable_key" is not null
      ) or (
        "discovery_inquiry_routes"."route_kind" in ('wait_for_source', 'finish_for_now')
        and "discovery_inquiry_routes"."process_id" is null
        and "discovery_inquiry_routes"."process_stable_key" is null
        and "discovery_inquiry_routes"."process_family_id" is null
        and "discovery_inquiry_routes"."process_family_stable_key" is null
        and "discovery_inquiry_routes"."discovery_session_id" is null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is null
        and "discovery_inquiry_routes"."discovery_inquiry_session_id" is null
        and "discovery_inquiry_routes"."discovery_inquiry_session_stable_key" is null
      ));--> statement-breakpoint
CREATE FUNCTION protect_discovery_inquiry_session_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'discovery inquiry sessions preserve source evidence';
	END IF;

	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key
		OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
		OR NEW.inquiry_id IS DISTINCT FROM OLD.inquiry_id
		OR NEW.inquiry_stable_key IS DISTINCT FROM OLD.inquiry_stable_key
		OR NEW.scope_statement IS DISTINCT FROM OLD.scope_statement
		OR NEW.actor_identifier IS DISTINCT FROM OLD.actor_identifier
		OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
		RAISE EXCEPTION 'discovery inquiry session identity and source context are immutable';
	END IF;

	IF NEW.revision <> OLD.revision + 1 THEN
		RAISE EXCEPTION 'discovery inquiry session revision must advance by exactly one';
	END IF;

	IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
		RAISE EXCEPTION 'discovery inquiry session update must record a new transaction time';
	END IF;

	IF OLD.status = 'closed' THEN
		RAISE EXCEPTION 'closed discovery inquiry sessions cannot be changed';
	END IF;

	IF NEW.status = 'closed' THEN
		IF NEW.current_question_key IS DISTINCT FROM OLD.current_question_key THEN
			RAISE EXCEPTION 'closing cannot advance the inquiry question';
		END IF;
		RETURN NEW;
	END IF;

	IF OLD.status = 'paused' AND (
		NEW.status <> 'in_progress'
		OR NEW.current_question_key IS DISTINCT FROM OLD.current_question_key
	) THEN
		RAISE EXCEPTION 'paused discovery inquiry sessions may only resume at the same question';
	END IF;

	IF OLD.status = 'ready_for_review' AND (
		NEW.status <> 'ready_for_review'
		OR NEW.current_question_key IS DISTINCT FROM OLD.current_question_key
	) THEN
		RAISE EXCEPTION 'review-ready discovery inquiry sessions may only append corrections';
	END IF;

	IF OLD.status = 'in_progress' AND NEW.status = 'paused'
		AND NEW.current_question_key IS DISTINCT FROM OLD.current_question_key THEN
		RAISE EXCEPTION 'pausing cannot advance the inquiry question';
	END IF;

	IF OLD.status = 'in_progress' AND NEW.status = 'in_progress'
		AND NEW.current_question_key IS NOT DISTINCT FROM OLD.current_question_key THEN
		RAISE EXCEPTION 'an in-progress inquiry revision must advance the question';
	END IF;

	IF OLD.status = 'in_progress' AND NEW.status = 'ready_for_review'
		AND NEW.current_question_key <> 'review' THEN
		RAISE EXCEPTION 'review-ready discovery inquiry sessions must use the review question key';
	END IF;

	IF OLD.status = 'in_progress'
		AND NEW.status NOT IN ('in_progress', 'paused', 'ready_for_review') THEN
		RAISE EXCEPTION 'invalid discovery inquiry session transition';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_inquiry_sessions_context_guard_trigger"
BEFORE UPDATE OR DELETE ON "discovery_inquiry_sessions"
FOR EACH ROW
EXECUTE FUNCTION protect_discovery_inquiry_session_context();--> statement-breakpoint
CREATE FUNCTION prevent_discovery_inquiry_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery inquiry observations are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_inquiry_observations_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_inquiry_observations"
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_inquiry_observation_mutation();
