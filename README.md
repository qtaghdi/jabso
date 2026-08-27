# Jabso

> A small, self-hosted error inbox for individuals and teams.

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
- A Next.js issue inbox with Clerk personal and organization workspaces
- Optional metadata links to public GitHub repositories
- Boundra runtime contracts and isolated internal diagnostics
- Six read-only MCP tools with workspace and project-scoped credentials
- One-time MCP bearer tokens, immediate revocation, and metadata-only audit logs

Session Replay and a first-party browser SDK are intentionally postponed.

## Technology

| Area | Technology |
| --- | --- |
| Monorepo | pnpm workspaces, Turborepo |
| Dashboard | Next.js 16, React 19, TanStack Query, Clerk |
| Collector | Fastify, Node.js 24 |
| Domain boundaries | Boundra 0.3.0, Zod |
| Database | PostgreSQL, Drizzle ORM |
| Symbolication | `@jridgewell/trace-mapping` |
| Logging | Pino |
| Tests | Vitest |
| Client integration | Sentry SDK compatibility, MCP Streamable HTTP |

Boundra defines and validates Jabso's domain contracts. Fastify owns the external HTTP and Sentry protocols, while PostgreSQL owns durable state.

## Architecture

```text
Sentry SDK
    |
    v
Fastify collector ---- Sentry protocol adapter
    |
    +------------------ MCP adapter
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
 Next.js UI    AI clients
```

Raw envelopes are parsed at the Fastify boundary. Only normalized events enter the domain layer. The dashboard API and MCP tools reuse the same project-scoped domain handlers instead of forking issue, event, or release queries.

## Run locally

### Requirements

- Node.js 24 or newer
- pnpm 11 through Corepack
- Docker with Compose, or an existing PostgreSQL database
- A Clerk application with GitHub sign-in and Organizations enabled

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
- MCP endpoint: `http://localhost:4000/mcp`

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
| `JABSO_DEV_CLERK_USER_ID` | Optional Clerk user ID that owns the local seeded project |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk server secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Jabso's Clerk sign-in route (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Jabso's Clerk sign-up route (`/sign-up`) |
| `NEXT_PUBLIC_JABSO_DSN` | DSN used by the built-in smoke test |

`JABSO_DASHBOARD_TOKEN`, `JABSO_ADMIN_TOKEN`, `CLERK_SECRET_KEY`, and the database URL must remain server-only. Never expose them through a `NEXT_PUBLIC_*` variable.

In Clerk, enable GitHub as a social connection and enable Organizations with **Membership optional**. Do not require organization membership: Clerk's required-membership session task inserts its own organization chooser before Jabso onboarding and duplicates workspace creation. After sign-up, Jabso shows an explicit transition state and then asks whether the first workspace is Personal, Team, or Organization. Personal workspaces are scoped to a Clerk user. Team and Organization workspaces both use Clerk Organizations for membership; Jabso stores their product kind separately. The sidebar switcher changes the active Clerk context and all dashboard API calls are scoped to the corresponding Jabso workspace.

Run `pnpm db:migrate` before deploying this version. Existing projects intentionally remain unassigned and invisible after the migration instead of being claimed by the first user who signs in. Assign legacy rows to a verified workspace with a reviewed, one-time database migration.

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

## Connect an MCP client

Open **MCP** in the dashboard, create a connection, and choose the projects it may inspect. Jabso shows the bearer token once and provides a copyable client configuration:

```json
{
  "mcpServers": {
    "jabso": {
      "url": "https://your-jabso-server.example/mcp",
      "headers": {
        "Authorization": "Bearer jabso_mcp_<one-time-token>"
      }
    }
  }
}
```

The connection exposes `list_projects`, `search_issues`, `get_issue`, `get_event`, `get_issue_occurrences`, and `get_release_regressions`. All tools are read-only. A connection can access only its selected projects, and revocation takes effect on its next request.

Jabso stores only the credential hash and a display prefix. MCP audit rows contain connection/workspace/project IDs, tool name, outcome, duration, and timestamp—never tool arguments, results, or the token—and expire after 30 days.

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

Projects, issues, releases, and repository connections are authorized through the active workspace. Cross-workspace reads return not found, and project administration requires a personal workspace owner or Clerk organization admin. Review these constraints before exposing a Jabso instance beyond a trusted environment.

Shared workspace deletion is restricted to organization admins. It permanently deletes the workspace and its projects, issues, events, releases, MCP connections, and member access; Personal workspaces cannot be deleted from Jabso.

## Boundra dogfooding

Jabso is also a real-world Boundra integration. Boundary violations, runtime contract failures, and host-adapter problems are recorded separately from application events through a recursion-guarded diagnostic sink. Diagnostics never include original inputs, secrets, cookies, request bodies, or raw events.

- [Boundra diagnostic policy](./docs/boundra-error-recording.md)
- [Boundra issue reports](./docs/boundra-report/README.md)

## Repository layout

```text
apps/
|-- web/                    # Next.js routes, screens, widgets, and shared web modules
`-- server/                 # Fastify composition root and protocol/persistence adapters

domains/
|-- project/
|-- event/
|-- issue/
|-- release/
|-- mcp/
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

The web workspace uses a shallow screen and widget structure:

```text
apps/web/src/
|-- app/                    # Next.js routes, layouts, and HTTP adapters
|-- screens/                # Route-specific product presentation
|-- widgets/                # Dashboard shell and workspace switcher assemblies
|-- shared/                 # UI, API, auth, query, providers, and integrations
`-- proxy.ts                # Next.js request proxy
```

Internal app imports use `src/...`, while server composition imports Boundra public APIs through `@domains/...`. Web dependencies point inward as `app -> screens -> widgets -> shared`. The server is organized as a composition root over HTTP, MCP, and PostgreSQL adapters. Concrete module imports are preferred over runtime barrel files. The complete rules live in [`apps/web/AGENTS.md`](./apps/web/AGENTS.md) and [`apps/server/AGENTS.md`](./apps/server/AGENTS.md).

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
- [x] Clerk authentication, workspace onboarding, tenant isolation, and shared dashboard UI
- [x] Read-only MCP tools with project-scoped authorization and audit logs
- [ ] Operational hardening and retention controls
- [ ] Session Replay, if the privacy and storage model can support it safely

The detailed phase scope, completion history, and exit criteria live in the [implementation plan](./docs/implementation-plan.html).

## License and support

Jabso is currently maintained as a private personal project. No stable public API, compatibility guarantee, hosted service, or support policy is provided yet.
