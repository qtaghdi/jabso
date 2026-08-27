import { implementQuery } from 'boundra'
import {
  getEventQuery,
  type GetEventQueryInput,
  type GetEventQueryResult,
} from '../shared/contracts/get-event.js'

export type EventQueryStore = {
  get(input: GetEventQueryInput): Promise<GetEventQueryResult>
}

export const createGetEventImplementation = (store: EventQueryStore) =>
  implementQuery(getEventQuery, (input) => store.get(input))
