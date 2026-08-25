import { defineMutation, type InferSchema } from 'boundra'
import { z } from 'zod'

export const disconnectProjectRepositoryInputSchema = z.object({
  workspaceId: z.uuid(),
  projectId: z.uuid(),
})

export const disconnectProjectRepositoryResultSchema = z.object({
  disconnected: z.boolean(),
  projectId: z.uuid(),
})

export type DisconnectProjectRepositoryMutationInput = InferSchema<typeof disconnectProjectRepositoryInputSchema>
export type DisconnectProjectRepositoryMutationResult = InferSchema<typeof disconnectProjectRepositoryResultSchema>

export const disconnectProjectRepositoryMutation = defineMutation({
  name: 'disconnect-project-repository',
  input: disconnectProjectRepositoryInputSchema,
  result: disconnectProjectRepositoryResultSchema,
})
