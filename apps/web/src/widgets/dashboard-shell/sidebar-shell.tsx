'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'
import { JabsoWordmark } from 'src/shared/brand/jabso-wordmark'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { OwnerSummary } from 'src/widgets/dashboard-shell/owner-summary'
import { SessionExpiryWatcher } from 'src/widgets/dashboard-shell/session-expiry-watcher'
import { setSidebarCollapsed } from 'src/widgets/dashboard-shell/sidebar-actions'

type SidebarShellProps = {
  activeWorkspaceName: string
  children: ReactNode
  initialCollapsed: boolean
  personalWorkspaceName: string | null
}

const IssueIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 3.5 21 19H3L12 3.5Z" />
    <path d="M12 9v4.5M12 17h.01" />
  </svg>
)

const ProjectIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M3.5 7.5h17v12h-17zM3.5 7.5l3-3h5l2 3" />
  </svg>
)

const McpIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M8 7.5h8M8 16.5h8M7.5 8v8M16.5 8v8" />
    <circle cx="7.5" cy="7.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
)

const SettingsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" />
    <path d="m19 13.5 1.5 1.2-2 3.5-1.9-.7a7.8 7.8 0 0 1-2.1 1.2l-.3 2h-4l-.3-2a7.8 7.8 0 0 1-2.1-1.2l-1.9.7-2-3.5 1.5-1.2a7.6 7.6 0 0 1 0-3L3.9 9.8l2-3.5 1.9.7a7.8 7.8 0 0 1 2.1-1.2l.3-2h4l.3 2A7.8 7.8 0 0 1 16.6 7l1.9-.7 2 3.5L19 11a7.6 7.6 0 0 1 0 2.5Z" />
  </svg>
)

const SidebarToggleIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <rect x="3" y="3.5" width="14" height="13" rx="2" />
    <path d="M7.5 4v12" />
    <path d={collapsed ? 'm11 8 2 2-2 2' : 'm13 8-2 2 2 2'} />
  </svg>
)

export const SidebarShell = ({
  activeWorkspaceName,
  children,
  initialCollapsed,
  personalWorkspaceName,
}: SidebarShellProps) => {
  const { t } = useI18n()
  const pathname = usePathname()
  const activeNav = pathname.startsWith('/projects')
    ? 'projects'
    : pathname.startsWith('/mcp')
      ? 'mcp'
      : pathname.startsWith('/settings') ? 'settings' : 'issues'
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [isPending, startTransition] = useTransition()

  const toggleSidebar = () => {
    const nextCollapsed = !collapsed
    setCollapsed(nextCollapsed)
    startTransition(async () => {
      try {
        await setSidebarCollapsed(nextCollapsed)
      } catch {
        setCollapsed(!nextCollapsed)
      }
    })
  }

  return (
    <div className={`grid min-h-screen bg-canvas transition-[grid-template-columns] duration-200 max-[620px]:block ${collapsed ? 'grid-cols-[76px_minmax(0,1fr)]' : 'grid-cols-[236px_minmax(0,1fr)]'} max-[900px]:grid-cols-[72px_minmax(0,1fr)]`}>
      <a className="fixed top-3 left-3 z-[100] -translate-y-[calc(100%+20px)] rounded-lg bg-ink px-3.5 py-2.5 text-[13px] font-semibold text-white no-underline focus-visible:translate-y-0" href="#main-content">{t('common.skipToContent')}</a>
      <SessionExpiryWatcher />
      <aside className={`sticky top-0 z-20 flex h-screen flex-col border-r border-line bg-white px-3.5 pt-6 pb-4 shadow-[1px_0_0_rgb(17_20_25_/_0.02)] transition-[padding] duration-200 max-[900px]:items-center max-[900px]:px-2 max-[620px]:z-40 max-[620px]:h-auto max-[620px]:w-full max-[620px]:flex-row max-[620px]:items-center max-[620px]:justify-between max-[620px]:border-r-0 max-[620px]:border-b max-[620px]:px-[18px] max-[620px]:py-[11px] max-[620px]:shadow-[0_1px_12px_rgb(17_20_25_/_0.05)] ${collapsed ? 'px-2.5' : ''}`}>
        <div className={`mx-2 mb-8 flex min-h-8 items-center max-[900px]:mx-0 max-[900px]:justify-center max-[620px]:m-0 max-[620px]:w-auto ${collapsed ? 'mx-0 justify-center' : 'justify-start'}`}>
          <Link className="inline-flex min-w-0 items-center text-ink no-underline" href="/" aria-label={t('nav.issueInbox')}>
            <JabsoWordmark className={`${collapsed ? '[&_.wordmark-text]:hidden [&_.jabso-mark]:size-[26px]' : ''} max-[900px]:[&_.wordmark-text]:hidden max-[620px]:[&_.wordmark-text]:inline max-[620px]:[&_.wordmark-text]:text-[22px] max-[620px]:[&_.jabso-mark]:size-[26px]`} />
          </Link>
        </div>
        <nav aria-label={t('nav.primary')} className="grid gap-1.5 max-[620px]:fixed max-[620px]:right-3 max-[620px]:bottom-[calc(10px+env(safe-area-inset-bottom))] max-[620px]:left-3 max-[620px]:z-50 max-[620px]:grid-cols-4 max-[620px]:gap-[3px] max-[620px]:rounded-[18px] max-[620px]:border max-[620px]:border-line max-[620px]:bg-white/96 max-[620px]:p-[5px] max-[620px]:shadow-[0_16px_42px_rgb(17_20_25_/_0.16)] max-[620px]:backdrop-blur-lg">
          <Link
            aria-label={t('nav.issues')}
            className={navItemClass(activeNav === 'issues', collapsed)}
            href="/"
            prefetch
            title={t('nav.issues')}
          >
            <IssueIcon />
            <span className={navLabelClass(collapsed)}>{t('nav.issues')}</span>
          </Link>
          <Link
            aria-label={t('nav.mcp')}
            className={navItemClass(activeNav === 'mcp', collapsed)}
            href="/mcp"
            prefetch
            title={t('nav.mcp')}
          >
            <McpIcon />
            <span className={navLabelClass(collapsed)}>{t('nav.mcp')}</span>
          </Link>
          <Link
            aria-label={t('nav.projects')}
            className={navItemClass(activeNav === 'projects', collapsed)}
            href="/projects"
            prefetch
            title={t('nav.projects')}
          >
            <ProjectIcon />
            <span className={navLabelClass(collapsed)}>{t('nav.projects')}</span>
          </Link>
          <Link
            aria-label={t('nav.settings')}
            className={navItemClass(activeNav === 'settings', collapsed)}
            href="/settings"
            prefetch
            title={t('nav.settings')}
          >
            <SettingsIcon />
            <span className={navLabelClass(collapsed)}>{t('nav.settings')}</span>
          </Link>
        </nav>
        <div className={`mt-auto grid gap-2.5 border-t border-line pt-4 text-xs text-muted max-[900px]:w-full max-[900px]:px-0 max-[620px]:m-0 max-[620px]:w-auto max-[620px]:border-0 max-[620px]:p-0 ${collapsed ? 'px-0' : 'px-2'}`}>
          <OwnerSummary
            activeWorkspaceName={activeWorkspaceName}
            collapsed={collapsed}
            personalWorkspaceName={personalWorkspaceName}
          />
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            className={`flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-transparent px-[9px] text-left text-xs font-medium text-muted hover:border-line hover:bg-canvas hover:text-ink disabled:cursor-default disabled:opacity-55 max-[900px]:hidden ${collapsed ? 'justify-center px-0' : ''} [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.45]`}
            disabled={isPending}
            onClick={toggleSidebar}
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
            type="button"
          >
            <SidebarToggleIcon collapsed={collapsed} />
            <span className={collapsed ? 'hidden' : undefined}>{t('nav.collapse')}</span>
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1440px] px-[clamp(30px,4vw,58px)] pt-11 pb-20 max-[900px]:px-7 max-[620px]:px-[18px] max-[620px]:pt-[30px] max-[620px]:pb-[calc(104px+env(safe-area-inset-bottom))]" id="main-content">{children}</main>
    </div>
  )
}

const navItemClass = (active: boolean, collapsed: boolean) => [
  'flex min-h-[46px] items-center gap-3 rounded-lg border px-3 text-sm font-semibold no-underline transition-[background-color,border-color,color,transform] duration-150 hover:translate-x-0.5 hover:border-line hover:bg-subtle hover:text-ink max-[900px]:w-12 max-[900px]:justify-center max-[900px]:px-0 max-[620px]:min-h-[54px] max-[620px]:w-auto max-[620px]:flex-col max-[620px]:justify-center max-[620px]:gap-[3px] max-[620px]:rounded-[13px] max-[620px]:px-1 max-[620px]:py-[5px] max-[620px]:text-[10px] max-[620px]:hover:translate-x-0 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6] max-[620px]:[&_svg]:size-[19px]',
  collapsed ? 'justify-center px-0' : '',
  active
    ? 'border-line bg-subtle-strong text-ink shadow-[inset_3px_0_#111419] max-[620px]:border-transparent max-[620px]:shadow-none'
    : 'border-transparent text-[#303640]',
].filter(Boolean).join(' ')

const navLabelClass = (collapsed: boolean) => `${collapsed ? 'hidden' : ''} max-[900px]:hidden max-[620px]:block max-[620px]:max-w-full max-[620px]:overflow-hidden max-[620px]:text-ellipsis max-[620px]:whitespace-nowrap`
