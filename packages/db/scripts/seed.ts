import { createSqlExecutor } from '../src/index.js'

const database = createSqlExecutor()

try {
  const dsnProjectId = process.env.JABSO_DEV_PROJECT_ID ?? '1'
  const publicKey = process.env.JABSO_DEV_PROJECT_KEY ?? '0123456789abcdef0123456789abcdef'
  const result = await database.query<{ id: string }>(
    `insert into projects (name, slug, dsn_project_id, public_key)
      values ($1, $2, $3, $4)
      on conflict (dsn_project_id) do update
        set name = excluded.name, slug = excluded.slug, public_key = excluded.public_key
      returning id`,
    ['Local project', 'local-project', dsnProjectId, publicKey],
  )
  console.log(`Seeded local project ${result.rows[0]?.id} (DSN project ${dsnProjectId})`)
} finally {
  await database.close?.()
}
