# Boundra error recording policy

Jabso는 Boundra를 사용하면서 Boundra 자체의 문제도 실전 환경에서 관찰한다. 하지만 Boundra 오류를 일반 ingestion contract로 다시 보내면 contract 오류가 자기 자신을 반복 생성할 수 있다. 이 문서는 해당 재귀를 차단하고 유용한 진단 정보만 보존하기 위한 정책이다.

## What is recorded

| Kind | Example | Destination |
| --- | --- | --- |
| `boundary_violation` | `BR-001`~`BR-006` | CI artifact, optional import |
| `runtime_contract` | `RUNTIME-001`~`RUNTIME-003` | Internal diagnostics sink |
| `host_adapter` | Fastify/Next adapter mismatch | Internal diagnostics sink |
| `cli` | native binary download or execution failure | Local diagnostic file |
| `unexpected` | Boundra integration code exception | Internal diagnostics sink |

## Isolation rules

1. Boundra diagnostics never call the public event ingestion endpoint.
2. Diagnostics never pass through the same failing Boundra contract.
3. The recorder accepts a minimal sink adapter. The server writes directly to PostgreSQL without using the public ingestion contract.
4. A process-local recursion guard drops nested diagnostic attempts after logging one line to stderr.
5. Local development falls back to the permission-restricted `.jabso-diagnostics/boundra.ndjson` file if PostgreSQL is unavailable.
6. Vercel falls back to one safe structured runtime-log line. Ephemeral function files are not used as durable storage.

## Safe diagnostic shape

```ts
type BoundraDiagnostic = {
  id: string
  kind:
    | 'boundary_violation'
    | 'runtime_contract'
    | 'host_adapter'
    | 'cli'
    | 'unexpected'
  code?: string
  message: string
  contract?: string
  operation?: 'route' | 'query' | 'mutation'
  issues?: Array<{
    path: Array<string | number>
    message: string
  }>
  boundraVersion: string
  jabsoVersion?: string
  occurredAt: string
  context?: Record<string, string | number | boolean | null>
}
```

Do not store:

- original contract input
- authorization headers, cookies, or tokens
- internal `cause` objects without sanitization
- request or response bodies
- arbitrary environment variables

Boundra runtime errors should use their safe `toJSON()` representation as the source. Stack traces are allowed only after path and secret scrubbing.

## Database table

```text
internal_diagnostics
├── id uuid primary key
├── kind text
├── code text nullable
├── message text
├── contract text nullable
├── operation text nullable
├── issues jsonb
├── context jsonb
├── boundra_version text
├── jabso_version text nullable
└── occurred_at timestamptz
```

The `internal_diagnostics` table is intentionally separate from customer `events` and `issues`. Internal diagnostics do not affect issue counts, alerts, or quotas. The server uses it as the primary sink and deletes at most 100 rows older than 30 days after each successful diagnostic write. This bounded opportunistic cleanup avoids an unbounded delete in the failure path; a future scheduled cleanup may supplement it if diagnostic volume grows.

## CI boundary violations

`boundra check-boundaries --format json` should run in CI. Its JSON output is retained as a build artifact. Importing it into Jabso is optional and should be a separate CI integration, not part of the production runtime.

Current implementation status:

- [x] bounded safe serialization
- [x] process-local recursion guard
- [x] permission-restricted local NDJSON sink
- [x] fallback and recursion tests
- [x] isolated `internal_diagnostics` schema
- [x] direct PostgreSQL sink with PostgreSQL JSONB integration coverage
- [x] deployment-specific fallback and 30-day retention

PostgreSQL is the durable source of truth. Vercel's structured runtime log and the local NDJSON file are best-effort fallback evidence only, and their availability follows the platform or local filesystem retention policy. All three paths receive only the safe bounded diagnostic shape above.

## Human-readable issue history

Runtime diagnostics and CI artifacts are machine-oriented evidence. Every Boundra-related problem that is investigated during development must also be summarized in [`boundra-report/`](./boundra-report/README.md). Reports must identify whether Boundra itself appears defective or whether its validation correctly exposed a Jabso integration problem, and they must not copy raw diagnostic payloads containing application data.
