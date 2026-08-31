'use client'

import { queryOptions } from '@tanstack/react-query'
import type { IssueDetail, IssueSummary } from 'src/shared/api/issues'
import type {
  GitHubRepositoriesResponse,
  GitHubInstallationsResponse,
  IssuesResponse,
  McpConnectionsResponse,
  ProjectsResponse,
} from 'src/shared/query/dashboard-types'
import type { CreatedMcpConnectionResponse } from 'src/shared/api/mcp'
import type { RepositoryConnection } from 'src/shared/api/projects'

const dashboardFetch = async <Result>(path: string, init?: RequestInit): Promise<Result> => {
  const response = await fetch(path, init)
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string } | null
    const message = result?.error
      ?? (response.status === 404 ? 'The requested resource was not found.' : 'Jabso could not load this data.')
    throw new Error(message)
  }
  return response.json() as Promise<Result>
}

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  issue: (issueId: string) => ['dashboard', 'issue', issueId] as const,
  issues: (search: string) => ['dashboard', 'issues', search] as const,
  mcpConnections: ['dashboard', 'mcp-connections'] as const,
  projects: ['dashboard', 'projects'] as const,
  repositories: ['dashboard', 'github-repositories'] as const,
  githubInstallations: ['dashboard', 'github-installations'] as const,
}

export const mcpConnectionsQueryOptions = () => queryOptions({
  queryKey: dashboardQueryKeys.mcpConnections,
  queryFn: () => dashboardFetch<McpConnectionsResponse>('/api/dashboard/mcp/connections'),
  staleTime: 30 * 1000,
})

export const projectsQueryOptions = () => queryOptions({
  queryKey: dashboardQueryKeys.projects,
  queryFn: () => dashboardFetch<ProjectsResponse>('/api/dashboard/projects'),
  staleTime: 5 * 60 * 1000,
})

export const githubRepositoriesQueryOptions = () => queryOptions({
  queryKey: dashboardQueryKeys.repositories,
  queryFn: () => dashboardFetch<GitHubRepositoriesResponse>('/api/dashboard/github/repositories'),
  staleTime: 5 * 60 * 1000,
})

export const githubInstallationsQueryOptions = () => queryOptions({
  queryKey: dashboardQueryKeys.githubInstallations,
  queryFn: () => dashboardFetch<GitHubInstallationsResponse>('/api/dashboard/github/installations'),
  staleTime: 60 * 1000,
})

export const startDashboardGitHubInstallation = () =>
  dashboardFetch<{ url: string }>('/api/dashboard/github/installations', { method: 'POST' })

export const issuesQueryOptions = (search: string) => queryOptions({
  queryKey: dashboardQueryKeys.issues(search),
  queryFn: () => dashboardFetch<IssuesResponse>(`/api/dashboard/issues${search ? `?${search}` : ''}`),
  staleTime: 15 * 1000,
})

export const issueQueryOptions = (issueId: string) => queryOptions({
  queryKey: dashboardQueryKeys.issue(issueId),
  queryFn: () => dashboardFetch<IssueDetail>(`/api/dashboard/issues/${encodeURIComponent(issueId)}`),
  staleTime: 30 * 1000,
})

export const createDashboardProject = (name: string) => dashboardFetch<ProjectsResponse>('/api/dashboard/projects', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name }),
})

export const selectDashboardProject = (projectId: string) => dashboardFetch<ProjectsResponse>('/api/dashboard/projects', {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ projectId }),
})

export const deleteDashboardProject = (projectId: string) => dashboardFetch<ProjectsResponse>('/api/dashboard/projects', {
  method: 'DELETE',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ projectId }),
})

export const connectDashboardRepository = (input: {
  projectId: string
  repositoryId: string
  rootPath: string
}) => dashboardFetch<{ projectId: string; repository: RepositoryConnection }>('/api/dashboard/projects/repository', {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(input),
})

export const disconnectDashboardRepository = (projectId: string) =>
  dashboardFetch<{ disconnected: boolean; projectId: string }>('/api/dashboard/projects/repository', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ projectId }),
  })

export const updateDashboardIssueStatus = (issueId: string, status: IssueSummary['status']) =>
  dashboardFetch<IssueDetail>(`/api/dashboard/issues/${encodeURIComponent(issueId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })

export const createDashboardMcpConnection = (input: { name: string; projectIds: string[] }) =>
  dashboardFetch<CreatedMcpConnectionResponse>('/api/dashboard/mcp/connections', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

export const revokeDashboardMcpConnection = (connectionId: string) =>
  dashboardFetch<{ connectionId: string; revoked: boolean }>(
    `/api/dashboard/mcp/connections/${encodeURIComponent(connectionId)}`,
    { method: 'DELETE' },
  )
