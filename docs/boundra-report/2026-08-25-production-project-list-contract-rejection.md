# Production project list contract rejection

| Field | Value |
| --- | --- |
| First observed | 2026-08-25 |
| Status | Investigating |
| Classification | Undetermined |
| Boundra version | 0.2.2 |
| Severity | High |
| Upstream candidate | Undetermined |

## Summary

The production dashboard could not load its project list. The authenticated web proxy returned HTTP 500 while its upstream `GET /api/projects?limit=100` request returned HTTP 400 from the collector. This blocks the dashboard because project selection is required by the Issues and Projects views.

## Safe symptom

- Boundary: `list-projects`
- Collector route: `GET /api/projects`
- Input: `limit=100`
- Collector status: `400 Bad Request`
- Web proxy route: `GET /api/dashboard/projects`
- Web proxy status: `500 Internal Server Error`
- Production region: Seoul (`icn1`)
- Boundra error code and rejected field path: not yet captured

No authorization header, dashboard token, DSN, response body, database value, or raw event is included in this report.

## Reproduction

1. Deploy the current Jabso web and collector applications with production dashboard credentials.
2. Sign in to the private dashboard as the configured owner.
3. Open a dashboard page that loads the project list.
4. Observe the web proxy request to `/api/dashboard/projects` fail with HTTP 500.
5. Observe the corresponding collector invocation for `/api/projects?limit=100` finish with HTTP 400.

## Expected and actual behavior

- Expected: The collector validates the list input and result, then returns a bounded project list with HTTP 200. The web proxy forwards that data to the dashboard.
- Actual: The collector returns HTTP 400 without an outgoing dependency call, and the web proxy surfaces the upstream failure as HTTP 500.

## Root cause

The exact contract failure is not yet known because the captured production evidence does not include Boundra's safe error code, contract field path, or expected/received type.

The collector currently converts every `BoundraRuntimeError` to HTTP 400. That status is appropriate for an invalid request contract but not for a result contract failure caused by server implementation or persisted data. The web adapter then converts any non-success collector response into a generic HTTP 500. This double mapping hides whether the failure is an input rejection, a result rejection, or a Boundra defect.

Until the safe Boundra diagnostic identifies the rejected stage and field, classify this incident as `Undetermined`. A result-schema mismatch or deployment/schema skew would be a Jabso integration issue; only an isolated incorrect validation by Boundra would be an upstream candidate.

## Resolution

Not resolved. Capture the safe diagnostic for this invocation, including only the Boundra code, contract name, validation stage, field path, and expected/received type. Then correct the contract or adapter mismatch and split HTTP handling so client input failures remain 400 while internal result failures return 500.

## Regression coverage

Existing server integration tests cover project listing and repository connections against the test database, but they did not detect this production-only path. The eventual fix should add:

- a production-schema smoke test for `GET /api/projects?limit=100`
- an adapter test proving invalid input contracts return 400
- an adapter test proving result contract failures return 500 without exposing sensitive values
- a web proxy test preserving a safe upstream error identifier for diagnosis

## Privacy review

This report contains only route names, status codes, region, package version, and bounded operational metadata. It excludes credentials, request and response bodies, database contents, raw events, and environment variables.

## Timeline

- 2026-08-25: Production dashboard request failed with HTTP 500; the corresponding collector request returned HTTP 400.
- 2026-08-25: Recorded as an investigating incident pending the safe Boundra diagnostic code and field path.
