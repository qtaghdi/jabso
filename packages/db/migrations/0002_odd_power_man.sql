ALTER TABLE "events" ADD COLUMN "breadcrumbs" jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "context" jsonb;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "status_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "regressed_at" timestamp with time zone;