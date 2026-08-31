import 'server-only'

import { getDatabase } from '@jabso/db'
import * as databaseSchema from '@jabso/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { organization } from 'better-auth/plugins'

const githubClientId = process.env.JABSO_GITHUB_OAUTH_CLIENT_ID?.trim()
const githubClientSecret = process.env.JABSO_GITHUB_OAUTH_CLIENT_SECRET?.trim()

export const auth = betterAuth({
  appName: 'Jabso',
  baseURL: process.env.BETTER_AUTH_URL?.trim(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDatabase(), { provider: 'pg', schema: databaseSchema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
    nextCookies(),
  ],
  socialProviders: githubClientId && githubClientSecret
    ? {
        github: {
          clientId: githubClientId,
          clientSecret: githubClientSecret,
          scope: ['read:user', 'user:email'],
        },
      }
    : undefined,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
})
