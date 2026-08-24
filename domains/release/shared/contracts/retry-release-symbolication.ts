import { defineMutation, type InferSchema } from 'boundra'
import { z } from 'zod'

export const retryReleaseSymbolicationInputSchema = z.object({
  projectId: z.uuid(),
  version: z.string().min(1).max(250),
  dist: z.string().max(128).default(''),
  limit: z.number().int().min(1).max(100).default(100),
})

export const retryReleaseSymbolicationResultSchema = z.object({
  releaseId: z.uuid().nullable(),
  processedEventCount: z.number().int().nonnegative(),
  completedEventCount: z.number().int().nonnegative(),
  missingEventCount: z.number().int().nonnegative(),
  failedEventCount: z.number().int().nonnegative(),
  pendingEventCount: z.number().int().nonnegative(),
})

export type RetryReleaseSymbolicationMutationInput = InferSchema<typeof retryReleaseSymbolicationInputSchema>
export type RetryReleaseSymbolicationMutationResult = InferSchema<typeof retryReleaseSymbolicationResultSchema>

export const retryReleaseSymbolicationMutation = defineMutation({
  name: 'retry-release-symbolication',
  input: retryReleaseSymbolicationInputSchema,
  result: retryReleaseSymbolicationResultSchema,
})
