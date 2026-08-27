import 'server-only'

import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { requireGitHubUser } from 'src/shared/auth/workspace-auth'

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
  const { githubLogin, userId } = await requireGitHubUser()
  const client = await clerkClient()
  const oauthTokens = await client.users.getUserOauthAccessToken(userId, 'github')
  const accessToken = oauthTokens.data[0]?.token
  const parameters = new URLSearchParams(accessToken ? {
    affiliation: 'owner,collaborator,organization_member',
    direction: 'desc',
    per_page: '100',
    sort: 'updated',
    visibility: 'public',
  } : {
    direction: 'desc',
    per_page: '100',
    sort: 'updated',
    type: 'owner',
  })
  const endpoint = accessToken
    ? 'https://api.github.com/user/repos'
    : `https://api.github.com/users/${encodeURIComponent(githubLogin)}/repos`
  const response = await fetch(`${endpoint}?${parameters}`, {
    headers: {
      accept: 'application/vnd.github+json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      'user-agent': 'jabso-dashboard',
      'x-github-api-version': '2022-11-28',
    },
    cache: 'no-store',
  })
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    throw new GitHubConnectionError(429, 'GitHub rate limit reached. Try again in a few minutes.')
  }
  if (response.status === 401 || response.status === 403) {
    throw new GitHubConnectionError(403, 'Reconnect GitHub to grant access to your public organization repositories.')
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
