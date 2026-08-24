import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export const requireOwner = cache(async () => {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const expectedLogin = process.env.JABSO_OWNER_GITHUB_LOGIN?.trim() || 'qtaghdi'
  const githubAccount = user.externalAccounts.find((account) =>
    account.provider === 'github' || account.provider === 'oauth_github',
  )
  if (githubAccount?.username?.toLowerCase() !== expectedLogin.toLowerCase()) {
    redirect('/not-authorized')
  }

  return { githubLogin: githubAccount.username, user }
})
