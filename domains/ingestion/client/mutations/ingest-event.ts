import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  ingestEventMutation,
  type IngestEventMutationInput,
} from "../../shared/contracts/ingest-event";

export function ingestEvent(
  client: BoundraClient,
  input: IngestEventMutationInput,
  options?: BoundraCallOptions,
) {
  return client.mutation(ingestEventMutation, input, options);
}
