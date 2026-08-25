import 'server-only'

import { z } from 'zod'
import { requireOwner } from '@/lib/auth'

const githubRepositorySchema = z.object({
  archived: z.boolean(),
  default_branch: z.string().min(1).max(250),
  html_url: z.url().max(500),
  id: z.number().int().positive().safe(),
  name: z.string().min(1).max(100),
  owner: z.object({ login: z.string().min(1).max(100) }),
  private: z.literal(false),
  updated_at: z.iso.datetime(),
})

const githubRepositoryListSchema = z.array(githubRepositorySchema).max(100)

export class GitHubConnectionError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'GitHubConnectionError'
  }
}

export const listGitHubRepositories = async () => {
  const { githubLogin } = await requireOwner()
  const parameters = new URLSearchParams({
    direction: 'desc',
    per_page: '100',
    sort: 'updated',
    type: 'owner',
  })
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(githubLogin)}/repos?${parameters}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'jabso-dashboard',
      'x-github-api-version': '2022-11-28',
    },
    next: { revalidate: 300 },
  })
  if (response.status === 403) {
    throw new GitHubConnectionError(429, 'GitHub rate limit reached. Try again in a few minutes.')
  }
  if (!response.ok) throw new GitHubConnectionError(502, 'GitHub repositories are temporarily unavailable.')

  const parsed = githubRepositoryListSchema.safeParse(await response.json())
  if (!parsed.success) throw new GitHubConnectionError(502, 'GitHub returned an unsupported repository response.')
  return parsed.data.map((repository) => ({
    archived: repository.archived,
    defaultBranch: repository.default_branch,
    externalId: String(repository.id),
    name: repository.name,
    owner: repository.owner.login,
    private: repository.private,
    updatedAt: repository.updated_at,
    url: repository.html_url,
  }))
}
