# Jabso

> 앱이 내는 잡소리에서 원인을 찾는 개인용 오류 관측 도구.

Jabso는 개인 프로젝트에서 발생한 브라우저·서버 오류를 한곳에 모으고, 비슷한 오류를 issue로 묶어 조사할 수 있게 만드는 토이 프로젝트입니다. 장기적으로는 MCP를 통해 코딩 에이전트가 오류, stack trace, release 문맥을 직접 조회하도록 만드는 것을 목표로 합니다.

현재 Phase 1은 Sentry Browser SDK가 보내는 error envelope를 수신해 canonical event로 정규화하고, fingerprint가 같은 오류를 PostgreSQL의 issue 하나로 묶어 저장합니다. Session Replay 실험은 보존만 하며 제품 runtime에서는 제외합니다.

## Product direction

- Sentry SDK의 DSN만 바꿔 기존 애플리케이션 오류 수집
- 오류 정규화와 fingerprint 기반 issue grouping
- project, environment, release, tag 기준 검색
- stack trace와 occurrence 문맥을 보여주는 관리 UI
- 읽기 전용 MCP 도구로 AI 에이전트의 장애 조사 지원
- 추후 rrweb 기반 Session Replay 연결

Jabso는 Sentry의 모든 기능을 복제하는 프로젝트가 아닙니다. 우선 개인 프로젝트에 필요한 **error inbox + issue grouping + MCP context**를 작고 명확하게 구현합니다.

## Planned stack

| Area | Choice |
| --- | --- |
| Monorepo | pnpm workspace + Turborepo |
| Web | Next.js 16, React 19 |
| Server | Fastify, Node.js 24 |
| Architecture and contracts | Boundra + Zod |
| Database | PostgreSQL + Drizzle |
| Logging | Pino |
| Tests | Vitest, Playwright |
| MCP | Official TypeScript SDK, Streamable HTTP |
| Client SDK | Sentry SDK compatibility first |

Boundra는 HTTP 서버나 ORM을 대체하지 않습니다. Jabso에서는 도메인 경계, 공개 API, client/server runtime contract를 담당합니다. Fastify는 외부 HTTP protocol과 수집 경로를, PostgreSQL은 영속성을 담당합니다.

## Intended architecture

```text
Sentry SDK
    │
    ▼
Fastify collector ── raw Sentry protocol adapter
    │
    ▼
Boundra domain contract
    │
    ├── event normalization
    ├── issue fingerprinting
    └── persistence
             │
             ▼
         PostgreSQL
             ▲
             │
     ┌───────┴───────┐
     │               │
 Next.js UI      MCP adapter
```

Sentry envelope처럼 raw binary와 외부 규격을 다루는 endpoint는 Fastify adapter가 직접 처리합니다. 파싱 이후의 canonical event부터 Boundra contract를 통과시킵니다. UI용 HTTP API와 MCP tool은 동일한 domain handler를 재사용합니다.

## Boundra dogfooding

Jabso는 Boundra의 실전 사용처이기도 합니다. Boundra에서 발생한 boundary violation, runtime contract error, host adapter 오류는 일반 사용자 event와 분리된 internal diagnostics로 기록합니다.

이 기록은 일반 Boundra transport를 다시 통과하지 않습니다. 재귀 오류를 막기 위해 직접 diagnostic sink를 사용하고, DB 기록까지 실패하면 로컬 NDJSON 파일로 fallback합니다. 원본 입력이나 secret은 저장하지 않고 Boundra의 safe diagnostic shape만 보존합니다.

자세한 내용은 [Boundra error recording policy](docs/boundra-error-recording.md)를 참고하세요.

## Repository

```text
apps/
├─ web/                    # Next.js UI and SDK smoke test
└─ server/                 # Fastify collector

domains/
├─ project/
├─ event/
├─ issue/
├─ release/
└─ ingestion/              # Boundra contracts and public boundaries

packages/
├─ sentry-compat/          # byte-safe envelope parser
├─ diagnostics/            # isolated Boundra diagnostics
├─ db/                     # Drizzle schema and connection
└─ config/                 # shared TypeScript config

spikes/
└─ replay/                 # preserved, non-production Replay experiment
```

## Development

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

웹은 `http://localhost:3999`, collector는 `http://localhost:4000`에서 실행됩니다. 기본 개발 DSN은 `http://local-dev-key@localhost:4000/1`입니다. `/health`는 프로세스 상태를, `/ready`는 PostgreSQL 연결 상태를 확인합니다.

Phase 1 수집 경로는 raw envelope만 Fastify에서 다루고, 정규화된 event를 Boundra 계약으로 검증한 뒤 하나의 transaction에서 issue upsert와 event insert를 수행합니다. `user`, `request`, breadcrumb, 원본 payload는 저장하지 않으며 동일한 `event_id` 재전송은 event 수를 증가시키지 않습니다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm boundra:check
```

기존 Replay 실험은 `spikes/replay`에 보존되어 있으며 현재 빌드와 제품 runtime에서는 제외됩니다.

## Roadmap

1. ~~기존 스파이크 보존과 byte-safe envelope parser 테스트~~
2. ~~pnpm/Turborepo 모노레포와 Boundra 경계 구성~~
3. ~~Fastify collector에서 canonical event 변환과 PostgreSQL 영속성~~
4. ~~error normalization과 issue grouping~~
5. Next.js issue inbox와 상세 화면
6. source map과 release 문맥
7. 읽기 전용 MCP 도구
8. 운영 안전장치와 retention
9. Session Replay 재도입

전체 설계와 우선순위는 [implementation plan](docs/implementation-plan.html)에 정리되어 있습니다.

## Status

Private toy project. API, schema, package names are not stable yet.
