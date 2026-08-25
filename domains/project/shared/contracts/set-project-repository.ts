import { defineMutation, type InferSchema } from 'boundra'
import { z } from 'zod'
import { repositoryConnectionSchema } from './repository-connection.js'

export const setProjectRepositoryInputSchema = z.object({
  workspaceId: z.uuid(),
  projectId: z.uuid(),
  repository: repositoryConnectionSchema.omit({ connectedAt: true }),
})

export const setProjectRepositoryResultSchema = z.object({
  projectId: z.uuid(),
  repository: repositoryConnectionSchema,
})

export type SetProjectRepositoryMutationInput = InferSchema<typeof setProjectRepositoryInputSchema>
export type SetProjectRepositoryMutationResult = InferSchema<typeof setProjectRepositoryResultSchema>

export const setProjectRepositoryMutation = defineMutation({
  name: 'set-project-repository',
  input: setProjectRepositoryInputSchema,
  result: setProjectRepositoryResultSchema,
})
