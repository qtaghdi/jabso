'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertDialog } from 'src/shared/ui/alert-dialog'
import { Button } from 'src/shared/ui/button'
import { CopyCodeButton } from 'src/shared/ui/copy-code-button'
import { McpConnectionDialog } from 'src/screens/mcp/mcp-connection-dialog'
import { McpTokenDialog } from 'src/screens/mcp/mcp-token-dialog'
import {
  createDashboardMcpConnection,
  dashboardQueryKeys,
  mcpConnectionsQueryOptions,
  revokeDashboardMcpConnection,
} from 'src/shared/query/dashboard-query'
import type { McpConnectionsResponse } from 'src/shared/query/dashboard-types'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { formatDateTime } from 'src/shared/format'

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

export const McpConnectionsView = ({
  canManage,
  initialData,
  projects,
}: McpConnectionsViewProps) => {
  const { locale, t } = useI18n()
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
        <p>{t('mcp.description')}</p>
      </header>
      <section className="mcp-endpoint-section">
        <div>
          <h2>{t('mcp.endpoint')}</h2>
          <p>{t('mcp.endpointDescription')}</p>
        </div>
        <div className="mcp-endpoint">
          <code>{query.data?.endpoint ?? initialData.endpoint}</code>
          <CopyCodeButton copiedLabel={t('common.copied')} iconOnly label={t('mcp.copyEndpoint')} value={query.data?.endpoint ?? initialData.endpoint} />
        </div>
      </section>
      <section className="mcp-connections-section" aria-labelledby="mcp-connections-title">
        <div className="section-heading-row">
          <div>
            <h2 id="mcp-connections-title">{t('mcp.connections')}</h2>
            <span>{t('mcp.connectionCount', { count: connections.length })}</span>
          </div>
          {canManage ? (
            <Button disabled={projects.length === 0} onClick={() => setCreateOpen(true)} type="button">
              {t('mcp.create')}
            </Button>
          ) : null}
        </div>
        {projects.length === 0 ? (
          <p className="muted-copy">{t('mcp.noProject')}</p>
        ) : connections.length === 0 ? (
          <div className="mcp-empty-state">
            <strong>{t('mcp.noConnections')}</strong>
            <p>{t('mcp.noConnectionsDescription')}</p>
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
                    {connection.revokedAt ? t('mcp.revoked') : t('common.active')}
                  </span>
                </div>
                <div className="mcp-project-chips">
                  {connection.projects.map((project) => <span key={project.id}>{project.name}</span>)}
                </div>
                <div className="mcp-connection-meta">
                  <span>{t('mcp.created', { date: formatDateTime(connection.createdAt, locale) })}</span>
                  <span>{connection.lastUsedAt ? t('mcp.lastUsed', { date: formatDateTime(connection.lastUsedAt, locale) }) : t('mcp.neverUsed')}</span>
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
                    {t('mcp.revoke')}
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
          confirmLabel={t('mcp.revokeConnection')}
          description={t('mcp.revokeConfirm', { name: revokeConnection.name })}
          error={revokeMutation.error?.message}
          pending={revokeMutation.isPending}
          title={t('mcp.revokeTitle', { name: revokeConnection.name })}
        />
      ) : null}
    </>
  )
}
