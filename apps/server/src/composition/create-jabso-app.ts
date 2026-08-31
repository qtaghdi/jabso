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
import { createGetEventImplementation } from '@jabso/domain-event/server'
import { createIngestEventImplementation } from '@jabso/domain-ingestion/server'
import {
  createCreateMcpConnectionImplementation,
  createListMcpConnectionsImplementation,
  createRevokeMcpConnectionImplementation,
} from '@jabso/domain-mcp/server'
import {
  createGetIssueImplementation,
  createGetIssueFacetsImplementation,
  createSearchIssuesImplementation,
  createUpdateIssueStatusImplementation,
} from '@jabso/domain-issue/server'
import {
  createGetReleaseRegressionsImplementation,
  createListReleasesImplementation,
  createRetryReleaseSymbolicationImplementation,
  createUploadSourceMapImplementation,
} from '@jabso/domain-release/server'
import {
  createCreateProjectImplementation,
  createDeleteProjectImplementation,
  createDisconnectProjectRepositoryImplementation,
  createListProjectsImplementation,
  createSetProjectRepositoryImplementation,
} from '@jabso/domain-project/server'
import { maxSourceMapBytes } from '@jabso/domain-release/shared'
import { BoundraRuntimeError, executeContract } from 'boundra'
import Fastify from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import { gunzipSync, inflateSync } from 'node:zlib'
import {
  createBoundraErrorRecorder,
  toBoundraDiagnosticInput,
  toBoundraHttpError,
} from '../adapters/http/boundra-diagnostics.js'
import { readGitHubAppRuntime, type GitHubAppRuntime } from '../adapters/http/github-app-client.js'
import { registerGitHubAppRoutes } from '../adapters/http/github-app-routes.js'
import { createPostgresEventQueryStore } from '../adapters/persistence/postgres-event-query-store.js'
import { PostgresGitHubInstallationStore } from '../adapters/persistence/postgres-github-installation-store.js'
import { PostgresIngestEventStore } from '../adapters/persistence/postgres-ingest-event-store.js'
import { createPostgresIssueQueryStore } from '../adapters/persistence/postgres-issue-query-store.js'
import { registerMcpManagementRoutes } from '../adapters/mcp/mcp-management-routes.js'
import { registerMcpRoutes } from '../adapters/mcp/mcp-routes.js'
import { PostgresMcpStore } from '../adapters/persistence/postgres-mcp-store.js'
import { openApiDocument } from '../adapters/http/openapi-document.js'
import { createPostgresProjectStore } from '../adapters/persistence/postgres-project-store.js'
import { PostgresReleaseStore, SourceMapUploadError } from '../adapters/persistence/postgres-release-store.js'
import { renderServerStatusPage } from '../adapters/http/server-status-page.js'
import { createPostgresWorkspaceStore, type WorkspaceKind } from '../adapters/persistence/postgres-workspace-store.js'

const compressedBodyLimit = 1024 * 1024
const decodedBodyLimit = 5 * 1024 * 1024

export type BuildServerOptions = {
  adminToken?: string
  allowedOrigin?: string
  database?: SqlExecutor
  dashboardToken?: string
  githubAppRuntime?: GitHubAppRuntime | null
}

const hasValidBearerToken = (authorization: string | undefined, expected: string | undefined) => {
  if (!authorization?.startsWith('Bearer ') || !expected) return false
  const actualBytes = Buffer.from(authorization.slice('Bearer '.length))
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}

const workspaceIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const externalWorkspaceIdPattern = /^(user|org):[a-zA-Z0-9_-]{3,128}$/

const dashboardWorkspaceId = (headers: Record<string, string | string[] | undefined>, token: string | undefined) => {
  if (!hasValidBearerToken(headers.authorization as string | undefined, token)) return null
  const value = headers['x-jabso-workspace-id']
  return typeof value === 'string' && workspaceIdPattern.test(value) ? value : null
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
  const eventStore = createPostgresEventQueryStore(database)
  const getEvent = createGetEventImplementation(eventStore)
  const releaseStore = new PostgresReleaseStore(database)
  const listReleases = createListReleasesImplementation(releaseStore)
  const getReleaseRegressions = createGetReleaseRegressionsImplementation(releaseStore)
  const uploadSourceMap = createUploadSourceMapImplementation(releaseStore)
  const retryReleaseSymbolication = createRetryReleaseSymbolicationImplementation(releaseStore)
  const projectStore = createPostgresProjectStore(database)
  const workspaceStore = createPostgresWorkspaceStore(database)
  const listProjects = createListProjectsImplementation(projectStore)
  const createProject = createCreateProjectImplementation(projectStore)
  const deleteProject = createDeleteProjectImplementation(projectStore)
  const setProjectRepository = createSetProjectRepositoryImplementation(projectStore)
  const disconnectProjectRepository = createDisconnectProjectRepositoryImplementation(projectStore)
  const mcpStore = new PostgresMcpStore(database)
  const githubInstallationStore = new PostgresGitHubInstallationStore(database)
  const createMcpConnection = createCreateMcpConnectionImplementation(mcpStore)
  const listMcpConnections = createListMcpConnectionsImplementation(mcpStore)
  const revokeMcpConnection = createRevokeMcpConnectionImplementation(mcpStore)
  const adminToken = options.adminToken ?? process.env.JABSO_ADMIN_TOKEN
  const dashboardToken = options.dashboardToken
    ?? process.env.JABSO_DASHBOARD_TOKEN
    ?? (process.env.NODE_ENV === 'production' ? undefined : 'replace-with-a-long-random-token')

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
  const recordMcpBoundraError = async (error: BoundraRuntimeError) => {
    const diagnostic = toBoundraDiagnosticInput(error)
    app.log.error({
      boundra: {
        code: diagnostic.code,
        contract: diagnostic.contract,
        phase: diagnostic.context?.phase,
        issues: diagnostic.issues,
      },
    }, 'Boundra MCP contract failed')
    await recordBoundraError(diagnostic)
  }

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof BoundraRuntimeError) {
      const diagnostic = toBoundraDiagnosticInput(error)
      request.log.error({
        boundra: {
          code: diagnostic.code,
          contract: diagnostic.contract,
          phase: diagnostic.context?.phase,
          issues: diagnostic.issues,
        },
      }, 'Boundra contract failed')
      await recordBoundraError(diagnostic)
      const response = toBoundraHttpError(error)
      return reply.code(response.statusCode).send(response.payload)
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

  const serviceDescription = {
    service: 'jabso-server',
    status: 'ok',
    message: 'Jabso collector is running.',
    health: '/health',
    readiness: '/ready',
  } as const

  app.get('/', async (request, reply) => {
    if (request.headers.accept?.includes('application/json')) return reply.send(serviceDescription)

    const databaseReady = await database.query('select 1').then(() => true).catch(() => false)
    return reply
      .code(databaseReady ? 200 : 503)
      .header('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
      .header('referrer-policy', 'no-referrer')
      .header('x-content-type-options', 'nosniff')
      .type('text/html; charset=utf-8')
      .send(renderServerStatusPage({ dashboardOrigin: allowedOrigin, databaseReady }))
  })
  app.get('/health', async () => ({ status: 'ok' }))
  app.get('/ready', async (_request, reply) => {
    await database.query('select 1')
    return reply.send({ status: 'ready' })
  })

  registerMcpManagementRoutes(app, {
    createConnection: createMcpConnection,
    listConnections: listMcpConnections,
    revokeConnection: revokeMcpConnection,
    workspaceId: (headers) => dashboardWorkspaceId(headers, dashboardToken),
  })
  registerMcpRoutes(app, {
    allowedOrigin,
    getEvent,
    getIssue,
    getReleaseRegressions,
    onBoundraRuntimeError: recordMcpBoundraError,
    searchIssues,
    store: mcpStore,
  })
  await registerGitHubAppRoutes(app, {
    runtime: options.githubAppRuntime === undefined ? readGitHubAppRuntime() : options.githubAppRuntime,
    store: githubInstallationStore,
    webOrigin: allowedOrigin,
    workspaceId: (headers) => dashboardWorkspaceId(headers, dashboardToken),
  })

  app.get<{ Params: { externalId: string } }>('/api/workspaces/:externalId', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const externalId = decodeURIComponent(request.params.externalId)
    if (!externalWorkspaceIdPattern.test(externalId)) {
      return reply.code(400).send({ error: 'invalid workspace identity' })
    }
    const workspace = await workspaceStore.findByExternalId(externalId)
    return workspace ? reply.send(workspace) : reply.code(404).send({ error: 'workspace not found' })
  })

  app.patch<{
    Params: { externalId: string }
    Body: { name?: string }
  }>('/api/workspaces/:externalId', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const externalId = decodeURIComponent(request.params.externalId)
    const name = request.body?.name?.trim() ?? ''
    if (!externalWorkspaceIdPattern.test(externalId) || !name || name.length > 80) {
      return reply.code(400).send({ error: 'invalid workspace' })
    }
    const workspace = await workspaceStore.updateName(externalId, name)
    return workspace ? reply.send(workspace) : reply.code(404).send({ error: 'workspace not found' })
  })

  app.delete<{ Params: { externalId: string } }>('/api/workspaces/:externalId', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const externalId = decodeURIComponent(request.params.externalId)
    if (!externalWorkspaceIdPattern.test(externalId) || !externalId.startsWith('org:')) {
      return reply.code(400).send({ error: 'invalid shared workspace identity' })
    }
    const deletedId = await workspaceStore.deleteByExternalId(externalId)
    return deletedId
      ? reply.send({ deleted: true, id: deletedId })
      : reply.code(404).send({ error: 'workspace not found' })
  })

  app.post<{
    Body: { externalId?: string; kind?: WorkspaceKind; name?: string }
  }>('/api/workspaces', async (request, reply) => {
    if (!hasValidBearerToken(request.headers.authorization, dashboardToken)) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const externalId = request.body?.externalId?.trim() ?? ''
    const kind = request.body?.kind
    const name = request.body?.name?.trim() ?? ''
    if (!externalWorkspaceIdPattern.test(externalId)
      || !kind || !['personal', 'team', 'organization'].includes(kind)
      || !name || name.length > 80) {
      return reply.code(400).send({ error: 'invalid workspace' })
    }
    return reply.code(201).send(await workspaceStore.upsert({ externalId, kind, name }))
  })

  app.get<{
    Querystring: { cursor?: string; limit?: string }
  }>('/api/projects', async (request, reply) => {
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    return reply.send(await executeContract(listProjects, {
      workspaceId,
      cursor: request.query.cursor,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
    }))
  })

  app.post<{
    Body: { name?: string }
  }>('/api/projects', async (request, reply) => {
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await executeContract(createProject, { workspaceId, name: request.body?.name ?? '' })
    return reply.code(201).send(project)
  })

  app.delete<{
    Params: { projectId: string }
  }>('/api/projects/:projectId', async (request, reply) => {
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const result = await executeContract(deleteProject, { workspaceId, id: request.params.projectId })
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
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const result = await executeContract(setProjectRepository, {
      workspaceId,
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
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const result = await executeContract(disconnectProjectRepository, { workspaceId, projectId: request.params.projectId })
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
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project || project.workspace_id !== workspaceId) {
      return reply.code(404).send({ error: 'project not found' })
    }

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
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project || project.workspace_id !== workspaceId) {
      return reply.code(404).send({ error: 'project not found' })
    }
    return reply.send(await executeContract(getIssueFacets, { projectId: project.id }))
  })

  app.get<{
    Params: { projectId: string; issueId: string }
    Querystring: Record<string, never>
  }>('/api/:projectId/issues/:issueId', async (request, reply) => {
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project || project.workspace_id !== workspaceId) {
      return reply.code(404).send({ error: 'project not found' })
    }

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
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project || project.workspace_id !== workspaceId) {
      return reply.code(404).send({ error: 'project not found' })
    }
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
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project || project.workspace_id !== workspaceId) {
      return reply.code(404).send({ error: 'project not found' })
    }
    return reply.send(await executeContract(listReleases, {
      projectId: project.id,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
    }))
  })

  app.get<{
    Params: { projectId: string; version: string }
    Querystring: { dist?: string; limit?: string }
  }>('/api/:projectId/releases/:version/regressions', async (request, reply) => {
    const workspaceId = dashboardWorkspaceId(request.headers, dashboardToken)
    if (!workspaceId) {
      return reply.code(403).send({ error: 'invalid dashboard credentials' })
    }
    const project = await store.findProjectByDsnProjectId(request.params.projectId)
    if (!project || project.workspace_id !== workspaceId) {
      return reply.code(404).send({ error: 'project not found' })
    }
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
