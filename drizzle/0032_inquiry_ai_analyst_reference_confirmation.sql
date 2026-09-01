CREATE TYPE "public"."discovery_reference_disposition" AS ENUM('confirmed', 'rejected', 'unresolved');--> statement-breakpoint
CREATE TYPE "public"."discovery_reference_kind" AS ENUM('organization_unit', 'operational_role', 'person_capacity', 'system', 'process', 'process_family', 'policy', 'other');--> statement-breakpoint
CREATE TABLE "discovery_reference_confirmations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_reference_confirmations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_session_id" integer NOT NULL,
	"inquiry_session_stable_key" uuid NOT NULL,
	"run_id" integer NOT NULL,
	"run_stable_key" uuid NOT NULL,
	"source_observation_stable_key" uuid NOT NULL,
	"mention_sequence" integer NOT NULL,
	"mention_text" text NOT NULL,
	"reference_kind" "discovery_reference_kind" NOT NULL,
	"source_fingerprint" varchar(64) NOT NULL,
	"disposition" "discovery_reference_disposition" NOT NULL,
	"organization_unit_id" integer,
	"organization_unit_stable_key" uuid,
	"role_id" integer,
	"role_stable_key" uuid,
	"person_id" integer,
	"person_stable_key" uuid,
	"position_id" integer,
	"position_stable_key" uuid,
	"system_id" integer,
	"system_stable_key" uuid,
	"process_id" integer,
	"process_stable_key" uuid,
	"process_family_id" integer,
	"process_family_stable_key" uuid,
	"supersedes_confirmation_id" integer,
	"supersedes_confirmation_stable_key" uuid,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_reference_confirmations_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_reference_confirmations_identity_context_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "discovery_reference_confirmations_mention_seq_positive_check" CHECK ("discovery_reference_confirmations"."mention_sequence" >= 1),
	CONSTRAINT "discovery_reference_confirmations_mention_not_blank_check" CHECK (char_length(trim("discovery_reference_confirmations"."mention_text")) > 0 and char_length("discovery_reference_confirmations"."mention_text") <= 500),
	CONSTRAINT "discovery_reference_confirmations_source_fingerprint_check" CHECK ("discovery_reference_confirmations"."source_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "discovery_reference_confirmations_supersedes_pair_check" CHECK (("discovery_reference_confirmations"."supersedes_confirmation_id" is null and "discovery_reference_confirmations"."supersedes_confirmation_stable_key" is null) or ("discovery_reference_confirmations"."supersedes_confirmation_id" is not null and "discovery_reference_confirmations"."supersedes_confirmation_stable_key" is not null)),
	CONSTRAINT "discovery_reference_confirmations_target_shape_check" CHECK ((
        "discovery_reference_confirmations"."disposition" in ('rejected', 'unresolved')
        and "discovery_reference_confirmations"."organization_unit_id" is null and "discovery_reference_confirmations"."organization_unit_stable_key" is null
        and "discovery_reference_confirmations"."role_id" is null and "discovery_reference_confirmations"."role_stable_key" is null
        and "discovery_reference_confirmations"."person_id" is null and "discovery_reference_confirmations"."person_stable_key" is null
        and "discovery_reference_confirmations"."position_id" is null and "discovery_reference_confirmations"."position_stable_key" is null
        and "discovery_reference_confirmations"."system_id" is null and "discovery_reference_confirmations"."system_stable_key" is null
        and "discovery_reference_confirmations"."process_id" is null and "discovery_reference_confirmations"."process_stable_key" is null
        and "discovery_reference_confirmations"."process_family_id" is null and "discovery_reference_confirmations"."process_family_stable_key" is null
      ) or (
        "discovery_reference_confirmations"."disposition" = 'confirmed' and (
          ("discovery_reference_confirmations"."reference_kind" = 'organization_unit' and "discovery_reference_confirmations"."organization_unit_id" is not null and "discovery_reference_confirmations"."organization_unit_stable_key" is not null and "discovery_reference_confirmations"."role_id" is null and "discovery_reference_confirmations"."role_stable_key" is null and "discovery_reference_confirmations"."person_id" is null and "discovery_reference_confirmations"."person_stable_key" is null and "discovery_reference_confirmations"."position_id" is null and "discovery_reference_confirmations"."position_stable_key" is null and "discovery_reference_confirmations"."system_id" is null and "discovery_reference_confirmations"."system_stable_key" is null and "discovery_reference_confirmations"."process_id" is null and "discovery_reference_confirmations"."process_stable_key" is null and "discovery_reference_confirmations"."process_family_id" is null and "discovery_reference_confirmations"."process_family_stable_key" is null)
          or ("discovery_reference_confirmations"."reference_kind" = 'operational_role' and "discovery_reference_confirmations"."organization_unit_id" is null and "discovery_reference_confirmations"."organization_unit_stable_key" is null and "discovery_reference_confirmations"."role_id" is not null and "discovery_reference_confirmations"."role_stable_key" is not null and "discovery_reference_confirmations"."person_id" is null and "discovery_reference_confirmations"."person_stable_key" is null and "discovery_reference_confirmations"."position_id" is null and "discovery_reference_confirmations"."position_stable_key" is null and "discovery_reference_confirmations"."system_id" is null and "discovery_reference_confirmations"."system_stable_key" is null and "discovery_reference_confirmations"."process_id" is null and "discovery_reference_confirmations"."process_stable_key" is null and "discovery_reference_confirmations"."process_family_id" is null and "discovery_reference_confirmations"."process_family_stable_key" is null)
          or ("discovery_reference_confirmations"."reference_kind" = 'person_capacity' and "discovery_reference_confirmations"."organization_unit_id" is null and "discovery_reference_confirmations"."organization_unit_stable_key" is null and ("discovery_reference_confirmations"."role_id" is null) = ("discovery_reference_confirmations"."role_stable_key" is null) and "discovery_reference_confirmations"."person_id" is not null and "discovery_reference_confirmations"."person_stable_key" is not null and "discovery_reference_confirmations"."position_id" is not null and "discovery_reference_confirmations"."position_stable_key" is not null and "discovery_reference_confirmations"."system_id" is null and "discovery_reference_confirmations"."system_stable_key" is null and "discovery_reference_confirmations"."process_id" is null and "discovery_reference_confirmations"."process_stable_key" is null and "discovery_reference_confirmations"."process_family_id" is null and "discovery_reference_confirmations"."process_family_stable_key" is null)
          or ("discovery_reference_confirmations"."reference_kind" = 'system' and "discovery_reference_confirmations"."organization_unit_id" is null and "discovery_reference_confirmations"."organization_unit_stable_key" is null and "discovery_reference_confirmations"."role_id" is null and "discovery_reference_confirmations"."role_stable_key" is null and "discovery_reference_confirmations"."person_id" is null and "discovery_reference_confirmations"."person_stable_key" is null and "discovery_reference_confirmations"."position_id" is null and "discovery_reference_confirmations"."position_stable_key" is null and "discovery_reference_confirmations"."system_id" is not null and "discovery_reference_confirmations"."system_stable_key" is not null and "discovery_reference_confirmations"."process_id" is null and "discovery_reference_confirmations"."process_stable_key" is null and "discovery_reference_confirmations"."process_family_id" is null and "discovery_reference_confirmations"."process_family_stable_key" is null)
          or ("discovery_reference_confirmations"."reference_kind" = 'process' and "discovery_reference_confirmations"."organization_unit_id" is null and "discovery_reference_confirmations"."organization_unit_stable_key" is null and "discovery_reference_confirmations"."role_id" is null and "discovery_reference_confirmations"."role_stable_key" is null and "discovery_reference_confirmations"."person_id" is null and "discovery_reference_confirmations"."person_stable_key" is null and "discovery_reference_confirmations"."position_id" is null and "discovery_reference_confirmations"."position_stable_key" is null and "discovery_reference_confirmations"."system_id" is null and "discovery_reference_confirmations"."system_stable_key" is null and "discovery_reference_confirmations"."process_id" is not null and "discovery_reference_confirmations"."process_stable_key" is not null and "discovery_reference_confirmations"."process_family_id" is null and "discovery_reference_confirmations"."process_family_stable_key" is null)
          or ("discovery_reference_confirmations"."reference_kind" = 'process_family' and "discovery_reference_confirmations"."organization_unit_id" is null and "discovery_reference_confirmations"."organization_unit_stable_key" is null and "discovery_reference_confirmations"."role_id" is null and "discovery_reference_confirmations"."role_stable_key" is null and "discovery_reference_confirmations"."person_id" is null and "discovery_reference_confirmations"."person_stable_key" is null and "discovery_reference_confirmations"."position_id" is null and "discovery_reference_confirmations"."position_stable_key" is null and "discovery_reference_confirmations"."system_id" is null and "discovery_reference_confirmations"."system_stable_key" is null and "discovery_reference_confirmations"."process_id" is null and "discovery_reference_confirmations"."process_stable_key" is null and "discovery_reference_confirmations"."process_family_id" is not null and "discovery_reference_confirmations"."process_family_stable_key" is not null)
        )
      )),
	CONSTRAINT "discovery_reference_confirmations_actor_not_blank_check" CHECK (char_length(trim("discovery_reference_confirmations"."actor_identifier")) > 0)
);
--> statement-breakpoint
ALTER TABLE "discovery_inquiry_sessions" ADD COLUMN "analyst_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_sessions" ADD COLUMN "analyst_authorized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_sessions" ADD COLUMN "analyst_authorization_version" varchar(64);--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_inquiry_session_fk" FOREIGN KEY ("inquiry_session_id","organization_id","inquiry_session_stable_key") REFERENCES "public"."discovery_inquiry_sessions"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_run_fk" FOREIGN KEY ("run_id","organization_id","run_stable_key") REFERENCES "public"."discovery_assistance_runs"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_observation_fk" FOREIGN KEY ("source_observation_stable_key","inquiry_session_id","organization_id") REFERENCES "public"."discovery_inquiry_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_unit_fk" FOREIGN KEY ("organization_unit_id","organization_id","organization_unit_stable_key") REFERENCES "public"."organization_units"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_role_fk" FOREIGN KEY ("role_id","organization_id","role_stable_key") REFERENCES "public"."roles"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_person_fk" FOREIGN KEY ("person_id","organization_id","person_stable_key") REFERENCES "public"."people"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_position_fk" FOREIGN KEY ("position_id","organization_id","position_stable_key") REFERENCES "public"."positions"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_system_fk" FOREIGN KEY ("system_id","organization_id","system_stable_key") REFERENCES "public"."systems"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_process_fk" FOREIGN KEY ("process_id","organization_id","process_stable_key") REFERENCES "public"."processes"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_family_fk" FOREIGN KEY ("process_family_id","organization_id","process_family_stable_key") REFERENCES "public"."process_families"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_reference_confirmations" ADD CONSTRAINT "discovery_reference_confirmations_supersedes_fk" FOREIGN KEY ("supersedes_confirmation_id","organization_id","supersedes_confirmation_stable_key") REFERENCES "public"."discovery_reference_confirmations"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_reference_confirmations_session_source_idx" ON "discovery_reference_confirmations" USING btree ("organization_id","inquiry_session_stable_key","source_observation_stable_key","mention_sequence","created_at");--> statement-breakpoint
CREATE INDEX "discovery_reference_confirmations_run_idx" ON "discovery_reference_confirmations" USING btree ("organization_id","run_stable_key","created_at");--> statement-breakpoint
ALTER TABLE "discovery_inquiry_sessions" ADD CONSTRAINT "discovery_inquiry_sessions_analyst_authorization_shape_check" CHECK (("discovery_inquiry_sessions"."analyst_enabled" = false and "discovery_inquiry_sessions"."analyst_authorized_at" is null and "discovery_inquiry_sessions"."analyst_authorization_version" is null) or ("discovery_inquiry_sessions"."analyst_enabled" = true and "discovery_inquiry_sessions"."analyst_authorized_at" is not null and "discovery_inquiry_sessions"."analyst_authorization_version" is not null and char_length(trim("discovery_inquiry_sessions"."analyst_authorization_version")) > 0));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_discovery_inquiry_session_context()
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
	IF OLD.analyst_enabled AND (
		NEW.analyst_enabled IS DISTINCT FROM OLD.analyst_enabled
		OR NEW.analyst_authorized_at IS DISTINCT FROM OLD.analyst_authorized_at
		OR NEW.analyst_authorization_version IS DISTINCT FROM OLD.analyst_authorization_version
	) THEN
		RAISE EXCEPTION 'discovery inquiry analyst authorization is immutable';
	END IF;
	IF NOT OLD.analyst_enabled AND NEW.analyst_enabled
		AND (OLD.status <> 'in_progress' OR NEW.status <> 'in_progress') THEN
		RAISE EXCEPTION 'discovery inquiry analyst mode requires an in-progress interview';
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
		AND NEW.current_question_key IS NOT DISTINCT FROM OLD.current_question_key
		AND NOT NEW.analyst_enabled THEN
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
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_discovery_assistance_run_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	session_revision integer;
	session_prompt_key varchar(64);
	session_status discovery_session_status;
	session_actor varchar(128);
	session_analyst_enabled boolean := false;
BEGIN
	IF NEW.session_kind = 'process' THEN
		SELECT revision, current_question_key, status, actor_identifier, analyst_enabled
		INTO STRICT session_revision, session_prompt_key, session_status, session_actor,
		  session_analyst_enabled
		FROM discovery_sessions
		WHERE id = NEW.discovery_session_id
		  AND organization_id = NEW.organization_id
		  AND stable_key = NEW.discovery_session_stable_key;
	ELSE
		SELECT revision, current_question_key, status, actor_identifier, analyst_enabled
		INTO STRICT session_revision, session_prompt_key, session_status, session_actor,
		  session_analyst_enabled
		FROM discovery_inquiry_sessions
		WHERE id = NEW.inquiry_session_id
		  AND organization_id = NEW.organization_id
		  AND stable_key = NEW.inquiry_session_stable_key;
	END IF;
	IF NEW.analyst_turn AND NOT session_analyst_enabled THEN
		RAISE EXCEPTION 'analyst assistance requires an authorized interview';
	END IF;
	IF session_revision <> NEW.requested_session_revision
	   OR (NOT NEW.analyst_turn AND session_prompt_key <> NEW.prompt_key)
	   OR session_status <> 'in_progress'
	   OR session_actor <> NEW.actor_identifier THEN
		RAISE EXCEPTION 'assistance run differs from the current interview context';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION validate_discovery_reference_confirmation_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	run_record discovery_assistance_runs%ROWTYPE;
	session_actor varchar(128);
	source_response text;
	source_created_at timestamp with time zone;
BEGIN
	SELECT * INTO STRICT run_record
	FROM discovery_assistance_runs
	WHERE id = NEW.run_id
	  AND organization_id = NEW.organization_id
	  AND stable_key = NEW.run_stable_key;
	IF run_record.session_kind <> 'inquiry'
	   OR NOT run_record.analyst_turn
	   OR run_record.inquiry_session_id <> NEW.inquiry_session_id
	   OR run_record.inquiry_session_stable_key <> NEW.inquiry_session_stable_key THEN
		RAISE EXCEPTION 'reference confirmation differs from its Inquiry Analyst run';
	END IF;
	SELECT session.actor_identifier, observation.response_text,
	  observation.created_at
	INTO STRICT session_actor, source_response, source_created_at
	FROM discovery_inquiry_sessions session
	INNER JOIN discovery_inquiry_observations observation
	  ON observation.organization_id = session.organization_id
	 AND observation.session_id = session.id
	 AND observation.stable_key = NEW.source_observation_stable_key
	WHERE session.id = NEW.inquiry_session_id
	  AND session.organization_id = NEW.organization_id
	  AND session.stable_key = NEW.inquiry_session_stable_key;
	IF session_actor <> NEW.actor_identifier
	   OR source_created_at > run_record.created_at
	   OR EXISTS (
	     SELECT 1 FROM discovery_inquiry_observations superseding
	     WHERE superseding.organization_id = NEW.organization_id
	       AND superseding.session_id = NEW.inquiry_session_id
	       AND superseding.supersedes_observation_stable_key = NEW.source_observation_stable_key
	       AND superseding.created_at <= NEW.created_at
	   )
	   OR position(lower(btrim(NEW.mention_text)) IN lower(coalesce(source_response, ''))) = 0 THEN
		RAISE EXCEPTION 'reference confirmation differs from its source mention';
	END IF;
	IF NEW.supersedes_confirmation_id IS NOT NULL AND NOT EXISTS (
		SELECT 1 FROM discovery_reference_confirmations prior
		WHERE prior.id = NEW.supersedes_confirmation_id
		  AND prior.organization_id = NEW.organization_id
		  AND prior.stable_key = NEW.supersedes_confirmation_stable_key
		  AND prior.inquiry_session_id = NEW.inquiry_session_id
		  AND prior.source_observation_stable_key = NEW.source_observation_stable_key
		  AND prior.source_fingerprint = NEW.source_fingerprint
		  AND prior.reference_kind = NEW.reference_kind
		  AND prior.created_at <= NEW.created_at
	) THEN
		RAISE EXCEPTION 'reference confirmation correction differs from the prior decision';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "discovery_reference_confirmations_context_trigger"
BEFORE INSERT ON "discovery_reference_confirmations"
FOR EACH ROW EXECUTE FUNCTION validate_discovery_reference_confirmation_context();
--> statement-breakpoint
CREATE FUNCTION prevent_discovery_reference_confirmation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery reference confirmations are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "discovery_reference_confirmations_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_reference_confirmations"
FOR EACH ROW EXECUTE FUNCTION prevent_discovery_reference_confirmation_mutation();
