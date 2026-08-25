# PostgreSQL JSONB double encoding rejected by result contract

| Field | Value |
| --- | --- |
| First observed | 2026-08-24 |
| Status | Resolved |
| Classification | Jabso integration |
| Boundra version | 0.2.2 |
| Severity | High |
| Upstream candidate | No |

## Summary

이슈 상세 조회의 `get-issue` result contract가 persisted event context를 배열과 객체로 기대했지만 PostgreSQL adapter가 일부 JSONB 값을 JSON string으로 저장했다. Boundra가 잘못된 result를 차단하면서 상세 API가 실패했고 웹에서는 이슈 상세 화면을 열 수 없었다.

## Safe symptom

- Contract: `get-issue`
- Affected paths: `latestEvent.stacktrace`, `latestEvent.breadcrumbs`, and related JSON context fields
- Expected types: array or object defined by the result contract
- Received type: string containing serialized JSON

원본 이벤트와 실제 field value는 이 보고서에 포함하지 않는다.

## Reproduction

1. Raw SQL adapter에서 `JSON.stringify` 결과를 PostgreSQL parameter로 넘긴다.
2. 해당 parameter를 곧바로 `$n::jsonb`로 cast해 event JSONB column에 저장한다.
3. 저장된 event를 `get-issue` query result로 반환한다.
4. Boundra result validation이 array/object 대신 string을 받아 요청을 거부한다.

## Expected and actual behavior

- Expected: JSONB columns preserve arrays and objects, and the query returns contract-ready values.
- Actual: postgres.js type inference and the explicit cast caused already serialized JSON to be stored as a JSON string.

## Root cause

Boundra의 validation은 schema와 다른 result를 정상적으로 거부했다. 원인은 Jabso의 raw PostgreSQL adapter가 이미 JSON-encoded된 text를 `$n::jsonb`로 전달한 데 있었다. 따라서 이 건은 Boundra defect가 아니며 upstream 보고 대상도 아니다.

## Resolution

- JSON text parameters are cast through text with `$n::text::jsonb` before JSONB conversion.
- Query adapters defensively decode legacy string-encoded JSONB rows.
- Source-map backfill writes use the same safe cast so `symbolicated_stacktrace` remains an array.
- Resolved by commit `75944ef` (`fix: decode persisted event context`).

## Regression coverage

`apps/server/test/app.test.ts` now verifies:

- `jsonb_typeof` reports arrays/objects for stacktrace, tags, breadcrumbs, and context after ingestion.
- issue detail reads legacy string-encoded rows safely.
- source-map backfill writes `symbolicated_stacktrace` as an array.

The repository guidance also documents the postgres.js casting rule under `apps/server/AGENTS.md` and `packages/db/AGENTS.md`.

## Privacy review

This report contains only contract names, field paths, data types, and repository references. It contains no raw events, credentials, DSNs, request bodies, environment variables, or source-map contents.

## Timeline

- 2026-08-24: The result contract exposed the persisted JSONB type mismatch.
- 2026-08-24: Adapter writes, legacy reads, and regression coverage were corrected in commit `75944ef`.
