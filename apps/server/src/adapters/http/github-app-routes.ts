import type { FastifyInstance } from 'fastify'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { GitHubAppError, type GitHubAppRuntime } from './github-app-client.js'
import type {
  GitHubInstallation,
  GitHubInstallationStore,
} from '../../ports/github-app.js'

const callbackQuerySchema = z.object({
  code: z.string().min(1).max(1_000).optional(),
  installation_id: z.string().regex(/^\d{1,30}$/).optional(),
  setup_action: z.enum(['install', 'request', 'update']).optional(),
  state: z.string().regex(/^[A-Za-z0-9_-]{20,200}$/),
})

const webhookInstallationSchema = z.object({
  account: z.object({
    id: z.number().int().positive().safe(),
    login: z.string().min(1).max(100),
    type: z.enum(['Organization', 'User']),
  }),
  id: z.number().int().positive().safe(),
  repository_selection: z.enum(['all', 'selected']),
  suspended_at: z.iso.datetime().nullable(),
})

const webhookSchema = z.object({
  action: z.string().min(1).max(100),
  installation: webhookInstallationSchema,
})

type RegisterGitHubAppRoutesOptions = {
  runtime: GitHubAppRuntime | null
  store: GitHubInstallationStore
  webOrigin: string
  workspaceId: (headers: Record<string, string | string[] | undefined>) => string | null
}

const stateHash = (state: string) => createHash('sha256').update(state).digest('hex')

const installationFromWebhook = (
  value: z.infer<typeof webhookInstallationSchema>,
): GitHubInstallation => ({
  accountId: String(value.account.id),
  accountLogin: value.account.login,
  accountType: value.account.type,
  installationId: String(value.id),
  repositorySelection: value.repository_selection,
  suspendedAt: value.suspended_at,
})

const safeRedirect = (webOrigin: string, status: string) => {
  const url = new URL('/projects', webOrigin)
  url.searchParams.set('github', status)
  return url.toString()
}

const verifiedWebhook = (body: Buffer, signature: string | undefined, secret: string) => {
  if (!signature?.startsWith('sha256=')) return false
  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
  const actualBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}

export const registerGitHubAppRoutes = async (
  app: FastifyInstance,
  options: RegisterGitHubAppRoutesOptions,
) => {
  app.get('/api/github/installations', async (request, reply) => {
    const workspaceId = options.workspaceId(request.headers)
    if (!workspaceId) return reply.code(403).send({ error: 'invalid dashboard credentials' })
    const installations = await options.store.listInstallations(workspaceId)
    return reply.send({
      configured: Boolean(options.runtime),
      items: installations.map((installation) => ({
        ...installation,
        manageUrl: installation.accountType === 'Organization'
          ? `https://github.com/organizations/${encodeURIComponent(installation.accountLogin)}/settings/installations/${installation.installationId}`
          : `https://github.com/settings/installations/${installation.installationId}`,
      })),
    })
  })

  app.post('/api/github/installations/session', async (request, reply) => {
    const workspaceId = options.workspaceId(request.headers)
    if (!workspaceId) return reply.code(403).send({ error: 'invalid dashboard credentials' })
    if (!options.runtime) return reply.code(503).send({ error: 'GitHub App is not configured' })
    const state = randomBytes(32).toString('base64url')
    await options.store.createState({
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      stateHash: stateHash(state),
      workspaceId,
    })
    const installUrl = new URL(`https://github.com/apps/${options.runtime.slug}/installations/new`)
    installUrl.searchParams.set('state', state)
    return reply.code(201).send({ url: installUrl.toString() })
  })

  app.get<{ Querystring: Record<string, string | undefined> }>('/api/github/callback', async (request, reply) => {
    if (!options.runtime) return reply.redirect(safeRedirect(options.webOrigin, 'not-configured'))
    const parsed = callbackQuerySchema.safeParse(request.query)
    if (!parsed.success) return reply.redirect(safeRedirect(options.webOrigin, 'invalid-callback'))
    const state = await options.store.consumeState(stateHash(parsed.data.state))
    if (!state) return reply.redirect(safeRedirect(options.webOrigin, 'expired'))
    if (parsed.data.setup_action === 'request') {
      return reply.redirect(safeRedirect(options.webOrigin, 'requested'))
    }
    if (!parsed.data.code || !parsed.data.installation_id) {
      return reply.redirect(safeRedirect(options.webOrigin, 'invalid-callback'))
    }

    try {
      const installation = await options.runtime.client.authorizeInstallation(
        parsed.data.code,
        parsed.data.installation_id,
      )
      const connected = await options.store.upsertInstallation(state.workspaceId, installation)
      return reply.redirect(safeRedirect(options.webOrigin, connected ? 'connected' : 'already-connected'))
    } catch (error) {
      const status = error instanceof GitHubAppError && error.status === 403 ? 'not-authorized' : 'unavailable'
      return reply.redirect(safeRedirect(options.webOrigin, status))
    }
  })

  app.get('/api/github/repositories', async (request, reply) => {
    const workspaceId = options.workspaceId(request.headers)
    if (!workspaceId) return reply.code(403).send({ error: 'invalid dashboard credentials' })
    if (!options.runtime) return reply.code(503).send({ error: 'GitHub App is not configured' })
    const installations = (await options.store.listInstallations(workspaceId))
      .filter((installation) => !installation.suspendedAt)
    const repositories = (await Promise.all(
      installations.map((installation) => options.runtime?.client.listRepositories(installation.installationId) ?? []),
    )).flat()
    repositories.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.externalId.localeCompare(right.externalId))
    return reply.send({ items: repositories.slice(0, 100) })
  })

  await app.register(async (webhookApp) => {
    webhookApp.removeContentTypeParser('application/json')
    webhookApp.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_request, body, done) => done(null, body),
    )
    webhookApp.post<{ Body: Buffer }>('/webhooks/github', async (request, reply) => {
      if (!options.runtime) return reply.code(503).send({ error: 'GitHub App is not configured' })
      if (!Buffer.isBuffer(request.body) || !verifiedWebhook(
        request.body,
        request.headers['x-hub-signature-256'] as string | undefined,
        options.runtime.webhookSecret,
      )) {
        return reply.code(401).send({ error: 'invalid webhook signature' })
      }
      let webhookBody: unknown
      try {
        webhookBody = JSON.parse(request.body.toString('utf8'))
      } catch {
        return reply.code(400).send({ error: 'invalid webhook payload' })
      }
      const payload = webhookSchema.safeParse(webhookBody)
      if (!payload.success) return reply.code(400).send({ error: 'invalid webhook payload' })
      const event = request.headers['x-github-event']
      const installation = installationFromWebhook(payload.data.installation)
      if (event === 'installation' && payload.data.action === 'deleted') {
        await options.store.deleteInstallation(installation.installationId)
      } else if (event === 'installation'
        || event === 'installation_repositories'
        || event === 'installation_target') {
        await options.store.updateInstallation(installation)
      }
      return reply.code(202).send({ accepted: true })
    })
  })
}
