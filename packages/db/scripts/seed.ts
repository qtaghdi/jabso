import { createSqlExecutor } from '../src/index.js'

const database = createSqlExecutor()

try {
  const dsnProjectId = process.env.JABSO_DEV_PROJECT_ID ?? '1'
  const publicKey = process.env.JABSO_DEV_PROJECT_KEY ?? '0123456789abcdef0123456789abcdef'
  const externalId = `user:${process.env.JABSO_DEV_CLERK_USER_ID ?? 'user_local_seed'}`
  const workspace = await database.query<{ id: string }>(
    `insert into workspaces (external_id, kind, name)
     values ($1, 'personal', 'Local workspace')
     on conflict (external_id) do update set name = excluded.name, updated_at = now()
     returning id`,
    [externalId],
  )
  const result = await database.query<{ id: string }>(
    `insert into projects (workspace_id, name, slug, dsn_project_id, public_key)
      values ($1, $2, $3, $4, $5)
      on conflict (dsn_project_id) do update
        set workspace_id = excluded.workspace_id, name = excluded.name,
          slug = excluded.slug, public_key = excluded.public_key
      returning id`,
    [workspace.rows[0]?.id, 'Local project', 'local-project', dsnProjectId, publicKey],
  )
  console.log(`Seeded local project ${result.rows[0]?.id} (DSN project ${dsnProjectId})`)
} finally {
  await database.close?.()
}
