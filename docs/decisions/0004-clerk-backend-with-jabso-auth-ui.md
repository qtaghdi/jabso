# Jabso owns the authentication UI while Clerk remains the identity backend

## Context

The current sign-in and sign-up routes render Clerk's prebuilt components and override their internal elements with CSS. This has repeatedly produced clipped fields, provider badges, browser validation bubbles, transient blank states, and layout changes that Jabso cannot control reliably. Jabso also depends on Clerk sessions, GitHub account linking, Organizations, membership, and server-side identity resolution.

Building a GitHub-only OAuth callback is feasible, but replacing Clerk would also require secure OAuth state and PKCE handling, session issuance and rotation, logout and revocation, account linking, email verification, password reset, organization membership and invitations, abuse protection, and migration of existing identities. That is substantially broader than replacing the visible form.

## Decision

Jabso will stop using Clerk's prebuilt `SignIn` and `SignUp` views. The web app will implement its own accessible forms, validation, loading states, error messages, and transitions with Clerk v7 custom-flow APIs such as `useSignIn()` and `useSignUp()`.

GitHub authentication starts from a Jabso-owned button and uses Clerk's OAuth/SSO flow. Email and password authentication, verification, reset, and missing-requirement steps also use custom Jabso screens. Clerk continues to own identity, secure sessions, connected GitHub accounts, Organizations, memberships, invitations, and server-side authentication. `ClerkProvider`, middleware, and workspace resolution remain in place.

This authentication UI work is independent of MCP authorization. MCP uses revocable Jabso credentials and remains valid if the dashboard identity provider is replaced later.

## Consequences

- Jabso controls every pixel and state of sign-in, sign-up, callbacks, validation, and loading.
- Existing users, sessions, organizations, and GitHub connections do not require migration.
- Clerk remains a runtime and operational dependency even though its prebuilt form UI disappears.
- Custom flows require explicit tests for OAuth callbacks, missing requirements, email verification, password reset, refresh, logout, and expired sessions.
- A later Clerk removal remains possible behind Jabso's internal workspace boundary.

## Rejected alternatives

- Continuing to style Clerk's prebuilt components was rejected because internal markup and validation behavior are not a stable Jabso design-system surface.
- Removing Clerk immediately for a hand-built GitHub OAuth flow was rejected because it would discard working session and organization capabilities while leaving email/password and membership behavior to rebuild.
- GitHub-only authentication was rejected for now because Jabso already supports email/password and organization workspaces.
- Adding another authentication library was rejected because it would still require identity, session, account-linking, and organization migration without solving a measured backend limitation.

## Reconsideration signals

Replace Clerk only if custom flows still block a required product behavior, organization pricing or limits become unacceptable, or Jabso needs an identity/session model Clerk cannot represent. That decision must include a migration plan for users, connected accounts, sessions, organizations, memberships, invitations, and credential revocation.

## References

- [Clerk custom OAuth authentication flows](https://clerk.com/docs/guides/development/custom-flows/authentication/oauth-connections)
