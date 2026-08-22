CREATE TYPE "public"."discovery_assistance_disposition" AS ENUM('used_as_written', 'edited', 'skipped', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."discovery_assistance_kind" AS ENUM('question_suggestions', 'clarity_draft');--> statement-breakpoint
CREATE TYPE "public"."discovery_assistance_session_kind" AS ENUM('process', 'inquiry');--> statement-breakpoint
CREATE TYPE "public"."discovery_assistance_source_kind" AS ENUM('process_snapshot', 'process_observation', 'inquiry_context', 'inquiry_observation');--> statement-breakpoint
CREATE TYPE "public"."discovery_assistance_suggestion_kind" AS ENUM('follow_up_question', 'clarity_draft');--> statement-breakpoint
CREATE TABLE "discovery_assistance_decisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_assistance_decisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"run_id" integer NOT NULL,
	"run_stable_key" uuid NOT NULL,
	"suggestion_id" integer NOT NULL,
	"suggestion_stable_key" uuid NOT NULL,
	"session_kind" "discovery_assistance_session_kind" NOT NULL,
	"disposition" "discovery_assistance_disposition" NOT NULL,
	"selected_text" text,
	"discovery_session_id" integer,
	"discovery_observation_stable_key" uuid,
	"inquiry_session_id" integer,
	"inquiry_observation_stable_key" uuid,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_assistance_decisions_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_assistance_decisions_suggestion_unique" UNIQUE("suggestion_stable_key"),
	CONSTRAINT "discovery_assistance_decisions_process_observation_unique" UNIQUE("discovery_observation_stable_key"),
	CONSTRAINT "discovery_assistance_decisions_inquiry_observation_unique" UNIQUE("inquiry_observation_stable_key"),
	CONSTRAINT "discovery_assistance_decisions_shape_check" CHECK ((
        "discovery_assistance_decisions"."disposition" in ('used_as_written', 'edited')
        and "discovery_assistance_decisions"."selected_text" is not null and char_length(trim("discovery_assistance_decisions"."selected_text")) > 0
        and (
          ("discovery_assistance_decisions"."session_kind" = 'process' and "discovery_assistance_decisions"."discovery_session_id" is not null and "discovery_assistance_decisions"."discovery_observation_stable_key" is not null and "discovery_assistance_decisions"."inquiry_session_id" is null and "discovery_assistance_decisions"."inquiry_observation_stable_key" is null)
          or ("discovery_assistance_decisions"."session_kind" = 'inquiry' and "discovery_assistance_decisions"."discovery_session_id" is null and "discovery_assistance_decisions"."discovery_observation_stable_key" is null and "discovery_assistance_decisions"."inquiry_session_id" is not null and "discovery_assistance_decisions"."inquiry_observation_stable_key" is not null)
        )
      ) or (
        "discovery_assistance_decisions"."disposition" in ('skipped', 'rejected')
        and "discovery_assistance_decisions"."selected_text" is null
        and "discovery_assistance_decisions"."discovery_session_id" is null and "discovery_assistance_decisions"."discovery_observation_stable_key" is null
        and "discovery_assistance_decisions"."inquiry_session_id" is null and "discovery_assistance_decisions"."inquiry_observation_stable_key" is null
      )),
	CONSTRAINT "discovery_assistance_decisions_selected_text_check" CHECK ("discovery_assistance_decisions"."selected_text" is null or char_length("discovery_assistance_decisions"."selected_text") <= 10000),
	CONSTRAINT "discovery_assistance_decisions_actor_not_blank_check" CHECK (char_length(trim("discovery_assistance_decisions"."actor_identifier")) > 0)
);
--> statement-breakpoint
CREATE TABLE "discovery_assistance_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_assistance_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_kind" "discovery_assistance_session_kind" NOT NULL,
	"discovery_session_id" integer,
	"discovery_session_stable_key" uuid,
	"inquiry_session_id" integer,
	"inquiry_session_stable_key" uuid,
	"requested_session_revision" integer NOT NULL,
	"prompt_key" varchar(64) NOT NULL,
	"assistance_kind" "discovery_assistance_kind" NOT NULL,
	"provider_key" varchar(64) NOT NULL,
	"model_identifier" varchar(128) NOT NULL,
	"prompt_policy_version" varchar(64) NOT NULL,
	"context_fingerprint" varchar(64) NOT NULL,
	"participant_focus" text,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_assistance_runs_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_assistance_runs_source_context_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "discovery_assistance_runs_context_unique" UNIQUE("id","organization_id","stable_key","session_kind"),
	CONSTRAINT "discovery_assistance_runs_session_shape_check" CHECK (("discovery_assistance_runs"."session_kind" = 'process' and "discovery_assistance_runs"."discovery_session_id" is not null and "discovery_assistance_runs"."discovery_session_stable_key" is not null and "discovery_assistance_runs"."inquiry_session_id" is null and "discovery_assistance_runs"."inquiry_session_stable_key" is null) or ("discovery_assistance_runs"."session_kind" = 'inquiry' and "discovery_assistance_runs"."discovery_session_id" is null and "discovery_assistance_runs"."discovery_session_stable_key" is null and "discovery_assistance_runs"."inquiry_session_id" is not null and "discovery_assistance_runs"."inquiry_session_stable_key" is not null)),
	CONSTRAINT "discovery_assistance_runs_revision_positive_check" CHECK ("discovery_assistance_runs"."requested_session_revision" >= 1),
	CONSTRAINT "discovery_assistance_runs_prompt_not_blank_check" CHECK (char_length(trim("discovery_assistance_runs"."prompt_key")) > 0),
	CONSTRAINT "discovery_assistance_runs_provider_shape_check" CHECK (char_length(trim("discovery_assistance_runs"."provider_key")) > 0 and char_length(trim("discovery_assistance_runs"."model_identifier")) > 0 and char_length(trim("discovery_assistance_runs"."prompt_policy_version")) > 0),
	CONSTRAINT "discovery_assistance_runs_fingerprint_check" CHECK ("discovery_assistance_runs"."context_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "discovery_assistance_runs_focus_shape_check" CHECK ("discovery_assistance_runs"."participant_focus" is null or (char_length(trim("discovery_assistance_runs"."participant_focus")) > 0 and char_length("discovery_assistance_runs"."participant_focus") <= 2000)),
	CONSTRAINT "discovery_assistance_runs_actor_not_blank_check" CHECK (char_length(trim("discovery_assistance_runs"."actor_identifier")) > 0)
);
--> statement-breakpoint
CREATE TABLE "discovery_assistance_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_assistance_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"run_id" integer NOT NULL,
	"run_stable_key" uuid NOT NULL,
	"source_sequence" integer NOT NULL,
	"source_kind" "discovery_assistance_source_kind" NOT NULL,
	"process_id" integer,
	"process_stable_key" uuid,
	"discovery_session_id" integer,
	"discovery_session_stable_key" uuid,
	"discovery_observation_stable_key" uuid,
	"inquiry_id" integer,
	"inquiry_stable_key" uuid,
	"inquiry_session_id" integer,
	"inquiry_session_stable_key" uuid,
	"inquiry_observation_stable_key" uuid,
	"source_snapshot" jsonb NOT NULL,
	"source_fingerprint" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_assistance_sources_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_assistance_sources_run_sequence_unique" UNIQUE("run_id","source_sequence"),
	CONSTRAINT "discovery_assistance_sources_sequence_positive_check" CHECK ("discovery_assistance_sources"."source_sequence" >= 1),
	CONSTRAINT "discovery_assistance_sources_shape_check" CHECK ((
        "discovery_assistance_sources"."source_kind" = 'process_snapshot'
        and "discovery_assistance_sources"."process_id" is not null and "discovery_assistance_sources"."process_stable_key" is not null
        and "discovery_assistance_sources"."discovery_session_id" is null and "discovery_assistance_sources"."discovery_session_stable_key" is null
        and "discovery_assistance_sources"."discovery_observation_stable_key" is null
        and "discovery_assistance_sources"."inquiry_id" is null and "discovery_assistance_sources"."inquiry_stable_key" is null
        and "discovery_assistance_sources"."inquiry_session_id" is null and "discovery_assistance_sources"."inquiry_session_stable_key" is null
        and "discovery_assistance_sources"."inquiry_observation_stable_key" is null
      ) or (
        "discovery_assistance_sources"."source_kind" = 'process_observation'
        and "discovery_assistance_sources"."process_id" is not null and "discovery_assistance_sources"."process_stable_key" is not null
        and "discovery_assistance_sources"."discovery_session_id" is not null and "discovery_assistance_sources"."discovery_session_stable_key" is not null
        and "discovery_assistance_sources"."discovery_observation_stable_key" is not null
        and "discovery_assistance_sources"."inquiry_id" is null and "discovery_assistance_sources"."inquiry_stable_key" is null
        and "discovery_assistance_sources"."inquiry_session_id" is null and "discovery_assistance_sources"."inquiry_session_stable_key" is null
        and "discovery_assistance_sources"."inquiry_observation_stable_key" is null
      ) or (
        "discovery_assistance_sources"."source_kind" = 'inquiry_context'
        and "discovery_assistance_sources"."process_id" is null and "discovery_assistance_sources"."process_stable_key" is null
        and "discovery_assistance_sources"."discovery_session_id" is null and "discovery_assistance_sources"."discovery_session_stable_key" is null
        and "discovery_assistance_sources"."discovery_observation_stable_key" is null
        and "discovery_assistance_sources"."inquiry_id" is not null and "discovery_assistance_sources"."inquiry_stable_key" is not null
        and "discovery_assistance_sources"."inquiry_session_id" is not null and "discovery_assistance_sources"."inquiry_session_stable_key" is not null
        and "discovery_assistance_sources"."inquiry_observation_stable_key" is null
      ) or (
        "discovery_assistance_sources"."source_kind" = 'inquiry_observation'
        and "discovery_assistance_sources"."process_id" is null and "discovery_assistance_sources"."process_stable_key" is null
        and "discovery_assistance_sources"."discovery_session_id" is null and "discovery_assistance_sources"."discovery_session_stable_key" is null
        and "discovery_assistance_sources"."discovery_observation_stable_key" is null
        and "discovery_assistance_sources"."inquiry_id" is not null and "discovery_assistance_sources"."inquiry_stable_key" is not null
        and "discovery_assistance_sources"."inquiry_session_id" is not null and "discovery_assistance_sources"."inquiry_session_stable_key" is not null
        and "discovery_assistance_sources"."inquiry_observation_stable_key" is not null
      )),
	CONSTRAINT "discovery_assistance_sources_snapshot_shape_check" CHECK (jsonb_typeof("discovery_assistance_sources"."source_snapshot") = 'object'),
	CONSTRAINT "discovery_assistance_sources_fingerprint_check" CHECK ("discovery_assistance_sources"."source_fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "discovery_assistance_suggestions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_assistance_suggestions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"run_id" integer NOT NULL,
	"run_stable_key" uuid NOT NULL,
	"suggestion_sequence" integer NOT NULL,
	"suggestion_kind" "discovery_assistance_suggestion_kind" NOT NULL,
	"prompt_key" varchar(64) NOT NULL,
	"topic" "discovery_observation_topic" NOT NULL,
	"suggested_text" text NOT NULL,
	"rationale" text NOT NULL,
	"original_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_assistance_suggestions_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_assistance_suggestions_context_unique" UNIQUE("id","organization_id","stable_key","run_id","run_stable_key"),
	CONSTRAINT "discovery_assistance_suggestions_run_sequence_unique" UNIQUE("run_id","suggestion_sequence"),
	CONSTRAINT "discovery_assistance_suggestions_sequence_positive_check" CHECK ("discovery_assistance_suggestions"."suggestion_sequence" >= 1),
	CONSTRAINT "discovery_assistance_suggestions_prompt_not_blank_check" CHECK (char_length(trim("discovery_assistance_suggestions"."prompt_key")) > 0),
	CONSTRAINT "discovery_assistance_suggestions_text_shape_check" CHECK (char_length(trim("discovery_assistance_suggestions"."suggested_text")) > 0 and char_length("discovery_assistance_suggestions"."suggested_text") <= 2000 and char_length(trim("discovery_assistance_suggestions"."rationale")) > 0 and char_length("discovery_assistance_suggestions"."rationale") <= 1000),
	CONSTRAINT "discovery_assistance_suggestions_original_shape_check" CHECK (("discovery_assistance_suggestions"."suggestion_kind" = 'follow_up_question' and "discovery_assistance_suggestions"."original_text" is null) or ("discovery_assistance_suggestions"."suggestion_kind" = 'clarity_draft' and "discovery_assistance_suggestions"."original_text" is not null and char_length(trim("discovery_assistance_suggestions"."original_text")) > 0 and char_length("discovery_assistance_suggestions"."original_text") <= 10000))
);
--> statement-breakpoint
ALTER TABLE "discovery_assistance_decisions" ADD CONSTRAINT "discovery_assistance_decisions_run_fk" FOREIGN KEY ("run_id","organization_id","run_stable_key","session_kind") REFERENCES "public"."discovery_assistance_runs"("id","organization_id","stable_key","session_kind") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_decisions" ADD CONSTRAINT "discovery_assistance_decisions_suggestion_fk" FOREIGN KEY ("suggestion_id","organization_id","suggestion_stable_key","run_id","run_stable_key") REFERENCES "public"."discovery_assistance_suggestions"("id","organization_id","stable_key","run_id","run_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_decisions" ADD CONSTRAINT "discovery_assistance_decisions_process_observation_fk" FOREIGN KEY ("discovery_observation_stable_key","discovery_session_id","organization_id") REFERENCES "public"."discovery_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_decisions" ADD CONSTRAINT "discovery_assistance_decisions_inquiry_observation_fk" FOREIGN KEY ("inquiry_observation_stable_key","inquiry_session_id","organization_id") REFERENCES "public"."discovery_inquiry_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD CONSTRAINT "discovery_assistance_runs_process_session_fk" FOREIGN KEY ("discovery_session_id","organization_id","discovery_session_stable_key") REFERENCES "public"."discovery_sessions"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD CONSTRAINT "discovery_assistance_runs_inquiry_session_fk" FOREIGN KEY ("inquiry_session_id","organization_id","inquiry_session_stable_key") REFERENCES "public"."discovery_inquiry_sessions"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_sources" ADD CONSTRAINT "discovery_assistance_sources_run_fk" FOREIGN KEY ("run_id","organization_id","run_stable_key") REFERENCES "public"."discovery_assistance_runs"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_sources" ADD CONSTRAINT "discovery_assistance_sources_process_fk" FOREIGN KEY ("process_id","organization_id","process_stable_key") REFERENCES "public"."processes"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_sources" ADD CONSTRAINT "discovery_assistance_sources_process_session_fk" FOREIGN KEY ("discovery_session_id","organization_id","discovery_session_stable_key","process_id","process_stable_key") REFERENCES "public"."discovery_sessions"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_sources" ADD CONSTRAINT "discovery_assistance_sources_process_observation_fk" FOREIGN KEY ("discovery_observation_stable_key","discovery_session_id","organization_id") REFERENCES "public"."discovery_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_sources" ADD CONSTRAINT "discovery_assistance_sources_inquiry_session_fk" FOREIGN KEY ("inquiry_session_id","organization_id","inquiry_session_stable_key","inquiry_id","inquiry_stable_key") REFERENCES "public"."discovery_inquiry_sessions"("id","organization_id","stable_key","inquiry_id","inquiry_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_sources" ADD CONSTRAINT "discovery_assistance_sources_inquiry_observation_fk" FOREIGN KEY ("inquiry_observation_stable_key","inquiry_session_id","organization_id") REFERENCES "public"."discovery_inquiry_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_assistance_suggestions" ADD CONSTRAINT "discovery_assistance_suggestions_run_fk" FOREIGN KEY ("run_id","organization_id","run_stable_key") REFERENCES "public"."discovery_assistance_runs"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_assistance_decisions_run_idx" ON "discovery_assistance_decisions" USING btree ("organization_id","run_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "discovery_assistance_runs_process_idx" ON "discovery_assistance_runs" USING btree ("organization_id","discovery_session_stable_key","requested_session_revision","created_at");--> statement-breakpoint
CREATE INDEX "discovery_assistance_runs_inquiry_idx" ON "discovery_assistance_runs" USING btree ("organization_id","inquiry_session_stable_key","requested_session_revision","created_at");--> statement-breakpoint
CREATE INDEX "discovery_assistance_sources_run_idx" ON "discovery_assistance_sources" USING btree ("organization_id","run_stable_key","source_sequence");--> statement-breakpoint
CREATE INDEX "discovery_assistance_suggestions_run_idx" ON "discovery_assistance_suggestions" USING btree ("organization_id","run_stable_key","suggestion_sequence");
--> statement-breakpoint
CREATE FUNCTION prevent_discovery_assistance_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery assistance history is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER discovery_assistance_runs_append_only
BEFORE UPDATE OR DELETE ON discovery_assistance_runs
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_assistance_mutation();
--> statement-breakpoint
CREATE TRIGGER discovery_assistance_sources_append_only
BEFORE UPDATE OR DELETE ON discovery_assistance_sources
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_assistance_mutation();
--> statement-breakpoint
CREATE TRIGGER discovery_assistance_suggestions_append_only
BEFORE UPDATE OR DELETE ON discovery_assistance_suggestions
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_assistance_mutation();
--> statement-breakpoint
CREATE TRIGGER discovery_assistance_decisions_append_only
BEFORE UPDATE OR DELETE ON discovery_assistance_decisions
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_assistance_mutation();
--> statement-breakpoint
CREATE FUNCTION validate_discovery_assistance_run_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	session_revision integer;
	session_prompt_key varchar(64);
	session_status discovery_session_status;
	session_actor varchar(128);
BEGIN
	IF NEW.session_kind = 'process' THEN
		SELECT revision, current_question_key, status, actor_identifier
		INTO STRICT session_revision, session_prompt_key, session_status, session_actor
		FROM discovery_sessions
		WHERE id = NEW.discovery_session_id
		  AND organization_id = NEW.organization_id
		  AND stable_key = NEW.discovery_session_stable_key;
	ELSE
		SELECT revision, current_question_key, status, actor_identifier
		INTO STRICT session_revision, session_prompt_key, session_status, session_actor
		FROM discovery_inquiry_sessions
		WHERE id = NEW.inquiry_session_id
		  AND organization_id = NEW.organization_id
		  AND stable_key = NEW.inquiry_session_stable_key;
	END IF;
	IF session_revision <> NEW.requested_session_revision
	   OR session_prompt_key <> NEW.prompt_key
	   OR session_status <> 'in_progress'
	   OR session_actor <> NEW.actor_identifier THEN
		RAISE EXCEPTION 'assistance run differs from the current interview context';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER discovery_assistance_runs_context_guard
BEFORE INSERT ON discovery_assistance_runs
FOR EACH ROW
EXECUTE FUNCTION validate_discovery_assistance_run_context();
--> statement-breakpoint
CREATE FUNCTION validate_discovery_assistance_source_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	run_record discovery_assistance_runs%ROWTYPE;
	current_process_id integer;
	source_process_id integer;
	source_prompt_key varchar(64);
	source_created_at timestamp with time zone;
BEGIN
	SELECT * INTO STRICT run_record
	FROM discovery_assistance_runs
	WHERE id = NEW.run_id
	  AND organization_id = NEW.organization_id
	  AND stable_key = NEW.run_stable_key;

	IF NEW.source_kind IN ('process_snapshot', 'process_observation') THEN
		IF run_record.session_kind <> 'process' THEN
			RAISE EXCEPTION 'process assistance source requires a Process-bound run';
		END IF;
		SELECT process_id INTO STRICT current_process_id
		FROM discovery_sessions
		WHERE id = run_record.discovery_session_id
		  AND organization_id = run_record.organization_id
		  AND stable_key = run_record.discovery_session_stable_key;
		IF NEW.process_id <> current_process_id THEN
			RAISE EXCEPTION 'assistance source Process differs from the run Process';
		END IF;
		IF NEW.source_kind = 'process_observation' THEN
			SELECT source_session.process_id, source_observation.prompt_key,
			  source_observation.created_at
			INTO STRICT source_process_id, source_prompt_key, source_created_at
			FROM discovery_sessions source_session
			INNER JOIN discovery_observations source_observation
			  ON source_observation.session_id = source_session.id
			 AND source_observation.organization_id = source_session.organization_id
			 AND source_observation.stable_key = NEW.discovery_observation_stable_key
			WHERE source_session.id = NEW.discovery_session_id
			  AND source_session.organization_id = NEW.organization_id
			  AND source_session.stable_key = NEW.discovery_session_stable_key;
			IF source_process_id <> current_process_id
			   OR source_prompt_key <> run_record.prompt_key
			   OR source_created_at > run_record.created_at
			   OR NEW.discovery_session_id >= run_record.discovery_session_id
			   OR EXISTS (
			     SELECT 1 FROM discovery_observations superseding
			     WHERE superseding.organization_id = NEW.organization_id
			       AND superseding.session_id = NEW.discovery_session_id
			       AND superseding.supersedes_observation_stable_key = NEW.discovery_observation_stable_key
			   ) THEN
				RAISE EXCEPTION 'assistance observation is outside the prior Process context';
			END IF;
		END IF;
	ELSE
		IF run_record.session_kind <> 'inquiry'
		   OR NEW.inquiry_session_id <> run_record.inquiry_session_id
		   OR NEW.inquiry_session_stable_key <> run_record.inquiry_session_stable_key THEN
			RAISE EXCEPTION 'inquiry assistance source differs from the run inquiry';
		END IF;
		IF NEW.source_kind = 'inquiry_observation' AND NOT EXISTS (
		  SELECT 1 FROM discovery_inquiry_observations source_observation
		  WHERE source_observation.organization_id = NEW.organization_id
		    AND source_observation.session_id = NEW.inquiry_session_id
		    AND source_observation.stable_key = NEW.inquiry_observation_stable_key
		    AND source_observation.created_at <= run_record.created_at
		) THEN
			RAISE EXCEPTION 'inquiry assistance source was not available to the run';
		END IF;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER discovery_assistance_sources_context_guard
BEFORE INSERT ON discovery_assistance_sources
FOR EACH ROW
EXECUTE FUNCTION validate_discovery_assistance_source_context();
--> statement-breakpoint
CREATE FUNCTION validate_discovery_assistance_suggestion_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	run_kind discovery_assistance_kind;
	run_prompt_key varchar(64);
BEGIN
	SELECT assistance_kind, prompt_key INTO STRICT run_kind, run_prompt_key
	FROM discovery_assistance_runs
	WHERE id = NEW.run_id
	  AND organization_id = NEW.organization_id
	  AND stable_key = NEW.run_stable_key;
	IF (run_kind = 'question_suggestions' AND NEW.suggestion_kind <> 'follow_up_question')
	   OR (run_kind = 'clarity_draft' AND NEW.suggestion_kind <> 'clarity_draft') THEN
		RAISE EXCEPTION 'assistance suggestion kind differs from the run purpose';
	END IF;
	IF NEW.prompt_key <> run_prompt_key THEN
		RAISE EXCEPTION 'assistance suggestion differs from the run question';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER discovery_assistance_suggestions_context_guard
BEFORE INSERT ON discovery_assistance_suggestions
FOR EACH ROW
EXECUTE FUNCTION validate_discovery_assistance_suggestion_context();
--> statement-breakpoint
CREATE FUNCTION validate_discovery_assistance_decision_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	run_record discovery_assistance_runs%ROWTYPE;
	suggestion_kind discovery_assistance_suggestion_kind;
	suggestion_text text;
	observation_prompt_key varchar(64);
	observation_prompt_text text;
	observation_response_text text;
	observation_created_at timestamp with time zone;
BEGIN
	SELECT * INTO STRICT run_record
	FROM discovery_assistance_runs
	WHERE id = NEW.run_id
	  AND organization_id = NEW.organization_id
	  AND stable_key = NEW.run_stable_key
	  AND session_kind = NEW.session_kind;
	IF NEW.disposition IN ('used_as_written', 'edited') THEN
		SELECT suggestion.suggestion_kind, suggestion.suggested_text
		INTO STRICT suggestion_kind, suggestion_text
		FROM discovery_assistance_suggestions suggestion
		WHERE suggestion.id = NEW.suggestion_id
		  AND suggestion.organization_id = NEW.organization_id
		  AND suggestion.stable_key = NEW.suggestion_stable_key
		  AND suggestion.run_id = NEW.run_id
		  AND suggestion.run_stable_key = NEW.run_stable_key;
		IF (NEW.session_kind = 'process' AND NEW.discovery_session_id <> run_record.discovery_session_id)
		   OR (NEW.session_kind = 'inquiry' AND NEW.inquiry_session_id <> run_record.inquiry_session_id) THEN
			RAISE EXCEPTION 'assistance decision observation differs from the run session';
		END IF;
		IF NEW.session_kind = 'process' THEN
			SELECT prompt_key, prompt_text, response_text, created_at
			INTO STRICT observation_prompt_key, observation_prompt_text,
			  observation_response_text, observation_created_at
			FROM discovery_observations
			WHERE organization_id = NEW.organization_id
			  AND session_id = NEW.discovery_session_id
			  AND stable_key = NEW.discovery_observation_stable_key;
		ELSE
			SELECT prompt_key, prompt_text, response_text, created_at
			INTO STRICT observation_prompt_key, observation_prompt_text,
			  observation_response_text, observation_created_at
			FROM discovery_inquiry_observations
			WHERE organization_id = NEW.organization_id
			  AND session_id = NEW.inquiry_session_id
			  AND stable_key = NEW.inquiry_observation_stable_key;
		END IF;
		IF observation_prompt_key <> run_record.prompt_key
		   OR observation_created_at < run_record.created_at
		   OR (suggestion_kind = 'follow_up_question'
		       AND NEW.selected_text <> observation_prompt_text)
		   OR (suggestion_kind = 'clarity_draft'
		       AND NEW.selected_text <> observation_response_text) THEN
			RAISE EXCEPTION 'assistance decision does not match the preserved human evidence';
		END IF;
		IF (NEW.disposition = 'used_as_written' AND NEW.selected_text <> suggestion_text)
		   OR (NEW.disposition = 'edited' AND NEW.selected_text = suggestion_text) THEN
			RAISE EXCEPTION 'assistance decision disposition differs from the selected text';
		END IF;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER discovery_assistance_decisions_context_guard
BEFORE INSERT ON discovery_assistance_decisions
FOR EACH ROW
EXECUTE FUNCTION validate_discovery_assistance_decision_context();
