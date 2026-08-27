import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/server'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { executeContract } from 'boundra'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { createGetEventImplementation } from '../../../../domains/event/server/public.js'
import { getEventResultSchema } from '../../../../domains/event/shared/public.js'
import type {
  createGetIssueImplementation,
  createSearchIssuesImplementation,
} from '../../../../domains/issue/server/public.js'
import {
  getIssueResultSchema,
  searchIssuesResultSchema,
} from '../../../../domains/issue/shared/public.js'
import type { createGetReleaseRegressionsImplementation } from '../../../../domains/release/server/public.js'
import { getReleaseRegressionsResultSchema } from '../../../../domains/release/shared/public.js'
import {
  type AuthenticatedMcpConnection,
  PostgresMcpStore,
} from './postgres-mcp-store.js'

type McpDependencies = {
  getEvent: ReturnType<typeof createGetEventImplementation>
  getIssue: ReturnType<typeof createGetIssueImplementation>
  getReleaseRegressions: ReturnType<typeof createGetReleaseRegressionsImplementation>
  searchIssues: ReturnType<typeof createSearchIssuesImplementation>
  store: PostgresMcpStore
}

type WebTransportResponse = {
  arrayBuffer: () => Promise<ArrayBuffer>
  headers: {
    forEach: (callback: (value: string, name: string) => void) => void
  }
  status: number
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

const projectIdSchema = z.uuid().describe('Jabso project UUID returned by list_projects')

const projectSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  repository: z.object({
    owner: z.string(),
    name: z.string(),
    url: z.url(),
    rootPath: z.string(),
  }).nullable(),
})

const textResult = (value: object) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  structuredContent: value,
})

const errorResult = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true as const,
})

const allowed = (connection: AuthenticatedMcpConnection, projectId: string) =>
  connection.projectIds.includes(projectId)

const audit = async (
  store: PostgresMcpStore,
  connection: AuthenticatedMcpConnection,
  input: {
    projectId: string | null
    tool: string
    outcome: 'success' | 'error' | 'denied'
    startedAt: number
  },
) => {
  await store.recordAudit({
    connectionId: connection.id,
    workspaceId: connection.workspaceId,
    projectId: input.projectId,
    tool: input.tool,
    outcome: input.outcome,
    durationMs: Math.max(0, Date.now() - input.startedAt),
  }).catch(() => undefined)
}

const runProjectTool = async <Result extends object>(
  store: PostgresMcpStore,
  connection: AuthenticatedMcpConnection,
  projectId: string,
  tool: string,
  operation: () => Promise<Result | null>,
) => {
  const startedAt = Date.now()
  if (!allowed(connection, projectId)) {
    await audit(store, connection, { projectId: null, tool, outcome: 'denied', startedAt })
    return errorResult('Not found')
  }
  try {
    const result = await operation()
    if (!result) {
      await audit(store, connection, { projectId, tool, outcome: 'error', startedAt })
      return errorResult('Not found')
    }
    await audit(store, connection, { projectId, tool, outcome: 'success', startedAt })
    return textResult(result)
  } catch {
    await audit(store, connection, { projectId, tool, outcome: 'error', startedAt })
    return errorResult('Jabso could not complete this read-only query.')
  }
}

const createJabsoMcpServer = (
  connection: AuthenticatedMcpConnection,
  dependencies: McpDependencies,
) => {
  const server = new McpServer(
    { name: 'jabso', version: '0.1.0' },
    { capabilities: { logging: {} } },
  )

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List the Jabso projects this connection is allowed to inspect.',
      inputSchema: z.object({}),
      outputSchema: z.object({ projects: z.array(projectSchema).max(100) }),
      annotations: readOnlyAnnotations,
    },
    async () => {
      const startedAt = Date.now()
      try {
        const result = { projects: await dependencies.store.listAllowedProjects(connection) }
        await audit(dependencies.store, connection, {
          projectId: null,
          tool: 'list_projects',
          outcome: 'success',
          startedAt,
        })
        return textResult(result)
      } catch {
        await audit(dependencies.store, connection, {
          projectId: null,
          tool: 'list_projects',
          outcome: 'error',
          startedAt,
        })
        return errorResult('Jabso could not list projects.')
      }
    },
  )

  server.registerTool(
    'search_issues',
    {
      title: 'Search issues',
      description: 'Search and filter recent Jabso issues in one allowed project.',
      inputSchema: z.object({
        projectId: projectIdSchema,
        query: z.string().max(500).optional(),
        status: z.enum(['unresolved', 'resolved', 'ignored']).optional(),
        level: z.string().max(32).optional(),
        environment: z.string().max(128).optional(),
        release: z.string().max(250).optional(),
        lastSeenAfter: z.iso.datetime().optional(),
        cursor: z.string().max(500).optional(),
        direction: z.enum(['next', 'previous']).default('next'),
        limit: z.number().int().min(1).max(50).default(25),
      }),
      outputSchema: searchIssuesResultSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) => runProjectTool(
      dependencies.store,
      connection,
      input.projectId,
      'search_issues',
      () => executeContract(dependencies.searchIssues, input),
    ),
  )

  server.registerTool(
    'get_issue',
    {
      title: 'Get issue',
      description: 'Get one Jabso issue with its latest event and bounded history.',
      inputSchema: z.object({
        projectId: projectIdSchema,
        issueId: z.uuid(),
      }),
      outputSchema: z.object({ issue: getIssueResultSchema.unwrap() }),
      annotations: readOnlyAnnotations,
    },
    async (input) => runProjectTool(
      dependencies.store,
      connection,
      input.projectId,
      'get_issue',
      async () => {
        const issue = await executeContract(dependencies.getIssue, input)
        return issue ? { issue } : null
      },
    ),
  )

  server.registerTool(
    'get_event',
    {
      title: 'Get event',
      description: 'Get one error event by its SDK event ID.',
      inputSchema: z.object({
        projectId: projectIdSchema,
        eventId: z.string().min(1).max(64),
      }),
      outputSchema: z.object({ event: getEventResultSchema.unwrap() }),
      annotations: readOnlyAnnotations,
    },
    async (input) => runProjectTool(
      dependencies.store,
      connection,
      input.projectId,
      'get_event',
      async () => {
        const event = await executeContract(dependencies.getEvent, input)
        return event ? { event } : null
      },
    ),
  )

  server.registerTool(
    'get_issue_occurrences',
    {
      title: 'Get issue occurrences',
      description: 'Get up to 25 recent occurrences for one Jabso issue.',
      inputSchema: z.object({
        projectId: projectIdSchema,
        issueId: z.uuid(),
      }),
      outputSchema: z.object({
        issueId: z.uuid(),
        occurrences: getIssueResultSchema.unwrap().shape.occurrences,
      }),
      annotations: readOnlyAnnotations,
    },
    async (input) => runProjectTool(
      dependencies.store,
      connection,
      input.projectId,
      'get_issue_occurrences',
      async () => {
        const issue = await executeContract(dependencies.getIssue, input)
        return issue ? { issueId: issue.id, occurrences: issue.occurrences } : null
      },
    ),
  )

  server.registerTool(
    'get_release_regressions',
    {
      title: 'Get release regressions',
      description: 'List issues that regressed in one release of an allowed project.',
      inputSchema: z.object({
        projectId: projectIdSchema,
        release: z.string().min(1).max(250),
        dist: z.string().max(128).default(''),
        limit: z.number().int().min(1).max(50).default(25),
      }),
      outputSchema: getReleaseRegressionsResultSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) => runProjectTool(
      dependencies.store,
      connection,
      input.projectId,
      'get_release_regressions',
      () => executeContract(dependencies.getReleaseRegressions, input),
    ),
  )

  return server
}

const jsonRpcMethodNotAllowed = {
  jsonrpc: '2.0',
  error: { code: -32000, message: 'Method not allowed. Use POST for stateless MCP requests.' },
  id: null,
} as const

const webRequestFromFastify = (
  request: FastifyRequest,
) => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value)
    else if (Array.isArray(value)) headers.set(name, value.join(', '))
  }
  const forwardedProtocol = headers.get('x-forwarded-proto')
  const protocol = forwardedProtocol === 'https' ? 'https' : 'http'
  return new Request(`${protocol}://${headers.get('host') ?? 'localhost'}${request.raw.url ?? '/mcp'}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request.body),
  })
}

export const registerMcpRoutes = (
  app: FastifyInstance,
  dependencies: McpDependencies & { allowedOrigin: string },
) => {
  app.get('/mcp', async (_request, reply) =>
    reply.header('allow', 'POST').code(405).send(jsonRpcMethodNotAllowed))
  app.delete('/mcp', async (_request, reply) =>
    reply.header('allow', 'POST').code(405).send(jsonRpcMethodNotAllowed))

  app.post('/mcp', async (request, reply) => {
    const origin = request.headers.origin
    if (origin && origin !== dependencies.allowedOrigin) {
      return reply.code(403).send({ error: 'origin not allowed' })
    }
    const authorization = request.headers.authorization
    if (!authorization?.startsWith('Bearer ')) {
      return reply.header('www-authenticate', 'Bearer').code(401).send({ error: 'MCP bearer token required' })
    }
    const token = authorization.slice('Bearer '.length)
    if (!token.startsWith('jabso_mcp_') || token.length > 256) {
      return reply.header('www-authenticate', 'Bearer').code(401).send({ error: 'invalid MCP credentials' })
    }
    const connection = await dependencies.store.authenticate(
      createHash('sha256').update(token).digest('hex'),
    )
    if (!connection) {
      return reply.header('www-authenticate', 'Bearer').code(401).send({ error: 'invalid MCP credentials' })
    }

    const server = createJabsoMcpServer(connection, dependencies)
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: undefined,
    })
    await server.connect(transport)
    const response = await transport.handleRequest(webRequestFromFastify(request), {
      parsedBody: request.body,
    }) as unknown as WebTransportResponse
    const body = Buffer.from(await response.arrayBuffer())
    response.headers.forEach((value, name) => reply.header(name, value))
    await server.close()
    return reply.code(response.status).send(body)
  })
}
