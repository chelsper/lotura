CREATE TYPE "public"."discovery_observation_state" AS ENUM('known', 'assumed', 'unknown', 'needs_validation', 'conflicting_observation');--> statement-breakpoint
CREATE TYPE "public"."discovery_observation_topic" AS ENUM('purpose', 'boundary', 'participants_responsibility', 'sequence', 'systems', 'exceptions', 'dependencies_handoffs', 'unresolved_questions');--> statement-breakpoint
CREATE TYPE "public"."discovery_session_status" AS ENUM('in_progress', 'paused', 'ready_for_review', 'closed');--> statement-breakpoint
CREATE TABLE "discovery_observations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_observations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
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
	CONSTRAINT "discovery_observations_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_observations_key_session_org_unique" UNIQUE("stable_key","session_id","organization_id"),
	CONSTRAINT "discovery_observations_session_sequence_unique" UNIQUE("session_id","sequence"),
	CONSTRAINT "discovery_observations_sequence_positive_check" CHECK ("discovery_observations"."sequence" >= 1),
	CONSTRAINT "discovery_observations_prompt_key_not_blank_check" CHECK (char_length(trim("discovery_observations"."prompt_key")) > 0),
	CONSTRAINT "discovery_observations_prompt_text_not_blank_check" CHECK (char_length(trim("discovery_observations"."prompt_text")) > 0),
	CONSTRAINT "discovery_observations_response_state_check" CHECK (("discovery_observations"."epistemic_state" = 'unknown' and ("discovery_observations"."response_text" is null or char_length(trim("discovery_observations"."response_text")) > 0)) or ("discovery_observations"."epistemic_state" <> 'unknown' and "discovery_observations"."response_text" is not null and char_length(trim("discovery_observations"."response_text")) > 0)),
	CONSTRAINT "discovery_observations_supersedes_distinct_check" CHECK ("discovery_observations"."supersedes_observation_stable_key" is null or "discovery_observations"."supersedes_observation_stable_key" <> "discovery_observations"."stable_key"),
	CONSTRAINT "discovery_observations_actor_not_blank_check" CHECK (char_length(trim("discovery_observations"."actor_identifier")) > 0)
);
--> statement-breakpoint
CREATE TABLE "discovery_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"process_id" integer NOT NULL,
	"process_stable_key" uuid NOT NULL,
	"scope_statement" text NOT NULL,
	"status" "discovery_session_status" DEFAULT 'in_progress' NOT NULL,
	"current_question_key" varchar(64) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_sessions_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_sessions_id_org_stable_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "discovery_sessions_scope_not_blank_check" CHECK (char_length(trim("discovery_sessions"."scope_statement")) > 0),
	CONSTRAINT "discovery_sessions_question_not_blank_check" CHECK (char_length(trim("discovery_sessions"."current_question_key")) > 0),
	CONSTRAINT "discovery_sessions_actor_not_blank_check" CHECK (char_length(trim("discovery_sessions"."actor_identifier")) > 0),
	CONSTRAINT "discovery_sessions_revision_positive_check" CHECK ("discovery_sessions"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "discovery_observations" ADD CONSTRAINT "discovery_observations_session_org_stable_fk" FOREIGN KEY ("session_id","organization_id","session_stable_key") REFERENCES "public"."discovery_sessions"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_observations" ADD CONSTRAINT "discovery_observations_supersedes_session_fk" FOREIGN KEY ("supersedes_observation_stable_key","session_id","organization_id") REFERENCES "public"."discovery_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_process_org_stable_fk" FOREIGN KEY ("process_id","organization_id","process_stable_key") REFERENCES "public"."processes"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_observations_session_sequence_idx" ON "discovery_observations" USING btree ("organization_id","session_stable_key","sequence");--> statement-breakpoint
CREATE INDEX "discovery_observations_org_state_idx" ON "discovery_observations" USING btree ("organization_id","epistemic_state","created_at");--> statement-breakpoint
CREATE INDEX "discovery_sessions_org_status_updated_idx" ON "discovery_sessions" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "discovery_sessions_process_updated_idx" ON "discovery_sessions" USING btree ("organization_id","process_stable_key","updated_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_discovery_session_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key
		OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
		OR NEW.process_id IS DISTINCT FROM OLD.process_id
		OR NEW.process_stable_key IS DISTINCT FROM OLD.process_stable_key
		OR NEW.scope_statement IS DISTINCT FROM OLD.scope_statement
		OR NEW.actor_identifier IS DISTINCT FROM OLD.actor_identifier
		OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
		RAISE EXCEPTION 'discovery session identity and source context are immutable';
	END IF;
	IF NEW.revision <> OLD.revision + 1 THEN
		RAISE EXCEPTION 'discovery session revision must advance by exactly one';
	END IF;
	IF OLD.status = 'closed' THEN
		RAISE EXCEPTION 'closed discovery sessions cannot be changed';
	END IF;
	IF NEW.status = 'closed' THEN
		IF NEW.current_question_key IS DISTINCT FROM OLD.current_question_key THEN
			RAISE EXCEPTION 'closing cannot advance the discovery question';
		END IF;
		RETURN NEW;
	END IF;
	IF OLD.status = 'paused' AND (
		NEW.status <> 'in_progress'
		OR NEW.current_question_key IS DISTINCT FROM OLD.current_question_key
	) THEN
		RAISE EXCEPTION 'paused discovery sessions may only resume at the same question';
	END IF;
	IF OLD.status = 'ready_for_review' AND (
		NEW.status <> 'ready_for_review'
		OR NEW.current_question_key IS DISTINCT FROM OLD.current_question_key
	) THEN
		RAISE EXCEPTION 'review-ready discovery sessions may only append corrections';
	END IF;
	IF OLD.status = 'in_progress' AND NEW.status = 'paused'
		AND NEW.current_question_key IS DISTINCT FROM OLD.current_question_key THEN
		RAISE EXCEPTION 'pausing cannot advance the discovery question';
	END IF;
	IF OLD.status = 'in_progress' AND NEW.status = 'in_progress'
		AND NEW.current_question_key IS NOT DISTINCT FROM OLD.current_question_key THEN
		RAISE EXCEPTION 'an in-progress revision must advance the discovery question';
	END IF;
	IF OLD.status = 'in_progress' AND NEW.status = 'ready_for_review'
		AND NEW.current_question_key <> 'review' THEN
		RAISE EXCEPTION 'review-ready discovery sessions must use the review question key';
	END IF;
	IF OLD.status = 'in_progress'
		AND NEW.status NOT IN ('in_progress', 'paused', 'ready_for_review') THEN
		RAISE EXCEPTION 'invalid discovery session transition';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_sessions_context_guard_trigger"
BEFORE UPDATE ON "discovery_sessions"
FOR EACH ROW
EXECUTE FUNCTION protect_discovery_session_context();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_discovery_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery observations are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_observations_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_observations"
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_observation_mutation();
