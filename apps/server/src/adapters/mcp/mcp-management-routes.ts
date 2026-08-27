import type { FastifyInstance } from 'fastify'
import { executeContract } from 'boundra'
import { createHash, randomBytes } from 'node:crypto'
import type {
  createCreateMcpConnectionImplementation,
  createListMcpConnectionsImplementation,
  createRevokeMcpConnectionImplementation,
} from '@jabso/domain-mcp/server'

type ManagementDependencies = {
  createConnection: ReturnType<typeof createCreateMcpConnectionImplementation>
  listConnections: ReturnType<typeof createListMcpConnectionsImplementation>
  revokeConnection: ReturnType<typeof createRevokeMcpConnectionImplementation>
  workspaceId: (headers: Record<string, string | string[] | undefined>) => string | null
}

const createToken = () => `jabso_mcp_${randomBytes(32).toString('base64url')}`

export const registerMcpManagementRoutes = (
  app: FastifyInstance,
  dependencies: ManagementDependencies,
) => {
  app.get<{ Querystring: { limit?: string } }>('/api/mcp/connections', async (request, reply) => {
    const workspaceId = dependencies.workspaceId(request.headers)
    if (!workspaceId) return reply.code(403).send({ error: 'invalid dashboard credentials' })
    return reply.send(await executeContract(dependencies.listConnections, {
      workspaceId,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
    }))
  })

  app.post<{
    Body: { name?: string; projectIds?: string[] }
  }>('/api/mcp/connections', async (request, reply) => {
    const workspaceId = dependencies.workspaceId(request.headers)
    if (!workspaceId) return reply.code(403).send({ error: 'invalid dashboard credentials' })
    const token = createToken()
    const connection = await executeContract(dependencies.createConnection, {
      workspaceId,
      name: request.body?.name ?? '',
      projectIds: request.body?.projectIds ?? [],
      tokenHash: createHash('sha256').update(token).digest('hex'),
      tokenPrefix: token.slice(0, 21),
    })
    if (!connection) return reply.code(404).send({ error: 'project not found' })
    return reply.code(201).send({ connection, token })
  })

  app.delete<{
    Params: { connectionId: string }
  }>('/api/mcp/connections/:connectionId', async (request, reply) => {
    const workspaceId = dependencies.workspaceId(request.headers)
    if (!workspaceId) return reply.code(403).send({ error: 'invalid dashboard credentials' })
    const result = await executeContract(dependencies.revokeConnection, {
      workspaceId,
      connectionId: request.params.connectionId,
    })
    return result.revoked
      ? reply.send(result)
      : reply.code(404).send({ error: 'MCP connection not found' })
  })
}
