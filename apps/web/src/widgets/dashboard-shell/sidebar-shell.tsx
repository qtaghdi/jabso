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
    <div className={`app-shell ${collapsed ? 'app-shell-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">{t('common.skipToContent')}</a>
      <SessionExpiryWatcher />
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link className="wordmark" href="/" aria-label={t('nav.issueInbox')}>
            <JabsoWordmark />
          </Link>
        </div>
        <nav aria-label={t('nav.primary')}>
          <Link
            aria-label={t('nav.issues')}
            className={`nav-item ${activeNav === 'issues' ? 'nav-item-active' : ''}`}
            href="/"
            prefetch
            title={t('nav.issues')}
          >
            <IssueIcon />
            <span className="nav-label">{t('nav.issues')}</span>
          </Link>
          <Link
            aria-label={t('nav.mcp')}
            className={`nav-item ${activeNav === 'mcp' ? 'nav-item-active' : ''}`}
            href="/mcp"
            prefetch
            title={t('nav.mcp')}
          >
            <McpIcon />
            <span className="nav-label">{t('nav.mcp')}</span>
          </Link>
          <Link
            aria-label={t('nav.projects')}
            className={`nav-item ${activeNav === 'projects' ? 'nav-item-active' : ''}`}
            href="/projects"
            prefetch
            title={t('nav.projects')}
          >
            <ProjectIcon />
            <span className="nav-label">{t('nav.projects')}</span>
          </Link>
          <Link
            aria-label={t('nav.settings')}
            className={`nav-item ${activeNav === 'settings' ? 'nav-item-active' : ''}`}
            href="/settings"
            prefetch
            title={t('nav.settings')}
          >
            <SettingsIcon />
            <span className="nav-label">{t('nav.settings')}</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <OwnerSummary
            activeWorkspaceName={activeWorkspaceName}
            personalWorkspaceName={personalWorkspaceName}
          />
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            className="sidebar-toggle"
            disabled={isPending}
            onClick={toggleSidebar}
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
            type="button"
          >
            <SidebarToggleIcon collapsed={collapsed} />
            <span className="sidebar-toggle-label">{t('nav.collapse')}</span>
          </button>
        </div>
      </aside>
      <main className="main-content" id="main-content">{children}</main>
    </div>
  )
}
