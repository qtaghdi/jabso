import type { SqlExecutor } from '@jabso/db'

export type WorkspaceKind = 'personal' | 'team' | 'organization'

export type Workspace = {
  id: string
  externalId: string
  kind: WorkspaceKind
  name: string
}

type WorkspaceRow = {
  external_id: string
  id: string
  kind: WorkspaceKind
  name: string
}

const toWorkspace = (row: WorkspaceRow): Workspace => ({
  id: row.id,
  externalId: row.external_id,
  kind: row.kind,
  name: row.name,
})

export const createPostgresWorkspaceStore = (database: SqlExecutor) => ({
  findByExternalId: async (externalId: string) => {
    const result = await database.query<WorkspaceRow>(
      `select id, external_id, kind, name
       from workspaces where external_id = $1 limit 1`,
      [externalId],
    )
    const workspace = result.rows[0]
    return workspace ? toWorkspace(workspace) : null
  },
  upsert: async (input: { externalId: string; kind: WorkspaceKind; name: string }) => {
    const result = await database.query<WorkspaceRow>(
      `insert into workspaces (external_id, kind, name)
       values ($1, $2::workspace_kind, $3)
       on conflict (external_id) do update set
         name = excluded.name,
         updated_at = now()
       returning id, external_id, kind, name`,
      [input.externalId, input.kind, input.name],
    )
    const workspace = result.rows[0]
    if (!workspace) throw new Error('workspace creation did not return a workspace')
    return toWorkspace(workspace)
  },
  updateName: async (externalId: string, name: string) => {
    const result = await database.query<WorkspaceRow>(
      `update workspaces
       set name = $2, updated_at = now()
       where external_id = $1
       returning id, external_id, kind, name`,
      [externalId, name],
    )
    const workspace = result.rows[0]
    return workspace ? toWorkspace(workspace) : null
  },
  deleteOrganizationWorkspace: async (externalId: string) => database.transaction(async (transaction) => {
    const organizationId = externalId.slice('org:'.length)
    const workspace = await transaction.query<{ id: string }>(
      'select id from workspaces where external_id = $1 for update',
      [externalId],
    )
    const organization = await transaction.query<{ id: string }>(
      'select id from organization where id = $1 for update',
      [organizationId],
    )
    const workspaceId = workspace.rows[0]?.id
    if (!workspaceId || !organization.rows[0]) return null

    await transaction.query(
      'update session set active_organization_id = null where active_organization_id = $1',
      [organizationId],
    )
    await transaction.query('delete from organization where id = $1', [organizationId])
    await transaction.query('delete from workspaces where id = $1', [workspaceId])
    return workspaceId
  }),
})
