import { defineConfig } from 'drizzle-kit'

const url = process.env.JABSO_DATABASE_URL
if (!url) throw new Error('JABSO_DATABASE_URL is required to generate or run migrations')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url },
})
