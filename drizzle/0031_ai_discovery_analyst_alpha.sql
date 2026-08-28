ALTER TABLE "discovery_assistance_runs" ADD COLUMN "analyst_turn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "analysis_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD COLUMN "analyst_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD COLUMN "analyst_authorized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD COLUMN "analyst_authorization_version" varchar(64);--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD CONSTRAINT "discovery_assistance_runs_analysis_snapshot_shape_check" CHECK (("discovery_assistance_runs"."analyst_turn" = true and "discovery_assistance_runs"."assistance_kind" = 'question_suggestions' and "discovery_assistance_runs"."analysis_snapshot" is not null and jsonb_typeof("discovery_assistance_runs"."analysis_snapshot") = 'object') or ("discovery_assistance_runs"."analyst_turn" = false and "discovery_assistance_runs"."analysis_snapshot" is null));--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_analyst_authorization_shape_check" CHECK (("discovery_sessions"."analyst_enabled" = false and "discovery_sessions"."analyst_authorized_at" is null and "discovery_sessions"."analyst_authorization_version" is null) or ("discovery_sessions"."analyst_enabled" = true and "discovery_sessions"."analyst_authorized_at" is not null and "discovery_sessions"."analyst_authorization_version" is not null and char_length(trim("discovery_sessions"."analyst_authorization_version")) > 0));
--> statement-breakpoint
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
	IF OLD.analyst_enabled AND (
		NEW.analyst_enabled IS DISTINCT FROM OLD.analyst_enabled
		OR NEW.analyst_authorized_at IS DISTINCT FROM OLD.analyst_authorized_at
		OR NEW.analyst_authorization_version IS DISTINCT FROM OLD.analyst_authorization_version
	) THEN
		RAISE EXCEPTION 'discovery analyst authorization is immutable';
	END IF;
	IF NOT OLD.analyst_enabled AND NEW.analyst_enabled
		AND (OLD.status <> 'in_progress' OR NEW.status <> 'in_progress') THEN
		RAISE EXCEPTION 'discovery analyst mode requires an in-progress interview';
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
		AND NEW.current_question_key IS NOT DISTINCT FROM OLD.current_question_key
		AND NOT NEW.analyst_enabled THEN
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
		SELECT revision, current_question_key, status, actor_identifier
		INTO STRICT session_revision, session_prompt_key, session_status, session_actor
		FROM discovery_inquiry_sessions
		WHERE id = NEW.inquiry_session_id
		  AND organization_id = NEW.organization_id
		  AND stable_key = NEW.inquiry_session_stable_key;
	END IF;
	IF NEW.analyst_turn AND (
		NEW.session_kind <> 'process'
		OR NOT session_analyst_enabled
	) THEN
		RAISE EXCEPTION 'analyst assistance requires an authorized Process interview';
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
CREATE OR REPLACE FUNCTION validate_discovery_assistance_source_context()
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
			   OR source_created_at > run_record.created_at
			   OR EXISTS (
			     SELECT 1 FROM discovery_observations superseding
			     WHERE superseding.organization_id = NEW.organization_id
			       AND superseding.session_id = NEW.discovery_session_id
			       AND superseding.supersedes_observation_stable_key = NEW.discovery_observation_stable_key
			   )
			   OR (
			     NOT run_record.analyst_turn
			     AND (
			       source_prompt_key <> run_record.prompt_key
			       OR NEW.discovery_session_id >= run_record.discovery_session_id
			     )
			   )
			   OR (
			     run_record.analyst_turn
			     AND (
			       NEW.discovery_session_id <> run_record.discovery_session_id
			       OR NEW.discovery_session_stable_key <> run_record.discovery_session_stable_key
			     )
			   ) THEN
				RAISE EXCEPTION 'assistance observation is outside the reviewed Process context';
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
