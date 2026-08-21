import { cache } from 'react'

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
  latestEvent: {
    eventId: string
    message: string | null
    exceptionType: string | null
    platform: string | null
    environment: string | null
    release: string | null
    occurredAt: string | null
    receivedAt: string
    stacktrace: StackFrame[]
    tags: Record<string, string>
  } | null
}

type IssueList = {
  items: IssueSummary[]
  nextCursor: string | null
}

const getApiConfig = () => ({
  baseUrl: process.env.JABSO_API_URL ?? 'http://localhost:4000',
  projectId: process.env.JABSO_PROJECT_ID ?? '1',
  projectKey: process.env.JABSO_PROJECT_KEY ?? '0123456789abcdef0123456789abcdef',
})

const request = async <Result>(path: string): Promise<Result | null> => {
  const { baseUrl, projectId, projectKey } = getApiConfig()
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(
    `${baseUrl}/api/${encodeURIComponent(projectId)}${path}${separator}sentry_key=${encodeURIComponent(projectKey)}`,
    { cache: 'no-store' },
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Jabso API request failed with status ${response.status}`)
  return response.json() as Promise<Result>
}

type IssueFilters = {
  query?: string
  environment?: string
}

export const listIssues = async (filters: IssueFilters = {}) => {
  const parameters = new URLSearchParams({ status: 'unresolved', limit: '50' })
  if (filters.query) parameters.set('query', filters.query)
  if (filters.environment) parameters.set('environment', filters.environment)
  return (await request<IssueList>(`/issues?${parameters}`)) ?? { items: [], nextCursor: null }
}

export const getIssue = cache(async (issueId: string) =>
  request<IssueDetail>(`/issues/${encodeURIComponent(issueId)}`),
)
