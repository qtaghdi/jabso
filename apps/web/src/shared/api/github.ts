import 'server-only'

import { cache } from 'react'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { getServerApiConfig } from 'src/shared/api/server-api-config'

export type GitHubInstallation = {
  accountId: string
  accountLogin: string
  accountType: 'Organization' | 'User'
  installationId: string
  manageUrl: string
  repositorySelection: 'all' | 'selected'
  suspendedAt: string | null
}

export type GitHubInstallationsResponse = {
  configured: boolean
  items: GitHubInstallation[]
}

export type GitHubRepository = {
  archived: boolean
  defaultBranch: string
  externalId: string
  installationId: string
  name: string
  owner: string
  private: boolean
  updatedAt: string
  url: string
}

export type GitHubRepositoriesResponse = {
  items: GitHubRepository[]
}

export class GitHubRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'GitHubRequestError'
  }
}

const githubRequest = async <Result>(
  path: string,
  init?: RequestInit,
): Promise<Result> => {
  const workspace = await requireWorkspace()
  const { baseUrl, dashboardToken } = getServerApiConfig()
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${dashboardToken}`)
  headers.set('x-jabso-workspace-id', workspace.id)
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string } | null
    throw new GitHubRequestError(
      response.status,
      result?.error ?? `GitHub App request failed with status ${response.status}`,
    )
  }
  return response.json() as Promise<Result>
}

export const listGitHubInstallations = cache(async () =>
  githubRequest<GitHubInstallationsResponse>('/api/github/installations'))

export const startGitHubInstallation = () =>
  githubRequest<{ url: string }>('/api/github/installations/session', {
    method: 'POST',
  })

export const claimGitHubInstallation = (claim: string) =>
  githubRequest<{ connected: true }>('/api/github/installations/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ claim }),
  })

export const listGitHubRepositories = () =>
  githubRequest<GitHubRepositoriesResponse>('/api/github/repositories')
