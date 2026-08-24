import { cache } from 'react'
import { requireOwner } from '@/lib/auth'

export type IssueSummary = {
  id: string
  projectId: string
  title: string
  exceptionType: string | null
  level: string
  status: 'unresolved' | 'resolved' | 'ignored'
  eventCount: number
  firstSeenAt: string
  lastSeenAt: string
  regressedAt: string | null
  environment: string | null
  release: string | null
}

export type StackFrame = {
  filename?: string
  function?: string
  line?: number
  column?: number
  inApp?: boolean
}

export type IssueDetail = Omit<IssueSummary, 'environment' | 'release'> & {
  fingerprint: string
  statusChangedAt: string
  resolvedAt: string | null
  occurrences: Array<{
    eventId: string
    level: string
    environment: string | null
    release: string | null
    occurredAt: string | null
    receivedAt: string
  }>
  latestEvent: {
    eventId: string
    message: string | null
    exceptionType: string | null
    platform: string | null
    environment: string | null
    release: string | null
    dist: string | null
    occurredAt: string | null
    receivedAt: string
    stacktrace: StackFrame[]
    originalStacktrace: StackFrame[]
    symbolication: {
      status: 'not_applicable' | 'pending' | 'completed' | 'missing' | 'failed'
      errorCode: string | null
      mappedAt: string | null
    }
    tags: Record<string, string>
    breadcrumbs: Array<{
      timestamp?: string
      category: string
      level?: string
      message?: string
    }>
    context: Record<string, string>
  } | null
  releaseHistory: Array<{
    release: string
    dist: string
    eventCount: number
    firstSeenAt: string
    lastSeenAt: string
    previousResolvedAt: string | null
    regressedAt: string | null
  }>
}

type IssueList = {
  items: IssueSummary[]
  nextCursor: string | null
  previousCursor: string | null
}

export type IssueFacets = {
  levels: string[]
  environments: string[]
  releases: string[]
}

const getApiConfig = () => {
  const config = {
    baseUrl: process.env.JABSO_API_URL?.trim() || 'http://localhost:4000',
    projectId: process.env.JABSO_PROJECT_ID?.trim() || '1',
    dashboardToken: process.env.JABSO_DASHBOARD_TOKEN?.trim() || 'replace-with-a-long-random-token',
  }
  const missingProductionVariables = process.env.VERCEL === '1'
    ? [
        !process.env.JABSO_API_URL?.trim() && 'JABSO_API_URL',
        !process.env.JABSO_PROJECT_ID?.trim() && 'JABSO_PROJECT_ID',
        !process.env.JABSO_DASHBOARD_TOKEN?.trim() && 'JABSO_DASHBOARD_TOKEN',
      ].filter(Boolean)
    : []

  if (missingProductionVariables.length > 0) {
    throw new Error(`Jabso web configuration is missing: ${missingProductionVariables.join(', ')}`)
  }

  return { ...config, baseUrl: config.baseUrl.replace(/\/$/, '') }
}

const request = async <Result>(path: string, init?: RequestInit): Promise<Result | null> => {
  await requireOwner()
  const { baseUrl, projectId, dashboardToken } = getApiConfig()
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${dashboardToken}`)
  const response = await fetch(
    `${baseUrl}/api/${encodeURIComponent(projectId)}${path}`,
    { cache: 'no-store', ...init, headers },
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Jabso API request failed with status ${response.status}`)
  return response.json() as Promise<Result>
}

export type IssueFilters = {
  query?: string
  status?: IssueSummary['status']
  level?: string
  environment?: string
  release?: string
  period?: '24h' | '7d' | '30d'
  cursor?: string
  direction?: 'next' | 'previous'
}

const periodMilliseconds = { '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 }

export const listIssues = async (filters: IssueFilters = {}) => {
  const parameters = new URLSearchParams({ limit: '25' })
  if (filters.query) parameters.set('query', filters.query)
  if (filters.status) parameters.set('status', filters.status)
  if (filters.level) parameters.set('level', filters.level)
  if (filters.environment) parameters.set('environment', filters.environment)
  if (filters.release) parameters.set('release', filters.release)
  if (filters.period) parameters.set('last_seen_after', new Date(Date.now() - periodMilliseconds[filters.period]).toISOString())
  if (filters.cursor) parameters.set('cursor', filters.cursor)
  if (filters.direction) parameters.set('direction', filters.direction)
  return (await request<IssueList>(`/issues?${parameters}`)) ?? {
    items: [],
    nextCursor: null,
    previousCursor: null,
  }
}

export const getIssueFacets = cache(async () =>
  (await request<IssueFacets>('/issues/facets')) ?? { levels: [], environments: [], releases: [] },
)

export const getIssue = cache(async (issueId: string) =>
  request<IssueDetail>(`/issues/${encodeURIComponent(issueId)}`),
)

export const updateIssueStatus = async (issueId: string, status: IssueSummary['status']) =>
  request<{ issueId: string; status: IssueSummary['status']; changedAt: string }>(
    `/issues/${encodeURIComponent(issueId)}/status`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  )
