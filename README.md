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
- A Next.js issue inbox with Better Auth personal and organization workspaces
- Workspace-scoped GitHub App installations for selected public and private repository metadata
- Boundra runtime contracts and isolated internal diagnostics
- Six read-only MCP tools with workspace and project-scoped credentials
- One-time MCP bearer tokens, immediate revocation, and metadata-only audit logs

Session Replay and a first-party browser SDK are intentionally postponed.

## Technology

| Area | Technology |
| --- | --- |
| Monorepo | pnpm workspaces, Turborepo |
| Dashboard | Next.js 16, React 19, TanStack Query, Better Auth |
| Collector | Fastify, Node.js 24 |
| Domain boundaries | Boundra 0.5.0, Zod |
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
- A GitHub OAuth App for optional GitHub sign-in
- A GitHub App when repository connections are required

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
| `JABSO_DATABASE_URL` | PostgreSQL connection string used by the collector and Better Auth web route |
| `JABSO_ALLOWED_ORIGIN` | Allowed dashboard origin for collector CORS |
| `JABSO_DASHBOARD_TOKEN` | Server-only credential for dashboard API access |
| `JABSO_ADMIN_TOKEN` | Server-only credential for source-map administration |
| `JABSO_GITHUB_APP_ID` | Numeric GitHub App ID used to sign app JWTs |
| `JABSO_GITHUB_APP_CLIENT_ID` | GitHub App OAuth client ID used to verify the installing user |
| `JABSO_GITHUB_APP_CLIENT_SECRET` | GitHub App OAuth client secret |
| `JABSO_GITHUB_APP_PRIVATE_KEY_BASE64` | Base64-encoded GitHub App private key; decode only in server memory |
| `JABSO_GITHUB_APP_SLUG` | App URL slug used to start installation |
| `JABSO_GITHUB_APP_WEBHOOK_SECRET` | Secret used to verify GitHub webhook signatures |
| `JABSO_API_URL` | Collector URL used by the Next.js server |
| `JABSO_DEV_AUTH_USER_ID` | Optional Better Auth user ID that owns the local seeded project |
| `BETTER_AUTH_SECRET` | At least 32 random bytes used to sign and encrypt auth data |
| `BETTER_AUTH_URL` | Canonical dashboard origin, such as `https://jabso.vercel.app` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated allowed dashboard origins |
| `JABSO_GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth client ID used only for user sign-in |
| `JABSO_GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth client secret used only for user sign-in |
| `RESEND_API_KEY` | Resend credential used for verification and password-reset email |
| `JABSO_AUTH_EMAIL_FROM` | Verified Resend sender, such as `Jabso <auth@example.com>` |
| `NEXT_PUBLIC_JABSO_DSN` | DSN used by the built-in smoke test |

`JABSO_DASHBOARD_TOKEN`, `JABSO_ADMIN_TOKEN`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, both `JABSO_GITHUB_OAUTH_*` values, every `JABSO_GITHUB_APP_*` credential, and the database URL must remain server-only. Never expose them through a `NEXT_PUBLIC_*` variable.

Configure the GitHub OAuth callback as `https://<your-jabso-web>/api/auth/callback/github`. Verify the domain used by `JABSO_AUTH_EMAIL_FROM` in Resend before enabling email sign-up. Email/password accounts must verify their address before workspace setup; trusted GitHub OAuth accounts continue directly to onboarding. Password-reset links expire after one hour and revoke existing sessions when used. Organization owners and admins can invite verified email addresses, manage roles, cancel pending invitations, and remove members from Workspace settings. Invitation links expire after 48 hours. After sign-up, Jabso asks whether the first workspace is Personal, Team, or Organization. Personal workspaces are scoped to a Better Auth user. Team and Organization workspaces use Better Auth organizations for membership; Jabso stores their product kind separately. The sidebar switcher changes the active organization and every dashboard API call resolves it to an internal Jabso workspace.

Run `pnpm db:migrate` before deploying this version. Migration `0010` adds the database-backed rate-limit table required by serverless authentication routes; deploy the migration before the web build receives traffic. Existing workspaces are never claimed by the first user who signs in. After verifying the previous and current external identity IDs, relink exactly one workspace with `pnpm --filter @jabso/db db:relink-workspace -- --from=user:<previous-id> --to=user:<current-id>` or the equivalent `org:` IDs.

### Connect GitHub repositories

GitHub sign-in proves user identity; it does not grant Jabso repository access. Repository connections use a separate GitHub App installation owned by the active Jabso workspace. Configure the GitHub App with:

- Callback URL: `https://<your-jabso-server>/api/github/callback`
- Webhook URL: `https://<your-jabso-server>/webhooks/github`
- **Request user authorization during installation** enabled
- Repository metadata permission set to read-only; no contents permission is required
- Installation target set to **Any account** when organizations outside the owner account should install it

After running the latest database migration, open **Projects** and choose **Install GitHub App**. GitHub lets the installer select all repositories or specific repositories. Jabso then lists only repositories visible to installations connected to the active workspace. Installation access tokens are minted on demand and never stored in PostgreSQL.

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
- GitHub installation account identifiers are stored until the installation is removed from GitHub or the Jabso workspace is deleted. A project's connected repository metadata remains until it is explicitly disconnected or its owning data is permanently deleted.
- GitHub OAuth user tokens and short-lived installation access tokens are never persisted.
- Verification and password-reset tokens are stored only in Better Auth's expiring verification table. Jabso sends the requested address and transactional email content to Resend, but does not persist email bodies.

Projects, issues, releases, and repository connections are authorized through the active workspace. Cross-workspace reads return not found, and project administration requires a personal workspace owner or Better Auth organization owner/admin. Review these constraints before exposing a Jabso instance beyond a trusted environment.

Shared workspace deletion is restricted to organization admins. It permanently deletes the workspace and its projects, issues, events, releases, MCP connections, and member access; Personal workspaces cannot be deleted from Jabso.

## Boundra dogfooding

Jabso is also a real-world Boundra integration. Boundary violations, runtime contract failures, and host-adapter problems are recorded separately from application events through a recursion-guarded diagnostic sink. Diagnostics never include original inputs, secrets, cookies, request bodies, or raw events.

- [Boundra diagnostic policy](./docs/boundra-error-recording.md)
- [Boundra issue reports](./docs/boundra-report/README.md)

## Repository layout

```text
apps/
|-- web/                    # Next.js routes, screens, widgets, and shared web modules
`-- server/                 # Fastify composition root, ports, and protocol/persistence adapters

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

The web app uses `src/...` imports, while the server imports Boundra public APIs through runtime-resolvable `@jabso/domain-*` workspace packages and uses short relative paths internally. Web dependencies point inward as `app -> screens -> widgets -> shared`. The server is organized as a composition root over HTTP, MCP, and PostgreSQL adapters. Concrete module imports are preferred over runtime barrel files. The complete rules live in [`apps/web/AGENTS.md`](./apps/web/AGENTS.md) and [`apps/server/AGENTS.md`](./apps/server/AGENTS.md).

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
- [x] Better Auth authentication, workspace onboarding, tenant isolation, and shared dashboard UI
- [x] Workspace-scoped GitHub App installations and selected repository discovery
- [x] Read-only MCP tools with project-scoped authorization and audit logs
- [ ] Operational hardening and retention controls
- [ ] Session Replay, if the privacy and storage model can support it safely

The detailed phase scope, completion history, and exit criteria live in the [implementation plan](./docs/implementation-plan.html).

## License and support

Jabso is currently maintained as a private personal project. No stable public API, compatibility guarantee, hosted service, or support policy is provided yet.
