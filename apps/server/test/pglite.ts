import { PGlite, type PGliteInterface, type Transaction } from '@electric-sql/pglite'
import type { SqlExecutor } from '@jabso/db'
import { readdir, readFile } from 'node:fs/promises'

type Queryable = Pick<PGliteInterface, 'query'> | Transaction

const wrap = (queryable: Queryable, database?: PGlite): SqlExecutor => {
  return {
    async query<Row>(statement: string, parameters: readonly unknown[] = []) {
      const result = await queryable.query<Row>(statement, [...parameters])
      return {
        rows: result.rows,
        affectedRows: result.rowCount ?? result.affectedRows ?? result.rows.length,
      }
    },
    async transaction<Result>(callback: (transaction: SqlExecutor) => Promise<Result>) {
      if (!database) return callback(wrap(queryable))
      return database.transaction((transaction) => callback(wrap(transaction)))
    },
  }
}

export const createTestDatabase = async () => {
  const database = new PGlite()
  const migrationsUrl = new URL('../../../packages/db/migrations/', import.meta.url)
  const migrations = (await readdir(migrationsUrl))
    .filter((filename) => filename.endsWith('.sql'))
    .sort()
  for (const migration of migrations) {
    await database.exec(await readFile(new URL(migration, migrationsUrl), 'utf8'))
  }
  return { database, executor: wrap(database, database) }
}
