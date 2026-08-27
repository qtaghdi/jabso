import type { IssueFacets, IssueSummary } from 'src/shared/api/issues'
import type { ProjectSummary } from 'src/shared/api/projects'
import type { McpConnection } from 'src/shared/api/mcp'

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

export type McpConnectionsResponse = {
  endpoint: string
  items: McpConnection[]
}
