# 0005. Use workspace-scoped GitHub App installations

## Context

Jabso originally discovered public repositories through the GitHub identity connection used by Clerk sign-in. That mixed authentication with product authorization, could not reliably represent organization installations, and could not provide selected private repository metadata with a least-privilege model.

Repository connections need to belong to the active Jabso workspace rather than whichever user happens to be signed in. A workspace may need repositories from more than one GitHub user or organization, while a single GitHub installation must not be claimable by multiple Jabso workspaces.

## Decision

- Keep Clerk responsible for Jabso identity, sessions, memberships, and active workspace context.
- Use a separate GitHub App installation for repository discovery.
- Allow a Jabso workspace to own multiple installations, but enforce one Jabso workspace per GitHub installation.
- Request read-only repository metadata and no repository contents permission.
- Store a SHA-256 hash of a random, single-use installation state for at most 10 minutes. Never store the state value itself.
- Exchange the OAuth code only to verify that the installing user can access the installation, then discard the OAuth access token.
- Mint installation access tokens on demand and keep them only in server memory until shortly before GitHub expiry.
- Verify webhook signatures over the raw request body before updating or deleting installation metadata.
- Revalidate every browser-selected repository against the provider response before persisting a project connection.

## Consequences

- Selected public and private repository metadata can be connected to personal, team, and organization workspaces without expanding Clerk's role.
- Jabso stores installation account ID, login, type, repository selection, suspension state, and selected repository metadata. These identifiers may reveal private organization or repository names and are treated as sensitive metadata.
- Installation metadata remains until GitHub reports deletion or the Jabso workspace is permanently deleted. Repository metadata already attached to a project remains until explicit disconnect or permanent deletion of its owning data. OAuth user tokens and installation access tokens have no database retention period because they are never persisted.
- Deployments must configure the GitHub App ID, client credentials, private key, slug, and webhook secret on the server and apply the additive database migration before enabling the UI.
- Repository discovery depends on GitHub availability. Existing issue collection, dashboard reads, and MCP remain independent.

## Rejected alternatives

- **Reuse Clerk's GitHub OAuth token:** couples sign-in to repository authorization, represents one user rather than a workspace, and cannot safely model selected organization installations.
- **Store a personal access token:** gives broad, long-lived user authority and creates unnecessary secret retention.
- **Store installation tokens:** unnecessary because GitHub issues short-lived tokens on demand; persistence would increase breach impact.
- **Install one global Jabso integration:** prevents each workspace from selecting its own accounts and repositories and breaks tenant isolation.
