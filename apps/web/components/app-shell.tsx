import Link from 'next/link'
import type { ReactNode } from 'react'
import { OwnerSummary } from '@/components/owner-summary'
import { SessionExpiryWatcher } from '@/components/session-expiry-watcher'

type AppShellProps = {
  children: ReactNode
}

const IssueIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 3.5 21 19H3L12 3.5Z" />
    <path d="M12 9v4.5M12 17h.01" />
  </svg>
)

export const AppShell = ({ children }: AppShellProps) => (
  <div className="app-shell">
    <SessionExpiryWatcher />
    <aside className="sidebar">
      <Link className="wordmark" href="/" aria-label="Jabso issue inbox">
        Jabso
      </Link>
      <nav aria-label="Primary navigation">
        <Link className="nav-item nav-item-active" href="/">
          <IssueIcon />
          Issues
        </Link>
      </nav>
      <div className="sidebar-footer">
        <OwnerSummary />
      </div>
    </aside>
    <main className="main-content">{children}</main>
  </div>
)
