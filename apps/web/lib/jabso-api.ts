import { cache } from 'react'
import { revalidateTag } from 'next/cache'
import { requireOwner } from '@/lib/auth'
import { getActiveProject, getServerApiConfig, type ProjectSummary } from '@/lib/projects'

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

const issueCacheTag = 'jabso-dashboard-issues'

type RequestOptions = {
  cache?: { revalidate: number; tags: string[] }
  operation: string
}

const request = async <Result>(
  path: string,
  init?: RequestInit,
  projectOverride?: ProjectSummary | null,
  options: RequestOptions = { operation: 'issues.request' },
): Promise<Result | null> => {
  await requireOwner()
  const project = projectOverride === undefined ? await getActiveProject() : projectOverride
  if (!project) return null
  const { baseUrl, dashboardToken } = getServerApiConfig()
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${dashboardToken}`)
  const startedAt = performance.now()
  const response = await fetch(
    `${baseUrl}/api/${encodeURIComponent(project.dsnProjectId)}${path}`,
    {
      ...init,
      headers,
      ...(options.cache ? { next: options.cache } : { cache: 'no-store' }),
    },
  )
  console.info('[jabso-dashboard-upstream]', {
    durationMs: Math.round(performance.now() - startedAt),
    operation: options.operation,
    status: response.status,
  })
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

export const listIssues = async (filters: IssueFilters = {}, project?: ProjectSummary | null) => {
  const parameters = new URLSearchParams({ limit: '25' })
  if (filters.query) parameters.set('query', filters.query)
  if (filters.status) parameters.set('status', filters.status)
  if (filters.level) parameters.set('level', filters.level)
  if (filters.environment) parameters.set('environment', filters.environment)
  if (filters.release) parameters.set('release', filters.release)
  if (filters.period) parameters.set('last_seen_after', new Date(Date.now() - periodMilliseconds[filters.period]).toISOString())
  if (filters.cursor) parameters.set('cursor', filters.cursor)
  if (filters.direction) parameters.set('direction', filters.direction)
  return (await request<IssueList>(`/issues?${parameters}`, undefined, project, {
    operation: 'issues.list',
  })) ?? {
    items: [],
    nextCursor: null,
    previousCursor: null,
  }
}

export const getIssueFacets = cache(async (project?: ProjectSummary | null) =>
  (await request<IssueFacets>('/issues/facets', undefined, project, {
    cache: { revalidate: 300, tags: [issueCacheTag] },
    operation: 'issues.facets',
  })) ?? { levels: [], environments: [], releases: [] },
)

export const getIssue = cache(async (issueId: string) =>
  request<IssueDetail>(`/issues/${encodeURIComponent(issueId)}`, undefined, undefined, {
    cache: { revalidate: 30, tags: [issueCacheTag] },
    operation: 'issues.detail',
  }),
)

export const updateIssueStatus = async (issueId: string, status: IssueSummary['status']) => {
  const result = await request<{ issueId: string; status: IssueSummary['status']; changedAt: string }>(
    `/issues/${encodeURIComponent(issueId)}/status`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    undefined,
    { operation: 'issues.status.update' },
  )
  revalidateTag(issueCacheTag, { expire: 0 })
  return result
}
