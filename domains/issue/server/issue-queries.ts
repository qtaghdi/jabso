import { implementQuery } from "boundra";

import {
  getIssueQuery,
  type GetIssueQueryInput,
  type GetIssueQueryResult,
} from "../shared/contracts/get-issue";
import {
  searchIssuesQuery,
  type SearchIssuesQueryInput,
  type SearchIssuesQueryResult,
} from "../shared/contracts/search-issues";

export type IssueQueryStore = {
  search(input: SearchIssuesQueryInput): Promise<SearchIssuesQueryResult>;
  get(input: GetIssueQueryInput): Promise<GetIssueQueryResult>;
};

export const createSearchIssuesImplementation = (store: IssueQueryStore) =>
  implementQuery(searchIssuesQuery, (input) => store.search(input));

export const createGetIssueImplementation = (store: IssueQueryStore) =>
  implementQuery(getIssueQuery, (input) => store.get(input));
