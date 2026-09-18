# Jabso System Map

Use the section matching the request. Confirm current code and deployment settings because this map records ownership, not every implementation detail.

## Core Ownership

| Concern | Owner | Primary location |
| --- | --- | --- |
| User sign-in, sessions, organizations, membership | Better Auth in Next.js | `apps/web/src/shared/auth` |
| Tenant resolution and dashboard authorization | Next.js server | `apps/web/src/shared/auth/workspace-auth.ts` |
| UI routing and presentation | Next.js | `apps/web/src/app`, `screens`, `widgets`, `shared` |
| Sentry-compatible ingestion and external HTTP | Fastify | `apps/server` adapters |
| Product use cases and contracts | Boundra domains | `domains/*` |
| SQL persistence and schema | PostgreSQL adapters and `@jabso/db` | `apps/server/src/adapters/persistence`, `packages/db` |
| Repository access | GitHub App installation | server GitHub adapters and workspace installation rows |
| Agent access | Read-only MCP connections | MCP domain and server adapter |

## Identity and Workspace Path

1. Better Auth validates the session in the web deployment.
2. The active organization ID, or user ID for Personal, becomes an external workspace identity (`org:<id>` or `user:<id>`).
3. `workspace-auth.ts` resolves that identity to the persisted Jabso workspace and role.
4. Dashboard adapters forward only the internal workspace ID to product APIs.
5. Every project, issue, GitHub installation, and MCP connection query remains scoped to that workspace.

Never authorize with a workspace name, organization slug, browser-selected UUID, or unvalidated cookie. Another workspace's resource should generally look not found.

Better Auth organization tables and Jabso workspace tables currently share PostgreSQL. Coupled deletion is implemented in the server persistence layer as one transaction, including clearing active organization references; preserve that invariant.

## GitHub Paths

Sign-in:

`browser -> Better Auth GitHub OAuth -> user identity -> Jabso session`

Repository connection:

`Projects UI -> server installation state -> GitHub App install/authorization -> verified callback -> workspace installation -> short-lived installation token -> repository metadata`

OAuth client ID/secret belong to the web deployment. GitHub App ID, private key, client credentials, slug, and webhook secret belong to the server deployment. Callback and webhook URLs target the server; Better Auth's GitHub callback targets the web deployment.

## Error Ingestion and Issue Reads

`Sentry SDK -> Fastify envelope adapter -> bounded normalization -> domain handlers -> PostgreSQL`

`dashboard or MCP -> authenticated workspace/project scope -> shared issue query handler -> PostgreSQL`

Raw envelopes and unsafe context stop at the adapter. Dashboard and MCP reads must reuse the same domain query behavior rather than fork SQL.

## Deployment and Database

The web and server deployments require the same PostgreSQL database for the current identity/workspace model. The web needs it because Better Auth opens its adapter inside serverless web functions. Apply migrations before traffic reaches code that depends on them.

When diagnosing Production, verify the exact deployment and environment scope. Preview and Production may use different variables, database branches, URLs, cookies, callback registrations, and GitHub App installations.
