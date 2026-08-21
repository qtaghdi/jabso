import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

let client: ReturnType<typeof postgres> | undefined

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
