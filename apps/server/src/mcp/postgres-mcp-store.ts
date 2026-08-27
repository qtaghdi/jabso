import type { SqlExecutor } from '@jabso/db'
import type { McpConnectionStore } from '../../../../domains/mcp/server/public.js'
import type {
  CreateMcpConnectionMutationInput,
  CreateMcpConnectionMutationResult,
  ListMcpConnectionsQueryInput,
  ListMcpConnectionsQueryResult,
  RevokeMcpConnectionMutationInput,
  RevokeMcpConnectionMutationResult,
} from '../../../../domains/mcp/shared/public.js'

type Timestamp = Date | string

type ConnectionRow = {
  id: string
  name: string
  token_prefix: string
  created_at: Timestamp
  last_used_at: Timestamp | null
  revoked_at: Timestamp | null
}

type ProjectRow = {
  connection_id: string
  id: string
  name: string
  slug: string
}

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

const iso = (value: Timestamp) => new Date(value).toISOString()

const groupConnections = (connections: ConnectionRow[], projects: ProjectRow[]) => {
  const projectsByConnection = new Map<string, ProjectRow[]>()
  for (const project of projects) {
    projectsByConnection.set(project.connection_id, [...(projectsByConnection.get(project.connection_id) ?? []), project])
  }
  return connections.map((connection) => ({
    id: connection.id,
    name: connection.name,
    tokenPrefix: connection.token_prefix,
    projects: (projectsByConnection.get(connection.id) ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
    })),
    createdAt: iso(connection.created_at),
    lastUsedAt: connection.last_used_at ? iso(connection.last_used_at) : null,
    revokedAt: connection.revoked_at ? iso(connection.revoked_at) : null,
  }))
}

export class PostgresMcpStore implements McpConnectionStore {
  constructor(private readonly database: SqlExecutor) {}

  async create(input: CreateMcpConnectionMutationInput): Promise<CreateMcpConnectionMutationResult> {
    return this.database.transaction(async (transaction) => {
      const projects = await transaction.query<{ id: string }>(
        `select id from projects
         where workspace_id = $1 and deleted_at is null and id = any($2::uuid[])
         order by id`,
        [input.workspaceId, input.projectIds],
      )
      const uniqueProjectIds = [...new Set(input.projectIds)].sort()
      if (projects.rows.length !== uniqueProjectIds.length) return null

      const connection = (await transaction.query<ConnectionRow>(
        `insert into mcp_connections (workspace_id, name, token_hash, token_prefix)
         values ($1, $2, $3, $4)
         returning id, name, token_prefix, created_at, last_used_at, revoked_at`,
        [input.workspaceId, input.name, input.tokenHash, input.tokenPrefix],
      )).rows[0]
      if (!connection) throw new Error('Failed to create MCP connection')

      for (const projectId of uniqueProjectIds) {
        await transaction.query(
          'insert into mcp_connection_projects (connection_id, project_id) values ($1, $2)',
          [connection.id, projectId],
        )
      }
      const projectRows = await this.projectsForConnections(transaction, [connection.id])
      return groupConnections([connection], projectRows)[0] ?? null
    })
  }

  async list(input: ListMcpConnectionsQueryInput): Promise<ListMcpConnectionsQueryResult> {
    const connections = await this.database.query<ConnectionRow>(
      `select id, name, token_prefix, created_at, last_used_at, revoked_at
       from mcp_connections where workspace_id = $1
       order by created_at desc, id desc limit $2`,
      [input.workspaceId, input.limit],
    )
    const projects = await this.projectsForConnections(this.database, connections.rows.map((row) => row.id))
    return { items: groupConnections(connections.rows, projects) }
  }

  async revoke(input: RevokeMcpConnectionMutationInput): Promise<RevokeMcpConnectionMutationResult> {
    const result = await this.database.query<{ id: string }>(
      `update mcp_connections set revoked_at = coalesce(revoked_at, now())
       where id = $1 and workspace_id = $2 returning id`,
      [input.connectionId, input.workspaceId],
    )
    return { connectionId: input.connectionId, revoked: Boolean(result.rows[0]) }
  }

  async authenticate(tokenHash: string): Promise<AuthenticatedMcpConnection | null> {
    const connection = (await this.database.query<{ id: string; workspace_id: string }>(
      `update mcp_connections set last_used_at = now()
       where token_hash = $1 and revoked_at is null
       returning id, workspace_id`,
      [tokenHash],
    )).rows[0]
    if (!connection) return null
    const projects = await this.database.query<{ project_id: string }>(
      `select connection_project.project_id
       from mcp_connection_projects as connection_project
       join projects as project on project.id = connection_project.project_id
       where connection_project.connection_id = $1
         and project.workspace_id = $2 and project.deleted_at is null
       order by connection_project.project_id`,
      [connection.id, connection.workspace_id],
    )
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      projectIds: projects.rows.map((row) => row.project_id),
    }
  }

  async recordAudit(input: McpAuditInput) {
    await this.database.transaction(async (transaction) => {
      await transaction.query(
        `insert into mcp_audit_logs
          (connection_id, workspace_id, project_id, tool, outcome, duration_ms)
         values ($1, $2, $3, $4, $5, $6)`,
        [input.connectionId, input.workspaceId, input.projectId, input.tool, input.outcome, input.durationMs],
      )
      await transaction.query(
        `delete from mcp_audit_logs
         where workspace_id = $1 and occurred_at < now() - interval '30 days'`,
        [input.workspaceId],
      )
    })
  }

  async listAllowedProjects(connection: AuthenticatedMcpConnection): Promise<AllowedMcpProject[]> {
    const result = await this.database.query<{
      id: string
      name: string
      slug: string
      repository_owner: string | null
      repository_name: string | null
      repository_url: string | null
      repository_root_path: string | null
    }>(
      `select project.id, project.name, project.slug,
        repository.owner as repository_owner, repository.name as repository_name,
        repository.url as repository_url, repository.root_path as repository_root_path
       from mcp_connection_projects as connection_project
       join projects as project on project.id = connection_project.project_id
       left join project_repository_connections as repository on repository.project_id = project.id
       where connection_project.connection_id = $1 and project.workspace_id = $2
         and project.deleted_at is null
       order by project.name, project.id limit 100`,
      [connection.id, connection.workspaceId],
    )
    return result.rows.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      repository: project.repository_owner && project.repository_name && project.repository_url
        ? {
            owner: project.repository_owner,
            name: project.repository_name,
            url: project.repository_url,
            rootPath: project.repository_root_path ?? '',
          }
        : null,
    }))
  }

  private async projectsForConnections(database: SqlExecutor, connectionIds: string[]) {
    if (connectionIds.length === 0) return []
    return (await database.query<ProjectRow>(
      `select connection_project.connection_id, project.id, project.name, project.slug
       from mcp_connection_projects as connection_project
       join projects as project on project.id = connection_project.project_id
       where connection_project.connection_id = any($1::uuid[])
       order by project.name, project.id`,
      [connectionIds],
    )).rows
  }
}
