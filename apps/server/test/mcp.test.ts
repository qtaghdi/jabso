import { describe, expect, it } from 'vitest'
import { buildServer } from '../src/jabso-app.js'
import { createTestDatabase } from './pglite.js'

const dashboardToken = 'mcp-dashboard-token'
const workspaceId = '128f47a2-5d1d-7e19-aab8-6f8cc59d9a01'
const otherWorkspaceId = '128f47a2-5d1d-7e19-aab8-6f8cc59d9a02'
const projectId = '228f47a2-5d1d-7e19-aab8-6f8cc59d9a01'
const otherProjectId = '228f47a2-5d1d-7e19-aab8-6f8cc59d9a02'

const dashboardHeaders = (targetWorkspaceId = workspaceId) => ({
  authorization: `Bearer ${dashboardToken}`,
  'x-jabso-workspace-id': targetWorkspaceId,
})

const mcpRequest = (
  app: Awaited<ReturnType<typeof buildServer>>,
  token: string,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
) => app.inject({
  method: 'POST',
  url: '/mcp',
  headers: {
    accept: 'application/json, text/event-stream',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'mcp-protocol-version': '2025-11-25',
    ...headers,
  },
  payload,
})

const fixture = async () => {
  const { database, executor } = await createTestDatabase()
  await executor.query(
    `insert into workspaces (id, external_id, kind, name) values
      ($1, 'user:mcp_owner', 'personal', 'MCP workspace'),
      ($2, 'org:mcp_other', 'organization', 'Other workspace')`,
    [workspaceId, otherWorkspaceId],
  )
  await executor.query(
    `insert into projects (id, workspace_id, name, slug, dsn_project_id, public_key) values
      ($1, $2, 'Allowed project', 'allowed-project', '501', 'allowed-public-key'),
      ($3, $4, 'Other project', 'other-project', '502', 'other-public-key')`,
    [projectId, workspaceId, otherProjectId, otherWorkspaceId],
  )
  const app = await buildServer({
    allowedOrigin: 'https://jabso.test',
    dashboardToken,
    database: executor,
  })
  return { app, database }
}

describe('Jabso MCP', () => {
  it('creates a scoped connection, exposes six read-only tools, audits calls, and revokes immediately', async () => {
    const { app, database } = await fixture()
    const crossWorkspace = await app.inject({
      method: 'POST',
      url: '/api/mcp/connections',
      headers: dashboardHeaders(),
      payload: { name: 'Unsafe', projectIds: [projectId, otherProjectId] },
    })
    expect(crossWorkspace.statusCode).toBe(404)

    const createdResponse = await app.inject({
      method: 'POST',
      url: '/api/mcp/connections',
      headers: dashboardHeaders(),
      payload: { name: 'Codex local', projectIds: [projectId] },
    })
    expect(createdResponse.statusCode).toBe(201)
    const created = createdResponse.json<{
      connection: { id: string; projects: Array<{ id: string }>; tokenPrefix: string }
      token: string
    }>()
    expect(created.token).toMatch(/^jabso_mcp_[A-Za-z0-9_-]{43}$/)
    expect(created.connection.tokenPrefix).toBe(created.token.slice(0, 21))
    expect(created.connection.projects).toEqual([expect.objectContaining({ id: projectId })])

    const storedSecret = (await database.query<{ token_hash: string }>(
      'select token_hash from mcp_connections where id = $1',
      [created.connection.id],
    )).rows[0]
    expect(storedSecret?.token_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(storedSecret?.token_hash).not.toContain(created.token)

    const toolsResponse = await mcpRequest(app, created.token, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    })
    expect(toolsResponse.statusCode, toolsResponse.body).toBe(200)
    const tools = toolsResponse.json<{
      result: { tools: Array<{ annotations: { readOnlyHint: boolean }; name: string }> }
    }>().result.tools
    expect(tools.map((tool) => tool.name)).toEqual([
      'list_projects',
      'search_issues',
      'get_issue',
      'get_event',
      'get_issue_occurrences',
      'get_release_regressions',
    ])
    expect(tools.every((tool) => tool.annotations.readOnlyHint)).toBe(true)

    const projectsResponse = await mcpRequest(app, created.token, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'list_projects', arguments: {} },
    })
    expect(projectsResponse.statusCode).toBe(200)
    expect(projectsResponse.json()).toMatchObject({
      result: {
        structuredContent: {
          projects: [{ id: projectId, name: 'Allowed project', slug: 'allowed-project' }],
        },
      },
    })

    const deniedResponse = await mcpRequest(app, created.token, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_issues',
        arguments: { projectId: otherProjectId, limit: 1 },
      },
    })
    expect(deniedResponse.statusCode).toBe(200)
    expect(deniedResponse.json()).toMatchObject({
      result: { isError: true, content: [{ text: 'Not found' }] },
    })

    const auditRows = await database.query<{
      project_id: string | null
      tool: string
      outcome: string
    }>('select project_id, tool, outcome from mcp_audit_logs order by occurred_at, id')
    expect(auditRows.rows).toEqual([
      { project_id: null, tool: 'list_projects', outcome: 'success' },
      { project_id: null, tool: 'search_issues', outcome: 'denied' },
    ])
    const unsafeAuditColumns = await database.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_name = 'mcp_audit_logs' and column_name in ('arguments', 'result', 'token')`,
    )
    expect(unsafeAuditColumns.rows).toEqual([])

    const rejectedOrigin = await mcpRequest(app, created.token, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/list',
      params: {},
    }, { origin: 'https://attacker.test' })
    expect(rejectedOrigin.statusCode).toBe(403)

    const revoked = await app.inject({
      method: 'DELETE',
      url: `/api/mcp/connections/${created.connection.id}`,
      headers: dashboardHeaders(),
    })
    expect(revoked.statusCode).toBe(200)
    const afterRevoke = await mcpRequest(app, created.token, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/list',
      params: {},
    })
    expect(afterRevoke.statusCode).toBe(401)

    await app.close()
    await database.close()
  })

  it('keeps connection management isolated by workspace', async () => {
    const { app, database } = await fixture()
    const created = await app.inject({
      method: 'POST',
      url: '/api/mcp/connections',
      headers: dashboardHeaders(),
      payload: { name: 'Owner connection', projectIds: [projectId] },
    })
    const connectionId = created.json<{ connection: { id: string } }>().connection.id

    const otherList = await app.inject({
      method: 'GET',
      url: '/api/mcp/connections',
      headers: dashboardHeaders(otherWorkspaceId),
    })
    expect(otherList.json<{ items: unknown[] }>().items).toEqual([])

    const otherRevoke = await app.inject({
      method: 'DELETE',
      url: `/api/mcp/connections/${connectionId}`,
      headers: dashboardHeaders(otherWorkspaceId),
    })
    expect(otherRevoke.statusCode).toBe(404)

    await app.close()
    await database.close()
  })
})
