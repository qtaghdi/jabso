import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  updateIssueStatusMutation,
  type UpdateIssueStatusMutationInput,
} from "../../shared/contracts/update-issue-status";

export const updateIssueStatus = (
  client: BoundraClient,
  input: UpdateIssueStatusMutationInput,
  options?: BoundraCallOptions,
) => client.mutation(updateIssueStatusMutation, input, options);
