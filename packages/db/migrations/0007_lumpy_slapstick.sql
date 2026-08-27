CREATE TABLE "mcp_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"tool" text NOT NULL,
	"outcome" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_connection_projects" (
	"connection_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_connection_id_mcp_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."mcp_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_connection_projects" ADD CONSTRAINT "mcp_connection_projects_connection_id_mcp_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."mcp_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_connection_projects" ADD CONSTRAINT "mcp_connection_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_connections" ADD CONSTRAINT "mcp_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_audit_logs_connection_occurred_idx" ON "mcp_audit_logs" USING btree ("connection_id","occurred_at");--> statement-breakpoint
CREATE INDEX "mcp_audit_logs_workspace_occurred_idx" ON "mcp_audit_logs" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_connection_projects_connection_project_uidx" ON "mcp_connection_projects" USING btree ("connection_id","project_id");--> statement-breakpoint
CREATE INDEX "mcp_connection_projects_project_idx" ON "mcp_connection_projects" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_connections_token_hash_uidx" ON "mcp_connections" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "mcp_connections_workspace_created_idx" ON "mcp_connections" USING btree ("workspace_id","created_at");