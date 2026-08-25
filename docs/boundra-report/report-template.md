# Short issue title

| Field | Value |
| --- | --- |
| First observed | YYYY-MM-DD |
| Status | Investigating / Mitigated / Resolved |
| Classification | Boundra defect / Jabso integration / Undetermined |
| Boundra version | Exact version |
| Severity | Low / Medium / High |
| Upstream candidate | Yes / No / Undetermined |

## Summary

사용자 영향과 실패한 boundary 또는 contract를 한 문단으로 설명한다.

## Safe symptom

원본 payload 대신 error code, contract name, field path, expected/received type만 기록한다.

## Reproduction

민감 데이터 없이 문제를 재현하는 최소 절차를 적는다.

## Expected and actual behavior

- Expected:
- Actual:

## Root cause

확인된 원인과 Boundra 자체 문제인지 Jabso 통합 문제인지 판단 근거를 적는다. 미확정이면 가설을 사실처럼 쓰지 않는다.

## Resolution

수정 또는 workaround와 관련 commit/PR을 적는다.

## Regression coverage

추가된 테스트와 앞으로 실패를 감지할 검증 명령을 적는다.

## Privacy review

보고서에 포함된 정보가 safe diagnostic policy를 지키는지 확인한다.

## Timeline

- YYYY-MM-DD: Observed.
