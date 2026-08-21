import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  getReleaseRegressionsQuery,
  type GetReleaseRegressionsQueryInput,
} from "../../shared/contracts/get-release-regressions";

export function getReleaseRegressions(
  client: BoundraClient,
  input: GetReleaseRegressionsQueryInput,
  options?: BoundraCallOptions,
) {
  return client.query(getReleaseRegressionsQuery, input, options);
}
