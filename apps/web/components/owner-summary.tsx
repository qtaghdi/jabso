'use client'

import { UserButton, useUser } from '@clerk/nextjs'

export const OwnerSummary = () => {
  const { user } = useUser()
  const githubAccount = user?.externalAccounts.find((account) => account.provider === 'github')
  const githubLogin = githubAccount?.username ?? 'owner'
  const ownerName = user?.fullName ?? githubLogin

  return (
    <div className="owner-summary">
      <UserButton appearance={{ elements: { avatarBox: 'owner-avatar' } }} />
      <span><strong>{ownerName}</strong><small>@{githubLogin}</small></span>
    </div>
  )
}
