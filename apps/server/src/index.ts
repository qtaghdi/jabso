import { buildServer } from './app.js'

const app = await buildServer()

const shutdown = async () => {
  await app.close()
  process.exit(0)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

await app.listen({
  host: process.env.HOST ?? '127.0.0.1',
  port: Number(process.env.PORT ?? 4000),
})
