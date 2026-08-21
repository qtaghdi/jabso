import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  getEventQuery,
  type GetEventQueryInput,
} from "../../shared/contracts/get-event";

export function getEvent(
  client: BoundraClient,
  input: GetEventQueryInput,
  options?: BoundraCallOptions,
) {
  return client.query(getEventQuery, input, options);
}
