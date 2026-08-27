import { z } from 'zod'

export const mcpConnectionProjectSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(120),
})

export const mcpConnectionSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(80),
  tokenPrefix: z.string().min(1).max(32),
  projects: z.array(mcpConnectionProjectSchema).min(1).max(100),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
})
