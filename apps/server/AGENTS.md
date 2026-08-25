# Collector server instructions

The root and `apps/AGENTS.md` instructions apply here.

## Fastify adapter rules

- `jabso-app.ts` is the composition root. Keep route bodies thin and delegate to Boundra domain handlers.
- Raw Sentry envelope parsing, request authentication, CORS, rate limits, content types, byte limits, and HTTP status mapping belong in this app.
- Public DSN keys authenticate ingestion only. Dashboard and release APIs require their dedicated administrator credentials.
- Never include tokens, request bodies, raw events, private source maps, or environment variables in logs or Boundra diagnostics.
- Keep OpenAPI accurate for implemented server routes, but do not expose documentation links in the private dashboard UI.

## PostgreSQL adapters

- Use the shared `SqlExecutor`, parameterized SQL, contract-ready plain objects, and ISO timestamps.
- postgres.js infers JSON/JSONB parameter types. When passing an already `JSON.stringify`-encoded value to raw SQL, cast through text (`$n::text::jsonb`) to prevent double encoding.
- Normalize legacy JSONB string values at read boundaries before returning a domain result. Do not let malformed stored JSON crash a dashboard route.
- Preserve project scoping in every query. A UUID alone never authorizes cross-project access.
- Dashboard routes require both the server-only dashboard token and an internal workspace ID resolved by the trusted web server. Project list, create, update, delete, issue, release, and repository paths must constrain SQL or project lookup by that workspace.
- Do not accept Clerk user IDs, organization IDs, or workspace names as direct project authorization in collector routes. Map external identities to internal workspace UUIDs through the workspace adapter first.
- Add a PGlite integration regression test for each adapter-to-database bug. When behavior can differ on Neon, assert PostgreSQL JSON types explicitly.

## Runtime behavior

- Keep ingestion successful when optional symbolication is missing or fails.
- Return bounded data and deterministic ordering from list endpoints.
- Prefer explicit error codes safe for operators; never leak internal causes to public ingestion clients.
