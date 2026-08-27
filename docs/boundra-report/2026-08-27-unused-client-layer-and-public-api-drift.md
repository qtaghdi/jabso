# Unused client layer and public API drift

| Field | Value |
| --- | --- |
| First observed | 2026-08-27 |
| Status | Resolved |
| Classification | Jabso integration |
| Boundra version | 0.3.0 |
| Severity | Low |
| Upstream candidate | No |

## Summary

Jabso retained generated `domains/*/client` helpers even though neither the dashboard nor the collector created a Boundra client transport or exposed a generic Boundra contract endpoint. The helpers compiled but had no runtime call sites. Domain manifests also exposed both each `shared/public.ts` entry point and the internal contract files it already re-exported, making the intended boundary less obvious.

## Safe symptom

- Every domain had an optional client layer, but repository search found no `BoundraClient`, `BoundraCallOptions`, or transport construction outside those generated helpers.
- The web application called Jabso's authenticated HTTP adapters directly.
- `domain.json` files declared redundant internal contract paths in addition to `shared/public.ts`.
- Empty client directories remained locally after their tracked files were removed.

No runtime input, event, credential, environment value, or production response is included in this report.

## Reproduction

1. Configure a default Boundra client public API and retain generated client query and mutation wrappers.
2. Do not create a Boundra client transport in the web application and do not expose a server endpoint that executes arbitrary Boundra client calls.
3. Search the repository for the generated wrappers and Boundra client construction.
4. Observe that the wrappers have no runtime consumers while HTTP routes call the server-side domain implementations independently.

## Expected and actual behavior

- Expected: Jabso keeps only the Boundra layers it executes, and all external imports cross a domain through one deliberate public entry point per layer.
- Actual: Optional generated client code and redundant manifest entries remained, suggesting a runtime boundary that Jabso did not implement.

## Root cause

This was a Jabso integration and repository-maintenance problem, not a Boundra defect. Boundra supports optional client, server, shared, and MCP layers; Jabso retained a default client scaffold without implementing its transport. Empty directories were a local filesystem artifact because Git does not track directories.

The experience does suggest that projects should decide which Boundra layers they execute before accepting generated scaffolding, but Boundra did not require Jabso to keep the unused layer and boundary validation behaved correctly.

## Resolution

- Removed every unused `domains/*/client` file and the default client public API configuration.
- Removed client entries from all domain manifests.
- Reduced each domain manifest to `server/public.ts` and `shared/public.ts` entry points.
- Kept Fastify HTTP and MCP protocol handling in server adapters while reusing Boundra server implementations.
- Removed obsolete empty client directories locally.
- Added ESLint dependency-direction checks and an MCP transport port so concrete adapters do not depend on each other.

Implemented in repository architecture PR #40.

## Regression coverage

- `pnpm boundra:check` verifies six domains with no boundary violations.
- `pnpm lint` rejects web outer-layer imports and concrete server adapter coupling.
- `pnpm check` verifies types and the 23-test collector suite.
- `pnpm build` verifies the Next.js and Fastify production bundles.

## Privacy review

This report contains only repository paths, layer names, and toolchain behavior. It contains no application event, DSN, token, request body, database value, or private repository metadata.

## Timeline

- 2026-08-27: Audited Boundra client call sites and confirmed the generated helpers had no runtime consumer.
- 2026-08-27: Removed unused client layers and redundant public API declarations.
- 2026-08-27: Added automated application-boundary rules and verified Boundra boundaries, tests, and production builds.
