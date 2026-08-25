import type { IssueFacets, IssueSummary } from '@/lib/jabso-api'
import type { ProjectSummary } from '@/lib/projects'

export type DashboardProject = ProjectSummary & {
  active: boolean
  dsn: string
}

export type ProjectsResponse = {
  items: DashboardProject[]
}

export type GitHubRepository = {
  archived: boolean
  defaultBranch: string
  externalId: string
  name: string
  owner: string
  private: boolean
  updatedAt: string
  url: string
}

export type GitHubRepositoriesResponse = {
  items: GitHubRepository[]
}

export type IssuesResponse = {
  activeProject: DashboardProject | null
  facets: IssueFacets
  items: IssueSummary[]
  nextCursor: string | null
  previousCursor: string | null
}
