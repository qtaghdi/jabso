import type { SqlExecutor } from '@jabso/db'
import type { ProjectStore } from '@jabso/domain-project/server'

type ProjectRow = {
  created_at: Date | string
  dsn_project_id: string
  id: string
  name: string
  public_key: string
  slug: string
  repository_connected_at: Date | string | null
  repository_default_branch: string | null
  repository_external_id: string | null
  repository_name: string | null
  repository_owner: string | null
  repository_private: boolean | null
  repository_root_path: string | null
  repository_url: string | null
}

type RepositoryRow = {
  connected_at: Date | string
  default_branch: string
  external_id: string
  name: string
  owner: string
  private: boolean
  project_id: string
  root_path: string
  url: string
}

const toRepository = (row: RepositoryRow) => {
  if (row.private) throw new Error('private repository connections are not supported')
  return {
    externalId: row.external_id,
    owner: row.owner,
    name: row.name,
    url: row.url,
    defaultBranch: row.default_branch,
    private: false as const,
    rootPath: row.root_path,
    connectedAt: new Date(row.connected_at).toISOString(),
  }
}

const toProject = (row: ProjectRow) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  dsnProjectId: row.dsn_project_id,
  publicKey: row.public_key,
  createdAt: new Date(row.created_at).toISOString(),
  repository: row.repository_external_id && row.repository_owner && row.repository_name
    && row.repository_url && row.repository_default_branch && row.repository_connected_at
    && row.repository_private === false
    ? {
        externalId: row.repository_external_id,
        owner: row.repository_owner,
        name: row.repository_name,
        url: row.repository_url,
        defaultBranch: row.repository_default_branch,
        private: false as const,
        rootPath: row.repository_root_path ?? '',
        connectedAt: new Date(row.repository_connected_at).toISOString(),
      }
    : null,
})

export const createPostgresProjectStore = (database: SqlExecutor): ProjectStore => ({
  create: async (input) => {
    const result = await database.query<ProjectRow>(
      `insert into projects (workspace_id, name, slug, dsn_project_id, public_key)
       values ($1, $2, $3, $4, $5)
       returning id, name, slug, dsn_project_id, public_key, created_at,
         null::text as repository_external_id, null::text as repository_owner,
         null::text as repository_name, null::text as repository_url,
         null::text as repository_default_branch, null::boolean as repository_private,
         null::text as repository_root_path, null::timestamptz as repository_connected_at`,
      [input.workspaceId, input.name, input.slug, input.dsnProjectId, input.publicKey],
    )
    const project = result.rows[0]
    if (!project) throw new Error('project creation did not return a project')
    return toProject(project)
  },
  delete: async (input) => {
    const result = await database.query<{ id: string }>(
      `update projects set deleted_at = now()
       where id = $1 and workspace_id = $2 and deleted_at is null
       returning id`,
      [input.id, input.workspaceId],
    )
    return { deleted: result.rows.length > 0, id: input.id }
  },
  disconnectRepository: async (input) => {
    const result = await database.query<{ project_id: string }>(
      `delete from project_repository_connections
       using projects
       where project_repository_connections.project_id = $1
         and projects.id = project_repository_connections.project_id
         and projects.workspace_id = $2
       returning project_id`,
      [input.projectId, input.workspaceId],
    )
    return { disconnected: result.rows.length > 0, projectId: input.projectId }
  },
  list: async (input) => {
    const result = await database.query<ProjectRow>(
      `select project.id, project.name, project.slug, project.dsn_project_id,
         project.public_key, project.created_at,
         repository.external_id as repository_external_id,
         repository.owner as repository_owner,
         repository.name as repository_name,
         repository.url as repository_url,
         repository.default_branch as repository_default_branch,
         repository.private as repository_private,
         repository.root_path as repository_root_path,
         repository.connected_at as repository_connected_at
       from projects as project
       left join project_repository_connections as repository on repository.project_id = project.id
       where project.workspace_id = $1
         and project.deleted_at is null
         and ($2::uuid is null or (project.created_at, project.id) < (
         select created_at, id from projects where id = $2::uuid and workspace_id = $1
       ))
       order by project.created_at desc, project.id desc
       limit $3`,
      [input.workspaceId, input.cursor ?? null, input.limit + 1],
    )
    const hasNextPage = result.rows.length > input.limit
    const rows = result.rows.slice(0, input.limit)
    return {
      items: rows.map(toProject),
      nextCursor: hasNextPage ? rows.at(-1)?.id ?? null : null,
    }
  },
  setRepository: async (input) => {
    const repository = input.repository
    const result = await database.query<RepositoryRow>(
      `insert into project_repository_connections (
         project_id, provider, external_id, owner, name, url,
         default_branch, private, root_path
       )
       select id, 'github', $3, $4, $5, $6, $7, $8, $9
       from projects where id = $1 and workspace_id = $2 and deleted_at is null
       on conflict (project_id) do update set
         external_id = excluded.external_id,
         owner = excluded.owner,
         name = excluded.name,
         url = excluded.url,
         default_branch = excluded.default_branch,
         private = excluded.private,
         root_path = excluded.root_path,
         updated_at = now()
       returning project_id, external_id, owner, name, url, default_branch,
         private, root_path, connected_at`,
      [
        input.projectId,
        input.workspaceId,
        repository.externalId,
        repository.owner,
        repository.name,
        repository.url,
        repository.defaultBranch,
        repository.private,
        repository.rootPath,
      ],
    )
    const stored = result.rows[0]
    if (!stored) throw new Error('project repository connection did not return a row')
    return { projectId: input.projectId, repository: toRepository(stored) }
  },
})
