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
import {
  createGetIssueImplementation,
  createGetIssueFacetsImplementation,
  createSearchIssuesImplementation,
  createUpdateIssueStatusImplementation,
} from '../../../domains/issue/server/public.js'
import { BoundraRuntimeError, executeContract } from 'boundra'
import Fastify from 'fastify'
import { gunzipSync, inflateSync } from 'node:zlib'
import { createBoundraErrorRecorder, toBoundraDiagnosticInput } from './boundra-diagnostics.js'
import { PostgresIngestEventStore } from './ingestion/postgres-ingest-event-store.js'
import { createPostgresIssueQueryStore } from './issues/postgres-issue-query-store.js'

const compressedBodyLimit = 1024 * 1024
const decodedBodyLimit = 5 * 1024 * 1024

export type BuildServerOptions = {
  allowedOrigin?: string
  database?: SqlExecutor
}

const decodeBody = (body: Buffer, contentEncoding: string | undefined) => {
  if (!contentEncoding || contentEncoding === 'identity') return body
  if (contentEncoding.includes('gzip')) {
    return gunzipSync(body, { maxOutputLength: decodedBodyLimit })
  }
  if (contentEncoding.includes('deflate')) {
    return inflateSync(body, { maxOutputLength: decodedBodyLimit })
  }
  throw new SentryEnvelopeParseError('INVALID_HEADER', `Unsupported content encoding: ${contentEncoding}`)
}

export const buildServer = async (options: BuildServerOptions = {}) => {
  const allowedOrigin = options.allowedOrigin ?? process.env.JABSO_ALLOWED_ORIGIN ?? 'http://localhost:3999'
  const database = options.database ?? createSqlExecutor()
  const ownsDatabase = !options.database
  const store = new PostgresIngestEventStore(database)
  const ingestEvent = createIngestEventImplementation(store)
  const issueStore = createPostgresIssueQueryStore(database)
  const searchIssues = createSearchIssuesImplementation(issueStore)
  const getIssue = createGetIssueImplementation(issueStore)
  const getIssueFacets = createGetIssueFacetsImplementation(issueStore)
  const updateIssueStatus = createUpdateIssueStatusImplementation(issueStore)

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

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof BoundraRuntimeError) {
      await recordBoundraError(toBoundraDiagnosticInput(error))
      return reply.code(400).send({ error: error.code, message: error.message })
    }
    request.log.error({ err: error }, 'request failed')
    return reply.send(error)
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

  app.get<{
    Params: { projectId: string }
    Querystring: {
      sentry_key?: string
      query?: string
      status?: 'unresolved' | 'resolved' | 'ignored'
      level?: string
      environment?: string
      release?: string
      last_seen_after?: string
      cursor?: string
      direction?: 'next' | 'previous'
      limit?: string
    }
  }>('/api/:projectId/issues', async (request, reply) => {
    const project = request.query.sentry_key
      ? await store.findProject(request.params.projectId, request.query.sentry_key)
      : undefined
    if (!project) return reply.code(403).send({ error: 'invalid project credentials' })

    const result = await executeContract(searchIssues, {
      projectId: project.id,
      query: request.query.query,
      status: request.query.status,
      level: request.query.level,
      environment: request.query.environment,
      release: request.query.release,
      lastSeenAfter: request.query.last_seen_after,
      cursor: request.query.cursor,
      direction: request.query.direction,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
    })
    return reply.send(result)
  })

  app.get<{
    Params: { projectId: string }
    Querystring: { sentry_key?: string }
  }>('/api/:projectId/issues/facets', async (request, reply) => {
    const project = request.query.sentry_key
      ? await store.findProject(request.params.projectId, request.query.sentry_key)
      : undefined
    if (!project) return reply.code(403).send({ error: 'invalid project credentials' })
    return reply.send(await executeContract(getIssueFacets, { projectId: project.id }))
  })

  app.get<{
    Params: { projectId: string; issueId: string }
    Querystring: { sentry_key?: string }
  }>('/api/:projectId/issues/:issueId', async (request, reply) => {
    const project = request.query.sentry_key
      ? await store.findProject(request.params.projectId, request.query.sentry_key)
      : undefined
    if (!project) return reply.code(403).send({ error: 'invalid project credentials' })

    const result = await executeContract(getIssue, {
      projectId: project.id,
      issueId: request.params.issueId,
    })
    return result ? reply.send(result) : reply.code(404).send({ error: 'issue not found' })
  })

  app.patch<{
    Params: { projectId: string; issueId: string }
    Querystring: { sentry_key?: string }
    Body: { status?: 'unresolved' | 'resolved' | 'ignored' }
  }>('/api/:projectId/issues/:issueId/status', async (request, reply) => {
    const project = request.query.sentry_key
      ? await store.findProject(request.params.projectId, request.query.sentry_key)
      : undefined
    if (!project) return reply.code(403).send({ error: 'invalid project credentials' })
    const result = await executeContract(updateIssueStatus, {
      projectId: project.id,
      issueId: request.params.issueId,
      status: request.body?.status,
    })
    return result ? reply.send(result) : reply.code(404).send({ error: 'issue not found' })
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
        throw error
      }
    },
  )

  return app
}
