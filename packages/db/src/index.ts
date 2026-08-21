import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

let client: ReturnType<typeof postgres> | undefined

export type SqlResult<Row> = {
  rows: Row[]
  affectedRows: number
}

export type SqlExecutor = {
  query<Row>(statement: string, parameters?: readonly unknown[]): Promise<SqlResult<Row>>
  transaction<Result>(callback: (transaction: SqlExecutor) => Promise<Result>): Promise<Result>
  close?(): Promise<void>
}

function postgresExecutor(sql: postgres.Sql | postgres.TransactionSql): SqlExecutor {
  const executor: SqlExecutor = {
    async query<Row>(statement: string, parameters: readonly unknown[] = []) {
      const result = await sql.unsafe(statement, parameters as never[])
      return { rows: [...result] as Row[], affectedRows: result.count }
    },
    transaction: (callback) => callback(executor),
  }
  return executor
}

export function createSqlExecutor(url = process.env.JABSO_DATABASE_URL): SqlExecutor {
  if (!url) throw new Error('JABSO_DATABASE_URL is required')
  const sql = postgres(url, { prepare: false })
  const executor = postgresExecutor(sql)
  executor.transaction = <Result>(callback: (transaction: SqlExecutor) => Promise<Result>) =>
    sql.begin((transaction) => callback(postgresExecutor(transaction))) as Promise<Result>
  executor.close = () => sql.end()
  return executor
}

export function getDatabase(url = process.env.JABSO_DATABASE_URL) {
  if (!url) throw new Error('JABSO_DATABASE_URL is required')
  client ??= postgres(url, { prepare: false })
  return drizzle(client, { schema })
}

export async function closeDatabase() {
  if (!client) return
  await client.end()
  client = undefined
}

export * from './schema.js'
