import { z } from 'zod'

const repositoryRootPathSchema = z.string().max(500).refine((value) => {
  if (!value) return true
  const segments = value.split('/')
  return !value.startsWith('/')
    && !value.endsWith('/')
    && !value.includes('\\')
    && segments.every((segment) => segment && segment !== '.' && segment !== '..')
}, 'Repository root must be a normalized relative path')

const githubRepositoryUrlSchema = z.url().max(500).refine((value) => {
  const url = new URL(value)
  return url.protocol === 'https:' && url.hostname === 'github.com'
}, 'Repository URL must use https://github.com')

export const repositoryConnectionSchema = z.object({
  connectedAt: z.iso.datetime(),
  defaultBranch: z.string().min(1).max(250),
  externalId: z.string().min(1).max(64),
  name: z.string().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/),
  owner: z.string().min(1).max(100).regex(/^[A-Za-z0-9-]+$/),
  private: z.literal(false),
  rootPath: repositoryRootPathSchema,
  url: githubRepositoryUrlSchema,
})
