CREATE TYPE "public"."issue_status" AS ENUM('unresolved', 'resolved', 'ignored');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"message" text,
	"level" text DEFAULT 'error' NOT NULL,
	"platform" text,
	"environment" text,
	"release" text,
	"occurred_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stacktrace" jsonb,
	"tags" jsonb
);
--> statement-breakpoint
CREATE TABLE "internal_diagnostics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"code" text,
	"message" text NOT NULL,
	"contract" text,
	"operation" text,
	"issues" jsonb,
	"context" jsonb,
	"boundra_version" text NOT NULL,
	"jabso_version" text,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"title" text NOT NULL,
	"level" text DEFAULT 'error' NOT NULL,
	"status" "issue_status" DEFAULT 'unresolved' NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"dsn_project_id" text NOT NULL,
	"public_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug"),
	CONSTRAINT "projects_dsn_project_id_unique" UNIQUE("dsn_project_id"),
	CONSTRAINT "projects_public_key_unique" UNIQUE("public_key")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_project_event_id_uidx" ON "events" USING btree ("project_id","event_id");--> statement-breakpoint
CREATE INDEX "events_issue_received_idx" ON "events" USING btree ("issue_id","received_at");--> statement-breakpoint
CREATE INDEX "internal_diagnostics_occurred_idx" ON "internal_diagnostics" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_fingerprint_uidx" ON "issues" USING btree ("project_id","fingerprint");--> statement-breakpoint
CREATE INDEX "issues_project_last_seen_idx" ON "issues" USING btree ("project_id","last_seen_at");