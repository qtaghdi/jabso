import 'server-only'

import { getDatabase } from '@jabso/db'
import * as databaseSchema from '@jabso/db/schema'
import { waitUntil } from '@vercel/functions'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { organization } from 'better-auth/plugins'
import { sendAuthEmail } from 'src/shared/auth/auth-email'

const githubClientId = process.env.JABSO_GITHUB_OAUTH_CLIENT_ID?.trim()
const githubClientSecret = process.env.JABSO_GITHUB_OAUTH_CLIENT_SECRET?.trim()
const authBaseUrl = process.env.BETTER_AUTH_URL?.trim()

const getInvitationUrl = (invitationId: string) => {
  if (!authBaseUrl) throw new Error('BETTER_AUTH_URL is required to send organization invitations')
  const url = new URL('/accept-invitation', authBaseUrl)
  url.searchParams.set('invitationId', invitationId)
  return url.toString()
}

const createAuth = () => betterAuth({
  appName: 'Jabso',
  baseURL: authBaseUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDatabase(), { provider: 'pg', schema: databaseSchema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, url }) => sendAuthEmail({ kind: 'password-reset', to: user.email, url }),
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: ({ user, url }) => sendAuthEmail({ kind: 'verification', to: user.email, url }),
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: {
      '/request-password-reset': { window: 5 * 60, max: 3 },
      '/reset-password': { window: 5 * 60, max: 5 },
      '/organization/invite-member': { window: 5 * 60, max: 10 },
      '/send-verification-email': { window: 5 * 60, max: 3 },
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 5 * 60, max: 3 },
      '*': false,
    },
  },
  advanced: {
    backgroundTasks: { handler: waitUntil },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      invitationExpiresIn: 48 * 60 * 60,
      invitationLimit: 100,
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: ({ email, id, inviter, organization: invitedOrganization }) => sendAuthEmail({
        inviterName: inviter.user.name || inviter.user.email,
        kind: 'organization-invitation',
        organizationName: invitedOrganization.name,
        to: email,
        url: getInvitationUrl(id),
      }),
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

let authInstance: ReturnType<typeof createAuth> | undefined

export const getAuth = () => {
  authInstance ??= createAuth()
  return authInstance
}
