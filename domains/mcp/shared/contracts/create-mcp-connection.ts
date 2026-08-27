import { defineMutation, type InferSchema } from 'boundra'
import { z } from 'zod'
import { mcpConnectionSchema } from './mcp-connection.js'

export const createMcpConnectionInputSchema = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  projectIds: z.array(z.uuid()).min(1).max(100),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  tokenPrefix: z.string().min(1).max(32),
})

export const createMcpConnectionResultSchema = mcpConnectionSchema.nullable()

export type CreateMcpConnectionMutationInput = InferSchema<typeof createMcpConnectionInputSchema>
export type CreateMcpConnectionMutationResult = InferSchema<typeof createMcpConnectionResultSchema>

export const createMcpConnectionMutation = defineMutation({
  name: 'create-mcp-connection',
  input: createMcpConnectionInputSchema,
  result: createMcpConnectionResultSchema,
})
