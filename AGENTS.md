# Jabso repository instructions

## Product scope

Jabso is a private toy project for collecting application errors, grouping similar events into issues, and exposing safe debugging context to coding agents through MCP.

The current product priority is:

1. preserve the completed Sentry-compatible ingestion and issue workflow
2. release modeling and source-map symbolication
3. read-only MCP tools over the existing domain queries
4. operational hardening and retention
5. Session Replay later

`docs/implementation-plan.html` is the single source of truth for phase scope, completion history, and exit criteria. Keep README as a concise status summary; do not create a duplicate Markdown implementation plan.

Do not broaden a change into APM, metrics, profiling, billing, or Session Replay unless the task explicitly requires it.

## Repository layout

- `apps/web`: Next.js 16 administration UI and SDK smoke test
- `apps/server`: Fastify collector and future HTTP/MCP adapters
- `domains/*`: Boundra domains, contracts, and public APIs
- `packages/sentry-compat`: byte-safe Sentry envelope parsing
- `packages/db`: Drizzle schema and database connection
- `packages/diagnostics`: isolated Boundra diagnostic recording
- `packages/symbolication`: source-map validation, path normalization, and frame mapping
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

- Keep `boundra` pinned exactly to `0.5.0` while it is in public preview.
- Generated contracts use Zod and must define bounded input and result schemas before use.
- Run `pnpm boundra:check` after changing imports, manifests, public APIs, or domain dependencies.
- Boundra runtime failures must go through `@jabso/diagnostics`; never report them through the failing public ingestion contract.
- Diagnostics may store Boundra's safe `toJSON()` shape, but never original inputs, causes, tokens, cookies, request bodies, or environment variables.
- Record every newly discovered Boundra package defect, boundary problem, contract mismatch, or diagnostic failure under `docs/boundra-report/` in the same change that investigates or fixes it. Update its index, state whether the problem is an upstream Boundra candidate or a Jabso integration issue, and never paste raw event data or secrets into a report.

## Data and privacy

- Never commit `.env*`, `.spike-dumps`, `.jabso-diagnostics`, production events, or raw user recordings.
- Project keys used by SDKs are identifiers, not administrator secrets; still validate project ID, key, origin, rate limit, and body size at ingestion.
- New persisted payloads require an explicit retention and PII-scrubbing decision.
- Session Replay masking must default to safe settings when Replay is eventually reintroduced.
- Breadcrumb persistence is limited to timestamp, category, level, and scrubbed message. Never persist breadcrumb data objects.
- Safe context uses an explicit browser/runtime/OS/device-family allowlist. Reject user identity, IP, auth, cookie, session, token, and raw request fields.
- Every dashboard-owned project belongs to one persisted workspace. Personal workspaces map to a Clerk user; team and organization workspaces map to a Clerk Organization.
- Treat the active Clerk context as identity input, resolve it server-side to an internal workspace ID, and include that workspace ID in every project-scoped query and mutation. Never authorize with a client cookie, project UUID, or organization label alone.
- New tenant-aware code requires a negative cross-workspace integration test. Return not found for another workspace's project to avoid leaking resource existence.
- Never auto-claim unassigned legacy rows during sign-in or onboarding. Ownership backfills require a reviewed one-time migration with an explicit target workspace.

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

## Release and source-map conventions

- A release is project-scoped. Artifact lookup must require an exact project, release, optional dist, and normalized artifact path match; do not use fuzzy cross-release fallback.
- Source-map upload uses an administrator credential, never the public DSN key. Keep the current 5 MiB decoded byte limit, 50-artifact release limit, 2,000-character path limit, and 100-event backfill batch unless a measured requirement changes them.
- Preserve original stack frames. Store symbolicated frames and symbolication status separately so a missing or malformed map never makes ingestion fail.
- For the toy-project MVP, store bounded artifact bytes, metadata, and checksums inside the PostgreSQL-backed release store adapter. Do not add object storage until measured size or deployment constraints justify it.
- Treat source maps and `sourcesContent` as private source code. Do not expose their raw contents through UI, logs, public APIs, diagnostics, or MCP responses.
- Until measured load requires a worker, use bounded retry/backfill over persisted pending state. Do not add Redis or a queue only for Phase 3.

## Repository connection conventions

- Repository connections store provider metadata and an optional normalized repository-relative root only. Never persist OAuth access tokens, refresh tokens, Git credentials, source archives, or arbitrary provider responses.
- Treat private repository names and paths as sensitive metadata. Do not expose them through public ingestion, diagnostics, logs, or unauthenticated APIs.
- Revalidate a repository selection against the provider response on the server before persisting it; never trust repository metadata submitted by the browser.
- Discover GitHub repositories only through a workspace-bound GitHub App installation. Installation access may include selected public or private repositories, must stay read-only for metadata, and must never be inferred from the Clerk sign-in connection.

## Web conventions

- Keep the Next.js application under `apps/web/src`. Use `src/...` absolute imports within the web workspace; do not use the `@/` alias.
- Keep routing and framework adapters in `src/app`, routed presentation in `src/screens`, reusable product assemblies in `src/widgets`, and common UI or technical adapters in `src/shared`.
- Keep dependencies directional: `app -> screens -> widgets -> shared`. Shared modules never depend on screens, widgets, or routes. Prefer direct module imports over runtime barrel files.
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

## Delivery discipline

- Establish the deployed baseline before implementing: fetch `origin`, inspect `origin/main`, open PRs, and commit ancestry. A feature that exists only on another branch or a PR based on a non-main branch is not part of the product.
- Separate four states in every report: implemented locally, pushed to a branch, deployed to Preview, and verified in Production. Never use “deployed” or “working” as a substitute for the exact state that was actually checked.
- Reproduce failures and trace the complete request path before editing. For slow pages, count remote calls and identify client hydration waterfalls, duplicate reads, cold starts, and region latency instead of guessing from the visible spinner.
- Verify product behavior, not only compilation. A green build proves the bundle is valid; it does not prove authentication, SDK delivery, database migrations, GitHub discovery, or the signed-in dashboard flow.
- Apply additive database migrations before exercising code that depends on the new schema. Record the migration and deployment impact in the PR.
- When a requested feature already exists elsewhere, restore or cherry-pick the original scoped commits after verifying their base and dependencies. Do not silently recreate a partial version.
- Before handoff, compare `origin/main...HEAD`, run the required checks, inspect the final PR body and status checks, and confirm the worktree is clean.
- Never place Markdown containing backticks, dollar signs, or command substitutions directly inside a shell argument. Write PR bodies and release notes to a temporary file with `apply_patch`, then pass the file through `--body-file` or the equivalent.

## Git hygiene

- Keep commits logically scoped and stage explicit paths.
- Use imperative Conventional Commit subjects: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, or `ci:`.
- Use kebab-case branch names with a type prefix, for example `feat/issue-inbox` or `fix/envelope-length`.
- Open pull requests as ready for review. Do not create Draft PRs unless a task explicitly requests one.
- After creating a PR, inspect it with `gh pr view` to confirm the base branch, included commits, non-Draft state, and uncorrupted body before reporting it.
- PR descriptions include a summary, scope exclusions, verification commands, and any migration, privacy, or deployment impact.
- Do not commit generated `.next`, `dist`, coverage, Turbo cache, local diagnostics, or fixture dumps.
- Preserve the original Replay spike under `spikes/replay` until sanitized golden fixtures cover its useful protocol behavior.
