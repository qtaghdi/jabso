import { defineQuery, type InferSchema } from 'boundra'
import { z } from 'zod'
import { mcpConnectionSchema } from './mcp-connection.js'

export const listMcpConnectionsInputSchema = z.object({
  workspaceId: z.uuid(),
  limit: z.number().int().min(1).max(100).default(50),
})

export const listMcpConnectionsResultSchema = z.object({
  items: z.array(mcpConnectionSchema).max(100),
})

export type ListMcpConnectionsQueryInput = InferSchema<typeof listMcpConnectionsInputSchema>
export type ListMcpConnectionsQueryResult = InferSchema<typeof listMcpConnectionsResultSchema>

export const listMcpConnectionsQuery = defineQuery({
  name: 'list-mcp-connections',
  input: listMcpConnectionsInputSchema,
  result: listMcpConnectionsResultSchema,
})
