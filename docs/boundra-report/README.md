# Boundra issue reports

이 디렉터리는 Jabso를 개발하면서 발견한 Boundra 관련 문제의 사람이 읽을 수 있는 이력이다. `.jabso-diagnostics`의 런타임 NDJSON이나 CI artifact를 대신하지 않으며, 재현·판단·해결 결과만 안전하게 요약한다.

현재 확인된 Boundra 패키지 자체의 결함은 없다. 기록된 문제들은 Boundra가 정상적으로 찾아낸 Jabso/PostgreSQL 어댑터 문제와 Jabso가 사용하지 않는 선택적 client scaffold를 유지한 통합 문제다.

## Reports

| Date | Report | Classification | Status | Upstream candidate |
| --- | --- | --- | --- | --- |
| 2026-08-25 | [Production project list handler failure](./2026-08-25-production-project-list-contract-rejection.md) | Jabso integration | Resolved | No |
| 2026-08-27 | [Unused client layer and public API drift](./2026-08-27-unused-client-layer-and-public-api-drift.md) | Jabso integration | Resolved | No |

## Recording rule

다음 중 하나가 새로 발견되면 조사 또는 수정과 같은 변경 안에서 보고서를 추가하고 위 표를 갱신한다.

- Boundra package defect or regression
- `boundra check-boundaries` false positive, false negative, or unexpected failure
- input/result contract mismatch found at runtime
- host adapter integration problem surfaced by Boundra
- diagnostic recorder, recursion guard, or safe serialization failure

파일명은 `YYYY-MM-DD-short-kebab-case.md`를 사용하고 [`report-template.md`](./report-template.md)에서 시작한다. 한 현상이 여러 번 발생하면 기존 보고서의 timeline과 regression coverage를 갱신하며, 원인이 다른 경우에만 새 보고서를 만든다.

## Classification

- `Boundra defect`: 최소 재현으로 Boundra 패키지의 잘못된 동작이 확인됨. upstream 보고 후보로 표시한다.
- `Jabso integration`: Boundra가 의도대로 동작하며 Jabso의 adapter, persistence, schema, or contract 문제를 찾음.
- `Undetermined`: 원인이 아직 분리되지 않음. 재현 절차와 다음 조사 항목을 명시한다.

보고서에는 실제 DSN, 토큰, 쿠키, 요청/응답 본문, 원본 이벤트, 환경 변수, private source map을 넣지 않는다. 진단 메시지는 field path와 expected/received type처럼 재현에 필요한 최소 정보로 축약한다.
