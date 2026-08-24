CREATE TYPE "public"."symbolication_status" AS ENUM('not_applicable', 'pending', 'completed', 'missing', 'failed');--> statement-breakpoint
CREATE TABLE "issue_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"release_id" uuid NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"previous_resolved_at" timestamp with time zone,
	"regressed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" text NOT NULL,
	"dist" text DEFAULT '' NOT NULL,
	"deployed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_map_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"path" text NOT NULL,
	"checksum" text NOT NULL,
	"content" "bytea" NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "dist" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "release_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "symbolicated_stacktrace" jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "symbolication_status" "symbolication_status" DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "symbolication_error_code" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "symbolicated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "issue_releases" ADD CONSTRAINT "issue_releases_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_releases" ADD CONSTRAINT "issue_releases_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_map_artifacts" ADD CONSTRAINT "source_map_artifacts_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_releases_issue_release_uidx" ON "issue_releases" USING btree ("issue_id","release_id");--> statement-breakpoint
CREATE INDEX "issue_releases_release_regressed_idx" ON "issue_releases" USING btree ("release_id","regressed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "releases_project_version_dist_uidx" ON "releases" USING btree ("project_id","version","dist");--> statement-breakpoint
CREATE INDEX "releases_project_created_idx" ON "releases" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "source_map_artifacts_release_path_uidx" ON "source_map_artifacts" USING btree ("release_id","path");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_release_symbolication_idx" ON "events" USING btree ("release_id","symbolication_status");--> statement-breakpoint
INSERT INTO "releases" ("project_id", "version", "dist")
SELECT DISTINCT "project_id", "release", coalesce("dist", '')
FROM "events"
WHERE "release" IS NOT NULL
ON CONFLICT ("project_id", "version", "dist") DO NOTHING;--> statement-breakpoint
UPDATE "events" AS "event"
SET "release_id" = "release"."id",
    "symbolication_status" = CASE
      WHEN jsonb_array_length(coalesce("event"."stacktrace", '[]'::jsonb)) > 0 THEN 'pending'::"symbolication_status"
      ELSE 'not_applicable'::"symbolication_status"
    END
FROM "releases" AS "release"
WHERE "event"."project_id" = "release"."project_id"
  AND "event"."release" = "release"."version"
  AND coalesce("event"."dist", '') = "release"."dist";--> statement-breakpoint
WITH "aggregated_issue_releases" AS (
  SELECT
    "issue_id",
    "release_id",
    count(*)::integer AS "event_count",
    min(coalesce("occurred_at", "received_at")) AS "first_seen_at",
    max(coalesce("occurred_at", "received_at")) AS "last_seen_at"
  FROM "events"
  WHERE "release_id" IS NOT NULL
  GROUP BY "issue_id", "release_id"
)
INSERT INTO "issue_releases" (
  "issue_id", "release_id", "event_count", "first_seen_at", "last_seen_at", "regressed_at"
)
SELECT
  "aggregate"."issue_id",
  "aggregate"."release_id",
  "aggregate"."event_count",
  "aggregate"."first_seen_at",
  "aggregate"."last_seen_at",
  CASE
    WHEN "issue"."regressed_at" BETWEEN "aggregate"."first_seen_at" AND "aggregate"."last_seen_at"
      THEN "issue"."regressed_at"
    ELSE NULL
  END
FROM "aggregated_issue_releases" AS "aggregate"
JOIN "issues" AS "issue" ON "issue"."id" = "aggregate"."issue_id"
ON CONFLICT ("issue_id", "release_id") DO NOTHING;
