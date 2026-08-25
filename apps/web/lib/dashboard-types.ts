import type { IssueFacets, IssueSummary } from '@/lib/jabso-api'
import type { ProjectSummary } from '@/lib/projects'

export type DashboardProject = ProjectSummary & {
  active: boolean
  dsn: string
}

export type ProjectsResponse = {
  items: DashboardProject[]
}

export type IssuesResponse = {
  activeProject: DashboardProject | null
  facets: IssueFacets
  items: IssueSummary[]
  nextCursor: string | null
  previousCursor: string | null
}
