import { createSqlExecutor } from '../src/index.js'

const argumentsByName = new Map(
  process.argv.slice(2).map((argument) => {
    const [name, ...value] = argument.split('=')
    return [name, value.join('=')]
  }),
)
const from = argumentsByName.get('--from')?.trim()
const to = argumentsByName.get('--to')?.trim()
const validExternalId = /^(user|org):[A-Za-z0-9_-]+$/

if (!from || !to || !validExternalId.test(from) || !validExternalId.test(to) || from === to) {
  throw new Error('Usage: pnpm --filter @jabso/db db:relink-workspace -- --from=user:<old-id> --to=user:<new-id>')
}

const database = createSqlExecutor()

try {
  const result = await database.transaction(async (transaction) => {
    const source = await transaction.query<{ id: string; name: string }>(
      'select id, name from workspaces where external_id = $1 for update',
      [from],
    )
    if (source.rows.length !== 1) throw new Error(`Expected exactly one source workspace for ${from}`)
    const target = await transaction.query<{ id: string }>(
      'select id from workspaces where external_id = $1 for update',
      [to],
    )
    if (target.rows.length > 0) throw new Error(`Target workspace already exists for ${to}`)
    await transaction.query('update workspaces set external_id = $1, updated_at = now() where external_id = $2', [to, from])
    return source.rows[0]
  })
  console.log(`Relinked workspace ${result?.name} (${result?.id}) from ${from} to ${to}`)
} finally {
  await database.close?.()
}
