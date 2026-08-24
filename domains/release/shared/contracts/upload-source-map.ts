import { defineMutation, type InferSchema } from 'boundra'
import { z } from 'zod'

export const maxSourceMapBytes = 5 * 1024 * 1024

export const uploadSourceMapInputSchema = z.object({
  projectId: z.uuid(),
  version: z.string().min(1).max(250),
  dist: z.string().max(128).default(''),
  artifactPath: z.string().min(1).max(2_000),
  content: z.string().min(1).max(maxSourceMapBytes),
  deployedAt: z.iso.datetime().optional(),
})

export const uploadSourceMapResultSchema = z.object({
  releaseId: z.uuid(),
  artifactId: z.uuid(),
  artifactPath: z.string(),
  checksum: z.string(),
  byteSize: z.number().int().positive(),
  processedEventCount: z.number().int().nonnegative(),
  completedEventCount: z.number().int().nonnegative(),
  pendingEventCount: z.number().int().nonnegative(),
})

export type UploadSourceMapMutationInput = InferSchema<typeof uploadSourceMapInputSchema>
export type UploadSourceMapMutationResult = InferSchema<typeof uploadSourceMapResultSchema>

export const uploadSourceMapMutation = defineMutation({
  name: 'upload-source-map',
  input: uploadSourceMapInputSchema,
  result: uploadSourceMapResultSchema,
})
