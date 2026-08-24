# Application workspace instructions

The root `AGENTS.md` applies here. `apps/*` are deployable composition roots, not business-logic owners.

## Boundaries

- Wire domain handlers, package adapters, authentication, transport concerns, and runtime configuration here.
- Put reusable use-case logic in `domains/*`; put protocol-independent infrastructure in `packages/*`.
- Do not import another app. Shared behavior must move to the smallest owning domain or package.
- Keep environment variables private to the runtime that owns them and validate required production values at startup or request entry.
- A transport adapter may translate status codes, headers, raw bodies, and framework errors, but must not duplicate domain validation.

## Verification

- Run the owning app's typecheck and tests while iterating.
- Run root `pnpm check` and `pnpm build` before handoff when an app contract, route, or deployment behavior changes.
