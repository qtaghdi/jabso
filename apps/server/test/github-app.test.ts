import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { buildServer } from '../src/composition/create-jabso-app.js'
import type { GitHubAppRuntime } from '../src/adapters/http/github-app-client.js'
import type { GitHubInstallation } from '../src/ports/github-app.js'
import { createTestDatabase } from './pglite.js'

const dashboardToken = 'github-app-dashboard-token'
const webhookSecret = 'github-app-webhook-secret-that-is-long-enough'
const workspaceOne = '028f47a2-5d1d-7e19-aab8-6f8cc59d9a11'
const workspaceTwo = '028f47a2-5d1d-7e19-aab8-6f8cc59d9a12'

const installation: GitHubInstallation = {
  accountId: '987654',
  accountLogin: 'jabso-labs',
  accountType: 'Organization',
  installationId: '123456',
  repositorySelection: 'selected',
  suspendedAt: null,
}

const runtime = (): GitHubAppRuntime => ({
  client: {
    authorizeInstallation: vi.fn(async (_code, installationId) => ({
      ...installation,
      installationId,
    })),
    listRepositories: vi.fn(async (installationId) => [{
      archived: false,
      defaultBranch: 'main',
      externalId: '456789',
      installationId,
      name: 'private-dashboard',
      owner: 'jabso-labs',
      private: true,
      updatedAt: '2026-08-31T00:00:00.000Z',
      url: 'https://github.com/jabso-labs/private-dashboard',
    }]),
  },
  slug: 'jabso-error-monitor',
  webhookSecret,
})

const fixture = async () => {
  const { database, executor } = await createTestDatabase()
  await executor.query(
    `insert into workspaces (id, external_id, kind, name) values
      ($1, 'org:org_github_one', 'organization', 'One'),
      ($2, 'org:org_github_two', 'organization', 'Two')`,
    [workspaceOne, workspaceTwo],
  )
  const githubAppRuntime = runtime()
  const app = await buildServer({
    allowedOrigin: 'https://jabso.test',
    dashboardToken,
    database: executor,
    githubAppRuntime,
  })
  const headers = (workspaceId: string) => ({
    authorization: `Bearer ${dashboardToken}`,
    'x-jabso-workspace-id': workspaceId,
  })
  return { app, database, executor, githubAppRuntime, headers }
}

const beginInstallation = async (
  app: Awaited<ReturnType<typeof buildServer>>,
  headers: Record<string, string>,
) => {
  const response = await app.inject({ method: 'POST', url: '/api/github/installations/session', headers })
  expect(response.statusCode).toBe(201)
  const installUrl = new URL(response.json<{ url: string }>().url)
  expect(installUrl.origin).toBe('https://github.com')
  expect(installUrl.pathname).toBe('/apps/jabso-error-monitor/installations/new')
  const state = installUrl.searchParams.get('state')
  expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/)
  return state as string
}

describe('GitHub App integration', () => {
  it('binds a verified installation to one workspace and lists private repositories', async () => {
    const { app, database, executor, githubAppRuntime, headers } = await fixture()
    const unauthorized = await app.inject({ method: 'POST', url: '/api/github/installations/session' })
    expect(unauthorized.statusCode).toBe(403)

    const state = await beginInstallation(app, headers(workspaceOne))
    const storedState = await executor.query<{ state_hash: string }>('select state_hash from github_installation_states')
    expect(storedState.rows[0]?.state_hash).not.toBe(state)

    const callback = await app.inject({
      method: 'GET',
      url: `/api/github/callback?code=oauth-code&installation_id=${installation.installationId}&state=${state}`,
    })
    expect(callback.statusCode).toBe(302)
    expect(callback.headers.location).toBe('https://jabso.test/projects?github=connected')
    expect(githubAppRuntime.client.authorizeInstallation).toHaveBeenCalledWith('oauth-code', installation.installationId)

    const installations = await app.inject({
      method: 'GET',
      url: '/api/github/installations',
      headers: headers(workspaceOne),
    })
    expect(installations.json()).toMatchObject({
      configured: true,
      items: [{
        accountLogin: 'jabso-labs',
        installationId: installation.installationId,
        manageUrl: `https://github.com/organizations/jabso-labs/settings/installations/${installation.installationId}`,
      }],
    })

    const otherWorkspace = await app.inject({
      method: 'GET',
      url: '/api/github/installations',
      headers: headers(workspaceTwo),
    })
    expect(otherWorkspace.json()).toMatchObject({ items: [] })

    const secondWorkspaceState = await beginInstallation(app, headers(workspaceTwo))
    const duplicateCallback = await app.inject({
      method: 'GET',
      url: `/api/github/callback?code=second-workspace&installation_id=${installation.installationId}&state=${secondWorkspaceState}`,
    })
    expect(duplicateCallback.headers.location).toBe('https://jabso.test/projects?github=already-connected')
    const stillIsolated = await app.inject({
      method: 'GET',
      url: '/api/github/installations',
      headers: headers(workspaceTwo),
    })
    expect(stillIsolated.json()).toMatchObject({ items: [] })

    const repositories = await app.inject({
      method: 'GET',
      url: '/api/github/repositories',
      headers: headers(workspaceOne),
    })
    expect(repositories.json()).toMatchObject({
      items: [{ name: 'private-dashboard', owner: 'jabso-labs', private: true }],
    })

    const replay = await app.inject({
      method: 'GET',
      url: `/api/github/callback?code=replayed&installation_id=${installation.installationId}&state=${state}`,
    })
    expect(replay.headers.location).toBe('https://jabso.test/projects?github=expired')
    await app.close()
    await database.close()
  })

  it('rejects unsigned webhooks and applies signed installation lifecycle events', async () => {
    const { app, database, headers } = await fixture()
    const state = await beginInstallation(app, headers(workspaceOne))
    await app.inject({
      method: 'GET',
      url: `/api/github/callback?code=oauth-code&installation_id=${installation.installationId}&state=${state}`,
    })

    const payload = JSON.stringify({
      action: 'suspend',
      installation: {
        account: { id: 987654, login: 'jabso-labs', type: 'Organization' },
        id: 123456,
        repository_selection: 'selected',
        suspended_at: '2026-08-31T01:00:00.000Z',
      },
    })
    const unsigned = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      headers: { 'content-type': 'application/json', 'x-github-event': 'installation' },
      payload,
    })
    expect(unsigned.statusCode).toBe(401)

    const malformedPayload = '{"action":'
    const malformedSignature = `sha256=${createHmac('sha256', webhookSecret).update(malformedPayload).digest('hex')}`
    const malformed = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'installation',
        'x-hub-signature-256': malformedSignature,
      },
      payload: malformedPayload,
    })
    expect(malformed.statusCode).toBe(400)

    const signature = `sha256=${createHmac('sha256', webhookSecret).update(payload).digest('hex')}`
    const suspended = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'installation',
        'x-hub-signature-256': signature,
      },
      payload,
    })
    expect(suspended.statusCode).toBe(202)
    const installations = await app.inject({
      method: 'GET',
      url: '/api/github/installations',
      headers: headers(workspaceOne),
    })
    expect(installations.json()).toMatchObject({
      items: [{ suspendedAt: '2026-08-31T01:00:00.000Z' }],
    })

    const deletedPayload = payload.replace('"suspend"', '"deleted"')
    const deletedSignature = `sha256=${createHmac('sha256', webhookSecret).update(deletedPayload).digest('hex')}`
    const deleted = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'installation',
        'x-hub-signature-256': deletedSignature,
      },
      payload: deletedPayload,
    })
    expect(deleted.statusCode).toBe(202)
    const remaining = await app.inject({
      method: 'GET',
      url: '/api/github/installations',
      headers: headers(workspaceOne),
    })
    expect(remaining.json()).toMatchObject({ items: [] })
    await app.close()
    await database.close()
  })
})
