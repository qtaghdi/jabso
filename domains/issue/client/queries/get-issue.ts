import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  getIssueQuery,
  type GetIssueQueryInput,
} from "../../shared/contracts/get-issue";

export function getIssue(
  client: BoundraClient,
  input: GetIssueQueryInput,
  options?: BoundraCallOptions,
) {
  return client.query(getIssueQuery, input, options);
}
