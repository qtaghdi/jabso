import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  getIssueFacetsQuery,
  type GetIssueFacetsQueryInput,
} from '../../shared/contracts/get-issue-facets.js'

export const getIssueFacets = (
  client: BoundraClient,
  input: GetIssueFacetsQueryInput,
  options?: BoundraCallOptions,
) => client.query(getIssueFacetsQuery, input, options);
