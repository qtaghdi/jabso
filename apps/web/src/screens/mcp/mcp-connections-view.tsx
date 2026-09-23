'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { AlertDialog } from 'src/shared/ui/alert-dialog'
import { Button, buttonClassName } from 'src/shared/ui/button'
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
import { dashboardPageHeaderClass, dashboardSectionHeadingClass, dashboardSurfaceClass } from 'src/shared/ui/dashboard-styles'

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

const McpEmptyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M8 7.5h8M8 16.5h8M7.5 8v8M16.5 8v8" />
    <circle cx="7.5" cy="7.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
)

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
      <header className={dashboardPageHeaderClass}>
        <h1>MCP</h1>
        <p>{t('mcp.description')}</p>
      </header>
      <section className={`${dashboardSurfaceClass} grid grid-cols-[minmax(260px,.8fr)_minmax(360px,1.2fr)] items-center gap-12 px-6 py-5 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:tracking-[-0.015em] [&_p]:mt-2 [&_p]:mb-0 [&_p]:max-w-lg [&_p]:text-[13px] [&_p]:text-muted max-[620px]:grid-cols-1 max-[620px]:gap-5.5 max-[620px]:p-[18px]`}>
        <div>
          <h2>{t('mcp.endpoint')}</h2>
          <p>{t('mcp.endpointDescription')}</p>
        </div>
        <div className="mcp-endpoint rounded-lg border border-line-strong bg-subtle">
          <code>{query.data?.endpoint ?? initialData.endpoint}</code>
          <CopyCodeButton copiedLabel={t('common.copied')} iconOnly label={t('mcp.copyEndpoint')} value={query.data?.endpoint ?? initialData.endpoint} />
        </div>
      </section>
      <section className={`${dashboardSurfaceClass} mt-4 px-6 pt-5 pb-6 max-[620px]:p-[18px]`} aria-labelledby="mcp-connections-title">
        <div className={`${dashboardSectionHeadingClass} border-b border-line pb-4 max-[620px]:items-stretch max-[620px]:flex-col`}>
          <div className="flex items-baseline gap-2.5">
            <h2 id="mcp-connections-title">{t('mcp.connections')}</h2>
            <span>{t('mcp.connectionCount', { count: connections.length })}</span>
          </div>
          {canManage && connections.length > 0 ? (
            <Button onClick={() => setCreateOpen(true)} type="button">
              {t('mcp.create')}
            </Button>
          ) : null}
        </div>
        {projects.length === 0 ? (
          <div className="mcp-empty-state grid justify-items-start border-0 px-0 pt-10 pb-4">
            <span className="mb-4 grid size-11 place-items-center rounded-xl border border-line bg-subtle text-[#3d4651] [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6]"><McpEmptyIcon /></span>
            <strong>{t('mcp.noProjectTitle')}</strong>
            <p className="mb-4 text-pretty">{t('mcp.noProject')}</p>
            <Link className={buttonClassName('primary')} href="/projects">{t('mcp.openProjects')}</Link>
          </div>
        ) : connections.length === 0 ? (
          <div className="mcp-empty-state grid justify-items-start border-0 px-0 pt-10 pb-4">
            <span className="mb-4 grid size-11 place-items-center rounded-xl border border-line bg-subtle text-[#3d4651] [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6]"><McpEmptyIcon /></span>
            <strong>{t('mcp.noConnections')}</strong>
            <p className="mb-4 text-pretty">{t('mcp.noConnectionsDescription')}</p>
            {canManage ? <Button onClick={() => setCreateOpen(true)} type="button">{t('mcp.create')}</Button> : null}
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
          cancelLabel={t('common.cancel')}
          closeLabel={t('common.close')}
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
