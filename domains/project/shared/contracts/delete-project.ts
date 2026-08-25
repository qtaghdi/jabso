import { defineMutation, type InferSchema } from 'boundra'
import { z } from 'zod'

export const deleteProjectInputSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
})

export const deleteProjectResultSchema = z.object({
  deleted: z.boolean(),
  id: z.uuid(),
})

export type DeleteProjectMutationInput = InferSchema<typeof deleteProjectInputSchema>
export type DeleteProjectMutationResult = InferSchema<typeof deleteProjectResultSchema>

export const deleteProjectMutation = defineMutation({
  name: 'delete-project',
  input: deleteProjectInputSchema,
  result: deleteProjectResultSchema,
})
