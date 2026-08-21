import type { BoundraCallOptions, BoundraClient } from "boundra";

import {
  getEventQuery,
  type GetEventQueryInput,
} from "../../shared/contracts/get-event";

export const getEvent = (
  client: BoundraClient,
  input: GetEventQueryInput,
  options?: BoundraCallOptions,
) => {
  return client.query(getEventQuery, input, options);
}
