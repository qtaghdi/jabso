# GitHub connection starts with public repositories

> Superseded by [0005. Use workspace-scoped GitHub App installations](./0005-workspace-github-app-installations.md). This document records the original public-only phase.

## Context

Jabso needs repository identity and an optional monorepo root so future release, source context, and MCP features can map an issue back to code. Reusing the sign-in OAuth token with GitHub's broad `repo` scope would grant access to every private repository available to the owner, which is wider than this feature requires.

## Decision

The first repository connection lists the signed-in owner's public GitHub repositories through GitHub's unauthenticated public REST API. The browser submits only a repository ID and optional relative root. The server fetches the provider list again and persists authoritative metadata through the project Boundra mutation.

Jabso stores provider, repository ID, owner, name, URL, default branch, visibility, root path, and connection timestamps. It stores no OAuth token, Git credential, source archive, or provider response. Repository names and roots can reveal project structure and are treated as sensitive metadata even when the repository is public.

Connections remain while a project is soft-deleted and are removed if the project is ever hard-deleted. Disconnecting removes the connection row immediately. No source code is retained by this feature.

## Consequences

- Public repositories can be connected without adding credentials or GitHub OAuth scopes.
- Monorepo applications can record a root such as `apps/web`.
- API rate limits are lower than authenticated GitHub requests, so discovery is cached for five minutes.
- Private repositories are not available in this phase.

## Rejected alternatives

- The sign-in GitHub OAuth token with the classic `repo` scope was rejected because it grants broad private-repository access.
- Accepting a repository URL directly from the browser was rejected because it would allow unverified metadata to enter the project boundary.
- A personal access token was rejected because Jabso would have to collect and protect a long-lived credential.

Private repository support should use a GitHub App installed only on explicitly selected repositories and requires a separate authorization and threat-modeling decision.
