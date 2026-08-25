# Production project list handler failure

| Field | Value |
| --- | --- |
| First observed | 2026-08-25 |
| Status | Resolved |
| Classification | Jabso integration |
| Boundra version | 0.2.2 |
| Severity | High |
| Upstream candidate | No |

## Summary

The production dashboard could not load its project list. Its authenticated web proxy returned HTTP 500 while the upstream collector returned HTTP 400 for `GET /api/projects?limit=100`. The collector's project query referenced a database column introduced by migration `0004`, but that migration had not been applied to the production Neon database.

## Safe symptom

- Contract: `list-projects`
- Boundra code: `RUNTIME-003`
- Boundra phase: `handler`
- Collector route and status: `GET /api/projects?limit=100`, HTTP 400
- Web proxy route and status: `GET /api/dashboard/projects`, HTTP 500
- Production region: Seoul (`icn1`)
- Diagnostic recorder failure: an empty configured path produced `ENOENT` while opening the sink

No authorization header, dashboard token, DSN, response body, database value, or raw event is included in this report.

## Reproduction

1. Deploy project-list code that filters on `projects.deleted_at`.
2. Leave the production database at migration `0003`, without the `deleted_at` column from migration `0004`.
3. Send an authenticated `GET /api/projects?limit=100` request.
4. Observe the SQL handler fail and Boundra wrap the dependency error as `RUNTIME-003` in the `handler` phase.
5. Configure `JABSO_BOUNDRA_DIAGNOSTIC_PATH` as an empty value and observe the NDJSON recorder fail with `ENOENT`.

## Expected and actual behavior

- Expected: Database migrations are applied before code that requires them. The collector returns a bounded project list with HTTP 200.
- Actual: The handler queried a missing `deleted_at` column. Boundra correctly wrapped the handler exception, but Jabso misclassified it as HTTP 400 and its diagnostic recorder discarded the diagnostic because the configured file path was empty.

## Root cause

This was a Jabso deployment and adapter problem, not a Boundra defect.

Migration `0004_faithful_black_bird.sql` adds `projects.deleted_at`. The project-list store had already deployed a `where deleted_at is null` filter, but the production Neon schema still contained only the pre-migration project columns. Boundra correctly reported the thrown database exception as `RUNTIME-003` with phase `handler`.

Two secondary Jabso problems obscured the cause:

- the Fastify error handler returned HTTP 400 for every `BoundraRuntimeError`, including internal handler failures
- a blank `JABSO_BOUNDRA_DIAGNOSTIC_PATH` was treated as a real path instead of falling back to a writable Vercel location

## Resolution

- Applied the pending Drizzle migrations to the production Neon database.
- Executed the real PostgreSQL store and `list-projects` Boundra contract against production data; it returned three projects and a null next cursor.
- Changed HTTP mapping so input contract failures return 400 while handler and result failures return a generic, non-sensitive 500 response.
- Added structured safe logging for Boundra code, contract, phase, and normalized issues.
- Changed a blank diagnostic path to use `/tmp/jabso-boundra.ndjson` on Vercel and the existing local fallback elsewhere.

## Regression coverage

- Unit coverage verifies input failures map to 400.
- Unit coverage verifies handler failures map to 500 without exposing the wrapped database message.
- Unit coverage verifies blank Vercel diagnostic paths resolve to `/tmp`.
- `pnpm check` validates runtime behavior and Boundra boundaries.
- `pnpm build` verifies the production server and dashboard builds.

Database migrations remain an explicit deployment operation. A future deployment workflow should apply migrations before promoting schema-dependent code.

## Privacy review

This report contains only route names, status codes, contract metadata, schema identifiers, and bounded operational facts. It excludes credentials, connection strings, database contents, raw events, and environment variable values.

## Timeline

- 2026-08-25: Production dashboard request failed with HTTP 500; the corresponding collector request returned HTTP 400.
- 2026-08-25: Runtime logs identified `RUNTIME-003` and a dropped diagnostic caused by an empty file path.
- 2026-08-25: A read-only schema query confirmed that `projects.deleted_at` was absent from production.
- 2026-08-25: Applied migration `0004` and verified the production `list-projects` contract returned successfully.
- 2026-08-25: Added safe logging, correct HTTP status mapping, and a writable Vercel diagnostic fallback.
