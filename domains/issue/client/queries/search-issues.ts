import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  searchIssuesQuery,
  type SearchIssuesQueryInput,
} from "../../shared/contracts/search-issues";

export const searchIssues = (
  client: BoundraClient,
  input: SearchIssuesQueryInput,
  options?: BoundraCallOptions,
) => {
  return client.query(searchIssuesQuery, input, options);
}
