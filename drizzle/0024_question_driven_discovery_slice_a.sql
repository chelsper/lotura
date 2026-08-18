CREATE TYPE "public"."discovery_inquiry_route_kind" AS ENUM('review_process', 'review_process_family', 'start_guided_interview', 'wait_for_source', 'finish_for_now');--> statement-breakpoint
CREATE TYPE "public"."discovery_inquiry_status" AS ENUM('open', 'waiting_for_information', 'routed', 'closed_for_now');--> statement-breakpoint
CREATE TABLE "discovery_inquiries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_inquiries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"question_text" text NOT NULL,
	"status" "discovery_inquiry_status" DEFAULT 'open' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_inquiries_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_inquiries_identity_context_unique" UNIQUE("id","organization_id","stable_key"),
	CONSTRAINT "discovery_inquiries_question_shape_check" CHECK (char_length(trim("discovery_inquiries"."question_text")) > 0 and char_length("discovery_inquiries"."question_text") <= 2000),
	CONSTRAINT "discovery_inquiries_actor_not_blank_check" CHECK (char_length(trim("discovery_inquiries"."actor_identifier")) > 0),
	CONSTRAINT "discovery_inquiries_revision_positive_check" CHECK ("discovery_inquiries"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "discovery_inquiry_routes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_inquiry_routes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" integer NOT NULL,
	"inquiry_stable_key" uuid NOT NULL,
	"route_sequence" integer NOT NULL,
	"route_kind" "discovery_inquiry_route_kind" NOT NULL,
	"process_id" integer,
	"process_stable_key" uuid,
	"process_family_id" integer,
	"process_family_stable_key" uuid,
	"discovery_session_id" integer,
	"discovery_session_stable_key" uuid,
	"route_note" text,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_inquiry_routes_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_inquiry_routes_identity_context_unique" UNIQUE("id","organization_id","stable_key","inquiry_id","inquiry_stable_key"),
	CONSTRAINT "discovery_inquiry_routes_inquiry_sequence_unique" UNIQUE("inquiry_id","route_sequence"),
	CONSTRAINT "discovery_inquiry_routes_sequence_positive_check" CHECK ("discovery_inquiry_routes"."route_sequence" >= 1),
	CONSTRAINT "discovery_inquiry_routes_note_shape_check" CHECK ("discovery_inquiry_routes"."route_note" is null or (char_length(trim("discovery_inquiry_routes"."route_note")) > 0 and char_length("discovery_inquiry_routes"."route_note") <= 2000)),
	CONSTRAINT "discovery_inquiry_routes_actor_not_blank_check" CHECK (char_length(trim("discovery_inquiry_routes"."actor_identifier")) > 0),
	CONSTRAINT "discovery_inquiry_routes_target_shape_check" CHECK ((
        "discovery_inquiry_routes"."route_kind" = 'review_process'
        and "discovery_inquiry_routes"."process_id" is not null
        and "discovery_inquiry_routes"."process_stable_key" is not null
        and "discovery_inquiry_routes"."process_family_id" is null
        and "discovery_inquiry_routes"."process_family_stable_key" is null
        and "discovery_inquiry_routes"."discovery_session_id" is null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is null
      ) or (
        "discovery_inquiry_routes"."route_kind" = 'review_process_family'
        and "discovery_inquiry_routes"."process_id" is null
        and "discovery_inquiry_routes"."process_stable_key" is null
        and "discovery_inquiry_routes"."process_family_id" is not null
        and "discovery_inquiry_routes"."process_family_stable_key" is not null
        and "discovery_inquiry_routes"."discovery_session_id" is null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is null
      ) or (
        "discovery_inquiry_routes"."route_kind" = 'start_guided_interview'
        and "discovery_inquiry_routes"."process_id" is not null
        and "discovery_inquiry_routes"."process_stable_key" is not null
        and "discovery_inquiry_routes"."process_family_id" is null
        and "discovery_inquiry_routes"."process_family_stable_key" is null
        and "discovery_inquiry_routes"."discovery_session_id" is not null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is not null
      ) or (
        "discovery_inquiry_routes"."route_kind" in ('wait_for_source', 'finish_for_now')
        and "discovery_inquiry_routes"."process_id" is null
        and "discovery_inquiry_routes"."process_stable_key" is null
        and "discovery_inquiry_routes"."process_family_id" is null
        and "discovery_inquiry_routes"."process_family_stable_key" is null
        and "discovery_inquiry_routes"."discovery_session_id" is null
        and "discovery_inquiry_routes"."discovery_session_stable_key" is null
      ))
);
--> statement-breakpoint
ALTER TABLE "discovery_inquiries" ADD CONSTRAINT "discovery_inquiries_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" ADD CONSTRAINT "discovery_inquiry_routes_inquiry_context_fk" FOREIGN KEY ("inquiry_id","organization_id","inquiry_stable_key") REFERENCES "public"."discovery_inquiries"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" ADD CONSTRAINT "discovery_inquiry_routes_process_context_fk" FOREIGN KEY ("process_id","organization_id","process_stable_key") REFERENCES "public"."processes"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" ADD CONSTRAINT "discovery_inquiry_routes_family_context_fk" FOREIGN KEY ("process_family_id","organization_id","process_family_stable_key") REFERENCES "public"."process_families"("id","organization_id","stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_inquiry_routes" ADD CONSTRAINT "discovery_inquiry_routes_session_context_fk" FOREIGN KEY ("discovery_session_id","organization_id","discovery_session_stable_key","process_id","process_stable_key") REFERENCES "public"."discovery_sessions"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_inquiries_org_status_updated_idx" ON "discovery_inquiries" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "discovery_inquiries_org_actor_created_idx" ON "discovery_inquiries" USING btree ("organization_id","actor_identifier","created_at");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_routes_org_inquiry_sequence_idx" ON "discovery_inquiry_routes" USING btree ("organization_id","inquiry_stable_key","route_sequence");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_routes_org_process_created_idx" ON "discovery_inquiry_routes" USING btree ("organization_id","process_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "discovery_inquiry_routes_org_family_created_idx" ON "discovery_inquiry_routes" USING btree ("organization_id","process_family_stable_key","created_at");--> statement-breakpoint
CREATE FUNCTION protect_discovery_inquiry_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'discovery inquiries preserve organizational questions';
	END IF;

	IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
		OR NEW.stable_key IS DISTINCT FROM OLD.stable_key
		OR NEW.question_text IS DISTINCT FROM OLD.question_text
		OR NEW.actor_identifier IS DISTINCT FROM OLD.actor_identifier
		OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
		RAISE EXCEPTION 'discovery inquiry identity and question are immutable';
	END IF;

	IF NEW.revision <> OLD.revision + 1 THEN
		RAISE EXCEPTION 'discovery inquiry revision must advance by exactly one';
	END IF;

	IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
		RAISE EXCEPTION 'discovery inquiry update must record a new transaction time';
	END IF;

	IF OLD.status IN ('routed', 'closed_for_now') THEN
		RAISE EXCEPTION 'completed discovery inquiries cannot be changed';
	END IF;

	IF OLD.status = 'open'
		AND NEW.status NOT IN (
			'waiting_for_information',
			'routed',
			'closed_for_now'
		) THEN
		RAISE EXCEPTION 'invalid open discovery inquiry transition';
	END IF;

	IF OLD.status = 'waiting_for_information'
		AND NEW.status NOT IN ('open', 'routed', 'closed_for_now') THEN
		RAISE EXCEPTION 'invalid waiting discovery inquiry transition';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_inquiries_context_guard_trigger"
BEFORE UPDATE OR DELETE ON "discovery_inquiries"
FOR EACH ROW
EXECUTE FUNCTION protect_discovery_inquiry_context();--> statement-breakpoint
CREATE FUNCTION prevent_discovery_inquiry_route_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery inquiry routes are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "discovery_inquiry_routes_immutable_trigger"
BEFORE UPDATE OR DELETE ON "discovery_inquiry_routes"
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_inquiry_route_mutation();
