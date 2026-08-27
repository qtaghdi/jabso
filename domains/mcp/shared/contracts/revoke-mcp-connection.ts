import { defineMutation, type InferSchema } from 'boundra'
import { z } from 'zod'

export const revokeMcpConnectionInputSchema = z.object({
  workspaceId: z.uuid(),
  connectionId: z.uuid(),
})

export const revokeMcpConnectionResultSchema = z.object({
  connectionId: z.uuid(),
  revoked: z.boolean(),
})

export type RevokeMcpConnectionMutationInput = InferSchema<typeof revokeMcpConnectionInputSchema>
export type RevokeMcpConnectionMutationResult = InferSchema<typeof revokeMcpConnectionResultSchema>

export const revokeMcpConnectionMutation = defineMutation({
  name: 'revoke-mcp-connection',
  input: revokeMcpConnectionInputSchema,
  result: revokeMcpConnectionResultSchema,
})
