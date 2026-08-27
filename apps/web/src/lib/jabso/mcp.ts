import 'server-only'

import { requireWorkspace } from 'src/lib/auth/workspace-auth'
import { getServerApiConfig } from 'src/lib/jabso/server-api-config'

export type McpConnectionProject = {
  id: string
  name: string
  slug: string
}

export type McpConnection = {
  id: string
  name: string
  tokenPrefix: string
  projects: McpConnectionProject[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export type McpConnectionsResponse = {
  endpoint: string
  items: McpConnection[]
}

export type CreatedMcpConnectionResponse = {
  connection: McpConnection
  endpoint: string
  token: string
}

const mcpRequest = async <Result>(path: string, init?: RequestInit): Promise<Result> => {
  const workspace = await requireWorkspace()
  const { baseUrl, dashboardToken } = getServerApiConfig()
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${dashboardToken}`)
  headers.set('x-jabso-workspace-id', workspace.id)
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  })
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(result?.error ?? `Jabso API request failed with status ${response.status}`)
  }
  return response.json() as Promise<Result>
}

export const listMcpConnections = async (): Promise<McpConnectionsResponse> => {
  const { baseUrl } = getServerApiConfig()
  const result = await mcpRequest<{ items: McpConnection[] }>('/api/mcp/connections?limit=100')
  return { ...result, endpoint: `${baseUrl}/mcp` }
}

export const createMcpConnection = async (input: { name: string; projectIds: string[] }) => {
  const { baseUrl } = getServerApiConfig()
  const result = await mcpRequest<{ connection: McpConnection; token: string }>('/api/mcp/connections', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  return { ...result, endpoint: `${baseUrl}/mcp` }
}

export const revokeMcpConnection = async (connectionId: string) =>
  mcpRequest<{ connectionId: string; revoked: boolean }>(
    `/api/mcp/connections/${encodeURIComponent(connectionId)}`,
    { method: 'DELETE' },
  )
