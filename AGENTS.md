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

## Package and runtime policy

- Use pnpm workspaces. Do not add npm or Yarn lockfiles.
- Keep Node.js 24 compatibility.
- Add dependencies to the smallest workspace that owns them.
- Prefer platform and standard-library capabilities over new dependencies when the behavior remains clear and testable.
- Do not run `pnpm audit fix --force`; upgrade affected packages deliberately and verify breaking changes.

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
- Do not commit generated `.next`, `dist`, coverage, Turbo cache, local diagnostics, or fixture dumps.
- Preserve the original Replay spike under `spikes/replay` until sanitized golden fixtures cover its useful protocol behavior.
