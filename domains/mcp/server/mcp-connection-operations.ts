import { implementMutation, implementQuery } from 'boundra'
import {
  createMcpConnectionMutation,
  type CreateMcpConnectionMutationInput,
  type CreateMcpConnectionMutationResult,
} from '../shared/contracts/create-mcp-connection.js'
import {
  listMcpConnectionsQuery,
  type ListMcpConnectionsQueryInput,
  type ListMcpConnectionsQueryResult,
} from '../shared/contracts/list-mcp-connections.js'
import {
  revokeMcpConnectionMutation,
  type RevokeMcpConnectionMutationInput,
  type RevokeMcpConnectionMutationResult,
} from '../shared/contracts/revoke-mcp-connection.js'

export type McpConnectionStore = {
  create(input: CreateMcpConnectionMutationInput): Promise<CreateMcpConnectionMutationResult>
  list(input: ListMcpConnectionsQueryInput): Promise<ListMcpConnectionsQueryResult>
  revoke(input: RevokeMcpConnectionMutationInput): Promise<RevokeMcpConnectionMutationResult>
}

export const createCreateMcpConnectionImplementation = (store: McpConnectionStore) =>
  implementMutation(createMcpConnectionMutation, (input) => store.create(input))

export const createListMcpConnectionsImplementation = (store: McpConnectionStore) =>
  implementQuery(listMcpConnectionsQuery, (input) => store.list(input))

export const createRevokeMcpConnectionImplementation = (store: McpConnectionStore) =>
  implementMutation(revokeMcpConnectionMutation, (input) => store.revoke(input))
