'use client'

import { useRouter } from 'next/navigation'
import { authClient } from 'src/shared/auth/auth-client'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { WorkspaceSwitcher } from 'src/widgets/workspace-switcher/workspace-switcher'

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'J'

type OwnerSummaryProps = {
  activeWorkspaceName: string
  personalWorkspaceName: string | null
}

export const OwnerSummary = ({ activeWorkspaceName, personalWorkspaceName }: OwnerSummaryProps) => {
  const { t } = useI18n()
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
      <WorkspaceSwitcher
        activeWorkspaceName={activeWorkspaceName}
        personalName={ownerName}
        personalWorkspaceName={personalWorkspaceName}
      />
      <button aria-label={t('onboarding.signOut')} className="owner-summary" onClick={signOut} title={t('onboarding.signOut')} type="button">
        <span className="owner-avatar owner-avatar-fallback" aria-hidden="true">{initials(ownerName)}</span>
        <span className="owner-details"><strong>{ownerName}</strong><small>{ownerEmail}</small></span>
      </button>
    </div>
  )
}
