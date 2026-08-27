# Read-only MCP uses the existing server and project allowlisted credentials

## Context

Jabso already exposes bounded project, issue, event, and release queries through Boundra domain implementations. Coding agents need the same safe debugging context without receiving the dashboard credential, a Clerk browser session, or a public ingestion DSN. The initial MCP surface is read-only and must work with Jabso's serverless deployment.

## Decision

Phase 4 adds a Streamable HTTP endpoint at `/mcp` to `apps/server`. Fastify owns routing, Origin validation, bearer authentication, rate limits, and protocol errors; the official MCP Web-standard transport owns Streamable HTTP framing. Each tool delegates to the same Boundra query implementation used by the HTTP dashboard API. Credential lookup, allowlist resolution, and audit persistence stay in the MCP infrastructure store rather than tool handlers.

The first deployment is stateless and returns JSON responses. It does not require resumable sessions, server notifications, prompts, resources, or a second deployable application. MCP protocol code remains isolated under `apps/server/src/mcp` so it can be extracted later if independent scaling is measured.

An MCP connection belongs to one internal workspace and an explicit allowlist of one or more projects. A new project is never added to an existing connection automatically. Its bearer credential is generated from at least 32 random bytes, shown once, and stored only as a SHA-256 hash plus a non-secret display prefix. The public DSN, global dashboard token, Clerk token, and source-map administrator token cannot authenticate MCP.

The first tools are:

- `list_projects`
- `search_issues`
- `get_issue`
- `get_event`
- `get_issue_occurrences`
- `get_release_regressions`

All tool inputs and outputs are bounded Zod schemas. Every project-bearing call checks the connection allowlist before invoking the domain query. Another workspace's or unlisted project returns not found. Responses contain only the existing safe context allowlist and never expose source-map contents, tokens, cookies, authorization headers, request bodies, user identity, IP addresses, or arbitrary event payloads.

Each call records connection ID, workspace ID, project ID when present, tool name, outcome, duration, and timestamp. Arguments and results are not retained in the audit row because search text and error context can contain sensitive source or customer data. Revocation takes effect on the next request.

Audit rows are retained for 30 days. The store performs a bounded workspace-scoped expiry pass when it records a call, so the MVP does not require a separate scheduler. Connection metadata, token hashes, and revocation timestamps remain until the connection is hard-deleted by a future retention job; token hashes are irreversible values derived from random credentials and the raw credential is never persisted.

## Consequences

- MCP and the private dashboard can evolve independently even if the dashboard identity provider changes.
- Existing domain contracts remain the single source of truth for UI, HTTP, and MCP reads.
- One server deployment and stateless requests fit the current Vercel topology.
- Creating and revoking connections requires new database tables, dashboard endpoints, and a small credential-management UI.
- Project allowlists add one authorization lookup per request but prevent a leaked connection from automatically gaining access to future projects.

## Rejected alternatives

- A separate MCP service was rejected for Phase 4 because it would duplicate deployment configuration and database adapters before scaling requires it.
- Reusing the DSN key was rejected because it is intentionally public and authorizes ingestion only.
- Reusing `JABSO_DASHBOARD_TOKEN` was rejected because it is an application-to-application credential with access to every workspace.
- Reusing a Clerk session was rejected because MCP clients are not browser sessions and the MCP lifecycle must not depend on the dashboard identity provider.
- Direct SQL in tools was rejected because it would fork validation, privacy, and workspace authorization from the existing domain query path.
- Write tools were deferred until a separate product, authorization, and confirmation design is approved.

## Implementation slices

1. Add MCP connection, project allowlist, and audit schemas with an additive migration and cross-workspace tests.
2. Add credential creation, one-time display, listing, and revocation through workspace-authorized dashboard routes.
3. Add the stateless `/mcp` transport and the six read-only tools over existing domain implementations.
4. Add protocol tests, bounded-output tests, Origin validation, revocation, audit, and negative project-isolation stories.
5. Add the dashboard connection UI and a copyable client configuration example.

## References

- [MCP Streamable HTTP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Official TypeScript SDK server guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- [Official TypeScript SDK HTTP serving guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md)
