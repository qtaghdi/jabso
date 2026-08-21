import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { parseSentryEnvelope, SentryEnvelopeParseError } from '@jabso/sentry-compat'
import { BoundraRuntimeError } from 'boundra'
import Fastify from 'fastify'
import { gunzipSync, inflateSync } from 'node:zlib'
import { createBoundraErrorRecorder, toBoundraDiagnosticInput } from './boundra-diagnostics.js'

const compressedBodyLimit = 1024 * 1024
const decodedBodyLimit = 5 * 1024 * 1024

export type BuildServerOptions = {
  allowedOrigin?: string
  projectId?: string
  projectKey?: string
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
  const projectId = options.projectId ?? process.env.JABSO_DEV_PROJECT_ID ?? '1'
  const projectKey = options.projectKey ?? process.env.JABSO_DEV_PROJECT_KEY ?? 'spike'
  const allowedOrigin = options.allowedOrigin ?? process.env.JABSO_ALLOWED_ORIGIN ?? 'http://localhost:3999'

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

  app.get('/health', async () => ({ status: 'ok' }))

  app.post<{ Params: { projectId: string }; Querystring: { sentry_key?: string } }>(
    '/api/:projectId/envelope',
    async (request, reply) => {
      if (request.params.projectId !== projectId || request.query.sentry_key !== projectKey) {
        return reply.code(403).send({ error: 'invalid project credentials' })
      }
      if (!Buffer.isBuffer(request.body)) {
        return reply.code(415).send({ error: 'expected a Sentry envelope body' })
      }

      try {
        const body = decodeBody(request.body, request.headers['content-encoding'])
        const envelope = parseSentryEnvelope(body, { maxItems: 100, maxItemBytes: decodedBodyLimit })
        const itemTypes = envelope.items.map((item) => item.header.type ?? 'unknown')
        request.log.info({ itemTypes, itemCount: itemTypes.length }, 'accepted Sentry envelope')
        const eventId = typeof envelope.header.event_id === 'string' ? envelope.header.event_id : undefined
        return reply.send({ id: eventId ?? crypto.randomUUID() })
      } catch (error) {
        if (error instanceof SentryEnvelopeParseError) {
          return reply.code(400).send({ error: error.code, message: error.message })
        }
        request.log.warn({ err: error }, 'failed to decode Sentry envelope')
        return reply.code(400).send({ error: 'INVALID_ENVELOPE' })
      }
    },
  )

  return app
}
