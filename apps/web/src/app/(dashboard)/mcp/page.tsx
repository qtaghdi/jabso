import { Suspense } from 'react'
import { McpConnectionsView } from 'src/features/mcp/components/mcp-connections-view'
import { requireWorkspace } from 'src/lib/auth/workspace-auth'
import { listMcpConnections } from 'src/lib/jabso/mcp'
import { listProjects } from 'src/lib/jabso/projects'

const McpPageData = async () => {
  const [workspace, connections, projects] = await Promise.all([
    requireWorkspace(),
    listMcpConnections(),
    listProjects(),
  ])
  return (
    <McpConnectionsView
      canManage={workspace.canManage}
      initialData={connections}
      projects={projects.items.map(({ id, name, slug }) => ({ id, name, slug }))}
    />
  )
}

const McpPageLoading = () => (
  <div className="dashboard-page-loading" role="status">
    <div className="page-header-loading">
      <span className="skeleton-block skeleton-title" />
      <span className="skeleton-block skeleton-copy" />
    </div>
    <span className="skeleton-block skeleton-project-form" />
    <div className="skeleton-table">
      {Array.from({ length: 2 }, (_, index) => <span className="skeleton-block" key={index} />)}
    </div>
    <span className="sr-only">Loading MCP connections</span>
  </div>
)

const McpPage = () => (
  <Suspense fallback={<McpPageLoading />}>
    <McpPageData />
  </Suspense>
)

export default McpPage
