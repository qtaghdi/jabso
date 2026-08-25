CREATE TABLE "project_repository_connections" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'github' NOT NULL,
	"external_id" text NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"default_branch" text NOT NULL,
	"private" boolean NOT NULL,
	"root_path" text DEFAULT '' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_repository_connections" ADD CONSTRAINT "project_repository_connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;