---
name: jabso-architecture
description: Plan, implement, or review Jabso technical changes involving authentication, workspaces, collector APIs, PostgreSQL, GitHub integrations, MCP, ingestion, deployment, or cross-service consistency.
---

# Jabso Architecture

Use this skill before editing a cross-layer flow or diagnosing a failure that crosses the browser, Next.js, Fastify, PostgreSQL, Better Auth, GitHub, or Vercel. Read the repository `AGENTS.md` and the relevant package instructions first. Then read [references/system-map.md](references/system-map.md) for the affected path.

## Map the Request Before Editing

Write down the actual path in one line, for example:

`browser -> Next.js route -> authorized workspace -> collector API -> domain handler -> PostgreSQL`

Identify which layer owns identity, authorization, validation, orchestration, persistence, and presentation. Reproduce the failure at the narrowest observable boundary. Do not patch the first visible error until the complete path and authoritative data source are known.

## Non-Negotiable Boundaries

- Better Auth owns users, sessions, organizations, memberships, invitations, and sign-in providers.
- Jabso workspaces own tenant-scoped product data. Every dashboard project resolves through a validated user or active organization to an internal workspace ID.
- GitHub OAuth is identity only. Repository discovery uses workspace-bound GitHub App installations and never falls back to an OAuth user token.
- Next.js reads Jabso product data through authenticated adapters and collector/domain APIs. Direct PostgreSQL access in the web app is reserved for the server-only Better Auth adapter.
- Fastify owns external protocols and HTTP concerns. Boundra domains own product use cases. PostgreSQL adapters own SQL and transactional invariants.
- MCP remains read-only unless the user explicitly authorizes a product and security expansion.

## Consistency and Destructive Work

Treat coupled identity and product records as one invariant. If a mutation spans Better Auth organization rows and Jabso workspace rows in the same PostgreSQL database, centralize it in one server-side transaction. If systems cannot share a transaction, use a durable intent or idempotent retry design before exposing the destructive action. Never perform irreversible deletions sequentially and hope the second call succeeds.

Use parameterized SQL, database constraints as concurrency guards, and negative tenant-isolation tests. A schema change requires a new generated migration and a deployment-order note. A new persisted payload requires an explicit PII and retention decision.

## Integration Diagnosis

For auth, GitHub, or deployment failures, compare the configured URL and environment on the component that actually opens the connection:

- Better Auth and its database execute in the web deployment.
- Collector, GitHub App callbacks and webhooks, ingestion, and MCP execute in the server deployment.
- A green build does not prove a migration, callback, cookie, installation, or signed-in request works.

Verify identifiers at each boundary without printing secrets: user ID, organization ID, internal workspace ID, project ID, installation ID, and deployment origin. Distinguish local, Preview, and Production evidence.

## Implementation Exit Criteria

Add the narrow unit or adapter test first, then one integration test for a critical cross-layer invariant. Run boundary validation when imports or ownership change. Verify the rendered or HTTP behavior that motivated the change and state what could not be exercised.
