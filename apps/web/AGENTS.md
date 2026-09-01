<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Jabso web instructions

The root and `apps/AGENTS.md` instructions also apply here.

## Source architecture

- Keep all application source under `src/`. Next.js route files and `proxy.ts` belong in `src/app` and `src/proxy.ts`; workspace configuration remains at the package root.
- Use `src/...` absolute imports for code inside this app. Do not introduce `@/`, package-root absolute imports, or long parent-relative imports such as `../../../`.
- `src/app` is the composition and routing layer. Route files validate request input, authorize and fetch data, compose a screen, and translate HTTP responses.
- `src/screens/<screen>` owns route-specific presentation such as issues, projects, MCP connections, onboarding, or auth. Keep each screen shallow instead of wrapping every file in a `components` directory.
- `src/widgets/<widget>` owns reusable product-aware assemblies such as the dashboard shell and workspace switcher.
- `src/shared` contains common `ui`, `brand`, `providers`, collector `api`, authentication, query contracts, and third-party integrations.
- Dependencies point inward: `app -> screens -> widgets -> shared`. Screens never import sibling screens; widgets never import screens; shared modules never import screens, widgets, or routes.
- Import the concrete module that owns a symbol. Do not add runtime barrel files solely to shorten import paths; type-only barrels are allowed only when they define a deliberate public contract.
- Start with a single focused file. Add another subfolder only when it represents a real runtime or ownership boundary; do not mirror a full layered architecture inside every screen.
- Keep browser-only code behind a client boundary and server-only authentication or secret-bearing calls in `server` modules. Never import a server module into a client component.
- Keep Better Auth-to-workspace authorization in `src/shared/auth/workspace-auth.ts`; screen and widget UI must not duplicate workspace resolution or trust client-selected tenant values.

## Rendering and data access

- Use React Server Components for dashboard reads. Add client components only for interaction such as copy, filters, toasts, SDK execution, or local selection state.
- Read Jabso product data through the focused adapters under `src/shared/api` and the authenticated server API. The only direct PostgreSQL connection in Next.js is the server-only Better Auth adapter; screens, widgets, route pages, and product API adapters must never query it directly.
- Resolve the active project through the authorized project list before using its cookie value. Never trust a client cookie as project authorization.
- Resolve Better Auth's active user or organization to a persisted Jabso workspace before every dashboard read. Forward only the internal workspace ID to the collector and never rely on a client-selected workspace value.
- Personal workspaces belong to one Better Auth user. Team and Organization workspaces use Better Auth organization membership, and destructive project actions require the owner or admin role.
- Never auto-claim legacy projects for the first user who signs in. Legacy ownership changes require a reviewed one-time migration.
- Keep `JABSO_DASHBOARD_TOKEN`, database credentials, and project administration values server-only. Generated public DSNs may be rendered for the signed-in owner.
- Deduplicate request-scoped reads with React `cache` and start independent work together with `Promise.all`.
- Trace pages from navigation to the final upstream request. Do not call the project list again merely to resolve the active project when the authorized list is already available.
- Seed TanStack Query with server-fetched data for first render and set an intentional stale time for repeat navigation. Do not make every client transition wait for the same uncached upstream read before the query cache can render; stream remote reads behind a shape-matched Suspense boundary or reuse a persistent cache, then verify that repeat navigation avoids upstream calls. Do not add client fetch-after-hydration waterfalls or show an error-page-shaped skeleton while the destination route is loading.
- After a mutation changes the active project, seed the destination Issues query with that project before navigating, then mark it stale for background refresh. Do not remove the Issues query and navigate into a cached RSC payload that still represents the previous active project.

## Product UI

- Issues is the primary workflow. SDK installation appears only as an empty-project onboarding state, not as the whole product.
- Projects owns project creation, active-project selection, public DSN display, and the route back into Issues.
- Do not link Swagger/OpenAPI from the dashboard.
- Reuse primitives under `src/shared/ui`; fields must support labels, errors, keyboard focus, and accessible descriptions.
- Apply shared Button, Select, input, copy, and destructive-action styles consistently across the entire affected workflow. Do not fix one row or one state while leaving equivalent controls visually different.
- Use the shared `Dialog` and `AlertDialog` primitives for modal flows and destructive confirmation. Never use browser `alert()`, `confirm()`, or `prompt()` in product UI.
- Keep asynchronous action labels and geometry stable. Do not change `Delete` to `Removing`, `Create` to `Creating`, or otherwise swap the action verb while pending; use the shared spinner, `aria-busy`, and disabled state without changing column width or causing layout shift.
- Use real framework file paths and runnable snippets in SDK setup. Avoid placeholder names such as `anywhere-in-your-app.ts`.
- Distinguish the current Sentry-compatible integration from a first-party Jabso SDK in code, documentation, and handoff notes. The smoke test must wait for the SDK transport to flush; calling `captureException` alone is not proof of delivery.
- GitHub repository discovery uses the active workspace's GitHub App installations and may include selected public or private repositories. Never fall back to the sign-in OAuth token or imply that signing in automatically grants repository access.
- Workspace switching and shared-workspace creation use Jabso-owned UI over Better Auth's organization API. Do not introduce provider-owned prebuilt workspace UI into the dashboard.
- For layout changes, verify desktop and narrow breakpoints, long DSNs, active badges, empty states, and connected/disconnected repository states. If browser verification is unavailable, state that limitation instead of presenting build success as visual verification.

## Route states and errors

- Each data route needs a shape-matched `loading.tsx` plus useful empty, not-found, and error states.
- Production React Server Component errors hide their cause. Reproduce them in development and inspect the upstream API response before changing UI error handling.
- Keep redirects server-side where possible and avoid full-page client auth gates.
- Give every sign-out control an explicit `/sign-in` redirect and refresh server state after revoking the session.
- Keep credential verification, password reset, and authentication rate limits in Better Auth. Use database-backed limits in serverless deployments, return account-neutral reset responses, never log auth tokens or full action URLs, and dispatch transactional email through the approved server-only adapter.
- Jabso owns the Personal, Team, or Organization choice after sign-up; do not insert a provider-owned organization task before onboarding.
- Keep sign-in and sign-up on explicit routes. Successful sign-up must transition through a visible loading state before `/onboarding`; never leave the auth shell blank while session state settles.
- Maintain `app/icon.svg` and a working `/favicon.ico` response.
