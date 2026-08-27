export type AuthenticatedMcpConnection = {
  id: string
  workspaceId: string
  projectIds: string[]
}

export type McpAuditInput = {
  connectionId: string
  workspaceId: string
  projectId: string | null
  tool: string
  outcome: 'success' | 'error' | 'denied'
  durationMs: number
}

export type AllowedMcpProject = {
  id: string
  name: string
  slug: string
  repository: {
    owner: string
    name: string
    url: string
    rootPath: string
  } | null
}

export type McpTransportStore = {
  authenticate: (tokenHash: string) => Promise<AuthenticatedMcpConnection | null>
  listAllowedProjects: (connection: AuthenticatedMcpConnection) => Promise<AllowedMcpProject[]>
  recordAudit: (input: McpAuditInput) => Promise<void>
}
