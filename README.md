# Jabso

> 앱이 내는 잡소리에서 원인을 찾는 개인용 오류 관측 도구.

Jabso는 개인 프로젝트에서 발생한 브라우저·서버 오류를 한곳에 모으고, 비슷한 오류를 issue로 묶어 조사할 수 있게 만드는 토이 프로젝트입니다. 장기적으로는 MCP를 통해 코딩 에이전트가 오류, stack trace, release 문맥을 직접 조회하도록 만드는 것을 목표로 합니다.

현재 Phase 3.5까지 완료했습니다. Sentry Browser SDK가 보내는 error envelope를 PostgreSQL issue로 묶고, release/dist에 맞는 source map으로 production stack을 원본 frame으로 변환합니다. 웹에서는 GitHub 소유자 인증 뒤 필터·occurrence·안전한 문맥·lifecycle과 함께 mapped/original stack, release별 first seen과 regression을 확인할 수 있습니다.

## Product direction

- Sentry SDK의 DSN만 바꿔 기존 애플리케이션 오류 수집
- 오류 정규화와 fingerprint 기반 issue grouping
- project, environment, release, tag 기준 검색
- stack trace와 occurrence 문맥을 보여주는 관리 UI
- 읽기 전용 MCP 도구로 AI 에이전트의 장애 조사 지원
- 추후 rrweb 기반 Session Replay 연결

Jabso는 Sentry의 모든 기능을 복제하는 프로젝트가 아닙니다. 우선 개인 프로젝트에 필요한 **error inbox + issue grouping + MCP context**를 작고 명확하게 구현합니다.

## Current stack

| Area | Choice |
| --- | --- |
| Monorepo | pnpm workspace + Turborepo |
| Web | Next.js 16, React 19 |
| Server | Fastify, Node.js 24 |
| Architecture and contracts | Boundra + Zod |
| Database | PostgreSQL + Drizzle |
| Symbolication | `@jridgewell/trace-mapping` behind `@jabso/symbolication` |
| Logging | Pino |
| Tests | Vitest + browser smoke verification |
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

이 기록은 일반 Boundra transport를 다시 통과하지 않습니다. 현재 server는 process-local recursion guard와 권한이 제한된 로컬 NDJSON sink를 사용합니다. DB direct sink와 배포 환경의 durable fallback은 아직 연결하지 않았습니다. 원본 입력이나 secret은 저장하지 않고 Boundra의 safe diagnostic shape만 보존합니다.

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
├─ symbolication/          # source-map validation and frame mapping
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

웹 issue inbox는 `http://localhost:3999`, collector는 `http://localhost:4000`에서 실행됩니다. `http://localhost:3999/smoke-test`에서 실제 Sentry Browser SDK 오류를 보내 end-to-end 수집 경로를 확인할 수 있습니다. 기본 개발 DSN은 `http://0123456789abcdef0123456789abcdef@localhost:4000/1`입니다. `/health`는 프로세스 상태를, `/ready`는 PostgreSQL 연결 상태를 확인합니다.

Collector의 대화형 API 문서는 `/docs`, OpenAPI 3.0 JSON은 `/docs/json`, YAML은 `/docs/yaml`에서 제공합니다. 문서는 Sentry envelope 수집, issue 조회와 lifecycle, release 조회, source-map upload와 symbolication retry endpoint를 포함합니다. 수집 endpoint의 `sentry_key`는 공개 DSN project key입니다. 대시보드 API는 서버 전용 `JABSO_DASHBOARD_TOKEN`, source-map 관리 endpoint는 별도의 `JABSO_ADMIN_TOKEN` bearer credential을 사용합니다.

Phase 1 수집 경로는 raw envelope만 Fastify에서 다루고, 정규화된 event를 Boundra 계약으로 검증한 뒤 하나의 transaction에서 issue upsert와 event insert를 수행합니다. `user`, `request`, breadcrumb, 원본 payload는 저장하지 않으며 동일한 `event_id` 재전송은 event 수를 증가시키지 않습니다.

Phase 1.5 조회 경로는 동일한 Boundra issue query를 Fastify read API가 실행하고 Next.js Server Component가 소비합니다. 웹 앱은 PostgreSQL에 직접 접근하지 않으며 조회·변경 API는 브라우저에 노출되지 않는 대시보드 bearer token으로 보호합니다.

Phase 2는 status/level/environment/release/last-seen 필터와 안정적인 복합 cursor pagination, 최근 occurrence 이력, lifecycle 변경을 완성합니다. resolved issue에 새 event가 들어오면 unresolved로 다시 열고 regression 시각을 기록하며, ignored issue는 자동으로 다시 열지 않습니다.

Phase 3은 release/dist별 source map을 single-owner 관리자 token으로 업로드하고 PostgreSQL에 저장합니다. event ingestion은 symbolication 실패와 분리되며, map이 늦게 도착하면 upload 또는 retry endpoint가 최대 100개씩 backfill합니다. UI/API에는 map 원문과 `sourcesContent`를 노출하지 않고, 로컬 home directory가 포함된 mapped source path도 scrub합니다.

Source map upload와 retry 사용법, 제한, 보존 정책은 [source map artifact guide](docs/source-map-artifacts.md)를 참고하세요.

Breadcrumb는 최근 50개의 timestamp/category/level/message만 저장합니다. context는 browser/runtime/OS/device family allowlist만 보존하고, tag key의 user/email/token/session/cookie/IP 계열 값은 수집 단계에서 제외합니다. raw request, user identity, breadcrumb data 객체는 저장하지 않습니다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm boundra:check
```

기존 Replay 실험은 `spikes/replay`에 보존되어 있으며 현재 빌드와 제품 runtime에서는 제외됩니다.

파일명, 함수 스타일, 아키텍처, DB, 테스트, Git/PR 규칙은 [repository instructions](AGENTS.md)에 정리되어 있으며 ESLint가 kebab-case source filename과 const arrow function 규칙을 검사합니다.

## Roadmap

1. ~~Phase 0 — 스파이크 보존, 모노레포, parser와 Boundra 기반~~
2. ~~Phase 1 — Fastify ingestion, canonical event, PostgreSQL grouping~~
3. ~~Phase 1.5 — Boundra read path와 Next.js inbox shell~~
4. ~~Phase 2 — 필터, cursor, occurrence, safe context와 issue lifecycle~~
5. ~~Phase 3 — release, source map artifact와 stack symbolication~~
6. ~~Phase 3.5 — GitHub owner 인증, 대시보드 API 분리, 첫 사용 온보딩과 공용 UI~~
7. **Phase 4 — 읽기 전용 MCP 도구**
8. Later — 운영 안전장치, retention, Session Replay 재도입

다음 Phase 4는 Phase 1.5~3의 Boundra query handler를 재사용하는 읽기 전용 MCP adapter입니다. MCP가 DB나 source map 원문에 직접 접근하지 않게 하고 project-scoped token, bounded result, audit log를 먼저 적용합니다.

phase 범위와 완료 이력의 단일 기준 문서는 [HTML implementation plan](docs/implementation-plan.html)입니다. 별도의 Markdown plan은 두지 않습니다.

## Status

Private toy project. API, schema, package names are not stable yet.
