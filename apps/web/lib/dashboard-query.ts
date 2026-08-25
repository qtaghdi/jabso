'use client'

import { queryOptions } from '@tanstack/react-query'
import type { IssueDetail, IssueSummary } from '@/lib/jabso-api'
import type { IssuesResponse, ProjectsResponse } from '@/lib/dashboard-types'

const dashboardFetch = async <Result>(path: string, init?: RequestInit): Promise<Result> => {
  const response = await fetch(path, init)
  if (!response.ok) {
    const message = response.status === 404 ? 'The requested resource was not found.' : 'Jabso could not load this data.'
    throw new Error(message)
  }
  return response.json() as Promise<Result>
}

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  issue: (issueId: string) => ['dashboard', 'issue', issueId] as const,
  issues: (search: string) => ['dashboard', 'issues', search] as const,
  projects: ['dashboard', 'projects'] as const,
}

export const projectsQueryOptions = () => queryOptions({
  queryKey: dashboardQueryKeys.projects,
  queryFn: () => dashboardFetch<ProjectsResponse>('/api/dashboard/projects'),
})

export const issuesQueryOptions = (search: string) => queryOptions({
  queryKey: dashboardQueryKeys.issues(search),
  queryFn: () => dashboardFetch<IssuesResponse>(`/api/dashboard/issues${search ? `?${search}` : ''}`),
})

export const issueQueryOptions = (issueId: string) => queryOptions({
  queryKey: dashboardQueryKeys.issue(issueId),
  queryFn: () => dashboardFetch<IssueDetail>(`/api/dashboard/issues/${encodeURIComponent(issueId)}`),
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

export const updateDashboardIssueStatus = (issueId: string, status: IssueSummary['status']) =>
  dashboardFetch<IssueDetail>(`/api/dashboard/issues/${encodeURIComponent(issueId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })
