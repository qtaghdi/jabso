CREATE TABLE "github_installation_claims" (
	"claim_hash" text PRIMARY KEY NOT NULL,
	"installation_id" text NOT NULL,
	"account_id" text NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"repository_selection" text NOT NULL,
	"suspended_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_installation_requests" (
	"account_id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_installation_requests" ADD CONSTRAINT "github_installation_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_installation_claims_installation_id_uidx" ON "github_installation_claims" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "github_installation_claims_expires_idx" ON "github_installation_claims" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installation_requests_request_id_uidx" ON "github_installation_requests" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "github_installation_requests_expires_idx" ON "github_installation_requests" USING btree ("expires_at");