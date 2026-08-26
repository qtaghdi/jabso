'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'
import { JabsoWordmark } from 'src/components/brand/jabso-wordmark'
import { OwnerSummary } from 'src/features/shell/components/owner-summary'
import { SessionExpiryWatcher } from 'src/features/shell/components/session-expiry-watcher'
import { setSidebarCollapsed } from 'src/features/shell/server/sidebar-actions'

type SidebarShellProps = {
  children: ReactNode
  initialCollapsed: boolean
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

const SidebarToggleIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <rect x="3" y="3.5" width="14" height="13" rx="2" />
    <path d="M7.5 4v12" />
    <path d={collapsed ? 'm11 8 2 2-2 2' : 'm13 8-2 2 2 2'} />
  </svg>
)

export const SidebarShell = ({ children, initialCollapsed }: SidebarShellProps) => {
  const pathname = usePathname()
  const activeNav = pathname.startsWith('/projects') ? 'projects' : 'issues'
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
      <SessionExpiryWatcher />
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link className="wordmark" href="/" aria-label="Jabso issue inbox">
            <JabsoWordmark />
          </Link>
        </div>
        <nav aria-label="Primary navigation">
          <Link
            aria-label="Issues"
            className={`nav-item ${activeNav === 'issues' ? 'nav-item-active' : ''}`}
            href="/"
            prefetch
            title="Issues"
          >
            <IssueIcon />
            <span className="nav-label">Issues</span>
          </Link>
          <Link
            aria-label="Projects"
            className={`nav-item ${activeNav === 'projects' ? 'nav-item-active' : ''}`}
            href="/projects"
            prefetch
            title="Projects"
          >
            <ProjectIcon />
            <span className="nav-label">Projects</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <OwnerSummary />
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="sidebar-toggle"
            disabled={isPending}
            onClick={toggleSidebar}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <SidebarToggleIcon collapsed={collapsed} />
            <span className="sidebar-toggle-label">Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
