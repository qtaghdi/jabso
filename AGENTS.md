# Jabso repository instructions

## Product scope

Jabso is a private toy project for collecting application errors, grouping similar events into issues, and exposing safe debugging context to coding agents through MCP.

The current product priority is:

1. Sentry-compatible error ingestion
2. canonical event normalization and issue fingerprinting
3. PostgreSQL persistence
4. issue inbox and source maps
5. read-only MCP tools
6. Session Replay later

Do not broaden a change into APM, metrics, profiling, billing, or Session Replay unless the task explicitly requires it.

## Repository layout

- `apps/web`: Next.js 16 administration UI and SDK smoke test
- `apps/server`: Fastify collector and future HTTP/MCP adapters
- `domains/*`: Boundra domains, contracts, and public APIs
- `packages/sentry-compat`: byte-safe Sentry envelope parsing
- `packages/db`: Drizzle schema and database connection
- `packages/diagnostics`: isolated Boundra diagnostic recording
- `packages/config`: shared TypeScript configuration
- `spikes/replay`: preserved non-production Session Replay experiment

## Architecture boundaries

- `apps/*` are composition roots. Business logic belongs in domains or focused packages.
- Raw external protocols such as Sentry envelopes stay in Fastify adapters. Parse and validate them before calling a Boundra contract.
- Cross-domain imports must use each domain's declared public API. Never import another domain's internal files.
- UI HTTP handlers and MCP tools must call the same domain query/mutation handlers instead of querying the database independently.
- MCP starts read-only. Any write tool requires an explicit product and authorization decision.
- Start with PostgreSQL. Do not introduce a queue, Redis, ClickHouse, or a search service until a measured requirement justifies it.

## Boundra rules

- Keep `boundra` pinned exactly to `0.2.2` while it is in public preview.
- Generated contracts use Zod and must define bounded input and result schemas before use.
- Run `pnpm boundra:check` after changing imports, manifests, public APIs, or domain dependencies.
- Boundra runtime failures must go through `@jabso/diagnostics`; never report them through the failing public ingestion contract.
- Diagnostics may store Boundra's safe `toJSON()` shape, but never original inputs, causes, tokens, cookies, request bodies, or environment variables.

## Data and privacy

- Never commit `.env*`, `.spike-dumps`, `.jabso-diagnostics`, production events, or raw user recordings.
- Project keys used by SDKs are identifiers, not administrator secrets; still validate project ID, key, origin, rate limit, and body size at ingestion.
- New persisted payloads require an explicit retention and PII-scrubbing decision.
- Session Replay masking must default to safe settings when Replay is eventually reintroduced.
- Breadcrumb persistence is limited to timestamp, category, level, and scrubbed message. Never persist breadcrumb data objects.
- Safe context uses an explicit browser/runtime/OS/device-family allowlist. Reject user identity, IP, auth, cookie, session, token, and raw request fields.

## Package and runtime policy

- Use pnpm workspaces. Do not add npm or Yarn lockfiles.
- Keep Node.js 24 compatibility.
- Add dependencies to the smallest workspace that owns them.
- Prefer platform and standard-library capabilities over new dependencies when the behavior remains clear and testable.
- Do not run `pnpm audit fix --force`; upgrade affected packages deliberately and verify breaking changes.

## Code conventions

- Use `kebab-case` for source file and directory names. Framework-reserved names such as `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `index.ts`, and tool config filenames are allowed.
- Dynamic route parameters also use kebab-case, for example `[issue-id]`; map them to camelCase variables inside TypeScript.
- Use `const` arrow functions for components, handlers, helpers, factories, and callbacks. Do not introduce function declarations. Framework-required named exports such as Next.js `GET` are exported `const` values.
- Use `PascalCase` for React components and exported types, `camelCase` for values and functions, and `SCREAMING_SNAKE_CASE` only for true process-wide constants.
- Prefer named exports. Default exports are limited to framework entry points such as Next.js pages and layouts.
- Keep files focused. A composition root may wire dependencies, but reusable logic belongs in a domain or focused package.
- Avoid barrel imports in runtime-sensitive code when a direct public entry point exists. Cross-domain imports still use the declared domain public API.
- Represent timestamps across contracts and Server/Client boundaries as ISO 8601 strings, not `Date` instances.
- Validate all external input at the adapter boundary and again through the owning Boundra contract. Never pass raw Sentry payloads into domain code.
- Return bounded collections. New list contracts must define a maximum limit and deterministic ordering before implementation.

## Server and database conventions

- Fastify adapters own HTTP status codes, headers, raw body handling, and external authentication. Domain implementations own use-case validation and orchestration.
- Read APIs, UI adapters, and future MCP tools must reuse the same Boundra query implementation.
- Keep SQL parameterized. Never interpolate request values into SQL text.
- Multi-row invariants and idempotency checks belong in a database transaction. Unique indexes remain the final concurrency guard.
- Drizzle schema changes require a generated migration in the same change. Never edit an already-applied migration; create a new one.
- Repository methods return contract-ready plain objects with ISO timestamp strings. Do not leak driver rows, clients, or transactions across boundaries.
- A new persisted field must document why it is needed, its PII risk, and its retention behavior. Raw event payloads stay prohibited.
- Resolving an issue records `resolved_at`. A later event reopens only resolved issues and records `regressed_at`; ignored issues remain ignored.

## Web conventions

- Prefer React Server Components for reads. Keep client components limited to actual browser state or SDK interaction.
- Next.js 16 `params`, `searchParams`, `cookies()`, and `headers()` are asynchronous and must be awaited.
- Fetch Jabso data through the read-only server API/domain path; do not query PostgreSQL from `apps/web`.
- Every data route needs explicit loading, empty, not-found, and failure behavior appropriate to its scope.
- Preserve keyboard navigation, visible focus styles, semantic landmarks, table headers, and sufficient color contrast.
- Do not expose database URLs, administrator credentials, or server-only project keys through `NEXT_PUBLIC_*` variables.

## Testing conventions

- Put tests next to the owning workspace under `test/` and name them `*.test.ts` or `*.test.tsx`.
- Test behavior at the narrowest useful layer, then add one integration test for each critical adapter-to-database path.
- Ingestion tests must cover grouping and duplicate `event_id` idempotency. Read API tests must cover project isolation and missing resources.
- PostgreSQL behavior is tested with PGlite in CI; provider-specific production behavior requires a separate smoke test.
- Tests must not depend on execution order, shared mutable databases, the network, or committed local environment files.

## Required verification

Run the smallest relevant checks during development. Before handing off a repository-wide change, run:

```bash
pnpm check
pnpm build
```

`pnpm check` includes lint, TypeScript, Vitest, and Boundra boundary validation. Parser changes require malformed and length-delimited envelope tests. Diagnostic changes require safe-serialization and recursion tests.

## Next.js work

Read `apps/web/AGENTS.md` before changing the Next.js app. Follow the version-matched documentation bundled under `apps/web/node_modules/next/dist/docs/` and preserve asynchronous request APIs required by Next.js 16.

## Git hygiene

- Keep commits logically scoped and stage explicit paths.
- Use imperative Conventional Commit subjects: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, or `ci:`.
- Use kebab-case branch names with a type prefix, for example `feat/issue-inbox` or `fix/envelope-length`.
- Open pull requests as ready for review. Do not create Draft PRs unless a task explicitly requests one.
- PR descriptions include a summary, scope exclusions, verification commands, and any migration, privacy, or deployment impact.
- Do not commit generated `.next`, `dist`, coverage, Turbo cache, local diagnostics, or fixture dumps.
- Preserve the original Replay spike under `spikes/replay` until sanitized golden fixtures cover its useful protocol behavior.
