import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getIssueFacets, listIssues, type IssueFilters, type IssueSummary } from '@/lib/jabso-api'
import { getActiveProject, projectDsn } from '@/lib/projects'

const statuses = new Set<IssueSummary['status']>(['unresolved', 'resolved', 'ignored'])
const periods = new Set<IssueFilters['period']>(['24h', '7d', '30d'])
const directions = new Set<IssueFilters['direction']>(['next', 'previous'])

const optional = (parameters: URLSearchParams, key: string) => parameters.get(key) || undefined

export const GET = async (request: Request) => {
  await requireOwner()
  const activeProject = await getActiveProject()
  if (!activeProject) {
    return NextResponse.json({
      activeProject: null,
      facets: { environments: [], levels: [], releases: [] },
      items: [],
      nextCursor: null,
      previousCursor: null,
    })
  }

  const parameters = new URL(request.url).searchParams
  const status = optional(parameters, 'status')
  const period = optional(parameters, 'period')
  const direction = optional(parameters, 'direction')
  const filters: IssueFilters = {
    cursor: optional(parameters, 'cursor'),
    direction: directions.has(direction as IssueFilters['direction']) ? direction as IssueFilters['direction'] : undefined,
    environment: optional(parameters, 'environment'),
    level: optional(parameters, 'level'),
    period: periods.has(period as IssueFilters['period']) ? period as IssueFilters['period'] : undefined,
    query: optional(parameters, 'query'),
    release: optional(parameters, 'release'),
    status: statuses.has(status as IssueSummary['status']) ? status as IssueSummary['status'] : undefined,
  }
  const [issues, facets] = await Promise.all([listIssues(filters), getIssueFacets()])
  return NextResponse.json({
    ...issues,
    activeProject: { ...activeProject, active: true, dsn: projectDsn(activeProject) },
    facets,
  })
}
