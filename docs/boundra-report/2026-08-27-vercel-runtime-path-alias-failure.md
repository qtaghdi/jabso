# Vercel runtime path alias failure

| Field | Value |
| --- | --- |
| First observed | 2026-08-27 |
| Status | Resolved |
| Classification | Jabso integration |
| Boundra version | 0.3.0 |
| Severity | High |
| Upstream candidate | No |

## Summary

The production collector crashed during module initialization after Jabso changed server imports to TypeScript `src/*` and `@domains/*` path aliases. Local type checks, Vitest, and the tsup bundle passed, but Vercel's zero-configuration Fastify function executed its compiled source entrypoint and Node treated `src` as a package name. Every collector route returned HTTP 500, which caused the authenticated dashboard root to fail while resolving its active workspace.

## Safe symptom

- Collector response: HTTP 500 for the workspace lookup used by the dashboard root.
- Runtime code: `ERR_MODULE_NOT_FOUND`.
- Runtime message: `Cannot find package 'src' imported from /var/task/apps/server/src/index.js`.
- Dashboard symptom: the workspace request failed with HTTP 500 and the route rendered its error state.

No organization identifier, authorization header, token, database value, or response body is included in this report.

## Reproduction

1. Configure `src/*` and `@domains/*` under the server `tsconfig.json` `paths` option.
2. Import the Fastify composition root from `src/index.ts` through `src/composition/...`.
3. Run local TypeScript, Vitest, and tsup checks; they resolve or bundle the aliases successfully.
4. Deploy through Vercel's zero-configuration Fastify detection.
5. Invoke any collector route and observe Node fail while loading the source function entrypoint.

## Expected and actual behavior

- Expected: Every import in the deployed Fastify source entrypoint resolves using Node-compatible package or relative semantics.
- Actual: Local tools accepted TypeScript path aliases that Vercel Node Functions explicitly do not support, so production crashed before Fastify initialized.

## Root cause

This was a Jabso toolchain and deployment integration error, not a Boundra defect. TypeScript `paths` only inform compatible compilers and do not create Node packages. Vercel's Node Function TypeScript support excludes path mappings. The local tsup build masked the mismatch because it understood the aliases, while the platform's Fastify source-function path remained untested.

The `@domains/*` alias also represented Boundra public boundaries as virtual paths rather than deployable workspace packages, so it had the same latent runtime problem even though the first failure occurred at `src/*`.

## Resolution

- Replaced server-internal `src/*` imports with short relative imports.
- Promoted all six Boundra domains to private pnpm workspace packages named `@jabso/domain-*`.
- Added built `server` and `shared` package exports for each domain.
- Added the domain packages as explicit collector dependencies so Turbo and Vercel build them before the function.
- Removed the server TypeScript path mappings and Vitest-only alias configuration.
- Added an ESLint rule that rejects `src/*` and `@domains/*` imports anywhere under the server source tree.

## Regression coverage

- Server integration tests load the real `@jabso/domain-*` package exports before running 23 collector tests.
- A direct Node ESM import smoke check resolves all six built domain packages.
- `pnpm check` builds and type-checks all domain workspaces and validates Boundra boundaries.
- `pnpm build` builds all domain packages plus the Fastify and Next.js production outputs.
- Vercel Preview must return a successful collector health response before merge.

## Privacy review

This report includes a public route class, a generic runtime error, and repository paths only. It excludes credentials, external workspace identifiers, event data, request bodies, database contents, and environment values.

## Timeline

- 2026-08-27: Production dashboard root returned HTTP 500 after the repository architecture deployment.
- 2026-08-27: Web logs traced the failure to a collector workspace request returning HTTP 500.
- 2026-08-27: Collector logs identified `ERR_MODULE_NOT_FOUND` for the bare `src` import during function initialization.
- 2026-08-27: Replaced virtual aliases with runtime-resolvable workspace packages and relative server imports.
- 2026-08-27: Added automated import enforcement and local package-resolution regression coverage.
