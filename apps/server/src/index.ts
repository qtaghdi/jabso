// Vercel requires the Fastify entrypoint to import the framework directly.
import 'fastify'

import { buildServer } from 'src/composition/create-jabso-app.js'

const app = await buildServer()

const shutdown = async () => {
  await app.close()
  process.exit(0)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

const listenOptions = {
  host: process.env.HOST ?? '127.0.0.1',
  port: Number(process.env.PORT ?? 4000),
}

if (process.env.VERCEL === '1') {
  // Vercel captures server.listen() while importing the entrypoint. Its stub
  // does not invoke Fastify's callback, so awaiting the Promise would deadlock.
  app.listen(listenOptions, (error) => {
    if (error) app.log.error(error)
  })
} else {
  await app.listen(listenOptions)
}
