ALTER TABLE "discovery_assistance_runs" ADD COLUMN "provider_project_identifier" varchar(128);--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "provider_request_status" varchar(32);--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "provider_request_count" integer;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "provider_input_tokens" integer;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "provider_cached_input_tokens" integer;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "provider_output_tokens" integer;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "provider_total_tokens" integer;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "provider_duration_ms" integer;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "estimated_cost_microusd" integer;--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD COLUMN "cost_basis_key" varchar(64);--> statement-breakpoint
ALTER TABLE "discovery_assistance_runs" ADD CONSTRAINT "discovery_assistance_runs_request_metadata_shape_check" CHECK ((
        "discovery_assistance_runs"."provider_project_identifier" is null
        and "discovery_assistance_runs"."provider_request_status" is null
        and "discovery_assistance_runs"."provider_request_count" is null
        and "discovery_assistance_runs"."provider_input_tokens" is null
        and "discovery_assistance_runs"."provider_cached_input_tokens" is null
        and "discovery_assistance_runs"."provider_output_tokens" is null
        and "discovery_assistance_runs"."provider_total_tokens" is null
        and "discovery_assistance_runs"."provider_duration_ms" is null
        and "discovery_assistance_runs"."estimated_cost_microusd" is null
        and "discovery_assistance_runs"."cost_basis_key" is null
      ) or (
        "discovery_assistance_runs"."provider_key" = 'openai'
        and "discovery_assistance_runs"."provider_project_identifier" is not null
        and char_length(trim("discovery_assistance_runs"."provider_project_identifier")) > 0
        and "discovery_assistance_runs"."provider_request_status" is not null
        and "discovery_assistance_runs"."provider_request_status" = 'completed'
        and "discovery_assistance_runs"."provider_request_count" is not null
        and "discovery_assistance_runs"."provider_request_count" = 1
        and "discovery_assistance_runs"."provider_input_tokens" is not null
        and "discovery_assistance_runs"."provider_input_tokens" >= 0
        and "discovery_assistance_runs"."provider_cached_input_tokens" is not null
        and "discovery_assistance_runs"."provider_cached_input_tokens" >= 0
        and "discovery_assistance_runs"."provider_cached_input_tokens" <= "discovery_assistance_runs"."provider_input_tokens"
        and "discovery_assistance_runs"."provider_output_tokens" is not null
        and "discovery_assistance_runs"."provider_output_tokens" >= 0
        and "discovery_assistance_runs"."provider_total_tokens" is not null
        and "discovery_assistance_runs"."provider_total_tokens" = "discovery_assistance_runs"."provider_input_tokens" + "discovery_assistance_runs"."provider_output_tokens"
        and "discovery_assistance_runs"."provider_duration_ms" is not null
        and "discovery_assistance_runs"."provider_duration_ms" >= 0
        and "discovery_assistance_runs"."provider_duration_ms" <= 30000
        and "discovery_assistance_runs"."estimated_cost_microusd" is not null
        and "discovery_assistance_runs"."estimated_cost_microusd" >= 0
        and "discovery_assistance_runs"."cost_basis_key" is not null
        and char_length(trim("discovery_assistance_runs"."cost_basis_key")) > 0
      ));