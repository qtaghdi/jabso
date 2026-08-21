import { defineConfig } from 'drizzle-kit'

const url = process.env.JABSO_DATABASE_URL

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  ...(url ? { dbCredentials: { url } } : {}),
})
