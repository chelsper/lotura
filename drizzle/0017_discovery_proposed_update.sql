CREATE TYPE "public"."discovery_proposal_disposition" AS ENUM('use_in_proposal', 'keep_documented', 'leave_for_later');--> statement-breakpoint
CREATE TYPE "public"."discovery_proposal_status" AS ENUM('draft', 'ready_for_review');--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_identity_process_unique" UNIQUE("id","organization_id","stable_key","process_id","process_stable_key");--> statement-breakpoint
CREATE TABLE "discovery_proposals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_proposals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"process_id" integer NOT NULL,
	"process_stable_key" uuid NOT NULL,
	"documented_process_snapshot" jsonb NOT NULL,
	"documented_process_fingerprint" varchar(64) NOT NULL,
	"status" "discovery_proposal_status" DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"ready_at" timestamp with time zone,
	"ready_by_actor" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_proposals_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_proposals_session_unique" UNIQUE("session_id"),
	CONSTRAINT "discovery_proposals_identity_session_unique" UNIQUE("id","organization_id","stable_key","session_id","session_stable_key"),
	CONSTRAINT "discovery_proposals_snapshot_object_check" CHECK (jsonb_typeof("discovery_proposals"."documented_process_snapshot") = 'object'),
	CONSTRAINT "discovery_proposals_fingerprint_check" CHECK ("discovery_proposals"."documented_process_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "discovery_proposals_revision_positive_check" CHECK ("discovery_proposals"."revision" >= 1),
	CONSTRAINT "discovery_proposals_actor_not_blank_check" CHECK (char_length(trim("discovery_proposals"."actor_identifier")) > 0),
	CONSTRAINT "discovery_proposals_ready_state_check" CHECK (("discovery_proposals"."status" = 'draft' and "discovery_proposals"."ready_at" is null and "discovery_proposals"."ready_by_actor" is null) or ("discovery_proposals"."status" = 'ready_for_review' and "discovery_proposals"."ready_at" is not null and "discovery_proposals"."ready_by_actor" is not null and char_length(trim("discovery_proposals"."ready_by_actor")) > 0))
);
--> statement-breakpoint
CREATE TABLE "discovery_proposal_decisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_proposal_decisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" integer NOT NULL,
	"proposal_stable_key" uuid NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"observation_stable_key" uuid NOT NULL,
	"decision_sequence" integer NOT NULL,
	"disposition" "discovery_proposal_disposition" NOT NULL,
	"review_note" text,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_proposal_decisions_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_proposal_decisions_observation_sequence_unique" UNIQUE("proposal_id","observation_stable_key","decision_sequence"),
	CONSTRAINT "discovery_proposal_decisions_sequence_positive_check" CHECK ("discovery_proposal_decisions"."decision_sequence" >= 1),
	CONSTRAINT "discovery_proposal_decisions_note_not_blank_check" CHECK ("discovery_proposal_decisions"."review_note" is null or char_length(trim("discovery_proposal_decisions"."review_note")) > 0),
	CONSTRAINT "discovery_proposal_decisions_actor_not_blank_check" CHECK (char_length(trim("discovery_proposal_decisions"."actor_identifier")) > 0)
);
--> statement-breakpoint
ALTER TABLE "discovery_proposals" ADD CONSTRAINT "discovery_proposals_session_process_fk" FOREIGN KEY ("session_id","organization_id","session_stable_key","process_id","process_stable_key") REFERENCES "public"."discovery_sessions"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_proposal_decisions" ADD CONSTRAINT "discovery_proposal_decisions_proposal_fk" FOREIGN KEY ("proposal_id","organization_id","proposal_stable_key","session_id","session_stable_key") REFERENCES "public"."discovery_proposals"("id","organization_id","stable_key","session_id","session_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_proposal_decisions" ADD CONSTRAINT "discovery_proposal_decisions_observation_fk" FOREIGN KEY ("observation_stable_key","session_id","organization_id") REFERENCES "public"."discovery_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_proposals_org_status_updated_idx" ON "discovery_proposals" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "discovery_proposal_decisions_proposal_created_idx" ON "discovery_proposal_decisions" USING btree ("organization_id","proposal_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "discovery_proposal_decisions_observation_idx" ON "discovery_proposal_decisions" USING btree ("organization_id","observation_stable_key","decision_sequence");--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_discovery_proposal_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'discovery proposals cannot be deleted';
	END IF;
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key
		OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
		OR NEW.session_id IS DISTINCT FROM OLD.session_id
		OR NEW.session_stable_key IS DISTINCT FROM OLD.session_stable_key
		OR NEW.process_id IS DISTINCT FROM OLD.process_id
		OR NEW.process_stable_key IS DISTINCT FROM OLD.process_stable_key
		OR NEW.documented_process_snapshot IS DISTINCT FROM OLD.documented_process_snapshot
		OR NEW.documented_process_fingerprint IS DISTINCT FROM OLD.documented_process_fingerprint
		OR NEW.actor_identifier IS DISTINCT FROM OLD.actor_identifier
		OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
		RAISE EXCEPTION 'discovery proposal source context is immutable';
	END IF;
	IF NEW.revision <> OLD.revision + 1 THEN
		RAISE EXCEPTION 'discovery proposal revision must advance by exactly one';
	END IF;
	IF OLD.status = 'ready_for_review' THEN
		RAISE EXCEPTION 'review-ready discovery proposals cannot be changed';
	END IF;
	IF OLD.status = 'draft' AND NEW.status NOT IN ('draft', 'ready_for_review') THEN
		RAISE EXCEPTION 'invalid discovery proposal transition';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_proposals_context_guard_trigger"
BEFORE UPDATE OR DELETE ON "discovery_proposals"
FOR EACH ROW
EXECUTE FUNCTION protect_discovery_proposal_context();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_discovery_proposal_decision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery proposal decisions are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_proposal_decisions_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_proposal_decisions"
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_proposal_decision_mutation();
