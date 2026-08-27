'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertDialog } from 'src/components/ui/alert-dialog'
import { Button } from 'src/components/ui/button'
import { CopyCodeButton } from 'src/components/ui/copy-code-button'
import { McpConnectionDialog } from 'src/features/mcp/components/mcp-connection-dialog'
import { McpTokenDialog } from 'src/features/mcp/components/mcp-token-dialog'
import {
  createDashboardMcpConnection,
  dashboardQueryKeys,
  mcpConnectionsQueryOptions,
  revokeDashboardMcpConnection,
} from 'src/lib/dashboard/dashboard-query'
import type { McpConnectionsResponse } from 'src/lib/dashboard/dashboard-types'

type ProjectOption = {
  id: string
  name: string
  slug: string
}

type McpConnectionsViewProps = {
  canManage: boolean
  initialData: McpConnectionsResponse
  projects: ProjectOption[]
}

type CreatedSecret = {
  endpoint: string
  name: string
  token: string
}

const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatDate = (value: string) => dateTimeFormatter.format(new Date(value))

export const McpConnectionsView = ({
  canManage,
  initialData,
  projects,
}: McpConnectionsViewProps) => {
  const queryClient = useQueryClient()
  const query = useQuery({ ...mcpConnectionsQueryOptions(), initialData })
  const [createOpen, setCreateOpen] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<CreatedSecret | null>(null)
  const [revokeConnectionId, setRevokeConnectionId] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createDashboardMcpConnection,
    onSuccess: (result) => {
      queryClient.setQueryData<McpConnectionsResponse>(dashboardQueryKeys.mcpConnections, (current) => ({
        endpoint: result.endpoint,
        items: [result.connection, ...(current?.items ?? [])],
      }))
      setCreateOpen(false)
      setCreatedSecret({
        endpoint: result.endpoint,
        name: result.connection.name,
        token: result.token,
      })
    },
  })
  const revokeMutation = useMutation({
    mutationFn: revokeDashboardMcpConnection,
    onSuccess: (result) => {
      queryClient.setQueryData<McpConnectionsResponse>(dashboardQueryKeys.mcpConnections, (current) => ({
        endpoint: current?.endpoint ?? initialData.endpoint,
        items: (current?.items ?? []).map((connection) => connection.id === result.connectionId
          ? { ...connection, revokedAt: new Date().toISOString() }
          : connection),
      }))
      setRevokeConnectionId(null)
    },
  })

  const connections = query.data?.items ?? []
  const revokeConnection = connections.find((connection) => connection.id === revokeConnectionId) ?? null

  return (
    <>
      <header className="page-header compact-page-header">
        <h1>MCP</h1>
        <p>Give AI clients narrow, read-only access to the errors already collected by Jabso.</p>
      </header>
      <section className="mcp-endpoint-section">
        <div>
          <h2>Server endpoint</h2>
          <p>Use one endpoint for every connection. Authentication and project access come from its token.</p>
        </div>
        <div className="mcp-endpoint">
          <code>{query.data?.endpoint ?? initialData.endpoint}</code>
          <CopyCodeButton iconOnly label="Copy MCP endpoint" value={query.data?.endpoint ?? initialData.endpoint} />
        </div>
      </section>
      <section className="mcp-connections-section" aria-labelledby="mcp-connections-title">
        <div className="section-heading-row">
          <div>
            <h2 id="mcp-connections-title">Connections</h2>
            <span>{connections.length} {connections.length === 1 ? 'connection' : 'connections'}</span>
          </div>
          {canManage ? (
            <Button disabled={projects.length === 0} onClick={() => setCreateOpen(true)} type="button">
              Create connection
            </Button>
          ) : null}
        </div>
        {projects.length === 0 ? (
          <p className="muted-copy">Create a project before connecting an MCP client.</p>
        ) : connections.length === 0 ? (
          <div className="mcp-empty-state">
            <strong>No MCP connections yet</strong>
            <p>Create one when you are ready to inspect Jabso issues from Codex, Claude, or another MCP client.</p>
          </div>
        ) : (
          <div className="mcp-connection-list">
            {connections.map((connection) => (
              <article className="mcp-connection-row" key={connection.id}>
                <div className="mcp-connection-name">
                  <div>
                    <h3>{connection.name}</h3>
                    <code>{connection.tokenPrefix}••••••••</code>
                  </div>
                  <span className={connection.revokedAt ? 'mcp-status-revoked' : 'mcp-status-active'}>
                    {connection.revokedAt ? 'Revoked' : 'Active'}
                  </span>
                </div>
                <div className="mcp-project-chips">
                  {connection.projects.map((project) => <span key={project.id}>{project.name}</span>)}
                </div>
                <div className="mcp-connection-meta">
                  <span>Created {formatDate(connection.createdAt)}</span>
                  <span>{connection.lastUsedAt ? `Last used ${formatDate(connection.lastUsedAt)}` : 'Never used'}</span>
                </div>
                {canManage && !connection.revokedAt ? (
                  <Button
                    onClick={() => {
                      revokeMutation.reset()
                      setRevokeConnectionId(connection.id)
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Revoke
                  </Button>
                ) : <span />}
              </article>
            ))}
          </div>
        )}
      </section>
      {createOpen ? (
        <McpConnectionDialog
          close={() => {
            if (!createMutation.isPending) setCreateOpen(false)
          }}
          error={createMutation.error?.message}
          pending={createMutation.isPending}
          projects={projects}
          submit={(input) => createMutation.mutate(input)}
        />
      ) : null}
      {createdSecret ? (
        <McpTokenDialog
          close={() => setCreatedSecret(null)}
          endpoint={createdSecret.endpoint}
          name={createdSecret.name}
          token={createdSecret.token}
        />
      ) : null}
      {revokeConnection ? (
        <AlertDialog
          cancel={() => {
            if (!revokeMutation.isPending) setRevokeConnectionId(null)
          }}
          confirm={() => revokeMutation.mutate(revokeConnection.id)}
          confirmLabel="Revoke connection"
          description={`${revokeConnection.name} will stop working on its next request. Existing audit history is retained.`}
          error={revokeMutation.error?.message}
          pending={revokeMutation.isPending}
          title={`Revoke ${revokeConnection.name}?`}
        />
      ) : null}
    </>
  )
}
