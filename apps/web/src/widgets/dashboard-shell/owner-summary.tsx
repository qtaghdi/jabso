'use client'

import Link from 'next/link'
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
  const { data: session } = authClient.useSession()
  const ownerName = session?.user.name ?? t('common.user')
  const ownerEmail = session?.user.email ?? ''

  return (
    <div className={`grid min-w-0 gap-2.5 max-[900px]:justify-items-center max-[620px]:flex max-[620px]:items-center max-[620px]:gap-2 ${collapsed ? 'justify-items-center' : ''}`}>
      <WorkspaceSwitcher
        activeWorkspaceName={activeWorkspaceName}
        collapsed={collapsed}
        personalName={ownerName}
        personalWorkspaceName={personalWorkspaceName}
      />
      <Link aria-label={t('profile.open')} className={`flex min-w-0 items-center gap-2.5 rounded-lg border border-transparent p-1 text-left no-underline hover:border-line hover:bg-subtle max-[900px]:justify-center ${collapsed ? 'justify-center' : ''}`} href="/profile" title={t('profile.open')}>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#17191d] text-[11px] font-bold text-white" aria-hidden="true">{initials(ownerName)}</span>
        <span className={`min-w-0 ${collapsed ? 'hidden' : 'grid'} max-[900px]:hidden`}><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-ink">{ownerName}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-muted">{ownerEmail}</small></span>
      </Link>
    </div>
  )
}
