# Jabso

> A small, self-hosted error inbox for personal projects.

Jabso collects browser and server errors, groups similar events into issues, and provides the context needed to investigate them. It accepts Sentry-compatible error envelopes, so an existing Sentry SDK can send events to Jabso by changing its DSN.

The project intentionally focuses on a narrow workflow: **error collection, issue grouping, source-map symbolication, and agent-readable context**. It is not intended to reproduce every Sentry feature.

> [!WARNING]
> Jabso is currently a private alpha and a personal toy project. APIs, database schemas, and package names may change without notice. Do not use it as your only production error archive.

## What works today

- Sentry-compatible browser error ingestion
- Byte-safe Sentry envelope parsing
- Project-scoped DSNs and project management
- Fingerprint-based issue grouping and duplicate event protection
- Filtering by status, level, environment, release, and last-seen time
- Stable cursor pagination and recent occurrence history
- Resolve, ignore, and regression workflows
- Bounded breadcrumbs and allowlisted runtime context
- Release- and dist-aware source-map upload and stack symbolication
- Backfilling events when source maps arrive after ingestion
- A Next.js issue inbox protected by Clerk and a configured GitHub owner
- Optional metadata links to public GitHub repositories
- Boundra runtime contracts and isolated internal diagnostics

Read-only MCP tools are the next planned phase. Session Replay and a first-party browser SDK are intentionally postponed.

## Technology

| Area | Technology |
| --- | --- |
| Monorepo | pnpm workspaces, Turborepo |
| Dashboard | Next.js 16, React 19, TanStack Query, Clerk |
| Collector | Fastify, Node.js 24 |
| Domain boundaries | Boundra 0.2.2, Zod |
| Database | PostgreSQL, Drizzle ORM |
| Symbolication | `@jridgewell/trace-mapping` |
| Logging | Pino |
| Tests | Vitest |
| Client integration | Sentry SDK compatibility |

Boundra defines and validates Jabso's domain contracts. Fastify owns the external HTTP and Sentry protocols, while PostgreSQL owns durable state.

## Architecture

```text
Sentry SDK
    |
    v
Fastify collector ---- Sentry protocol adapter
    |
    v
Boundra contracts
    |-- event normalization
    |-- issue fingerprinting
    |-- release and symbolication workflows
    |-- persistence
             |
             v
         PostgreSQL
             ^
             |
      +------+------+
      |             |
 Next.js UI    MCP adapter (planned)
```

Raw envelopes are parsed at the Fastify boundary. Only normalized events enter the domain layer. The dashboard API and future MCP adapter reuse the same project-scoped domain handlers instead of querying PostgreSQL independently.

## Run locally

### Requirements

- Node.js 24 or newer
- pnpm 11 through Corepack
- Docker with Compose, or an existing PostgreSQL database
- A Clerk application with GitHub sign-in enabled

### Setup

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The services start at:

- Dashboard: `http://localhost:3999`
- Collector: `http://localhost:4000`
- SDK smoke test: `http://localhost:3999/smoke-test`
- Health check: `http://localhost:4000/health`
- Database readiness check: `http://localhost:4000/ready`

The seeded local DSN is:

```text
http://0123456789abcdef0123456789abcdef@localhost:4000/1
```

### Environment variables

Copy [`.env.example`](./.env.example) and replace every placeholder before deploying.

| Variable | Purpose |
| --- | --- |
| `JABSO_DATABASE_URL` | PostgreSQL connection string used by the collector |
| `JABSO_ALLOWED_ORIGIN` | Allowed dashboard origin for collector CORS |
| `JABSO_DASHBOARD_TOKEN` | Server-only credential for dashboard API access |
| `JABSO_ADMIN_TOKEN` | Server-only credential for source-map administration |
| `JABSO_API_URL` | Collector URL used by the Next.js server |
| `JABSO_OWNER_GITHUB_LOGIN` | The only GitHub login allowed into this private instance |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk server secret |
| `NEXT_PUBLIC_JABSO_DSN` | DSN used by the built-in smoke test |

`JABSO_DASHBOARD_TOKEN`, `JABSO_ADMIN_TOKEN`, `CLERK_SECRET_KEY`, and the database URL must remain server-only. Never expose them through a `NEXT_PUBLIC_*` variable.

For GitHub authentication, enable GitHub as a social connection in Clerk and set `JABSO_OWNER_GITHUB_LOGIN` to the account that owns the instance.

## Send an error

Install the Sentry SDK appropriate for your application. A minimal browser example is:

```bash
pnpm add @sentry/browser
```

```ts
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: 'https://<project-key>@<your-jabso-host>/<project-id>',
  environment: 'production',
  release: 'my-app@1.0.0',
})

Sentry.captureException(new Error('Jabso smoke test'))
```

Create or select a project in the dashboard to obtain its DSN. The onboarding view provides framework-specific installation and initialization snippets. After sending an event, open **Issues** to inspect the grouped issue, occurrences, breadcrumbs, context, release history, and symbolicated stack.

The DSN project key identifies the project and is used only for ingestion; it is not an administrator credential.

## Source maps

Source maps are uploaded with the separate `JABSO_ADMIN_TOKEN`, never with a public DSN key. Jabso matches artifacts by project, release, optional dist, and normalized artifact path. Raw source maps and `sourcesContent` are not exposed through the dashboard or read APIs.

See the [source-map artifact guide](./docs/source-map-artifacts.md) for upload, retry, size limits, and retention behavior.

## Privacy model

Jabso stores only bounded debugging data needed by the issue workflow.

- Raw request objects, user identity, and original event payloads are not persisted.
- Breadcrumbs are limited to the latest 50 timestamp, category, level, and scrubbed message entries.
- Context is restricted to an allowlist of browser, runtime, operating-system, and device-family fields.
- Tag keys related to users, email, tokens, sessions, cookies, and IP addresses are removed during ingestion.
- Original stack frames are retained separately from mapped frames.
- Source-map contents are treated as private source code.

Review these constraints before exposing a Jabso instance beyond a trusted personal environment.

## Boundra dogfooding

Jabso is also a real-world Boundra integration. Boundary violations, runtime contract failures, and host-adapter problems are recorded separately from application events through a recursion-guarded diagnostic sink. Diagnostics never include original inputs, secrets, cookies, request bodies, or raw events.

- [Boundra diagnostic policy](./docs/boundra-error-recording.md)
- [Boundra issue reports](./docs/boundra-report/README.md)

## Repository layout

```text
apps/
|-- web/                    # Next.js dashboard and SDK smoke test
`-- server/                 # Fastify collector and HTTP adapters

domains/
|-- project/
|-- event/
|-- issue/
|-- release/
`-- ingestion/              # Boundra contracts and public boundaries

packages/
|-- sentry-compat/          # Byte-safe envelope parser
|-- diagnostics/            # Isolated Boundra diagnostics
|-- symbolication/          # Source-map validation and frame mapping
|-- db/                     # Drizzle schema, migrations, and connection
`-- config/                 # Shared TypeScript configuration

spikes/
`-- replay/                 # Preserved, non-production Replay experiment
```

## Development commands

```bash
pnpm dev             # Run all development services
pnpm dev:web         # Run only the dashboard
pnpm dev:server      # Run only the collector
pnpm db:migrate      # Apply database migrations
pnpm db:seed         # Seed the local development project
pnpm check           # Lint, type-check, test, and validate Boundra boundaries
pnpm build           # Build all workspaces
pnpm boundra:graph   # Print the domain graph as Mermaid
```

Repository-wide architecture, security, testing, and Git conventions are documented in [`AGENTS.md`](./AGENTS.md).

## Roadmap

- [x] Monorepo, protocol spike preservation, and Boundra boundaries
- [x] Sentry-compatible ingestion and PostgreSQL issue grouping
- [x] Project-scoped read APIs and the initial issue inbox
- [x] Filtering, occurrences, safe context, and issue lifecycle
- [x] Releases, source maps, symbolication, and backfill
- [x] Owner authentication, onboarding, and shared dashboard UI
- [ ] Read-only MCP tools with project-scoped authorization and audit logs
- [ ] Operational hardening and retention controls
- [ ] Session Replay, if the privacy and storage model can support it safely

The detailed phase scope, completion history, and exit criteria live in the [implementation plan](./docs/implementation-plan.html).

## License and support

Jabso is currently maintained as a private personal project. No stable public API, compatibility guarantee, hosted service, or support policy is provided yet.
