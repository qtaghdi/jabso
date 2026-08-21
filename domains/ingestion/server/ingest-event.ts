import { implementMutation } from "boundra";

import {
  ingestEventMutation,
  type IngestEventMutationInput,
  type IngestEventMutationResult,
} from "../shared/contracts/ingest-event";

export type IngestEventStore = {
  ingest(input: IngestEventMutationInput): Promise<IngestEventMutationResult>;
};

export function createIngestEventImplementation(store: IngestEventStore) {
  return implementMutation(ingestEventMutation, (input) => store.ingest(input));
}
