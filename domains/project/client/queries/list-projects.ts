import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  listProjectsQuery,
  type ListProjectsQueryInput,
} from '../../shared/contracts/list-projects.js'

export const listProjects = (
  client: BoundraClient,
  input: ListProjectsQueryInput,
  options?: BoundraCallOptions,
) => {
  return client.query(listProjectsQuery, input, options);
}
