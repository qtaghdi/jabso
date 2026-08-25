import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export const requireOwner = cache(async () => {
  const startedAt = performance.now()
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const expectedUserId = process.env.JABSO_OWNER_CLERK_USER_ID?.trim()
  const expectedLogin = process.env.JABSO_OWNER_GITHUB_LOGIN?.trim() || 'qtaghdi'
  if (expectedUserId) {
    if (userId !== expectedUserId) redirect('/not-authorized')
    console.info('[jabso-dashboard-auth]', {
      durationMs: Math.round(performance.now() - startedAt),
      mode: 'session-user-id',
    })
    return { githubLogin: expectedLogin, userId }
  }

  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const githubAccount = user.externalAccounts.find((account) =>
    account.provider === 'github' || account.provider === 'oauth_github',
  )
  if (githubAccount?.username?.toLowerCase() !== expectedLogin.toLowerCase()) {
    redirect('/not-authorized')
  }

  console.info('[jabso-dashboard-auth]', {
    durationMs: Math.round(performance.now() - startedAt),
    mode: 'clerk-backend-fallback',
  })
  return { githubLogin: githubAccount.username, userId }
})
