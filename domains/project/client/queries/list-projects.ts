import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  listProjectsQuery,
  type ListProjectsQueryInput,
} from "../../shared/contracts/list-projects";

export const listProjects = (
  client: BoundraClient,
  input: ListProjectsQueryInput,
  options?: BoundraCallOptions,
) => {
  return client.query(listProjectsQuery, input, options);
}
