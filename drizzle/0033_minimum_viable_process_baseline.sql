ALTER TYPE "public"."discovery_inquiry_review_outcome_kind" ADD VALUE 'possible_new_process_family' BEFORE 'spans_multiple_processes';--> statement-breakpoint
ALTER TYPE "public"."discovery_inquiry_review_outcome_kind" ADD VALUE 'possible_policy' BEFORE 'spans_multiple_processes';--> statement-breakpoint
ALTER TABLE "discovery_inquiry_review_outcomes" DROP CONSTRAINT "discovery_inquiry_review_outcomes_required_explanation_check";--> statement-breakpoint
ALTER TABLE "discovery_inquiry_review_outcomes" ADD CONSTRAINT "discovery_inquiry_review_outcomes_required_explanation_check" CHECK (
	"discovery_inquiry_review_outcomes"."outcome_kind" NOT IN (
		'possible_new_process',
		'possible_new_process_family',
		'possible_policy',
		'spans_multiple_processes',
		'additional_validation_required'
	) OR "discovery_inquiry_review_outcomes"."explanation" IS NOT NULL
);--> statement-breakpoint
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
	IF OLD.status = 'paused' AND NOT (
		(NEW.status = 'in_progress'
			AND NEW.current_question_key IS NOT DISTINCT FROM OLD.current_question_key)
		OR (NEW.status = 'ready_for_review'
			AND NEW.current_question_key = 'review')
	) THEN
		RAISE EXCEPTION 'paused discovery inquiry sessions may only resume or move to review';
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
