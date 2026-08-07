CREATE TYPE "public"."process_dependency_type" AS ENUM('requires', 'receives_from', 'provides_to', 'triggers');--> statement-breakpoint
CREATE TABLE "process_dependencies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "process_dependencies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"source_process_id" integer NOT NULL,
	"target_process_id" integer NOT NULL,
	"dependency_type" "process_dependency_type" NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_dependencies_source_target_type_unique" UNIQUE("source_process_id","target_process_id","dependency_type"),
	CONSTRAINT "process_dependencies_distinct_processes_check" CHECK ("process_dependencies"."source_process_id" <> "process_dependencies"."target_process_id")
);
--> statement-breakpoint
CREATE TABLE "process_systems" (
	"organization_id" integer NOT NULL,
	"process_id" integer NOT NULL,
	"system_id" integer NOT NULL,
	"usage" text NOT NULL,
	CONSTRAINT "process_systems_process_id_system_id_pk" PRIMARY KEY("process_id","system_id")
);
--> statement-breakpoint
ALTER TABLE "process_dependencies" ADD CONSTRAINT "process_dependencies_source_process_organization_fk" FOREIGN KEY ("source_process_id","organization_id") REFERENCES "public"."processes"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_dependencies" ADD CONSTRAINT "process_dependencies_target_process_organization_fk" FOREIGN KEY ("target_process_id","organization_id") REFERENCES "public"."processes"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_systems" ADD CONSTRAINT "process_systems_process_organization_fk" FOREIGN KEY ("process_id","organization_id") REFERENCES "public"."processes"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_systems" ADD CONSTRAINT "process_systems_system_organization_fk" FOREIGN KEY ("system_id","organization_id") REFERENCES "public"."systems"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_dependencies_target_process_id_idx" ON "process_dependencies" USING btree ("target_process_id");--> statement-breakpoint
CREATE INDEX "process_dependencies_organization_id_type_idx" ON "process_dependencies" USING btree ("organization_id","dependency_type");--> statement-breakpoint
CREATE INDEX "process_systems_system_id_idx" ON "process_systems" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "process_systems_organization_id_idx" ON "process_systems" USING btree ("organization_id");