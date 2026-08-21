import { PGlite, type PGliteInterface, type Transaction } from '@electric-sql/pglite'
import type { SqlExecutor } from '@jabso/db'
import { readFile } from 'node:fs/promises'

type Queryable = Pick<PGliteInterface, 'query'> | Transaction

function wrap(queryable: Queryable, database?: PGlite): SqlExecutor {
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

export async function createTestDatabase() {
  const database = new PGlite()
  const migrationUrl = new URL('../../../packages/db/migrations/0000_wet_professor_monster.sql', import.meta.url)
  await database.exec(await readFile(migrationUrl, 'utf8'))
  return { database, executor: wrap(database, database) }
}
