'use client'

import { useRouter } from 'next/navigation'
import { authClient } from 'src/shared/auth/auth-client'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { WorkspaceSwitcher } from 'src/widgets/workspace-switcher/workspace-switcher'

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'J'

type OwnerSummaryProps = {
  activeWorkspaceName: string
  collapsed: boolean
  personalWorkspaceName: string | null
}

export const OwnerSummary = ({ activeWorkspaceName, collapsed, personalWorkspaceName }: OwnerSummaryProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const ownerName = session?.user.name ?? t('common.user')
  const ownerEmail = session?.user.email ?? ''

  const signOut = async () => {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <div className={`grid min-w-0 gap-2.5 max-[900px]:justify-items-center max-[620px]:block ${collapsed ? 'justify-items-center' : ''}`}>
      <WorkspaceSwitcher
        activeWorkspaceName={activeWorkspaceName}
        collapsed={collapsed}
        personalName={ownerName}
        personalWorkspaceName={personalWorkspaceName}
      />
      <button aria-label={t('onboarding.signOut')} className={`flex min-w-0 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left max-[900px]:justify-center max-[620px]:hidden ${collapsed ? 'justify-center' : ''}`} onClick={signOut} title={t('onboarding.signOut')} type="button">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#17191d] text-[11px] font-bold text-white" aria-hidden="true">{initials(ownerName)}</span>
        <span className={`min-w-0 ${collapsed ? 'hidden' : 'grid'} max-[900px]:hidden`}><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-ink">{ownerName}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-muted">{ownerEmail}</small></span>
      </button>
    </div>
  )
}
