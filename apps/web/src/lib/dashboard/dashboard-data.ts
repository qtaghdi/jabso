import 'server-only'

import {
  getIssueFacets,
  listIssues,
  type IssueFilters,
  type IssueSummary,
} from 'src/lib/jabso/issues'
import {
  getActiveProject,
  getActiveProjectFrom,
  listProjects,
  projectDsn,
  type ProjectSummary,
} from 'src/lib/jabso/projects'
import type { IssuesResponse, ProjectsResponse } from 'src/lib/dashboard/dashboard-types'

const statuses = new Set<IssueSummary['status']>(['unresolved', 'resolved', 'ignored'])
const periods = new Set<IssueFilters['period']>(['24h', '7d', '30d'])
const directions = new Set<IssueFilters['direction']>(['next', 'previous'])

const optional = (parameters: URLSearchParams, key: string) => parameters.get(key) || undefined

const dashboardProject = (project: ProjectSummary, activeProjectId?: string): ProjectsResponse['items'][number] => ({
  ...project,
  active: project.dsnProjectId === activeProjectId,
  dsn: projectDsn(project),
})

export const createProjectsResponse = async (items: ProjectSummary[]): Promise<ProjectsResponse> => {
  const activeProject = await getActiveProjectFrom(items)
  return { items: items.map((project) => dashboardProject(project, activeProject?.dsnProjectId)) }
}

export const getProjectsResponse = async (): Promise<ProjectsResponse> =>
  createProjectsResponse((await listProjects()).items)

export const issueFiltersFromParameters = (parameters: URLSearchParams): IssueFilters => {
  const status = optional(parameters, 'status')
  const period = optional(parameters, 'period')
  const direction = optional(parameters, 'direction')
  return {
    cursor: optional(parameters, 'cursor'),
    direction: directions.has(direction as IssueFilters['direction']) ? direction as IssueFilters['direction'] : undefined,
    environment: optional(parameters, 'environment'),
    level: optional(parameters, 'level'),
    period: periods.has(period as IssueFilters['period']) ? period as IssueFilters['period'] : undefined,
    query: optional(parameters, 'query'),
    release: optional(parameters, 'release'),
    status: statuses.has(status as IssueSummary['status']) ? status as IssueSummary['status'] : undefined,
  }
}

export const getIssuesResponse = async (parameters: URLSearchParams): Promise<IssuesResponse> => {
  const activeProject = await getActiveProject()
  if (!activeProject) {
    return {
      activeProject: null,
      facets: { environments: [], levels: [], releases: [] },
      items: [],
      nextCursor: null,
      previousCursor: null,
    }
  }

  const [issues, facets] = await Promise.all([
    listIssues(issueFiltersFromParameters(parameters), activeProject),
    getIssueFacets(activeProject),
  ])
  return {
    ...issues,
    activeProject: dashboardProject(activeProject, activeProject.dsnProjectId),
    facets,
  }
}
