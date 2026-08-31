import { createSign } from 'node:crypto'
import { z } from 'zod'
import type {
  GitHubAppClient,
  GitHubInstallation,
  GitHubRepository,
} from '../../ports/github-app.js'

const githubApiUrl = 'https://api.github.com'
const githubApiVersion = '2022-11-28'

const installationSchema = z.object({
  account: z.object({
    id: z.number().int().positive().safe(),
    login: z.string().min(1).max(100),
    type: z.enum(['Organization', 'User']),
  }),
  id: z.number().int().positive().safe(),
  repository_selection: z.enum(['all', 'selected']),
  suspended_at: z.iso.datetime().nullable(),
})

const installationTokenSchema = z.object({
  expires_at: z.iso.datetime(),
  token: z.string().min(20).max(1_000),
})

const oauthTokenSchema = z.object({
  access_token: z.string().min(20).max(1_000),
})

const repositorySchema = z.object({
  archived: z.boolean(),
  default_branch: z.string().min(1).max(250).nullable(),
  html_url: z.url().max(500),
  id: z.number().int().positive().safe(),
  name: z.string().min(1).max(100),
  owner: z.object({ login: z.string().min(1).max(100) }),
  private: z.boolean(),
  updated_at: z.iso.datetime(),
})

const repositoryListSchema = z.object({
  repositories: z.array(repositorySchema).max(100),
})

const environmentSchema = z.object({
  appId: z.string().regex(/^\d{1,30}$/),
  clientId: z.string().min(10).max(200),
  clientSecret: z.string().min(20).max(500),
  privateKeyBase64: z.string().min(100).max(20_000),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/),
  webhookSecret: z.string().min(32).max(500),
})

export type GitHubAppRuntime = {
  client: GitHubAppClient
  slug: string
  webhookSecret: string
}

export class GitHubAppError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'GitHubAppError'
  }
}

const installationFromResponse = (value: z.infer<typeof installationSchema>): GitHubInstallation => ({
  accountId: String(value.account.id),
  accountLogin: value.account.login,
  accountType: value.account.type,
  installationId: String(value.id),
  repositorySelection: value.repository_selection,
  suspendedAt: value.suspended_at,
})

const githubHeaders = (token: string) => ({
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${token}`,
  'user-agent': 'jabso-server',
  'x-github-api-version': githubApiVersion,
})

const responseJson = async <Result>(response: Response, schema: z.ZodType<Result>, message: string) => {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new GitHubAppError(403, 'GitHub did not authorize this installation.')
    }
    throw new GitHubAppError(502, 'GitHub is temporarily unavailable.')
  }
  const result = schema.safeParse(await response.json())
  if (!result.success) throw new GitHubAppError(502, message)
  return result.data
}

const encoded = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

const createAppJwt = (appId: string, privateKey: string) => {
  const now = Math.floor(Date.now() / 1_000)
  const unsigned = `${encoded({ alg: 'RS256', typ: 'JWT' })}.${encoded({
    exp: now + 9 * 60,
    iat: now - 60,
    iss: appId,
  })}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  return `${unsigned}.${signer.sign(privateKey, 'base64url')}`
}

export const createGitHubAppClient = (input: {
  appId: string
  clientId: string
  clientSecret: string
  privateKey: string
}): GitHubAppClient => {
  const tokenCache = new Map<string, { expiresAt: number; token: string }>()

  const appRequest = (path: string, init?: RequestInit) => fetch(`${githubApiUrl}${path}`, {
    ...init,
    headers: {
      ...githubHeaders(createAppJwt(input.appId, input.privateKey)),
      ...init?.headers,
    },
  })

  const installationToken = async (installationId: string) => {
    const cached = tokenCache.get(installationId)
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
    const response = await appRequest(`/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
      method: 'POST',
    })
    const result = await responseJson(response, installationTokenSchema, 'GitHub returned an invalid installation token.')
    tokenCache.set(installationId, {
      expiresAt: new Date(result.expires_at).getTime(),
      token: result.token,
    })
    return result.token
  }

  return {
    authorizeInstallation: async (code, installationId) => {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'jabso-server',
        },
        body: new URLSearchParams({
          client_id: input.clientId,
          client_secret: input.clientSecret,
          code,
        }),
      })
      const oauth = await responseJson(tokenResponse, oauthTokenSchema, 'GitHub returned an invalid OAuth response.')
      const verification = await fetch(
        `${githubApiUrl}/user/installations/${encodeURIComponent(installationId)}/repositories?per_page=1`,
        { headers: githubHeaders(oauth.access_token) },
      )
      if (!verification.ok) throw new GitHubAppError(403, 'Your GitHub account cannot manage this installation.')

      const installationResponse = await appRequest(`/app/installations/${encodeURIComponent(installationId)}`)
      const installation = await responseJson(
        installationResponse,
        installationSchema,
        'GitHub returned an invalid installation.',
      )
      return installationFromResponse(installation)
    },
    listRepositories: async (installationId): Promise<GitHubRepository[]> => {
      const token = await installationToken(installationId)
      const response = await fetch(`${githubApiUrl}/installation/repositories?per_page=100`, {
        headers: githubHeaders(token),
      })
      const result = await responseJson(response, repositoryListSchema, 'GitHub returned an invalid repository list.')
      return result.repositories.map((repository) => ({
        archived: repository.archived,
        defaultBranch: repository.default_branch ?? 'main',
        externalId: String(repository.id),
        installationId,
        name: repository.name,
        owner: repository.owner.login,
        private: repository.private,
        updatedAt: repository.updated_at,
        url: repository.html_url,
      }))
    },
  }
}

export const readGitHubAppRuntime = (): GitHubAppRuntime | null => {
  const parsed = environmentSchema.safeParse({
    appId: process.env.JABSO_GITHUB_APP_ID,
    clientId: process.env.JABSO_GITHUB_APP_CLIENT_ID,
    clientSecret: process.env.JABSO_GITHUB_APP_CLIENT_SECRET,
    privateKeyBase64: process.env.JABSO_GITHUB_APP_PRIVATE_KEY_BASE64,
    slug: process.env.JABSO_GITHUB_APP_SLUG,
    webhookSecret: process.env.JABSO_GITHUB_APP_WEBHOOK_SECRET,
  })
  if (!parsed.success) return null
  const privateKey = Buffer.from(parsed.data.privateKeyBase64, 'base64').toString('utf8')
  if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN RSA PRIVATE KEY')) return null
  return {
    client: createGitHubAppClient({
      appId: parsed.data.appId,
      clientId: parsed.data.clientId,
      clientSecret: parsed.data.clientSecret,
      privateKey,
    }),
    slug: parsed.data.slug,
    webhookSecret: parsed.data.webhookSecret,
  }
}
