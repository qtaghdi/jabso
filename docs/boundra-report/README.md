# Boundra issue reports

이 디렉터리는 Jabso를 개발하면서 발견한 Boundra 관련 문제의 사람이 읽을 수 있는 이력이다. `.jabso-diagnostics`의 런타임 NDJSON이나 CI artifact를 대신하지 않으며, 재현·판단·해결 결과만 안전하게 요약한다.

현재 확인된 Boundra 패키지 자체의 결함이나 조사 중인 통합 문제는 없다.

## Reports

현재 열린 보고서는 없다.

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
