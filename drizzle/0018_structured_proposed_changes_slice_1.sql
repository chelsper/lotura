CREATE TYPE "public"."discovery_mapping_action" AS ENUM('update_process_purpose', 'change_process_owner', 'preserve_unresolved');--> statement-breakpoint
CREATE TYPE "public"."discovery_mapping_item_state" AS ENUM('active', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."discovery_mapping_status" AS ENUM('draft', 'ready_for_proposal_review');--> statement-breakpoint
CREATE TABLE "discovery_proposal_mappings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_proposal_mappings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" integer NOT NULL,
	"proposal_stable_key" uuid NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"process_id" integer NOT NULL,
	"process_stable_key" uuid NOT NULL,
	"status" "discovery_mapping_status" DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"ready_at" timestamp with time zone,
	"ready_by_actor" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_mappings_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_mappings_proposal_unique" UNIQUE("proposal_id"),
	CONSTRAINT "discovery_mappings_identity_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "discovery_mappings_identity_session_unique" UNIQUE("id","organization_id","stable_key","session_id","session_stable_key"),
	CONSTRAINT "discovery_mappings_revision_positive_check" CHECK ("discovery_proposal_mappings"."revision" >= 1),
	CONSTRAINT "discovery_mappings_actor_not_blank_check" CHECK (char_length(trim("discovery_proposal_mappings"."actor_identifier")) > 0),
	CONSTRAINT "discovery_mappings_ready_state_check" CHECK (("discovery_proposal_mappings"."status" = 'draft' and "discovery_proposal_mappings"."ready_at" is null and "discovery_proposal_mappings"."ready_by_actor" is null) or ("discovery_proposal_mappings"."status" = 'ready_for_proposal_review' and "discovery_proposal_mappings"."ready_at" is not null and "discovery_proposal_mappings"."ready_by_actor" is not null and char_length(trim("discovery_proposal_mappings"."ready_by_actor")) > 0))
);
--> statement-breakpoint
CREATE TABLE "discovery_mapping_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_mapping_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"mapping_id" integer NOT NULL,
	"mapping_stable_key" uuid NOT NULL,
	"item_stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"item_sequence" integer NOT NULL,
	"state" "discovery_mapping_item_state" DEFAULT 'active' NOT NULL,
	"action" "discovery_mapping_action" NOT NULL,
	"owner_role_id" integer,
	"owner_role_stable_key" uuid,
	"before_state" jsonb NOT NULL,
	"proposed_state" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_mapping_items_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_mapping_items_item_sequence_unique" UNIQUE("mapping_id","item_stable_key","item_sequence"),
	CONSTRAINT "discovery_mapping_items_revision_identity_unique" UNIQUE("id","organization_id","stable_key","mapping_id","mapping_stable_key"),
	CONSTRAINT "discovery_mapping_items_sequence_positive_check" CHECK ("discovery_mapping_items"."item_sequence" >= 1),
	CONSTRAINT "discovery_mapping_items_states_object_check" CHECK (jsonb_typeof("discovery_mapping_items"."before_state") = 'object' and jsonb_typeof("discovery_mapping_items"."proposed_state") = 'object'),
	CONSTRAINT "discovery_mapping_items_rationale_not_blank_check" CHECK (char_length(trim("discovery_mapping_items"."rationale")) > 0),
	CONSTRAINT "discovery_mapping_items_actor_not_blank_check" CHECK (char_length(trim("discovery_mapping_items"."actor_identifier")) > 0),
	CONSTRAINT "discovery_mapping_items_owner_role_pair_check" CHECK (("discovery_mapping_items"."owner_role_id" is null and "discovery_mapping_items"."owner_role_stable_key" is null) or ("discovery_mapping_items"."owner_role_id" is not null and "discovery_mapping_items"."owner_role_stable_key" is not null)),
	CONSTRAINT "discovery_mapping_items_target_shape_check" CHECK (("discovery_mapping_items"."action" = 'change_process_owner') or ("discovery_mapping_items"."action" in ('update_process_purpose', 'preserve_unresolved') and "discovery_mapping_items"."owner_role_id" is null and "discovery_mapping_items"."owner_role_stable_key" is null)),
	CONSTRAINT "discovery_mapping_items_payload_shape_check" CHECK (("discovery_mapping_items"."action" = 'update_process_purpose' and "discovery_mapping_items"."before_state" ? 'purpose' and "discovery_mapping_items"."proposed_state" ? 'purpose') or ("discovery_mapping_items"."action" = 'change_process_owner' and "discovery_mapping_items"."before_state" ? 'ownerRoleStableKey' and "discovery_mapping_items"."proposed_state" ? 'ownerRoleStableKey') or ("discovery_mapping_items"."action" = 'preserve_unresolved' and "discovery_mapping_items"."proposed_state" ? 'question'))
);
--> statement-breakpoint
CREATE TABLE "discovery_mapping_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_mapping_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"mapping_id" integer NOT NULL,
	"mapping_stable_key" uuid NOT NULL,
	"item_revision_id" integer NOT NULL,
	"item_revision_stable_key" uuid NOT NULL,
	"session_id" integer NOT NULL,
	"session_stable_key" uuid NOT NULL,
	"observation_stable_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_mapping_sources_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_mapping_sources_item_observation_unique" UNIQUE("item_revision_id","observation_stable_key")
);
--> statement-breakpoint
ALTER TABLE "discovery_proposals" ADD CONSTRAINT "discovery_proposals_full_context_unique" UNIQUE("id","organization_id","stable_key","session_id","session_stable_key","process_id","process_stable_key");--> statement-breakpoint
ALTER TABLE "discovery_proposal_mappings" ADD CONSTRAINT "discovery_mappings_proposal_context_fk" FOREIGN KEY ("proposal_id","organization_id","proposal_stable_key","session_id","session_stable_key","process_id","process_stable_key") REFERENCES "public"."discovery_proposals"("id","organization_id","stable_key","session_id","session_stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_mapping_items" ADD CONSTRAINT "discovery_mapping_items_mapping_fk" FOREIGN KEY ("mapping_id","organization_id","mapping_stable_key") REFERENCES "public"."discovery_proposal_mappings"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_mapping_items" ADD CONSTRAINT "discovery_mapping_items_owner_role_fk" FOREIGN KEY ("owner_role_id","organization_id","owner_role_stable_key") REFERENCES "public"."roles"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_mapping_sources" ADD CONSTRAINT "discovery_mapping_sources_mapping_session_fk" FOREIGN KEY ("mapping_id","organization_id","mapping_stable_key","session_id","session_stable_key") REFERENCES "public"."discovery_proposal_mappings"("id","organization_id","stable_key","session_id","session_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_mapping_sources" ADD CONSTRAINT "discovery_mapping_sources_item_revision_fk" FOREIGN KEY ("item_revision_id","organization_id","item_revision_stable_key","mapping_id","mapping_stable_key") REFERENCES "public"."discovery_mapping_items"("id","organization_id","stable_key","mapping_id","mapping_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_mapping_sources" ADD CONSTRAINT "discovery_mapping_sources_observation_fk" FOREIGN KEY ("observation_stable_key","session_id","organization_id") REFERENCES "public"."discovery_observations"("stable_key","session_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_mappings_org_status_updated_idx" ON "discovery_proposal_mappings" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "discovery_mapping_items_mapping_created_idx" ON "discovery_mapping_items" USING btree ("organization_id","mapping_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "discovery_mapping_items_owner_role_idx" ON "discovery_mapping_items" USING btree ("owner_role_id");--> statement-breakpoint
CREATE INDEX "discovery_mapping_sources_observation_idx" ON "discovery_mapping_sources" USING btree ("organization_id","observation_stable_key");--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_discovery_mapping_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'discovery proposal mappings cannot be deleted';
	END IF;
	IF NEW.stable_key IS DISTINCT FROM OLD.stable_key
		OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
		OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
		OR NEW.proposal_stable_key IS DISTINCT FROM OLD.proposal_stable_key
		OR NEW.session_id IS DISTINCT FROM OLD.session_id
		OR NEW.session_stable_key IS DISTINCT FROM OLD.session_stable_key
		OR NEW.process_id IS DISTINCT FROM OLD.process_id
		OR NEW.process_stable_key IS DISTINCT FROM OLD.process_stable_key
		OR NEW.actor_identifier IS DISTINCT FROM OLD.actor_identifier
		OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
		RAISE EXCEPTION 'discovery mapping source context is immutable';
	END IF;
	IF NEW.revision <> OLD.revision + 1 THEN
		RAISE EXCEPTION 'discovery mapping revision must advance by exactly one';
	END IF;
	IF OLD.status = 'ready_for_proposal_review' THEN
		RAISE EXCEPTION 'review-ready discovery mappings cannot be changed';
	END IF;
	IF OLD.status = 'draft'
		AND NEW.status NOT IN ('draft', 'ready_for_proposal_review') THEN
		RAISE EXCEPTION 'invalid discovery mapping transition';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_mappings_context_guard_trigger"
BEFORE UPDATE OR DELETE ON "discovery_proposal_mappings"
FOR EACH ROW
EXECUTE FUNCTION protect_discovery_mapping_context();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_discovery_mapping_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery mapping item revisions are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_mapping_items_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_mapping_items"
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_mapping_item_mutation();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_discovery_mapping_source_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery mapping source links are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_mapping_sources_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_mapping_sources"
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_mapping_source_mutation();
