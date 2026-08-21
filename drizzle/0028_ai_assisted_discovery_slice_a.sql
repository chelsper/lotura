CREATE TABLE "discovery_observation_confirmations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discovery_observation_confirmations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"stable_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"process_id" integer NOT NULL,
	"process_stable_key" uuid NOT NULL,
	"confirmation_session_id" integer NOT NULL,
	"confirmation_session_stable_key" uuid NOT NULL,
	"confirmation_observation_stable_key" uuid NOT NULL,
	"source_session_id" integer NOT NULL,
	"source_session_stable_key" uuid NOT NULL,
	"source_observation_stable_key" uuid NOT NULL,
	"prompt_key" varchar(64) NOT NULL,
	"actor_identifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_observation_confirmations_stable_key_unique" UNIQUE("stable_key"),
	CONSTRAINT "discovery_confirmation_observation_unique" UNIQUE("confirmation_observation_stable_key"),
	CONSTRAINT "discovery_confirmation_sessions_distinct_check" CHECK ("discovery_observation_confirmations"."confirmation_session_id" <> "discovery_observation_confirmations"."source_session_id"),
	CONSTRAINT "discovery_confirmation_observations_distinct_check" CHECK ("discovery_observation_confirmations"."confirmation_observation_stable_key" <> "discovery_observation_confirmations"."source_observation_stable_key"),
	CONSTRAINT "discovery_confirmation_actor_not_blank_check" CHECK (char_length(trim("discovery_observation_confirmations"."actor_identifier")) > 0),
	CONSTRAINT "discovery_confirmation_prompt_not_blank_check" CHECK (char_length(trim("discovery_observation_confirmations"."prompt_key")) > 0)
);
--> statement-breakpoint
ALTER TABLE "discovery_observations" ADD CONSTRAINT "discovery_observations_prompt_context_unique" UNIQUE("stable_key","session_id","organization_id","prompt_key");--> statement-breakpoint
ALTER TABLE "discovery_observation_confirmations" ADD CONSTRAINT "discovery_confirmation_current_session_fk" FOREIGN KEY ("confirmation_session_id","organization_id","confirmation_session_stable_key","process_id","process_stable_key") REFERENCES "public"."discovery_sessions"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_observation_confirmations" ADD CONSTRAINT "discovery_confirmation_source_session_fk" FOREIGN KEY ("source_session_id","organization_id","source_session_stable_key","process_id","process_stable_key") REFERENCES "public"."discovery_sessions"("id","organization_id","stable_key","process_id","process_stable_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_observation_confirmations" ADD CONSTRAINT "discovery_confirmation_current_observation_fk" FOREIGN KEY ("confirmation_observation_stable_key","confirmation_session_id","organization_id","prompt_key") REFERENCES "public"."discovery_observations"("stable_key","session_id","organization_id","prompt_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_observation_confirmations" ADD CONSTRAINT "discovery_confirmation_source_observation_fk" FOREIGN KEY ("source_observation_stable_key","source_session_id","organization_id","prompt_key") REFERENCES "public"."discovery_observations"("stable_key","session_id","organization_id","prompt_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_confirmation_current_session_idx" ON "discovery_observation_confirmations" USING btree ("organization_id","confirmation_session_stable_key","created_at");--> statement-breakpoint
CREATE INDEX "discovery_confirmation_source_observation_idx" ON "discovery_observation_confirmations" USING btree ("organization_id","source_observation_stable_key");
--> statement-breakpoint
CREATE FUNCTION prevent_discovery_confirmation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'discovery observation confirmations are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER discovery_observation_confirmations_append_only
BEFORE UPDATE OR DELETE ON discovery_observation_confirmations
FOR EACH ROW
EXECUTE FUNCTION prevent_discovery_confirmation_mutation();
