import { implementMutation, implementQuery } from "boundra";

import {
  getIssueFacetsQuery,
  type GetIssueFacetsQueryInput,
  type GetIssueFacetsQueryResult,
} from '../shared/contracts/get-issue-facets.js'

import {
  getIssueQuery,
  type GetIssueQueryInput,
  type GetIssueQueryResult,
} from '../shared/contracts/get-issue.js'
import {
  searchIssuesQuery,
  type SearchIssuesQueryInput,
  type SearchIssuesQueryResult,
} from '../shared/contracts/search-issues.js'
import {
  updateIssueStatusMutation,
  type UpdateIssueStatusMutationInput,
  type UpdateIssueStatusMutationResult,
} from '../shared/contracts/update-issue-status.js'

export type IssueQueryStore = {
  search(input: SearchIssuesQueryInput): Promise<SearchIssuesQueryResult>;
  get(input: GetIssueQueryInput): Promise<GetIssueQueryResult>;
  facets(input: GetIssueFacetsQueryInput): Promise<GetIssueFacetsQueryResult>;
  updateStatus(input: UpdateIssueStatusMutationInput): Promise<UpdateIssueStatusMutationResult>;
};

export const createSearchIssuesImplementation = (store: IssueQueryStore) =>
  implementQuery(searchIssuesQuery, (input) => store.search(input));

export const createGetIssueImplementation = (store: IssueQueryStore) =>
  implementQuery(getIssueQuery, (input) => store.get(input));

export const createGetIssueFacetsImplementation = (store: IssueQueryStore) =>
  implementQuery(getIssueFacetsQuery, (input) => store.facets(input));

export const createUpdateIssueStatusImplementation = (store: IssueQueryStore) =>
  implementMutation(updateIssueStatusMutation, (input) => store.updateStatus(input));
