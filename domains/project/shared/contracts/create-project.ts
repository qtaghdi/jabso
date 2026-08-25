import { defineMutation, type InferSchema } from 'boundra'
import { z } from 'zod'
import { repositoryConnectionSchema } from './repository-connection.js'

export const createProjectInputSchema = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(1).max(80),
})

export const createProjectResultSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(120),
  dsnProjectId: z.string().min(1).max(64),
  publicKey: z.string().min(16).max(128),
  createdAt: z.iso.datetime(),
  repository: repositoryConnectionSchema.nullable(),
})

export type CreateProjectMutationInput = InferSchema<typeof createProjectInputSchema>
export type CreateProjectMutationResult = InferSchema<typeof createProjectResultSchema>

export const createProjectMutation = defineMutation({
  name: 'create-project',
  input: createProjectInputSchema,
  result: createProjectResultSchema,
})
