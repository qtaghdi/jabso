import { Suspense } from 'react'
import { McpConnectionsView } from 'src/screens/mcp/mcp-connections-view'
import { McpPageSkeleton } from 'src/screens/mcp/mcp-page-skeleton'
import { requireWorkspace } from 'src/shared/auth/workspace-auth'
import { listMcpConnections } from 'src/shared/api/mcp'
import { listProjects } from 'src/shared/api/projects'

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

const McpPage = () => (
  <Suspense fallback={<McpPageSkeleton />}>
    <McpPageData />
  </Suspense>
)

export default McpPage
