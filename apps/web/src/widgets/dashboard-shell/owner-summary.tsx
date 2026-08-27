'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import { WorkspaceSwitcher } from 'src/widgets/workspace-switcher/workspace-switcher'

export const OwnerSummary = () => {
  const { user } = useUser()
  const githubAccount = user?.externalAccounts.find((account) => account.provider === 'github')
  const githubLogin = githubAccount?.username ?? 'owner'
  const ownerName = user?.fullName ?? githubLogin

  return (
    <div className="account-summary">
      <WorkspaceSwitcher personalName={ownerName} />
      <div className="owner-summary">
        <UserButton appearance={{ elements: { avatarBox: 'owner-avatar' } }} />
        <span className="owner-details"><strong>{ownerName}</strong><small>@{githubLogin}</small></span>
      </div>
    </div>
  )
}
