import { defineQuery, type InferSchema } from 'boundra'
import { z } from 'zod'

export const listReleasesInputSchema = z.object({
  projectId: z.uuid(),
  limit: z.number().int().min(1).max(100).default(50),
})

export const releaseSummarySchema = z.object({
  id: z.uuid(),
  version: z.string(),
  dist: z.string(),
  deployedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  artifactCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
})

export const listReleasesResultSchema = z.object({
  items: z.array(releaseSummarySchema).max(100),
})

export type ListReleasesQueryInput = InferSchema<typeof listReleasesInputSchema>
export type ListReleasesQueryResult = InferSchema<typeof listReleasesResultSchema>

export const listReleasesQuery = defineQuery({
  name: 'list-releases',
  input: listReleasesInputSchema,
  result: listReleasesResultSchema,
})
