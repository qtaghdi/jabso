# Better Auth owns dashboard identity and organization sessions

## Context

Clerk's hosted script and provider-owned UI repeatedly failed on Jabso's production domain and constrained form, validation, loading, and organization flows. Jabso already keeps product authorization behind an internal workspace boundary, so changing the identity provider does not require changing collector, DSN, GitHub App, or MCP authorization.

## Decision

Jabso uses Better Auth with its Drizzle adapter, PostgreSQL session storage, email/password authentication, GitHub OAuth, and organization plugin. The Next.js app owns every authentication and workspace UI. A validated server session and active organization resolve to the existing `workspaces.external_id` boundary before any dashboard request reaches the collector.

The GitHub OAuth provider proves user identity only. Repository discovery continues to use a separate, workspace-bound GitHub App installation. MCP continues to use its own scoped bearer credentials.

Existing Clerk IDs are not claimed automatically. A reviewed operator may relink exactly one legacy workspace with `pnpm --filter @jabso/db db:relink-workspace -- --from=<old-external-id> --to=<new-external-id>` after verifying both identities.

## Consequences

- Jabso controls authentication markup, validation, loading, redirects, and session expiry behavior.
- The web deployment now needs database access because the Better Auth route runs in Next.js.
- Better Auth schema migration `0009` must run before the new web deployment receives traffic.
- Existing Clerk sessions, users, and organizations are not portable; users authenticate again and legacy workspaces require explicit relinking.
- Email verification, password reset, and shared serverless rate limits are defined by [0007](./0007-auth-email-and-rate-limits.md).
