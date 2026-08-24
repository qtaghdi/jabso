import { implementMutation, implementQuery } from 'boundra'
import {
  getReleaseRegressionsQuery,
  type GetReleaseRegressionsQueryInput,
  type GetReleaseRegressionsQueryResult,
  listReleasesQuery,
  type ListReleasesQueryInput,
  type ListReleasesQueryResult,
  retryReleaseSymbolicationMutation,
  type RetryReleaseSymbolicationMutationInput,
  type RetryReleaseSymbolicationMutationResult,
  uploadSourceMapMutation,
  type UploadSourceMapMutationInput,
  type UploadSourceMapMutationResult,
} from '../shared/public'

export type ReleaseStore = {
  list(input: ListReleasesQueryInput): Promise<ListReleasesQueryResult>
  regressions(input: GetReleaseRegressionsQueryInput): Promise<GetReleaseRegressionsQueryResult>
  uploadSourceMap(input: UploadSourceMapMutationInput): Promise<UploadSourceMapMutationResult>
  retrySymbolication(
    input: RetryReleaseSymbolicationMutationInput,
  ): Promise<RetryReleaseSymbolicationMutationResult>
}

export const createListReleasesImplementation = (store: ReleaseStore) =>
  implementQuery(listReleasesQuery, (input) => store.list(input))

export const createGetReleaseRegressionsImplementation = (store: ReleaseStore) =>
  implementQuery(getReleaseRegressionsQuery, (input) => store.regressions(input))

export const createUploadSourceMapImplementation = (store: ReleaseStore) =>
  implementMutation(uploadSourceMapMutation, (input) => store.uploadSourceMap(input))

export const createRetryReleaseSymbolicationImplementation = (store: ReleaseStore) =>
  implementMutation(retryReleaseSymbolicationMutation, (input) => store.retrySymbolication(input))
