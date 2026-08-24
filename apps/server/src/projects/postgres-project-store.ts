import type { SqlExecutor } from '@jabso/db'
import type { ProjectStore } from '../../../../domains/project/server/public.js'

type ProjectRow = {
  created_at: Date | string
  dsn_project_id: string
  id: string
  name: string
  public_key: string
  slug: string
}

const toProject = (row: ProjectRow) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  dsnProjectId: row.dsn_project_id,
  publicKey: row.public_key,
  createdAt: new Date(row.created_at).toISOString(),
})

export const createPostgresProjectStore = (database: SqlExecutor): ProjectStore => ({
  create: async (input) => {
    const result = await database.query<ProjectRow>(
      `insert into projects (name, slug, dsn_project_id, public_key)
       values ($1, $2, $3, $4)
       returning id, name, slug, dsn_project_id, public_key, created_at`,
      [input.name, input.slug, input.dsnProjectId, input.publicKey],
    )
    const project = result.rows[0]
    if (!project) throw new Error('project creation did not return a project')
    return toProject(project)
  },
  list: async (input) => {
    const result = await database.query<ProjectRow>(
      `select id, name, slug, dsn_project_id, public_key, created_at
       from projects
       where ($1::uuid is null or (created_at, id) < (
         select created_at, id from projects where id = $1::uuid
       ))
       order by created_at desc, id desc
       limit $2`,
      [input.cursor ?? null, input.limit + 1],
    )
    const hasNextPage = result.rows.length > input.limit
    const rows = result.rows.slice(0, input.limit)
    return {
      items: rows.map(toProject),
      nextCursor: hasNextPage ? rows.at(-1)?.id ?? null : null,
    }
  },
})
