import type { IssueFacets, IssueSummary } from 'src/lib/jabso/issues'
import type { ProjectSummary } from 'src/lib/jabso/projects'
import type { McpConnection } from 'src/lib/jabso/mcp'

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
