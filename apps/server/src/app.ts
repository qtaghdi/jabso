import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { createSqlExecutor, type SqlExecutor } from '@jabso/db'
import {
  decodeJsonItem,
  normalizeSentryEvent,
  parseSentryEnvelope,
  SentryEnvelopeParseError,
} from '@jabso/sentry-compat'
import { createIngestEventImplementation } from '../../../domains/ingestion/server/public.js'
import { BoundraRuntimeError, executeContract } from 'boundra'
import Fastify from 'fastify'
import { gunzipSync, inflateSync } from 'node:zlib'
import { createBoundraErrorRecorder, toBoundraDiagnosticInput } from './boundra-diagnostics.js'
import { PostgresIngestEventStore } from './ingestion/postgres-ingest-event-store.js'

const compressedBodyLimit = 1024 * 1024
const decodedBodyLimit = 5 * 1024 * 1024

export type BuildServerOptions = {
  allowedOrigin?: string
  database?: SqlExecutor
}

function decodeBody(body: Buffer, contentEncoding: string | undefined) {
  if (!contentEncoding || contentEncoding === 'identity') return body
  if (contentEncoding.includes('gzip')) {
    return gunzipSync(body, { maxOutputLength: decodedBodyLimit })
  }
  if (contentEncoding.includes('deflate')) {
    return inflateSync(body, { maxOutputLength: decodedBodyLimit })
  }
  throw new SentryEnvelopeParseError('INVALID_HEADER', `Unsupported content encoding: ${contentEncoding}`)
}

export async function buildServer(options: BuildServerOptions = {}) {
  const allowedOrigin = options.allowedOrigin ?? process.env.JABSO_ALLOWED_ORIGIN ?? 'http://localhost:3999'
  const database = options.database ?? createSqlExecutor()
  const ownsDatabase = !options.database
  const store = new PostgresIngestEventStore(database)
  const ingestEvent = createIngestEventImplementation(store)

  const app = Fastify({
    bodyLimit: compressedBodyLimit,
    logger: process.env.NODE_ENV !== 'test',
    routerOptions: {
      ignoreTrailingSlash: true,
    },
  })

  await app.register(cors, { origin: allowedOrigin })
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })
  const recordBoundraError = createBoundraErrorRecorder()

  app.addHook('onError', async (_request, _reply, error) => {
    if (error instanceof BoundraRuntimeError) {
      await recordBoundraError(toBoundraDiagnosticInput(error))
    }
  })

  app.addContentTypeParser(
    ['application/x-sentry-envelope', 'text/plain'],
    { parseAs: 'buffer', bodyLimit: compressedBodyLimit },
    (_request, body, done) => done(null, body),
  )

  app.addHook('onClose', async () => {
    if (ownsDatabase) await database.close?.()
  })

  app.get('/health', async () => ({ status: 'ok' }))
  app.get('/ready', async (_request, reply) => {
    await database.query('select 1')
    return reply.send({ status: 'ready' })
  })

  app.post<{ Params: { projectId: string }; Querystring: { sentry_key?: string } }>(
    '/api/:projectId/envelope',
    async (request, reply) => {
      const publicKey = request.query.sentry_key
      const project = publicKey ? await store.findProject(request.params.projectId, publicKey) : undefined
      if (!project) {
        return reply.code(403).send({ error: 'invalid project credentials' })
      }
      if (!Buffer.isBuffer(request.body)) {
        return reply.code(415).send({ error: 'expected a Sentry envelope body' })
      }

      try {
        const body = decodeBody(request.body, request.headers['content-encoding'])
        const envelope = parseSentryEnvelope(body, { maxItems: 100, maxItemBytes: decodedBodyLimit })
        const itemTypes = envelope.items.map((item) => item.header.type ?? 'unknown')
        const headerEventId = typeof envelope.header.event_id === 'string' ? envelope.header.event_id : undefined
        let acceptedEventId = headerEventId

        for (const item of envelope.items) {
          if (item.header.type !== 'event') continue
          const normalized = normalizeSentryEvent(decodeJsonItem(item), headerEventId)
          await executeContract(ingestEvent, { ...normalized, projectId: project.id })
          acceptedEventId = normalized.eventId
        }

        request.log.info({ itemTypes, itemCount: itemTypes.length }, 'accepted Sentry envelope')
        return reply.send({ id: acceptedEventId ?? crypto.randomUUID() })
      } catch (error) {
        if (error instanceof SentryEnvelopeParseError) {
          return reply.code(400).send({ error: error.code, message: error.message })
        }
        if (error instanceof BoundraRuntimeError) {
          await recordBoundraError(toBoundraDiagnosticInput(error))
          return reply.code(400).send({ error: error.code, message: error.message })
        }
        throw error
      }
    },
  )

  return app
}
