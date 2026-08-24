import type { BoundraCallOptions, BoundraClient } from 'boundra'
import {
  listReleasesQuery,
  type ListReleasesQueryInput,
} from '../../shared/contracts/list-releases'

export const listReleases = (
  client: BoundraClient,
  input: ListReleasesQueryInput,
  options?: BoundraCallOptions,
) => client.query(listReleasesQuery, input, options)
