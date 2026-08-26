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
- `src/app` is the composition and routing layer. Route files may validate request input, call a feature or library entry point, and translate results into HTTP or UI responses; reusable product behavior does not belong there.
- `src/features/<feature>` owns one product workflow such as auth, issues, projects, onboarding, SDK smoke tests, or the dashboard shell. Organize a feature by runtime responsibility only when needed, using focused folders such as `components`, `server`, and `model`.
- `src/components` contains feature-agnostic building blocks only: `ui` primitives, `brand` assets, and application-wide `providers`. Shared components must not import from `src/features`.
- `src/lib` contains reusable technical adapters and cross-feature contracts. Keep Jabso HTTP access under `src/lib/jabso`, dashboard query/cache contracts under `src/lib/dashboard`, and third-party adapters under `src/lib/integrations`.
- Dependencies point inward: `app -> features -> components/lib`. A feature may use shared components and libraries, but must not import route files. Avoid direct imports between sibling features; move truly shared behavior to `components` or `lib`, or compose the features from `app`. The shell feature is the only composition feature and may assemble dashboard-wide feature UI when necessary.
- Import the concrete module that owns a symbol. Do not add runtime barrel files solely to shorten import paths; type-only barrels are allowed only when they define a deliberate public contract.
- Start with a single focused file. Add `components`, `server`, `model`, or `test` subfolders only when a feature has more than one responsibility; do not mirror a full layered architecture for trivial code.
- Keep browser-only code behind a client boundary and server-only authentication or secret-bearing calls in `server` modules. Never import a server module into a client component.
- Keep Clerk-to-workspace authorization in `src/lib/auth/workspace-auth.ts`; feature UI must not duplicate workspace resolution or trust client-selected tenant values.

## Rendering and data access

- Use React Server Components for dashboard reads. Add client components only for interaction such as copy, filters, toasts, SDK execution, or local selection state.
- Read Jabso through the focused adapters under `src/lib/jabso` and the authenticated server API. Never connect to PostgreSQL from Next.js.
- Resolve the active project through the authorized project list before using its cookie value. Never trust a client cookie as project authorization.
- Resolve Clerk's active user or organization to a persisted Jabso workspace before every dashboard read. Forward only the internal workspace ID to the collector and never rely on a client-selected workspace value.
- Personal workspaces belong to one Clerk user. Team and Organization workspaces use Clerk Organization membership, and destructive project actions require the organization admin role.
- Never auto-claim legacy projects for the first user who signs in. Legacy ownership changes require a reviewed one-time migration.
- Keep `JABSO_DASHBOARD_TOKEN`, database credentials, and project administration values server-only. Generated public DSNs may be rendered for the signed-in owner.
- Deduplicate request-scoped reads with React `cache` and start independent work together with `Promise.all`.
- Trace pages from navigation to the final upstream request. Do not call the project list again merely to resolve the active project when the authorized list is already available.
- Seed TanStack Query with server-fetched data for first render and set an intentional stale time for repeat navigation. Do not make every client transition wait for the same uncached upstream read before the query cache can render; stream remote reads behind a shape-matched Suspense boundary or reuse a persistent cache, then verify that repeat navigation avoids upstream calls. Do not add client fetch-after-hydration waterfalls or show an error-page-shaped skeleton while the destination route is loading.

## Product UI

- Issues is the primary workflow. SDK installation appears only as an empty-project onboarding state, not as the whole product.
- Projects owns project creation, active-project selection, public DSN display, and the route back into Issues.
- Do not link Swagger/OpenAPI from the dashboard.
- Reuse primitives under `src/components/ui`; fields must support labels, errors, keyboard focus, and accessible descriptions.
- Apply shared Button, Select, input, copy, and destructive-action styles consistently across the entire affected workflow. Do not fix one row or one state while leaving equivalent controls visually different.
- Use the shared `Dialog` and `AlertDialog` primitives for modal flows and destructive confirmation. Never use browser `alert()`, `confirm()`, or `prompt()` in product UI.
- Keep asynchronous action labels and geometry stable. Do not change `Delete` to `Removing`, `Create` to `Creating`, or otherwise swap the action verb while pending; use the shared spinner, `aria-busy`, and disabled state without changing column width or causing layout shift.
- Use real framework file paths and runnable snippets in SDK setup. Avoid placeholder names such as `anywhere-in-your-app.ts`.
- Distinguish the current Sentry-compatible integration from a first-party Jabso SDK in code, documentation, and handoff notes. The smoke test must wait for the SDK transport to flush; calling `captureException` alone is not proof of delivery.
- GitHub repository discovery currently supports public repositories only. Do not imply that private repositories are available until a least-privilege GitHub App flow is implemented and verified.
- For layout changes, verify desktop and narrow breakpoints, long DSNs, active badges, empty states, and connected/disconnected repository states. If browser verification is unavailable, state that limitation instead of presenting build success as visual verification.

## Route states and errors

- Each data route needs a shape-matched `loading.tsx` plus useful empty, not-found, and error states.
- Production React Server Component errors hide their cause. Reproduce them in development and inspect the upstream API response before changing UI error handling.
- Keep redirects server-side where possible and avoid full-page client auth gates.
- Give every Clerk sign-out control an explicit `/sign-in` redirect. Do not rely on Clerk's default `/` destination, which adds a protected-route bounce and can leave the sign-in shell temporarily empty.
- Keep Clerk Organizations enabled with membership optional. Jabso owns the Personal, Team, or Organization choice after sign-up; required Clerk organization membership creates a duplicate pre-onboarding organization task.
- Keep sign-in and sign-up on explicit routes. Successful sign-up must transition through a visible loading state before `/onboarding`; never leave the mounted Clerk shell blank while session state settles.
- Maintain `app/icon.svg` and a working `/favicon.ico` response.
