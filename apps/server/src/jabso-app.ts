import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { createSqlExecutor, type SqlExecutor } from '@jabso/db'
import {
  decodeJsonItem,
  normalizeSentryEvent,
  parseSentryEnvelope,
  SentryEnvelopeParseError,
} from '@jabso/sentry-compat'
import { normalizeArtifactPath, validateSourceMap } from '@jabso/symbolication'
import { createIngestEventImplementation } from '../../../domains/ingestion/server/public.js'
import {
  createGetIssueImplementation,
  createGetIssueFacetsImplementation,
  createSearchIssuesImplementation,
  createUpdateIssueStatusImplementation,
} from '../../../domains/issue/server/public.js'
import {
  createGetReleaseRegressionsImplementation,
  createListReleasesImplementation,
  createRetryReleaseSymbolicationImplementation,
  createUploadSourceMapImplementation,
} from '../../../domains/release/server/public.js'
import {
  createCreateProjectImplementation,
  createDeleteProjectImplementation,
  createDisconnectProjectRepositoryImplementation,
  createListProjectsImplementation,
  createSetProjectRepositoryImplementation,
} from '../../../domains/project/server/public.js'
import { maxSourceMapBytes } from '../../../domains/release/shared/public.js'
import { BoundraRuntimeError, executeContract } from 'boundra'
import Fastify from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import { gunzipSync, inflateSync } from 'node:zlib'
import { createBoundraErrorRecorder, toBoundraDiagnosticInput } from './boundra-diagnostics.js'
import { PostgresIngestEventStore } from './ingestion/postgres-ingest-event-store.js'
import { createPostgresIssueQueryStore } from './issues/postgres-issue-query-store.js'
import { openApiDocument } from './openapi-document.js'
import { createPostgresProjectStore } from './projects/postgres-project-store.js'
import { PostgresReleaseStore, SourceMapUploadError } from './releases/postgres-release-store.js'

const compressedBodyLimit = 1024 * 1024
const decodedBodyLimit = 5 * 1024 * 1024

export type BuildServerOptions = {
  adminToken?: string
  allowedOrigin?: string
  database?: SqlExecutor
  dashboardToken?: string
}

const hasValidBearerToken = (authorization: string | undefined, expected: string | undefined) => {
  if (!authorization?.startsWith('Bearer ') || !expected) return false
  const actualBytes = Buffer.from(authorization.slice('Bearer '.length))
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
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
  const releaseStore = new PostgresReleaseStore(database)
  const listReleases = createListReleasesImplementation(releaseStore)
  const getReleaseRegressions = createGetReleaseRegressionsImplementation(releaseStore)
  const uploadSourceMap = createUploadSourceMapImplementation(releaseStore)
  const retryReleaseSymbolication = createRetryReleaseSymbolicationImplementation(releaseStore)
  const projectStore = createPostgresProjectStore(database)
  const listProjects = createListProjectsImplementation(projectStore)
  const createProject = createCreateProjectImplementation(projectStore)
  const deleteProject = createDeleteProjectImplementation(projectStore)
  const setProjectRepository = createSetProjectRepositoryImplementation(projectStore)
  const disconnectProjectRepository = createDisconnectProjectRepositoryImplementation(projectStore)
  const adminToken = options.adminToken ?? process.env.JABSO_ADMIN_TOKEN
  const dashboardToken = options.dashboardToken ?? process.env.JABSO_DASHBOARD_TOKEN

  const app = Fastify({
    bodyLimit: compressedBodyLimit,
    logger: process.env.NODE_ENV !== 'test',
    routerOptions: {
      ignoreTrailingSlash: true,
    },
  })

  await app.register(swagger, {
    mode: 'static',
    specification: { document: openApiDocument },
  })
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      deepLinking: true,
      docExpansion: 'list',
    },
    staticCSP: true,
  })
  await app.register(cors, { origin: allowedOrigin })
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })
  const recordBoundraError = createBoundraErrorRecorder()

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof BoundraRuntimeError) {
      await recordBoundraError(toBoundraDiagnosticInput(error))
      return reply.code(400).send({ error: error.code, message: error.message })
    }
    if (error instanceof SourceMapUploadError) {
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
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: maxSourceMapBytes },
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
    Querystring: { cursor?: string; limit?: string }
  }>('/api/projects', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    return reply.send(await executeContract(listProjects, {
      cursor: request.query.cursor,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
    }))
  })

  app.post<{
    Body: { name?: string }
  }>('/api/projects', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await executeContract(createProject, { name: request.body?.name ?? '' })
    return reply.code(201).send(project)
  })

  app.delete<{
    Params: { projectId: string }
  }>('/api/projects/:projectId', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const result = await executeContract(deleteProject, { id: request.params.projectId })
    return result.deleted
      ? reply.send(result)
      : reply.code(404).send({ error: 'project not found' })
  })

  app.put<{
    Params: { projectId: string }
    Body: {
      defaultBranch?: string
      externalId?: string
      name?: string
      owner?: string
      private?: boolean
      rootPath?: string
      url?: string
    }
  }>('/api/projects/:projectId/repository', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const result = await executeContract(setProjectRepository, {
      projectId: request.params.projectId,
      repository: {
        defaultBranch: request.body?.defaultBranch ?? '',
        externalId: request.body?.externalId ?? '',
        name: request.body?.name ?? '',
        owner: request.body?.owner ?? '',
        private: request.body?.private ?? false,
        rootPath: request.body?.rootPath ?? '',
        url: request.body?.url ?? '',
      },
    })
    return reply.send(result)
  })

  app.delete<{
    Params: { projectId: string }
  }>('/api/projects/:projectId/repository', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const result = await executeContract(disconnectProjectRepository, { projectId: request.params.projectId })
    return result.disconnected
      ? reply.send(result)
      : reply.code(404).send({ error: 'repository connection not found' })
  })

  app.get<{
    Params: { projectId: string }
    Querystring: {
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
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project) return reply.code(404).send({ error: 'project not found' })

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
    Querystring: Record<string, never>
  }>('/api/:projectId/issues/facets', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project) return reply.code(404).send({ error: 'project not found' })
    return reply.send(await executeContract(getIssueFacets, { projectId: project.id }))
  })

  app.get<{
    Params: { projectId: string; issueId: string }
    Querystring: Record<string, never>
  }>('/api/:projectId/issues/:issueId', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project) return reply.code(404).send({ error: 'project not found' })

    const result = await executeContract(getIssue, {
      projectId: project.id,
      issueId: request.params.issueId,
    })
    return result ? reply.send(result) : reply.code(404).send({ error: 'issue not found' })
  })

  app.patch<{
    Params: { projectId: string; issueId: string }
    Querystring: Record<string, never>
    Body: { status?: 'unresolved' | 'resolved' | 'ignored' }
  }>('/api/:projectId/issues/:issueId/status', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project) return reply.code(404).send({ error: 'project not found' })
    const result = await executeContract(updateIssueStatus, {
      projectId: project.id,
      issueId: request.params.issueId,
      status: request.body?.status,
    })
    return result ? reply.send(result) : reply.code(404).send({ error: 'issue not found' })
  })

  app.get<{
    Params: { projectId: string }
    Querystring: { limit?: string }
  }>('/api/:projectId/releases', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project) return reply.code(404).send({ error: 'project not found' })
    return reply.send(await executeContract(listReleases, {
      projectId: project.id,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
    }))
  })

  app.get<{
    Params: { projectId: string; version: string }
    Querystring: { dist?: string; limit?: string }
  }>('/api/:projectId/releases/:version/regressions', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project) return reply.code(404).send({ error: 'project not found' })
    return reply.send(await executeContract(getReleaseRegressions, {
      projectId: project.id,
      release: request.params.version,
      dist: request.query.dist,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
    }))
  })

  app.put<{
    Params: { projectId: string; version: string }
    Querystring: { artifact_path?: string; dist?: string; deployed_at?: string }
  }>('/api/:projectId/releases/:version/artifacts', { bodyLimit: maxSourceMapBytes }, async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, adminToken)) {
      return reply.code(403).send({ error: 'invalid administrator credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project) return reply.code(404).send({ error: 'project not found' })
    if (!Buffer.isBuffer(request.body) || !request.query.artifact_path) {
      return reply.code(400).send({ error: 'source map body and artifact_path are required' })
    }
    const artifactPath = normalizeArtifactPath(request.query.artifact_path)
    if (!artifactPath || !artifactPath.endsWith('.map')) {
      return reply.code(400).send({ error: 'invalid_path', message: 'Source map artifact path is invalid' })
    }
    const content = request.body.toString('utf8')
    try {
      validateSourceMap(content)
    } catch {
      return reply.code(400).send({ error: 'invalid_source_map', message: 'Source map content is invalid' })
    }
    const result = await executeContract(uploadSourceMap, {
      projectId: project.id,
      version: request.params.version,
      dist: request.query.dist,
      artifactPath,
      content,
      deployedAt: request.query.deployed_at,
    })
    return reply.send(result)
  })

  app.post<{
    Params: { projectId: string; version: string }
    Querystring: { dist?: string; limit?: string }
  }>('/api/:projectId/releases/:version/symbolicate', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, adminToken)) {
      return reply.code(403).send({ error: 'invalid administrator credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project) return reply.code(404).send({ error: 'project not found' })
    return reply.send(await executeContract(retryReleaseSymbolication, {
      projectId: project.id,
      version: request.params.version,
      dist: request.query.dist,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
    }))
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
          try {
            await releaseStore.symbolicateEvent(project.id, normalized.eventId)
          } catch (error) {
            request.log.warn({ err: error, eventId: normalized.eventId }, 'event symbolication failed')
          }
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
