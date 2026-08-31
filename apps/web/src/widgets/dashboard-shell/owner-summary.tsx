'use client'

import { useRouter } from 'next/navigation'
import { authClient } from 'src/shared/auth/auth-client'
import { WorkspaceSwitcher } from 'src/widgets/workspace-switcher/workspace-switcher'

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'J'

export const OwnerSummary = () => {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const ownerName = session?.user.name ?? 'Jabso user'
  const ownerEmail = session?.user.email ?? ''

  const signOut = async () => {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <div className="account-summary">
      <WorkspaceSwitcher personalName={ownerName} />
      <button className="owner-summary" onClick={signOut} title="Sign out" type="button">
        <span className="owner-avatar owner-avatar-fallback" aria-hidden="true">{initials(ownerName)}</span>
        <span className="owner-details"><strong>{ownerName}</strong><small>{ownerEmail}</small></span>
      </button>
    </div>
  )
}
